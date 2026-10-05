"""Run user code under sys.settrace and record a snapshot of variables per line.

Loaded into Pyodide by the worker, and importable by plain CPython for tests.
Entry point: run_traced(source) -> JSON string (see TraceResult in src/types.ts).
"""

import ast
import io
import json
import sys

USER_FILENAME = "<user>"
HIDDEN_PREFIX = "_ct_idx_"
MAX_LIST_ITEMS = 64
MAX_DEPTH = 3


class StepLimitExceeded(Exception):
    pass


class _LoopIndexer(ast.NodeTransformer):
    """Rewrite `for v in xs:` to `for _ct_idx_N, v in enumerate(xs):`.

    The hidden counter lets the visualizer know which box `v` points at even
    when the list holds duplicate values. Only loops over a plain name are
    rewritten, so we always know which list the pointer belongs to.
    """

    def __init__(self):
        self.pointers = []

    def visit_For(self, node):
        self.generic_visit(node)
        if isinstance(node.target, ast.Name) and isinstance(node.iter, ast.Name):
            hidden = f"{HIDDEN_PREFIX}{node.lineno}_{node.col_offset}"
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


def _serialize(value, depth=0):
    if value is None or isinstance(value, (bool, int, float, str)):
        if isinstance(value, float) and value != value:
            return {"type": "prim", "repr": "nan"}
        return {"type": "prim", "repr": repr(value), "value": value}
    if isinstance(value, (list, tuple)) and depth < MAX_DEPTH:
        return {
            "type": "list" if isinstance(value, list) else "tuple",
            "items": [_serialize(v, depth + 1) for v in value[:MAX_LIST_ITEMS]],
            "truncated": len(value) > MAX_LIST_ITEMS,
        }
    if isinstance(value, dict) and depth < MAX_DEPTH:
        items = list(value.items())[:MAX_LIST_ITEMS]
        return {
            "type": "dict",
            "entries": [[_serialize(k, depth + 1), _serialize(v, depth + 1)] for k, v in items],
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


def run_traced(source, max_steps=2000, call=None):
    """Trace `source`. If `call` is {"name": ..., "args": [...]}, also call that
    function after the module runs (LeetCode style) and trace its body."""
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
    indexer = _LoopIndexer()
    tree = ast.fix_missing_locations(indexer.visit(tree))
    pointers = indexer.pointers + pointers
    code = compile(tree, USER_FILENAME, "exec")

    steps = []
    stdout = io.StringIO()
    user_globals = {"__name__": "__main__", "__builtins__": __builtins__}

    def snapshot(frame, line):
        if len(steps) >= max_steps:
            raise StepLimitExceeded()
        scope = frame.f_locals
        variables = {}
        hidden = {}
        for name, value in scope.items():
            if name.startswith(HIDDEN_PREFIX):
                hidden[name] = value
            elif _visible(name, value):
                variables[name] = _serialize(value)
        steps.append(
            {
                "line": line,
                "func": frame.f_code.co_name,
                "vars": variables,
                "hidden": hidden,
                "stdout": stdout.getvalue(),
            }
        )

    def tracer(frame, event, arg):
        if frame.f_code.co_filename != USER_FILENAME:
            return None
        if event == "line":
            snapshot(frame, frame.f_lineno)
        elif event == "return" and (
            frame.f_back is None or frame.f_back.f_code.co_filename != USER_FILENAME
        ):
            # Final state of the module, or of the problem's function when we call it.
            snapshot(frame, steps[-1]["line"] if steps else 1)
        return tracer

    error = None
    truncated = False
    result = None
    old_stdout = sys.stdout
    sys.stdout = stdout
    sys.settrace(tracer)
    try:
        exec(code, user_globals)
        if call is not None:
            func = user_globals.get(call["name"])
            if not callable(func):
                raise NameError(f"define a function named {call['name']}")
            result = _serialize(func(*_copy_args(call["args"])))
    except StepLimitExceeded:
        truncated = True
    except Exception as exc:  # noqa: BLE001 - user code may raise anything
        tb = exc.__traceback__
        line = None
        while tb is not None:
            if tb.tb_frame.f_code.co_filename == USER_FILENAME:
                line = tb.tb_lineno
            tb = tb.tb_next
        error = {"kind": "runtime", "message": f"{type(exc).__name__}: {exc}", "line": line}
    finally:
        sys.settrace(None)
        sys.stdout = old_stdout

    return json.dumps(
        {
            "ok": True,
            "steps": steps,
            "pointers": pointers,
            "truncated": truncated,
            "error": error,
            "stdout": stdout.getvalue(),
            "result": result,
            "call": _call_desc(call) if call is not None else None,
        }
    )


def _copy_args(args):
    return json.loads(json.dumps(args))


def run_tests(source, name, cases, max_seconds=2.0):
    """Run `name(*case["args"])` for each case without tracing.

    Returns JSON: [{"passed": bool, "got": repr | None, "error": str | None}].
    Answers are compared as sorted lists when `case["unordered"]` is set.
    """
    import time

    results = []
    user_globals = {"__name__": "__main__", "__builtins__": __builtins__}
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

            def guard(frame, event, arg):
                if time.monotonic() > deadline:
                    raise TimeoutError("took too long")
                return guard if frame.f_code.co_filename == USER_FILENAME else None

            sys.settrace(guard)
            try:
                got = func(*_copy_args(case["args"]))
                sys.settrace(None)
                expected = case["expected"]
                if case.get("unordered") and isinstance(got, (list, tuple)):
                    passed = sorted(got) == sorted(expected)
                else:
                    passed = (list(got) if isinstance(got, tuple) else got) == expected
                results.append({"passed": passed, "got": repr(got), "error": None})
            except Exception as exc:  # noqa: BLE001
                sys.settrace(None)
                results.append({"passed": False, "got": None, "error": f"{type(exc).__name__}: {exc}"})
    finally:
        sys.settrace(None)
        sys.stdout = old_stdout
    return json.dumps(results)
