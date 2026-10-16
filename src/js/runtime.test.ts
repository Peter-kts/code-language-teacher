import { describe, expect, it } from 'vitest'
import { runTests, runTraced } from './runtime'
import { containerChanges, newVars, previousInFrame, scalarChanges, stepRoles } from '../viz/changes'
import { placePointers } from '../viz/pointers'
import { formatValue, typeLabel } from '../viz/format'
import type { Step, TraceResult } from '../types'

type Good = Extract<TraceResult, { ok: true }>

function trace(code: string, call: { name: string; args: unknown[] } | null = null): Good {
  const result = runTraced(code, call)
  if (!result.ok) throw new Error(result.error.message)
  return result
}

/** Each step as `line: name=value ...`, for reading a whole run at a glance. */
const lines = (steps: Step[]) =>
  steps.map((s) => `${s.line}: ${Object.entries(s.vars).map(([k, v]) => `${k}=${formatValue(v)}`).join(' ')}`.trim())

describe('runTraced', () => {
  it('steps before each line, and on the loop line between passes, like the Python tracer', () => {
    const t = trace(`const nums = [4, 8]
let total = 0
for (const n of nums) {
  total += n
}
console.log(total)
`)
    expect(lines(t.steps)).toEqual([
      '1:',
      '2: nums=[4, 8]',
      '3: nums=[4, 8] total=0',
      '4: nums=[4, 8] total=0 n=4',
      '3: nums=[4, 8] total=4 n=4',
      '4: nums=[4, 8] total=4 n=8',
      '3: nums=[4, 8] total=12 n=8',
      '6: nums=[4, 8] total=12',
      // The final state, after the last line ran.
      '6: nums=[4, 8] total=12',
    ])
    expect(t.console).toEqual([{ stream: 'stdout', text: '12\n', line: 6, step: 8 }])
    // The arrow under nums follows n with a hidden counter.
    expect(t.pointers).toEqual([{ label: 'n', var: '_ct_idx_3_0', target: 'nums' }])
    expect(t.steps[5].hidden).toEqual({ _ct_idx_3_0: 1 })
    expect(t.loops).toEqual([{ item: 'n', over: 'nums', index: null, line: 3, start: 17, end: 21 }])
  })

  it('records what an assignment was made of, so the visualizer can break it down', () => {
    const t = trace(`const ages = { test: 12 }
let n = 4
let total = 0
total += n + ages["test"]
`)
    const i = t.steps.findIndex((_, j) => j > 0 && t.steps[j - 1].line === 4)
    const prev = previousInFrame(t.steps, i)
    expect(scalarChanges(t.steps[i], prev, t).total.deltas).toEqual([
      {
        text: '+16',
        from: null,
        sum: [
          { sign: 1, value: '4', label: 'n' },
          { sign: 1, value: '12', label: 'ages["test"]' },
        ],
      },
    ])
    expect(stepRoles(t.steps[i], prev, t).reads).toContainEqual(
      expect.objectContaining({ name: 'ages', item: '"test"', gave: [{ value: '12', to: 'total' }] }),
    )
  })

  it('credits a for loop counter to the loop line, as +1', () => {
    const t = trace(`const xs = [5, 6]
for (let i = 0; i < xs.length; i++) {
  const x = xs[i]
}
`)
    expect(t.pointers).toEqual([{ label: 'i', var: 'i', target: 'xs' }])
    // The step after the loop line's update shows i one higher.
    const i = t.steps.findIndex((s, j) => j > 0 && t.steps[j - 1].line === 2 && s.vars.i && t.steps[j - 1].vars.i)
    expect(scalarChanges(t.steps[i], previousInFrame(t.steps, i), t).i.deltas).toEqual([{ text: '+1', from: null }])
  })

  it('keeps calls apart, and calls the problem function with copies of its arguments', () => {
    const t = trace(
      `function fib(n) {
  if (n < 2) return n
  return fib(n - 1) + fib(n - 2)
}`,
      { name: 'fib', args: [3] },
    )
    expect(t.call).toBe('fib(3)')
    expect(t.result).toEqual({ type: 'prim', repr: '2', value: 2, t: 'number' })
    // A function declaration does nothing when its line is reached, so only the calls step.
    expect(new Set(t.steps.map((s) => s.func))).toEqual(new Set(['fib']))
    expect(new Set(t.steps.filter((s) => s.func === 'fib').map((s) => s.frame)).size).toBe(5)
  })

  it('names types the JavaScript way and draws Maps, Sets and objects', () => {
    const t = trace(`const m = new Map([["a", 1]])
const s = new Set([1, 2])
const o = { a: [1], "b c": null }
let u
`)
    const last = t.steps[t.steps.length - 1].vars
    expect(formatValue(last.m)).toBe('Map { "a" => 1 }')
    expect(formatValue(last.s)).toBe('Set {1, 2}')
    expect(formatValue(last.o)).toBe('{ a: [1], "b c": null }')
    expect(typeLabel(last.m)).toBe('Map · 1 item')
    expect(typeLabel(last.u)).toBe('undefined')
  })

  it('shows the variables a callback closes over, next to its own', () => {
    const t = trace(`let total = 0
const nums = [1, 2]
nums.forEach((n) => {
  total += n
})
`)
    const inside = t.steps.filter((s) => s.func === '<anonymous>')
    expect(lines(inside)).toEqual(['4: n=1 total=0 nums=[1, 2]', '4: n=2 total=1 nums=[1, 2]'])
  })

  it('shows loop variables even while the loop body is empty', () => {
    const t = trace(
      `function twoSum(nums, target) {
  for (const [i, num] of nums.entries()) {
    // what number would pair with num?
  }
}`,
      { name: 'twoSum', args: [[2, 7], 9] },
    )
    expect(lines(t.steps.filter((s) => s.line === 3))).toEqual([
      '3: nums=[2, 7] target=9 i=0 num=2',
      '3: nums=[2, 7] target=9 i=1 num=7',
    ])
  })

  it('plans counts.set(c, ...) like Python\'s counts[c] = ..., and get(c) ?? 0 like get(c, 0)', () => {
    const t = trace(`const counts = new Map([["a", 1]])
const c = "a"
const right = 5
counts.set(c, (counts.get(c) ?? 0) + 1)
counts.set(c, right)
`)
    const after = (line: number) => t.steps.findIndex((_, j) => j > 0 && t.steps[j - 1].line === line)
    const at = (i: number) => [t.steps[i], previousInFrame(t.steps, i), t] as const
    // The count goes up by the 1, as Python's `counts[c] = counts.get(c, 0) + 1` does.
    expect(containerChanges(...at(after(4))).counts.parts['"a"']).toEqual([{ text: '+1', from: null }])
    expect(containerChanges(...at(after(5))).counts.parts['"a"']).toEqual([{ text: '=', from: 'right' }])
    expect(stepRoles(...at(after(5))).reads).toContainEqual(expect.objectContaining({ name: 'right', gave: [{ value: '5', to: 'counts["a"]' }] }))
  })

  it('takes new Map() and { x: 1 } as written-out values, like Python\'s {} and {"x": 1}', () => {
    const t = trace(`const seen = new Map()
const o = { x: 1, y: [2] }
const n = 0
`)
    // No `= from new Map()` badge: the new value says it all.
    expect(newVars(t.steps[1], t.steps[0], t).deltas).toEqual({ seen: [] })
    expect(newVars(t.steps[2], t.steps[1], t).deltas).toEqual({ o: [] })
  })

  it('reads what a method is called on, as Python reads the word in "".join(sorted(word))', () => {
    const t = trace(`const word = "tea"
const stack = []
const key = [...word].sort().join("")
const rest = word.slice(1)
stack.push(key)
`)
    const readsAfter = (line: number) => {
      const i = t.steps.findIndex((_, j) => j > 0 && t.steps[j - 1].line === line)
      const prev = previousInFrame(t.steps, i)
      return [...stepRoles(t.steps[i], prev, t).reads, ...newVars(t.steps[i], prev, t).reads].map((r) => r.name)
    }
    expect(readsAfter(3)).toEqual(['word'])
    expect(readsAfter(4)).toEqual(['word'])
    // The list a value is pushed onto is what changes, not something read.
    expect(readsAfter(5)).toEqual(['key'])
  })

  it('reads what an object is copied from, as in { ...state, user }', () => {
    const t = trace(`const state = { theme: "dark" }
const user = { name: "Ada" }
const next = { ...state, user }
`)
    const i = t.steps.findIndex((_, j) => j > 0 && t.steps[j - 1].line === 3)
    const prev = previousInFrame(t.steps, i)
    const reads = [...stepRoles(t.steps[i], prev, t).reads, ...newVars(t.steps[i], prev, t).reads].map((r) => r.name)
    expect(reads).toEqual(['state', 'user'])
    // The shorthand still makes a `user` key holding the same object.
    expect(formatValue(t.steps[t.steps.length - 1].vars.next)).toBe('{ theme: "dark", user: { name: "Ada" } }')
  })

  it('moves one pointer for two loops with the same name over the same array', () => {
    const t = trace(`const xs = [4, 8]
for (const x of xs) {
  const a = x
}
for (const x of xs) {
  const b = x
}
`)
    expect(t.pointers).toEqual([{ label: 'x', var: '_ct_idx_2_0', target: 'xs' }])
    // The second loop's first pass is at xs[0], not where the first loop ended.
    const i = t.steps.findIndex((s) => s.line === 6)
    expect(t.steps[i].hidden).toEqual({ _ct_idx_2_0: 0 })
    expect(placePointers(t.steps[i], t.pointers)).toEqual({ xs: [{ label: 'x', index: 0 }] })
    expect(newVars(t.steps[i], previousInFrame(t.steps, i), t).deltas.x).toEqual([{ text: '=', from: 'xs[0]' }])
  })

  it('reports a runtime error on the line that threw, through the calls it went through', () => {
    const t = trace(`function boom(x) {
  return x.y.z
}
boom({})
`)
    expect(t.error).toEqual({
      kind: 'runtime',
      message: expect.stringMatching(/^TypeError: /),
      line: 2,
      traceback: [
        { line: 4, func: '<module>' },
        { line: 2, func: 'boom' },
      ],
    })
  })

  it('reports syntax errors with their place', () => {
    expect(runTraced('let x = ')).toEqual({ ok: false, error: { kind: 'syntax', message: 'Unexpected token', line: 1, col: 9 } })
  })

  it('runs strict, so a typo in a name is an error rather than a new global', () => {
    expect(trace('totl = 1').error?.message).toMatch(/^ReferenceError: totl is not defined/)
  })

  it('stops an endless loop', () => {
    const t = trace('let i = 0\nwhile (true) { i++ }')
    expect(t.truncated).toBe(true)
    expect(t.error).toBe(null)
  })
})

