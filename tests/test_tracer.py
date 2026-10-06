import io
import json
import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src", "python"))

from tracer import run_traced  # noqa: E402


def run(source, **kwargs):
    return json.loads(run_traced(source, **kwargs))


class TracerTest(unittest.TestCase):
    def test_for_loop_over_list_points_at_each_box(self):
        result = run("nums = [3, 1, 3]\nfor n in nums:\n    print(n)\n")
        self.assertTrue(result["ok"])
        self.assertIsNone(result["error"])
        [pointer] = result["pointers"]
        self.assertEqual(pointer["label"], "n")
        self.assertEqual(pointer["target"], "nums")
        body_steps = [s for s in result["steps"] if s["line"] == 3]
        self.assertEqual([s["hidden"][pointer["var"]] for s in body_steps], [0, 1, 2])
        self.assertEqual(result["stdout"], "3\n1\n3\n")
        self.assertNotIn(pointer["var"], body_steps[0]["vars"])

    def test_index_pointers_for_range_len_and_subscript(self):
        src = "a = [1, 2, 3]\nl, r = 0, len(a) - 1\nwhile l < r:\n    a[l], a[r] = a[r], a[l]\n    l += 1\n    r -= 1\nfor i in range(len(a)):\n    pass\n"
        result = run(src)
        labels = {(p["label"], p["target"]) for p in result["pointers"]}
        self.assertEqual(labels, {("i", "a"), ("l", "a"), ("r", "a")})
        last = result["steps"][-1]["vars"]["a"]
        self.assertEqual([item["value"] for item in last["items"]], [3, 2, 1])

    def test_syntax_error_reports_line(self):
        result = run("for x in [1, 2]\n    print(x)\n")
        self.assertFalse(result["ok"])
        self.assertEqual(result["error"]["kind"], "syntax")
        self.assertEqual(result["error"]["line"], 1)

    def test_runtime_error_keeps_steps(self):
        result = run("xs = [1]\ny = xs[5]\n")
        self.assertTrue(result["ok"])
        self.assertEqual(result["error"]["line"], 2)
        self.assertIn("IndexError", result["error"]["message"])
        self.assertGreater(len(result["steps"]), 0)

    def test_console_notes_the_line_and_step_of_each_print(self):
        src = "def show(x):\n    print('x is', x)\n\nfor n in [1, 2]:\n    show(n)\nprint('done', end='')\n"
        result = run(src)
        console = result["console"]
        self.assertEqual([(c["text"], c["line"], c["stream"]) for c in console], [
            ("x is 1\n", 2, "stdout"),
            ("x is 2\n", 2, "stdout"),
            ("done", 6, "stdout"),
        ])
        steps = result["steps"]
        for entry in console:
            # It shows on the step after its line ran, which already has it in stdout.
            self.assertEqual(steps[entry["step"] - 1]["line"], entry["line"])
            self.assertTrue(steps[entry["step"]]["stdout"].endswith(entry["text"]))

    def test_console_catches_stderr_and_logging(self):
        src = "import sys, logging\nprint('oops', file=sys.stderr)\nlogging.basicConfig(format='%(levelname)s %(message)s')\nlogging.warning('careful')\n"
        result = run(src)
        self.assertEqual([(c["stream"], c["text"], c["line"]) for c in result["console"]], [
            ("stderr", "oops\n", 2),
            ("stderr", "WARNING careful\n", 4),
        ])
        self.assertEqual(result["stdout"], "")
        # The next run starts with a fresh console rather than the old one.
        again = run("import logging\nlogging.warning('again')\n")
        self.assertEqual([c["text"] for c in again["console"]], ["WARNING:root:again\n"])

    def test_runtime_error_has_a_traceback_of_user_frames(self):
        src = "def inner(xs):\n    return xs[3]\n\ndef outer():\n    return inner([1])\n\nprint('start')\nouter()\n"
        result = run(src)
        error = result["error"]
        self.assertEqual(error["traceback"], [
            {"line": 8, "func": "<module>"},
            {"line": 5, "func": "outer"},
            {"line": 2, "func": "inner"},
        ])
        self.assertEqual(error["line"], 2)
        self.assertEqual(result["console"][0]["text"], "start\n")

    def test_infinite_loop_is_cut_off(self):
        result = run("i = 0\nwhile True:\n    i += 1\n", max_steps=100)
        self.assertTrue(result["truncated"])
        self.assertEqual(len(result["steps"]), 100)

    def test_function_frames_are_traced(self):
        src = "def total(xs):\n    s = 0\n    for x in xs:\n        s += x\n    return s\n\nprint(total([1, 2]))\n"
        result = run(src)
        funcs = {s["func"] for s in result["steps"]}
        self.assertIn("total", funcs)
        self.assertEqual(result["stdout"], "3\n")
        self.assertNotIn("total", result["steps"][-1]["vars"])


