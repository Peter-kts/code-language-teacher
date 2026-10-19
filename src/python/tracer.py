"""Run user code under sys.settrace and record a snapshot of variables per line.

Loaded into Pyodide by the worker, and importable by plain CPython for tests.
Entry point: run_traced(source) -> JSON string (see TraceResult in src/types.ts).
"""

import ast
import collections
import io
import itertools
import json
import math
import reprlib
import sys

USER_FILENAME = "<user>"
HIDDEN_PREFIX = "_ct_idx_"
RECORD_FN = "_ct_rec"
# Records the length of what a `for` loop goes over, so a step can say "pass 3 of 8".
RECORD_LEN = "_ct_len"
# Records whether an `if` or `while` test came out true, so a step can say why the code went that way.
RECORD_BOOL = "_ct_bool"
MAX_LIST_ITEMS = 64
# A variable's own list can be longer, so the boxes around a pointer far into it can still be drawn.
MAX_TOP_ITEMS = 200
MAX_DEPTH = 3
MAX_BRIEF = 60
MAX_SEQ_PARTS = 8
# Code flags (inspect.CO_GENERATOR, CO_COROUTINE, CO_ASYNC_GENERATOR) of frames
# that "return" at each yield and later resume as the same call.
_RESUMABLE = 0x20 | 0x80 | 0x200


MAX_NODES = 60
MAX_NODE_FIELDS = 12
# How far a returned linked list is followed before it counts as looping forever.
MAX_LIST_NODES = 100_000


class StepLimitExceeded(Exception):
    pass


class _TooSlow(Exception):
    pass


# The node classes LeetCode defines for its linked list and tree problems. They are handed
# to the learner's code (it can also define its own), and inputs are built from them.
class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

    def __repr__(self):
        return f"ListNode({self.val!r})"


class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

    def __repr__(self):
        return f"TreeNode({self.val!r})"


_NODE_CLASSES = {"ListNode": ListNode, "TreeNode": TreeNode}


def _is_node(value):
    """An object of a class: the learner's own, or ListNode and TreeNode."""
    cls = type(value)
    if cls in (ListNode, TreeNode):
        return True
    return cls.__module__ == "__main__" and not isinstance(value, type) and hasattr(value, "__dict__")


def _to_nodes(value, kind, classes):
    """A JSON argument as the linked list or tree it stands for (see NodeIo in src/types.ts)."""
    list_node = classes.get("ListNode", ListNode)
    tree_node = classes.get("TreeNode", TreeNode)
    if kind == "lists":
        return [_to_nodes(v, "list", classes) for v in value]
    if kind in ("list", "cycle"):
        values, pos = (value["values"], value.get("pos", -1)) if kind == "cycle" else (value, -1)
        nodes = [list_node(v) for v in values]
        for a, b in zip(nodes, nodes[1:]):
            a.next = b
        if nodes and 0 <= pos < len(nodes):
            nodes[-1].next = nodes[pos]
        return nodes[0] if nodes else None
    if kind == "tree":
        if not value or value[0] is None:
            return None
        root = tree_node(value[0])
        queue, i = [root], 1
        for node in queue:
            if i >= len(value):
                break
            for side in ("left", "right"):
                if i < len(value) and value[i] is not None:
                    child = tree_node(value[i])
                    setattr(node, side, child)
                    queue.append(child)
                i += 1
        return root
    return value


def _from_nodes(value, kind):
    """A returned linked list or tree as JSON, the way the tests write it."""
    if value is None:
        return []
    if kind == "lists":
        return [_from_nodes(v, "list") for v in value]
    if kind in ("list", "cycle"):
        if not hasattr(value, "next"):
            raise TypeError(f"return the first node of the list (a ListNode), not {type(value).__name__}")
        out = []
        while value is not None:
            out.append(value.val)
            if len(out) > MAX_LIST_NODES:
                raise ValueError("the list you returned never ends: some node's next leads back into it")
            value = value.next
        return out
    if kind == "tree":
        if not hasattr(value, "left"):
            raise TypeError(f"return the root of the tree (a TreeNode), not {type(value).__name__}")
        out, queue = [], [value]
        for node in queue:
            if len(queue) > MAX_LIST_NODES:
                raise ValueError("the tree you returned loops back on itself")
            if node is None:
                out.append(None)
                continue
            out.append(node.val)
            queue.append(node.left)
            queue.append(node.right)
        while out and out[-1] is None:
            out.pop()
        return out
    return value


def _call_args(args, node_io, classes):
    args = _copy_args(args)
    if not node_io:
        return args
    kinds = node_io.get("args") or []
    return [_to_nodes(a, kinds[i], classes) if i < len(kinds) and kinds[i] else a for i, a in enumerate(args)]