describe('runTests', () => {
  it('compares answers, in any order when asked', () => {
    const code = 'function pair(a, b) { return [b, a] }'
    expect(
      runTests(code, 'pair', [
        { args: [1, 2], expected: [2, 1] },
        { args: [1, 2], expected: [1, 2], unordered: true },
        { args: [1, 2], expected: [1, 2] },
      ]).map((r) => r.passed),
    ).toEqual([true, true, false])
  })

  it('stops a test that never finishes', () => {
    expect(runTests('function f() { while (true) {} }', 'f', [{ args: [], expected: 1 }])).toEqual([
      { passed: false, got: null, error: 'Error: took too long' },
    ])
  })
})

describe('closures and shared objects', () => {
  it('draws a closure with the outer variables it remembers', () => {
    const t = trace(`function makeCounter() {
  let count = 0
  return () => {
    count++
    return count
  }
}
const counter = makeCounter()
counter()
counter()
`)
    const last = t.steps[t.steps.length - 1]
    expect(formatValue(last.vars.counter)).toBe('ƒ ⟨count: 2⟩')
    // makeCounter remembers nothing, so it stays out of the way like any plain function.
    expect(last.vars.makeCounter).toBeUndefined()
    // Inside the closure, count shows up and is marked as remembered.
    const inside = t.steps.find((s) => s.func === '<anonymous>' && s.line === 5)!
    expect(formatValue(inside.vars.count)).toBe('1')
    expect(inside.captured).toEqual(['count'])
  })

  it('handles closures made by function declarations and in loops', () => {
    const t = trace(`function outer(x) {
  function inner() {
    return x * 2
  }
  return inner
}
const fs = []
for (let i = 0; i < 2; i++) {
  fs.push(() => i)
}
const g = outer(5)
console.log(g(), fs[0](), fs[1]())
`)
    const last = t.steps[t.steps.length - 1]
    expect(formatValue(last.vars.g)).toBe('ƒ inner ⟨x: 5⟩')
    expect(formatValue(last.vars.fs)).toBe('[ƒ ⟨i: 0⟩, ƒ ⟨i: 1⟩]')
    expect(t.console[0].text).toBe('10 0 1\n')
  })

  it('registers a closure made by a function declaration before its line runs (hoisting)', () => {
    const t = trace(`function makeCounter() {
  let count = 0
  return increment
  function increment() {
    count++
    return count
  }
}
const counter = makeCounter()
counter()
switch (1) {
  case 1:
    function inCase() {}
}
`)
    expect(formatValue(t.steps[t.steps.length - 1].vars.counter)).toBe('ƒ increment ⟨count: 1⟩')
  })

  it('gives each object one id for the whole run', () => {
    const t = trace(`const a = [1]
const b = a
const c = [...a]
`)
    const { a, b, c } = t.steps[t.steps.length - 1].vars
    expect(a.type === 'list' && a.id).toBeTruthy()
    expect((a as { id?: number }).id).toBe((b as { id?: number }).id)
    expect((a as { id?: number }).id).not.toBe((c as { id?: number }).id)
  })

  it('runs test cases written as code', () => {
    const results = runTests(
      `function makeCounter() { let n = 0; return () => ++n }`,
      'makeCounter',
      [
        { args: [], run: 'const c = makeCounter(); c(); return c()', expected: 2 },
        { args: [], run: 'return makeCounter()()', expected: 5 },
      ],
    )
    expect(results.map((r) => r.passed)).toEqual([true, false])
  })
})