if __name__ == "__main__":
    unittest.main()


TWO_SUM = """def twoSum(nums, target):
    seen = {}
    for i, num in enumerate(nums):
        if target - num in seen:
            return [seen[target - num], i]
        seen[num] = i
"""


class ProblemTest(unittest.TestCase):
    def test_traces_called_function(self):
        result = run(TWO_SUM, call={"name": "twoSum", "args": [[2, 7, 11, 15], 9]})
        self.assertIsNone(result["error"])
        self.assertEqual(result["call"], "twoSum([2, 7, 11, 15], 9)")
        self.assertEqual([x["value"] for x in result["result"]["items"]], [0, 1])
        self.assertIn(("i", "nums"), {(p["label"], p["target"]) for p in result["pointers"]})
        last = result["steps"][-1]
        self.assertEqual(last["func"], "twoSum")
        self.assertEqual(last["vars"]["seen"]["type"], "dict")

    def test_missing_function_is_reported(self):
        result = run("x = 1\n", call={"name": "twoSum", "args": [[1], 1]})
        self.assertIn("twoSum", result["error"]["message"])

    def test_run_tests(self):
        from tracer import run_tests

        cases = [
            {"args": [[2, 7, 11, 15], 9], "expected": [0, 1], "unordered": True},
            {"args": [[3, 2, 4], 6], "expected": [1, 2], "unordered": True},
            {"args": [[3, 3], 6], "expected": [0, 1], "unordered": True},
        ]
        self.assertTrue(all(r["passed"] for r in json.loads(run_tests(TWO_SUM, "twoSum", cases))))
        wrong = json.loads(run_tests("def twoSum(nums, target):\n    return [0, 0]\n", "twoSum", cases))
        self.assertEqual([r["passed"] for r in wrong], [False, False, False])
        slow = json.loads(run_tests("def twoSum(nums, target):\n    while True:\n        pass\n", "twoSum", cases[:1], max_seconds=0.2))
        self.assertIn("too long", slow[0]["error"])


def strict_json(text):
    """Parse like the browser does: no Infinity or NaN."""

    def reject(token):
        raise ValueError(f"not valid JSON in a browser: {token}")

    return json.loads(text, parse_constant=reject)


def after_line(result, line):
    """Steps whose previous step in the same call was on `line`."""
    steps = result["steps"]
    out = []
    for i, step in enumerate(steps):
        prev = next((s for s in reversed(steps[:i]) if s["frame"] == step["frame"]), None)
        if prev is not None and prev["line"] == line:
            out.append(step)
    return out