def _answer(value, node_io):
    return _from_nodes(value, node_io["result"]) if node_io and node_io.get("result") else value


def _refs(serialized, out):
    """The node ids a serialized value points at, added to `out`."""
    kind = serialized.get("type")
    if kind == "ref":
        out.append(str(serialized["id"]))
    elif kind in ("list", "tuple"):
        for item in serialized["items"]:
            _refs(item, out)
    elif kind == "dict":
        for k, v in serialized["entries"]:
            _refs(k, out)
            _refs(v, out)
    return out


class _Heap:
    """The class instances one snapshot reaches, by a number that stays the same for the whole run."""

    def __init__(self, ids):
        self.ids = ids
        self.nodes = {}

    def ref(self, obj):
        entry = self.ids.get(id(obj))
        if entry is None:
            # Keep the object alive so its id() can't be reused by another one.
            entry = self.ids[id(obj)] = (len(self.ids) + 1, obj)
        n = entry[0]
        key = str(n)
        if key not in self.nodes and len(self.nodes) < MAX_NODES:
            self.nodes[key] = None  # placeholder, so a cycle stops here
            fields = list(getattr(obj, "__dict__", {}).items())[:MAX_NODE_FIELDS]
            self.nodes[key] = {
                "cls": type(obj).__name__,
                "fields": [[k, _serialize(v, 1, self)] for k, v in fields if not k.startswith("__")],
            }
        return {"type": "ref", "id": n, "cls": type(obj).__name__}


class _ConsoleStream(io.TextIOBase):
    """Stands in for sys.stdout or sys.stderr and hands every write to `sink`."""

    def __init__(self, name, sink):
        self.name = name
        self.sink = sink

    def writable(self):
        return True

    def write(self, text):
        if text:
            self.sink(self.name, text)
        return len(text)


def _user_line():
    """The line of the user's code running right now, if any."""
    frame = sys._getframe(2)
    while frame is not None and frame.f_code.co_filename != USER_FILENAME:
        frame = frame.f_back
    return frame.f_lineno if frame is not None else None


class _LoopIndexer(ast.NodeTransformer):
    """Rewrite `for v in xs:` to `for _ct_idx_N, v in enumerate(xs):`.

    The hidden counter lets the visualizer know which box `v` points at even
    when the list holds duplicate values. Only loops over a plain name are
    rewritten, so we always know which list the pointer belongs to.
    """

    def __init__(self):
        self.pointers = []
        # Loops with the same name over the same list share one counter (and
        # pointer), so a second `for c in s:` moves the arrow rather than
        # leaving it where the first loop ended.
        self.shared = {}

    def visit_For(self, node):
        self.generic_visit(node)
        if isinstance(node.target, ast.Name) and isinstance(node.iter, ast.Name):
            pair = (node.target.id, node.iter.id)
            hidden = self.shared.get(pair)
            if hidden is None:
                hidden = f"{HIDDEN_PREFIX}{node.lineno}_{node.col_offset}"
                self.shared[pair] = hidden
                self.pointers.append(
                    {"label": node.target.id, "var": hidden, "target": node.iter.id}
                )
            node.target = ast.copy_location(
                ast.Tuple(
                    elts=[ast.Name(id=hidden, ctx=ast.Store()), node.target],
                    ctx=ast.Store(),
                ),
                node.target,
            )
            node.iter = ast.copy_location(
                ast.Call(
                    func=ast.Name(id="enumerate", ctx=ast.Load()),
                    args=[node.iter],
                    keywords=[],
                ),
                node.iter,
            )
        return node


def _index_pointers(tree):
    """Find integer variables used as indexes into lists.

    Covers `for i in range(len(xs))`, `for i, v in enumerate(xs)` and any
    `xs[i]` subscript, which is how two-pointer code (`l`, `r`) reads.
    """
    found = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Subscript):
            if isinstance(node.value, ast.Name) and isinstance(node.slice, ast.Name):
                found.add((node.slice.id, node.value.id))
        elif isinstance(node, ast.For) and isinstance(node.iter, ast.Call):
            call = node.iter
            if not isinstance(call.func, ast.Name) or not call.args:
                continue
            if call.func.id == "range":
                arg = call.args[-1] if len(call.args) <= 2 else call.args[1]
                if (
                    isinstance(arg, ast.Call)
                    and isinstance(arg.func, ast.Name)
                    and arg.func.id == "len"
                    and arg.args
                    and isinstance(arg.args[0], ast.Name)
                    and isinstance(node.target, ast.Name)
                ):
                    found.add((node.target.id, arg.args[0].id))
            elif call.func.id == "enumerate" and isinstance(call.args[0], ast.Name):
                if (
                    isinstance(node.target, ast.Tuple)
                    and node.target.elts
                    and isinstance(node.target.elts[0], ast.Name)
                ):
                    found.add((node.target.elts[0].id, call.args[0].id))
    return [{"label": var, "var": var, "target": target} for var, target in sorted(found)]


