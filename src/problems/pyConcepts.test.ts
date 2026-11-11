import { spawnSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'
import type { TestResult, TraceResult } from '../types'
import { JS_CONCEPTS } from './concepts'
import { PROBLEMS, CONCEPT_GROUPS } from './problems'
import { PY_CONCEPTS } from './pyConcepts'

// The Python concept problems run in CPython with the same tracer.py the browser loads into Pyodide.

type Job = { trace: string } | { code: string; name: string; cases: unknown[] }

const RUNNER = `
import json, sys
sys.path.insert(0, "src/python")
from tracer import run_tests, run_traced
out = []
for job in json.load(sys.stdin):
    if "trace" in job:
        out.append(json.loads(run_traced(job["trace"])))
    else:
        out.append(json.loads(run_tests(job["code"], job["name"], job["cases"], max_seconds=20)))
print(json.dumps(out))
`

function runPython<T>(jobs: Job[]): T[] {
  const done = spawnSync('python3', ['-c', RUNNER], { input: JSON.stringify(jobs), encoding: 'utf8', maxBuffer: 1 << 28 })
  if (done.status !== 0) throw new Error(done.stderr)
  return JSON.parse(done.stdout)
}

const builds = PY_CONCEPTS.filter((p) => p.kind === 'build')
const predicts = PY_CONCEPTS.filter((p) => p.kind === 'predict')
const failing = (results: TestResult[]) => results.flatMap((r, i) => (r.passed ? [] : [`${i + 1}: ${r.error ?? `got ${r.got}`}`]))

describe('Python concept problems', () => {
  it('have ids of their own, a section, hints, and tests or an explanation', () => {
    const ids = [...PROBLEMS, ...JS_CONCEPTS, ...PY_CONCEPTS].map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
    const groups = new Set(CONCEPT_GROUPS.map((g) => g.id))
    for (const p of PY_CONCEPTS) {
      expect(p.track, p.id).toBe('py-concepts')
      expect(groups.has(p.group!), p.id).toBe(true)
      expect(p.hints.length, p.id).toBeGreaterThan(0)
      if (p.kind === 'build') {
        expect(p.tests.length, p.id).toBeGreaterThan(0)
        expect(p.tests.every((t) => t.run && t.name), p.id).toBe(true)
        expect(p.starters.python, p.id).toMatch(new RegExp(`(def|class) ${p.functionName}\\b`))
      } else {
        expect(p.explain?.length, p.id).toBeGreaterThan(0)
      }
    }
  })

  it('have starters that run without an error', () => {
    const runs = runPython<TraceResult>(PY_CONCEPTS.map((p) => ({ trace: p.starters.python })))
    runs.forEach((run, i) => {
      const id = PY_CONCEPTS[i].id
      expect(run.ok && run.error, id).toBe(null)
      expect(run.ok && run.truncated, id).toBe(false)
    })
  })

  it('fail their tests until solved, and pass once solved', () => {
    const before = runPython<TestResult[]>(builds.map((p) => ({ code: p.starters.python, name: p.functionName, cases: p.tests })))
    const after = runPython<TestResult[]>(builds.map((p) => ({ code: SOLUTIONS[p.id], name: p.functionName, cases: p.tests })))
    builds.forEach((p, i) => {
      expect(SOLUTIONS[p.id], p.id).toBeDefined()
      expect(before[i].some((r) => !r.passed), p.id).toBe(true)
      expect(failing(after[i]), p.id).toEqual([])
    })
  })

  it('print what the predict explanations say', () => {
    const runs = runPython<TraceResult>(predicts.map((p) => ({ trace: p.starters.python })))
    runs.forEach((run, i) => {
      if (!run.ok) throw new Error(predicts[i].id)
      expect(run.stdout, predicts[i].id).toBe(OUTPUTS[predicts[i].id])
    })
  })

  it('show closures and shared lists in the trace', () => {
    const [counter, grid] = runPython<TraceResult>([
      { trace: SOLUTIONS['py-counter'] + 'c = make_counter()\nc()\n' },
      { trace: PY_CONCEPTS.find((p) => p.id === 'py-grid-trap')!.starters.python },
    ])
    if (!counter.ok || !grid.ok) throw new Error('did not run')
    // Inside increment, count is the remembered variable; outside, c is a closure that carries it.
    expect(counter.steps.some((s) => s.func === 'increment' && s.captured?.includes('count'))).toBe(true)
    const last = counter.steps[counter.steps.length - 1].vars.c
    expect(last).toMatchObject({ type: 'other', repr: '<function increment>', captured: { count: { value: 1 } } })
    // [row] * 3 holds one list three times: the same id as row.
    const vars = grid.steps[grid.steps.length - 1].vars
    const rows = vars.grid.type === 'list' ? vars.grid.items.map((r) => (r.type === 'list' ? r.id : null)) : []
    const row = vars.row.type === 'list' ? vars.row.id : undefined
    expect(row).toBeDefined()
    expect(rows).toEqual([row, row, row])
  })
})

const OUTPUTS: Record<string, string> = {
  'py-mutable-default': "['apple', 'pear']\n['apple', 'pear']\nTrue\n['apple'] ['pear']\n",
  'py-why-both-changed': "[1, 2, 3, 4]\n[1, 2, 3, 4, 5]\nAda ['math', 'code']\nTrue True False\n",
  'py-grid-trap': '[[1, 0, 0], [1, 0, 0], [1, 0, 0]]\n[[1, 0, 0], [0, 0, 0], [0, 0, 0]]\n[1, 0, 0]\n',
  'py-slicing': 'yth on nohtyp\n[0, 2, 4] [4, 5] []\n[3, 4] [0, 1, 4, 5]\n',
  'py-late-binding': '[2, 2, 2]\n[0, 1, 2]\n[10, 11, 12]\n',
  'py-scope': 'global local global\nchanged\n2\n',
  'py-args-kwargs': "1 2 () 3 {}\n1 5 (6, 7) 3 {}\n1 2 () 9 {'d': 4}\n10 20 () 30 {'e': 50}\n",
  'py-generator-order': 'made gen\nstart\n1\nafter 1\n2\nstart\ngot 1\nafter 1\ngot 2\nend\n',
  'py-itertools':
    "[('a', 'b'), ('a', 'c'), ('b', 'c')]\n[(1, 2), (1, 3), (2, 1)]\n[('a', 0), ('a', 1), ('b', 0), ('b', 1)]\n[1, 3, 6, 10]\n[1, 2, 'a', 'b']\n[('a', 3), ('b', 1), ('c', 2), ('a', 2)]\n",
  'py-sorting':
    "None [1, 2, 3]\n['Cherry', 'apple', 'banana']\n['apple', 'banana', 'Cherry']\n['banana', 'Cherry', 'apple']\n[('Alan', 41), ('Ada', 36), ('Grace', 36)]\n",
}

// One worked answer per build problem, to check the tests agree with the statement.
const SOLUTIONS: Record<string, string> = {
  'py-counter': `def make_counter():
    count = 0
    def increment():
        nonlocal count
        count += 1
        return count
    return increment
`,
  'py-memoize': `def memoize(fn):
    cache = {}
    def wrapper(*args):
        if args in cache:
            return cache[args]
        answer = fn(*args)
        cache[args] = answer
        return answer
    return wrapper
`,
  'py-count-calls': `from functools import wraps

def count_calls(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        wrapper.calls += 1
        return fn(*args, **kwargs)
    wrapper.calls = 0
    return wrapper
`,
  'py-repeat': `def repeat(times):
    def decorator(fn):
        def wrapper(*args, **kwargs):
            return [fn(*args, **kwargs) for _ in range(times)]
        return wrapper
    return decorator
`,
  'py-map-filter': `def my_map(fn, items):
    return [fn(item) for item in items]

def my_filter(fn, items):
    if fn is None:
        return [item for item in items if item]
    return [item for item in items if fn(item)]
`,
  'py-zip-enumerate': `def my_enumerate(items, start=0):
    i = start
    for item in items:
        yield i, item
        i += 1

def my_zip(*iterables):
    if not iterables:
        return
    its = [iter(x) for x in iterables]
    while True:
        row = []
        for it in its:
            try:
                row.append(next(it))
            except StopIteration:
                return
        yield tuple(row)
`,
  'py-reduce': `_MISSING = object()

def my_reduce(fn, items, initial=_MISSING):
    it = iter(items)
    if initial is _MISSING:
        try:
            result = next(it)
        except StopIteration:
            raise TypeError("my_reduce() of empty iterable with no initial value") from None
    else:
        result = initial
    for item in it:
        result = fn(result, item)
    return result
`,
  'py-flatten': `def flatten(nested):
    for item in nested:
        if isinstance(item, (list, tuple)):
            yield from flatten(item)
        else:
            yield item
`,
  'py-deep-copy': `def deep_copy(value):
    if isinstance(value, list):
        return [deep_copy(x) for x in value]
    if isinstance(value, dict):
        return {k: deep_copy(v) for k, v in value.items()}
    if isinstance(value, tuple):
        return tuple(deep_copy(x) for x in value)
    if isinstance(value, set):
        return {deep_copy(x) for x in value}
    return value
`,
  'py-range': `def my_range(start, stop=None, step=1):
    if stop is None:
        start, stop = 0, start
    if step == 0:
        raise ValueError("step must not be zero")
    i = start
    while (step > 0 and i < stop) or (step < 0 and i > stop):
        yield i
        i += step
`,
  'py-chunks': `def chunks(items, size):
    batch = []
    for item in items:
        batch.append(item)
        if len(batch) == size:
            yield batch
            batch = []
    if batch:
        yield batch
`,
  'py-countdown': `class Countdown:
    def __init__(self, n):
        self.current = n

    def __iter__(self):
        return self

    def __next__(self):
        if self.current <= 0:
            raise StopIteration
        value = self.current
        self.current -= 1
        return value
`,
  'py-comprehensions': `def squares_of_evens(nums):
    return [n * n for n in nums if n % 2 == 0]

def invert(d):
    return {v: k for k, v in d.items()}

def transpose(matrix):
    return [list(col) for col in zip(*matrix)]
`,
  'py-top-words': `from collections import Counter

def top_words(text, k):
    counts = Counter(text.lower().split())
    return sorted(counts, key=lambda w: (-counts[w], w))[:k]
`,
  'py-group-by': `from collections import defaultdict

def group_by(items, key):
    groups = defaultdict(list)
    for item in items:
        groups[key(item)].append(item)
    return groups
`,
  'py-moving-average': `from collections import deque

def moving_averages(nums, k):
    window = deque()
    total = 0
    out = []
    for n in nums:
        window.append(n)
        total += n
        if len(window) > k:
            total -= window.popleft()
        if len(window) == k:
            out.append(total / k)
    return out
`,
  'py-task-queue': `import heapq

def by_priority(tasks):
    heap = []
    for order, task in enumerate(tasks):
        heapq.heappush(heap, (task["priority"], order, task))
    return [heapq.heappop(heap)[2]["name"] for _ in range(len(heap))]
`,
  'py-vector': `class Vector:
    def __init__(self, x, y):
        self.x = x
        self.y = y

    def __add__(self, other):
        return Vector(self.x + other.x, self.y + other.y)

    def __mul__(self, k):
        return Vector(self.x * k, self.y * k)

    def __eq__(self, other):
        return self.x == other.x and self.y == other.y

    def __repr__(self):
        return f"Vector({self.x}, {self.y})"
`,
  'py-lru-cache': `class LRUCache:
    def __init__(self, capacity):
        self.capacity = capacity
        self.data = {}

    def get(self, key):
        if key not in self.data:
            return -1
        value = self.data.pop(key)
        self.data[key] = value
        return value

    def put(self, key, value):
        self.data.pop(key, None)
        self.data[key] = value
        if len(self.data) > self.capacity:
            del self.data[next(iter(self.data))]
`,
}