class RecordTest(unittest.TestCase):
    def test_records_each_part_of_an_assignment(self):
        src = 'nums = [4, 8]\nages = {"test": 12}\ntotal = 0\nfor n in nums:\n    total += n + ages["test"]\n'
        result = run(src)
        [plan] = [p for p in result["plans"] if p["line"] == 5]
        self.assertEqual(plan["op"], "+")
        self.assertEqual(plan["targets"], [{"kind": "name", "name": "total"}])
        value = plan["value"]
        self.assertEqual((value["kind"], value["op"], value["text"]), ("bin", "+", 'n + ages["test"]'))
        n, ages = value["left"], value["right"]
        self.assertEqual((n["kind"], n["name"], n["start"], n["end"]), ("name", "n", 14, 15))
        self.assertEqual((ages["kind"], ages["name"], ages["text"]), ("sub", "ages", 'ages["test"]'))
        self.assertEqual(ages["key"]["value"], ["'test'", None])
        first, second = after_line(result, 5)
        ran = lambda step, part: step["ran"][str(part["id"])]  # noqa: E731
        self.assertEqual([ran(first, n), ran(first, ages), ran(first, value)], [["4", 4], ["12", 12], ["16", 16]])
        self.assertEqual(ran(second, n), ["8", 8])
        self.assertNotIn("_ct_rec", result["steps"][-1]["vars"])

    def test_recording_keeps_what_the_code_does(self):
        src = """
calls = []
def key():
    calls.append(1)
    return 'k'
def boom():
    raise ValueError('should not run')
xs = [1, 2, 3, 4]
d = {'k': 1}
d[key()] += 10
a = xs[0] or boom()
ys = xs[1:3]
zs = [*xs, 9]
ok = 1 < xs[1] < 5
w = (v := 3) + 1
sq = [k * k for k in xs]
inc = lambda q: q + 1
first, *rest = xs
t: int = inc(5)
s = f"{a}!"
xs.append(t)
got = d.get('k', 0) + d.get('missing', 7)
def gen():
    y = yield 1
    yield y * 2
g = gen()
nxt = next(g)
again = g.send(5)
class Box:
    size = len(xs) * 2
big = Box.size
print(a, ys, zs, ok, w, sq, first, rest, t, s, got, nxt, again, big, len(calls))
"""
        plain = io.StringIO()
        old = sys.stdout
        sys.stdout = plain
        try:
            exec(compile(src, "<plain>", "exec"), {})
        finally:
            sys.stdout = old
        result = run(src)
        self.assertIsNone(result["error"])
        self.assertEqual(result["stdout"], plain.getvalue())
        self.assertIn(" 1\n", result["stdout"])  # key() ran once for `d[key()] += 10`

    def test_errors_still_point_at_the_line(self):
        result = run('ages = {"a": 1}\ntotal = 0\ntotal += ages["b"]\n')
        self.assertEqual(result["error"]["line"], 3)
        self.assertIn("KeyError", result["error"]["message"])

    def test_each_frame_keeps_its_own_values(self):
        src = "def fact(n):\n    r = 1 if n <= 1 else n * fact(n - 1)\n    return r\n\nfact(3)\n"
        result = run(src)
        [plan] = [p for p in result["plans"] if p["line"] == 2]
        root = str(plan["value"]["id"])
        # Inner calls finish first: 1, then 2 * 1, then 3 * 2.
        self.assertEqual([s["ran"][root][1] for s in after_line(result, 2)], [1, 2, 6])

    def test_a_generator_stays_one_call_across_yields(self):
        src = "def running(xs):\n    total = 0\n    for x in xs:\n        total += x\n        yield total\n\nout = list(running([1, 2]))\n"
        result = run(src)
        self.assertEqual(len({s["frame"] for s in result["steps"] if s["func"] == "running"}), 1)
        # Each resume picks up from the step before its yield.
        self.assertEqual([s["line"] for s in after_line(result, 5)], [3, 3])

    def test_describing_a_value_does_not_trace_the_users_repr(self):
        src = 'class Node:\n    def __repr__(self):\n        return "Node"\n\na = Node()\nb = a\n'
        result = run(src)
        self.assertNotIn("__repr__", {s["func"] for s in result["steps"]})
        [plan] = [p for p in result["plans"] if p["line"] == 6]
        self.assertEqual(after_line(result, 6)[0]["ran"][str(plan["value"]["id"])], ["Node", None])

    def test_loops_say_which_list_they_walk(self):
        result = run("nums = [5]\nfor n in nums:\n    pass\nfor i, m in enumerate(nums):\n    pass\n")
        self.assertEqual(
            result["loops"],
            [
                {"item": "n", "over": "nums", "index": None, "start": 10, "end": 14, "line": 2},
                {"item": "m", "over": "nums", "index": "i", "start": 23, "end": 27, "line": 4},
            ],
        )

    def test_method_calls_and_dict_get_are_recorded(self):
        result = run("stack = []\nn = 4\nstack.append(n)\ncounts = {}\ncounts['a'] = counts.get('a', 0) + 1\n")
        append = next(p for p in result["plans"] if p["line"] == 3)
        self.assertEqual((append["op"], append["targets"]), ("call", [{"kind": "name", "name": "stack"}]))
        self.assertEqual(append["value"]["parts"][0]["name"], "n")
        get = next(p for p in result["plans"] if p["line"] == 5)["value"]["left"]
        self.assertEqual((get["kind"], get["name"], get["key"]["value"]), ("sub", "counts", ["'a'", None]))

    def test_infinity_and_nan_stay_valid_json(self):
        out = run_traced("best = float('inf')\nworst = -best\nnan = best - best\nbest += 1\n")
        result = strict_json(out)
        self.assertIsNone(result["error"])
        last = result["steps"][-1]["vars"]
        self.assertEqual([last[k]["repr"] for k in ("best", "worst", "nan")], ["inf", "-inf", "nan"])