def _cell_pointers(tree):
    """`grid[r][c]` with plain names: the cell (r, c) of a grid or table that the code looks at."""
    found = set()
    for node in ast.walk(tree):
        if (
            isinstance(node, ast.Subscript)
            and isinstance(node.slice, ast.Name)
            and isinstance(node.value, ast.Subscript)
            and isinstance(node.value.value, ast.Name)
            and isinstance(node.value.slice, ast.Name)
        ):
            found.add((node.value.slice.id, node.slice.id, node.value.value.id))
    return [{"row": r, "col": c, "target": target} for r, c, target in sorted(found)]


_HEAPQ = {"heappush", "heappop", "heapify", "heapreplace", "heappushpop"}


def _heap_names(tree):
    """Lists the code uses as heaps: the first argument of heapq.heappush(h, x) and friends."""
    found = []
    for node in ast.walk(tree):
        if not isinstance(node, ast.Call) or not node.args or not isinstance(node.args[0], ast.Name):
            continue
        f = node.func
        name = f.attr if isinstance(f, ast.Attribute) and isinstance(f.value, ast.Name) and f.value.id == "heapq" else f.id if isinstance(f, ast.Name) else None
        if name in _HEAPQ and node.args[0].id not in found:
            found.append(node.args[0].id)
    return found


_BIN_OPS = {
    ast.Add: "+", ast.Sub: "-", ast.Mult: "*", ast.Div: "/", ast.FloorDiv: "//", ast.Mod: "%",
    ast.Pow: "**", ast.LShift: "<<", ast.RShift: ">>", ast.BitOr: "|", ast.BitXor: "^",
    ast.BitAnd: "&", ast.MatMult: "@",
}
_UNARY_OPS = {ast.USub: "-", ast.UAdd: "+", ast.Not: "not", ast.Invert: "~"}


def _has_slice(node):
    return any(isinstance(n, ast.Slice) for n in ast.walk(node))


def _is_dict_get(node):
    """`name.get(key)` or `name.get(key, default)`."""
    return (
        isinstance(node, ast.Call)
        and isinstance(node.func, ast.Attribute)
        and node.func.attr == "get"
        and isinstance(node.func.value, ast.Name)
        and 1 <= len(node.args) <= 2
        and not node.keywords
        and not any(isinstance(a, ast.Starred) for a in node.args)
    )