describe('linked lists, trees and speed cases', () => {
  const reverse = `function f(head) {
  let prev = null
  let cur = head
  while (cur) {
    const nxt = cur.next
    cur.next = prev
    prev = cur
    cur = nxt
  }
  return prev
}`

  it('draws class instances as nodes, each listed once by id', () => {
    const run = runTraced(reverse, { name: 'f', args: [[1, 2, 3]] }, undefined, { args: ['list'], result: 'list' })
    if (!run.ok) throw new Error('did not run')
    expect(run.error).toBe(null)
    expect(run.result).toMatchObject({ type: 'list', items: [{ value: 3 }, { value: 2 }, { value: 1 }] })
    const first = run.steps.find((s) => s.func === 'f')!
    const head = first.vars.head
    expect(head).toMatchObject({ type: 'ref', cls: 'ListNode' })
    const node = first.nodes![String((head as { id: number }).id)]
    expect(node.fields.map(([k]) => k)).toEqual(['val', 'next'])
    expect(node.fields[1][1].type).toBe('ref')
    expect(Object.keys(first.nodes!)).toHaveLength(3)
  })

  it('lists a cycle once', () => {
    const run = runTraced('function f(head) { return head.val }', { name: 'f', args: [{ values: [1, 2], pos: 0 }] }, undefined, { args: ['cycle'] })
    if (!run.ok) throw new Error('did not run')
    expect(Object.keys(run.steps.find((s) => s.func === 'f')!.nodes!)).toHaveLength(2)
  })

  it('takes and gives back trees in level order', () => {
    const swap = 'function f(root) {\n  ;[root.left, root.right] = [root.right, root.left]\n  return root\n}'
    const [r] = runTests(swap, 'f', [{ args: [[2, 1, 3, null, 4]], expected: [2, 3, 1, null, null, null, 4] }], { args: ['tree'], result: 'tree' })
    expect(r).toMatchObject({ passed: true })
  })

  it('counts steps on a speed case and stops when it goes over', () => {
    const sum = 'function f(n) {\n  let t = 0\n  for (let i = 0; i < n; i++) t += i\n  return t\n}'
    const [fast, slow] = runTests(sum, 'f', [
      { args: [10], expected: 45, maxSteps: 100 },
      { args: [1000], expected: 499500, maxSteps: 100 },
    ])
    expect(fast.passed).toBe(true)
    expect(fast.steps).toBeGreaterThan(10)
    expect(slow.passed).toBe(false)
    expect(slow.error).toMatch(/^too slow/)
  })
})
