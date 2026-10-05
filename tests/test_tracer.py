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