class _Recorder(ast.NodeTransformer):
    """Record the value of each part of an assignment while it runs.

    `total += n + ages["test"]` runs as
    `total += _ct_rec(4, _ct_rec(1, n) + _ct_rec(3, ages[_ct_rec(2, "test")]))`:
    the same values in the same order, but each part's value is kept for the
    step, so the visualizer can show +16 as n (4) + ages["test"] (12) and light
    up the dict row it read. `plans` describes each assignment once; steps only
    carry the recorded values, keyed by part id.
    """

    def __init__(self, source):
        self.source = source
        self.lines = source.split("\n")
        self.plans = []
        # `if` and `while` tests (see CheckPlan in src/types.ts), and loops with the lines they span.
        self.checks = []
        self.blocks = []
        self.ids = 0

    def visit_If(self, node):
        self.generic_visit(node)
        self.check(node, "if")
        return node

    def visit_While(self, node):
        self.generic_visit(node)
        self.check(node, "while")
        self.blocks.append({"line": node.lineno, "end": node.end_lineno, "kind": "while"})
        return node

    def visit_For(self, node):
        self.generic_visit(node)
        # The loop goes over `node.iter`, or over its argument when it is `enumerate(xs)`
        # (also the loops _LoopIndexer rewrote): its length is how many passes there will be.
        it = node.iter
        holder, field = node, "iter"
        if isinstance(it, ast.Call) and isinstance(it.func, ast.Name) and it.func.id == "enumerate" and len(it.args) == 1 and not it.keywords:
            holder, field = it.args, 0
        self.ids += 1
        target = holder[field] if field == 0 else getattr(holder, field)
        wrapped = ast.copy_location(
            ast.Call(func=ast.Name(id=RECORD_LEN, ctx=ast.Load()), args=[ast.Constant(self.ids), target], keywords=[]),
            target,
        )
        if field == 0:
            holder[0] = wrapped
        else:
            setattr(holder, field, wrapped)
        self.blocks.append({"line": node.lineno, "end": node.end_lineno, "kind": "for", "id": self.ids})
        return node

    def check(self, node, kind):
        """Record the parts of a test and whether it came out true."""
        if isinstance(node.test, ast.Constant):
            return  # `while True:` decides nothing
        if kind == "if" and self.lines[node.lineno - 1].lstrip().startswith("elif"):
            kind = "elif"
        node.test, plan = self.expr(node.test)
        if plan is None:
            return
        self.ids += 1
        node.test = ast.copy_location(
            ast.Call(func=ast.Name(id=RECORD_BOOL, ctx=ast.Load()), args=[ast.Constant(self.ids), node.test], keywords=[]),
            node.test,
        )
        self.checks.append({"line": node.lineno, "kind": kind, "id": self.ids, "value": plan})

    def visit_Assign(self, node):
        targets = [self.target(t) for t in node.targets]
        node.value, value = self.expr(node.value)
        self.plans.append({"line": node.lineno, "op": None, "targets": targets, "value": value})
        return node

    def visit_AugAssign(self, node):
        target = self.target(node.target)
        node.value, value = self.expr(node.value)
        op = _BIN_OPS.get(type(node.op))
        self.plans.append({"line": node.lineno, "op": op, "targets": [target], "value": value})
        return node

    def visit_Expr(self, node):
        call = node.value
        if isinstance(call, ast.Call) and isinstance(call.func, ast.Attribute) and isinstance(call.func.value, ast.Name):
            # `stack.append(n)` changes `stack`: record what it was given, so `n` lights up.
            target = {"kind": "name", "name": call.func.value.id}
            node.value, value = self.expr(call)
            self.plans.append({"line": node.lineno, "op": "call", "targets": [target], "value": value})
        return node

    def visit_AnnAssign(self, node):
        if node.value is None:
            return node
        target = self.target(node.target)
        node.value, value = self.expr(node.value)
        self.plans.append({"line": node.lineno, "op": None, "targets": [target], "value": value})
        return node

    def target(self, node):
        if isinstance(node, ast.Name):
            return {"kind": "name", "name": node.id}
        if isinstance(node, (ast.Tuple, ast.List)):
            return {"kind": "seq", "items": [self.target(t) for t in node.elts]}
        if isinstance(node, ast.Subscript) and isinstance(node.value, ast.Name) and not _has_slice(node.slice):
            # The key is read even though the item is written: record it too.
            node.slice, key = self.expr(node.slice)
            return {"kind": "item", "name": node.value.id, "key": key, "text": self.text(node)}
        return {"kind": "other"}

    def expr(self, node):
        """Wrap `node` so its value is recorded; returns (new node, plan)."""
        if isinstance(node, ast.Constant):
            return node, {"kind": "const", "text": self.text(node), "value": _brief(node.value)}
        if isinstance(node, (ast.Starred, ast.Slice)):
            return node, None  # only valid where they stand, so they can't be wrapped
        if isinstance(node, ast.Name):
            plan = {"kind": "name", "name": node.id}
        elif _is_dict_get(node):
            # `counts.get(c, 0)` reads counts[c] like a subscript does, so it lights up that row.
            node.args[0], key = self.expr(node.args[0])
            plan = {"kind": "sub", "name": node.func.value.id, "of": None, "key": key}
        elif isinstance(node, ast.Subscript):
            name = node.value.id if isinstance(node.value, ast.Name) else None
            of = None
            if name is None:
                node.value, of = self.expr(node.value)
            key = None
            if not _has_slice(node.slice):
                node.slice, key = self.expr(node.slice)
            plan = {"kind": "sub", "name": name, "of": of, "key": key}
        elif isinstance(node, ast.BinOp):
            node.left, left = self.expr(node.left)
            node.right, right = self.expr(node.right)
            plan = {"kind": "bin", "op": _BIN_OPS.get(type(node.op), "?"), "left": left, "right": right}
        elif isinstance(node, ast.UnaryOp):
            node.operand, operand = self.expr(node.operand)
            plan = {"kind": "unary", "op": _UNARY_OPS.get(type(node.op), "?"), "operand": operand}
        elif isinstance(node, (ast.Tuple, ast.List)) and len(node.elts) <= MAX_SEQ_PARTS:
            # Itemized so `a, b = b, a + b` can pair each target with its value.
            plan = {"kind": "seq", "items": self.each(node.elts)}
        else:
            # Calls, comparisons and the like are one part each, but the names
            # they read are recorded too, so they still light up as sources.
            # Lambdas and comprehensions run later or many times: left alone.
            parts = []
            if isinstance(node, ast.Call):
                parts = self.each(node.args)
                for kw in node.keywords:
                    kw.value, part = self.expr(kw.value)
                    parts.append(part)
            elif isinstance(node, ast.BoolOp):
                parts = self.each(node.values)
            elif isinstance(node, ast.Compare):
                node.left, left = self.expr(node.left)
                parts = [left, *self.each(node.comparators)]
            elif isinstance(node, ast.IfExp):
                node.test, test = self.expr(node.test)
                node.body, body = self.expr(node.body)
                node.orelse, orelse = self.expr(node.orelse)
                parts = [test, body, orelse]
            plan = {"kind": "other", "parts": [p for p in parts if p]}
        self.ids += 1
        plan["id"] = self.ids
        plan["text"] = self.text(node)
        plan.update(self.span(node))
        call = ast.Call(
            func=ast.Name(id=RECORD_FN, ctx=ast.Load()),
            args=[ast.Constant(self.ids), node],
            keywords=[],
        )
        return ast.copy_location(call, node), plan

    def each(self, nodes):
        """Wrap every expression in a list in place; returns their plans."""
        plans = []
        for i, node in enumerate(nodes):
            nodes[i], plan = self.expr(node)
            plans.append(plan)
        return plans

    def text(self, node):
        text = ast.get_source_segment(self.source, node) or ""
        return " ".join(text.split())

    def span(self, node):
        return _span(self.lines, node)


def _span(lines, node):
    """Where a node sits on its line, as 1-based character columns (none if it spans lines)."""
    if node.lineno != node.end_lineno or node.lineno > len(lines):
        return {}
    line = lines[node.lineno - 1].encode("utf-8")
    col = lambda byte: len(line[:byte].decode("utf-8", "replace")) + 1  # noqa: E731
    return {"line": node.lineno, "start": col(node.col_offset), "end": col(node.end_col_offset)}


def _loop_plans(tree, source):
    """`for n in nums` and `for i, n in enumerate(nums)`: which list each step's `n` comes from."""
    lines = source.split("\n")
    loops = []
    for node in ast.walk(tree):
        if not isinstance(node, ast.For):
            continue
        it, target = node.iter, node.target
        if isinstance(target, ast.Name) and isinstance(it, ast.Name):
            loops.append({"item": target.id, "over": it.id, "index": None, **_span(lines, it), "line": node.lineno})
        elif (
            isinstance(it, ast.Call)
            and isinstance(it.func, ast.Name)
            and it.func.id == "enumerate"
            and len(it.args) == 1
            and not it.keywords
            and isinstance(it.args[0], ast.Name)
            and isinstance(target, ast.Tuple)
            and len(target.elts) == 2
            and all(isinstance(t, ast.Name) for t in target.elts)
        ):
            index, item = target.elts
            over = it.args[0]
            loops.append({"item": item.id, "over": over.id, "index": index.id, **_span(lines, over), "line": node.lineno})
    return loops


_REPR = reprlib.Repr()
_REPR.maxlist = _REPR.maxtuple = _REPR.maxset = _REPR.maxdeque = 6
_REPR.maxdict = 4
_REPR.maxstring = _REPR.maxother = MAX_BRIEF


def _brief(value):
    """A recorded value: its repr (short) and, for a number, the number."""
    num = None
    if isinstance(value, int) and not isinstance(value, bool):
        num = value if abs(value) < 2**53 else None
    elif isinstance(value, float):
        num = value if math.isfinite(value) else None
    try:
        if num is not None:
            text = repr(value)
        elif isinstance(value, str):
            # Only the start of a long string is shown, so only that much is put into words.
            text = repr(value[: MAX_BRIEF + 1])
        else:
            text = _REPR.repr(value)
    except Exception:  # noqa: BLE001 - a user __repr__ may raise
        text = f"<{type(value).__name__}>"
    if len(text) > MAX_BRIEF:
        text = text[: MAX_BRIEF - 1] + "…"
    return [text, num]


def _serialize(value, depth=0, heap=None):
    if heap is not None and _is_node(value):
        return heap.ref(value)
    if value is None or isinstance(value, (bool, int, float, str)):
        if isinstance(value, float) and not math.isfinite(value):
            # JSON has no inf or nan (the browser can't parse them), so keep only the text.
            return {"type": "prim", "repr": repr(value)}
        return {"type": "prim", "repr": repr(value), "value": value}
    limit = MAX_TOP_ITEMS if depth == 0 else MAX_LIST_ITEMS
    if isinstance(value, (list, tuple, collections.deque)) and depth < MAX_DEPTH:
        if isinstance(value, collections.deque):
            value = list(value)
        return {
            "type": "list" if isinstance(value, list) else "tuple",
            "items": [_serialize(v, depth + 1, heap) for v in value[:limit]],
            "truncated": len(value) > limit,
        }
    if isinstance(value, (set, frozenset)) and depth < MAX_DEPTH:
        # Drawn as boxes like a list. A set has no order of its own, so sort it when its
        # items can be compared: the boxes then stay put when an item is added.
        items = list(value)
        try:
            items.sort()
        except Exception:  # noqa: BLE001 - mixed types, or a user class without <
            pass
        return {
            "type": "list",
            "set": True,
            "items": [_serialize(v, depth + 1, heap) for v in items[:limit]],
            "truncated": len(items) > limit,
        }
    if isinstance(value, dict) and depth < MAX_DEPTH:
        items = list(value.items())[:MAX_LIST_ITEMS]
        return {
            "type": "dict",
            "entries": [[_serialize(k, depth + 1, heap), _serialize(v, depth + 1, heap)] for k, v in items],
            "truncated": len(value) > MAX_LIST_ITEMS,
        }
    text = repr(value)
    return {"type": "other", "repr": text if len(text) <= 80 else text[:77] + "..."}


def _visible(name, value):
    if name.startswith("__"):
        return False
    if callable(value) or type(value).__name__ == "module":
        return False
    return True


def _call_desc(call):
    return f"{call['name']}({', '.join(repr(a) for a in call['args'])})"


def run_traced(source, max_steps=2000, call=None, node_io=None):
    """Trace `source`. If `call` is {"name": ..., "args": [...]}, also call that
    function after the module runs (LeetCode style) and trace its body.
    `node_io` says which arguments and answer are linked lists or trees (NodeIo in src/types.ts)."""
    try:
        tree = ast.parse(source, filename=USER_FILENAME)
    except SyntaxError as err:
        return json.dumps(
            {
                "ok": False,
                "error": {
                    "kind": "syntax",
                    "message": err.msg,
                    "line": err.lineno or 1,
                    "col": err.offset or 1,
                },
            }
        )

    pointers = _index_pointers(tree)
    cells = _cell_pointers(tree)
    heaps = _heap_names(tree)
    loops = _loop_plans(tree, source)
    indexer = _LoopIndexer()
    tree = indexer.visit(tree)
    pointers = indexer.pointers + pointers
    recorder = _Recorder(source)
    tree = ast.fix_missing_locations(recorder.visit(tree))
    code = compile(tree, USER_FILENAME, "exec")

    steps = []
    stdout = io.StringIO()
    # What the program wrote, in order: which stream, which line wrote it, and the
    # step it first shows on (the one after the line ran).
    console = []

    def write(stream, text):
        if stream == "stdout":
            stdout.write(text)
        line = _user_line()
        last = console[-1] if console else None
        if last and (last["stream"], last["line"], last["step"]) == (stream, line, len(steps)):
            last["text"] += text
        else:
            console.append({"stream": stream, "text": text, "line": line, "step": len(steps)})
    # Part values recorded per frame since its last step (see _Recorder).
    pending = {}
    # A number per running call, so recursive calls of one function keep their steps apart.
    frame_ids = {}
    next_frame = itertools.count(1)
    # Set while a recorded value is put into words, so a __repr__ of the user's
    # that it runs is neither traced nor recorded.
    describing = False

    def record(part_id, value, _getframe=sys._getframe):
        nonlocal describing
        if describing:
            return value
        describing = True
        try:
            pending.setdefault(_getframe(1), {})[part_id] = _brief(value)
        except Exception:  # noqa: BLE001 - recording must never break the user's code
            pass
        finally:
            describing = False
        return value

    def record_len(part_id, value, _getframe=sys._getframe):
        if not describing:
            try:
                n = len(value)
                pending.setdefault(_getframe(1), {})[part_id] = [str(n), n]
            except Exception:  # noqa: BLE001 - a generator has no length, and that's fine
                pass
        return value

    def record_bool(part_id, value, _getframe=sys._getframe):
        nonlocal describing
        if describing:
            return value
        describing = True
        try:
            pending.setdefault(_getframe(1), {})[part_id] = ["True" if value else "False", None]
        except Exception:  # noqa: BLE001
            pass
        finally:
            describing = False
        return value

    user_globals = {
        "__name__": "__main__",
        "__builtins__": __builtins__,
        RECORD_FN: record,
        RECORD_LEN: record_len,
        RECORD_BOOL: record_bool,
        **_NODE_CLASSES,
    }
    node_ids = {}
    # What a call just gave back, kept for the next step of the call it returned to.
    returns = {}
    # Calls an exception is leaving: they give nothing back.
    raising = set()

    def snapshot(frame, line):
        if len(steps) >= max_steps:
            raise StepLimitExceeded()
        scope = frame.f_locals
        variables = {}
        hidden = {}
        heap = _Heap(node_ids)
        for name, value in scope.items():
            if name.startswith(HIDDEN_PREFIX):
                hidden[name] = value
            elif _visible(name, value):
                variables[name] = _serialize(value, 0, heap)
        step = {
            "line": line,
            "func": frame.f_code.co_name,
            "frame": frame_ids.get(frame, 0),
            "vars": variables,
            "hidden": hidden,
            "stdout": stdout.getvalue(),
        }
        # What the frame's previous line computed on the way to this state.
        ran = pending.pop(frame, None)
        if ran:
            step["ran"] = ran
        back = returns.pop(frame, None)
        if back:
            step["returned"] = back
        # Nodes the calls further out hold (the whole tree while a recursive call looks at one
        # branch), so the drawing keeps its context; and the calls waiting on this one.
        outer = []
        stack = []
        caller = frame.f_back
        while caller is not None and caller.f_code.co_filename == USER_FILENAME:
            stack.append(site(caller, caller.f_lineno))
            if caller.f_code.co_name != "<module>":
                for name, value in caller.f_locals.items():
                    if _visible(name, value) and not name.startswith(HIDDEN_PREFIX):
                        _refs(_serialize(value, 0, heap), outer)
            caller = caller.f_back
        if stack:
            step["stack"] = [*stack[::-1], site(frame, line)]
        if heap.nodes:
            step["nodes"] = heap.nodes
            if outer:
                step["outer"] = list(dict.fromkeys(outer))
        steps.append(step)

    # Each call's arguments as they came in, e.g. `n=5, memo={}`.
    frame_args = {}

    def site(frame, line):
        out = {"func": frame.f_code.co_name, "line": line, "frame": frame_ids.get(frame, 0)}
        if frame in frame_args:
            out["args"] = frame_args[frame]
        return out

    def take_args(frame):
        nonlocal describing
        code = frame.f_code
        if code.co_name == "<module>":
            return
        count = code.co_argcount + code.co_kwonlyargcount + bool(code.co_flags & 0x04) + bool(code.co_flags & 0x08)
        names = code.co_varnames[:count]
        describing = True
        try:
            scope = frame.f_locals
            frame_args[frame] = ", ".join(f"{n}={_brief(scope[n])[0]}" for n in names if n in scope and n != "self")
        except Exception:  # noqa: BLE001
            pass
        finally:
            describing = False

    def give_back(frame, value):
        nonlocal describing
        describing = True
        try:
            returns[frame.f_back] = {"func": frame.f_code.co_name, "value": _brief(value)}
        except Exception:  # noqa: BLE001
            pass
        finally:
            describing = False

    def tracer(frame, event, arg):
        if frame.f_code.co_filename != USER_FILENAME or (event == "call" and describing):
            return None
        if event == "call":
            # A generator resuming after a yield carries on the same call.
            if frame not in frame_ids:
                frame_ids[frame] = next(next_frame)
                take_args(frame)
        elif event == "line":
            raising.discard(frame)  # an exception caught here: the call carries on
            snapshot(frame, frame.f_lineno)
        elif event == "exception":
            raising.add(frame)
        elif event == "return":
            if frame.f_back is None or frame.f_back.f_code.co_filename != USER_FILENAME:
                # Final state of the module, or of the problem's function when we call it.
                snapshot(frame, steps[-1]["line"] if steps else 1)
            elif frame not in raising and not frame.f_code.co_flags & _RESUMABLE:
                give_back(frame, arg)
            raising.discard(frame)
            pending.pop(frame, None)
            returns.pop(frame, None)
            if not frame.f_code.co_flags & _RESUMABLE:
                frame_ids.pop(frame, None)
                frame_args.pop(frame, None)
        return tracer

    error = None
    truncated = False
    result = None
    old_stdout, old_stderr = sys.stdout, sys.stderr
    sys.stdout = _ConsoleStream("stdout", write)
    sys.stderr = _ConsoleStream("stderr", write)
    sys.settrace(tracer)
    try:
        exec(code, user_globals)
        if call is not None:
            func = user_globals.get(call["name"])
            if not callable(func):
                raise NameError(f"define a function named {call['name']}")
            result = _serialize(_answer(func(*_call_args(call["args"], node_io, user_globals)), node_io))
    except StepLimitExceeded:
        truncated = True
    except Exception as exc:  # noqa: BLE001 - user code may raise anything
        tb = exc.__traceback__
        frames = []
        while tb is not None:
            if tb.tb_frame.f_code.co_filename == USER_FILENAME:
                frames.append({"line": tb.tb_lineno, "func": tb.tb_frame.f_code.co_name})
            tb = tb.tb_next
        error = {
            "kind": "runtime",
            "message": f"{type(exc).__name__}: {exc}",
            "line": frames[-1]["line"] if frames else None,
            "traceback": frames,
        }
    finally:
        sys.settrace(None)
        sys.stdout, sys.stderr = old_stdout, old_stderr
        # Logging handlers keep the stream they were given; drop ours so the
        # next run (Pyodide keeps the interpreter) doesn't log into a dead console.
        logging = sys.modules.get("logging")
        if logging is not None:
            loggers = [logging.root, *logging.Logger.manager.loggerDict.values()]
            for logger in loggers:
                for handler in getattr(logger, "handlers", [])[:]:
                    if isinstance(getattr(handler, "stream", None), _ConsoleStream):
                        logger.removeHandler(handler)

    return json.dumps(
        {
            "ok": True,
            "steps": steps,
            "pointers": pointers,
            "truncated": truncated,
            "error": error,
            "stdout": stdout.getvalue(),
            "console": console,
            "result": result,
            "call": _call_desc(call) if call is not None else None,
            "plans": recorder.plans,
            "loops": loops,
            "checks": recorder.checks,
            "blocks": recorder.blocks,
            "cells": cells,
            "heaps": heaps,
        }
    )


def _copy_args(args):
    return json.loads(json.dumps(args))


def run_tests(source, name, cases, max_seconds=2.0, node_io=None):
    """Run `name(*case["args"])` for each case without tracing.

    Returns JSON: [{"passed": bool, "got": repr | None, "error": str | None, "steps"?: int}].
    Answers are compared as sorted lists when `case["unordered"]` is set. A case with
    `maxSteps` counts the lines the learner's code runs and stops it as too slow past that.
    """
    import time

    results = []
    user_globals = {"__name__": "__main__", "__builtins__": __builtins__, **_NODE_CLASSES}
    old_stdout = sys.stdout
    sys.stdout = io.StringIO()
    try:
        try:
            exec(compile(source, USER_FILENAME, "exec"), user_globals)
        except Exception as exc:  # noqa: BLE001
            return json.dumps([{"passed": False, "got": None, "error": f"{type(exc).__name__}: {exc}"}] * len(cases))
        func = user_globals.get(name)
        for case in cases:
            if not callable(func):
                results.append({"passed": False, "got": None, "error": f"define a function named {name}"})
                continue
            deadline = time.monotonic() + max_seconds
            limit = case.get("maxSteps")
            steps = 0

            def guard(frame, event, arg):
                nonlocal steps
                if event == "line":
                    steps += 1
                    if limit is not None and steps > limit:
                        raise _TooSlow()
                if time.monotonic() > deadline:
                    # On a speed test, running out of time is being too slow too.
                    raise _TooSlow() if limit is not None else TimeoutError("took too long")
                return guard if frame.f_code.co_filename == USER_FILENAME else None

            counted = {"steps": steps} if limit is not None else {}
            try:
                call_args = _call_args(case["args"], node_io, user_globals)
                sys.settrace(guard)
                got = func(*call_args)
                sys.settrace(None)
                got = _answer(got, node_io)
                expected = case["expected"]
                if case.get("unordered") and isinstance(got, (list, tuple)):
                    passed = sorted(got) == sorted(expected)
                else:
                    passed = (list(got) if isinstance(got, tuple) else got) == expected
                if limit is not None:
                    counted["steps"] = steps
                results.append({"passed": passed, "got": repr(got), "error": None, **counted})
            except _TooSlow:
                sys.settrace(None)
                over = steps > limit
                why = f"still running after {limit:,} steps" if over else f"ran out of time after {steps:,} steps"
                results.append({"passed": False, "got": None, "error": f"too slow: {why}", "steps": steps})
            except Exception as exc:  # noqa: BLE001
                sys.settrace(None)
                if limit is not None:
                    counted["steps"] = steps
                results.append({"passed": False, "got": None, "error": f"{type(exc).__name__}: {exc}", **counted})
    finally:
        sys.settrace(None)
        sys.stdout = old_stdout
    return json.dumps(results)
