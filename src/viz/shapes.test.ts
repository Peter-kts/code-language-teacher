import { spawnSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'
import { runTraced } from '../js/runtime'
import type { Step, TraceResult, Value } from '../types'
import { containerChanges, previousInFrame, stepRoles } from './changes'
import { callStack, decisionAt, graphOf, heapLists, isIntervals, loopPasses, shapesFor, visibleSlots } from './shapes'

type Good = Extract<TraceResult, { ok: true }>

function trace(code: string, call: { name: string; args: unknown[] } | null = null): Good {
  const result = runTraced(code, call)
  if (!result.ok) throw new Error(result.error.message)
  if (result.error) throw new Error(result.error.message)
  return result
}

const prim = (x: number | string): Value => ({ type: 'prim', repr: typeof x === 'string' ? `'${x}'` : String(x), value: x })
const list = (...xs: Value[]): Value => ({ type: 'list', items: xs, truncated: false })

/** Each pass chip at every step, as `line:pass/total` (or `done`). */
const passesAt = (t: Good) =>
  t.steps.map((s, i) => `${s.line} ${loopPasses(t.steps, i, t.blocks).map((p) => (p.done ? `done(${p.total})` : `${p.pass}/${p.total ?? '?'}`)).join(' ')}`.trim())

describe('decisions', () => {
  it('fills a test in with the values it read and says what it meant', () => {
    const t = trace('const nums = [1, 7, 9]\nconst target = 9\nconst mid = 1\nif (nums[mid] < target) {\n  const x = 1\n}')
    const i = t.steps.findIndex((s) => s.line === 5)
    const d = decisionAt(t.steps[i], previousInFrame(t.steps, i), t.checks)
    expect(d).toMatchObject({ kind: 'if', text: 'nums[mid] < target', filled: '7 < 9', result: true, meaning: 'so it runs the if block' })
  })

  it('names an else if and leaves parts a short-circuit skipped', () => {
    const t = trace('const a = 0\nlet x = 0\nif (a > 1) {\n  x = 1\n} else if (a === 1 && x > 0) {\n  x = 2\n}\nx = 3')
    const i = t.steps.findIndex((s) => s.line === 8)
    const d = decisionAt(t.steps[i], previousInFrame(t.steps, i), t.checks)
    expect(d).toMatchObject({ kind: 'elif', filled: '0 === 1 && x > 0', result: false })
  })

  it('lights up the grid cell a test read', () => {
    const t = trace('const grid = [[1, 2], [3, 4]]\nconst r = 1\nconst c = 0\nif (grid[r][c] > 2) {\n  const x = 1\n}')
    const i = t.steps.findIndex((s) => s.line === 5)
    const { reads, sources } = stepRoles(t.steps[i], previousInFrame(t.steps, i), t)
    expect(reads.find((r) => r.col !== undefined)).toMatchObject({ name: 'grid', item: '1', col: '0' })
    expect(sources).toEqual(expect.arrayContaining(['r', 'c']))
    expect(t.cells).toEqual([{ row: 'r', col: 'c', target: 'grid' }])
  })
})

describe('loop passes', () => {
  it('counts for...of passes out of the array length', () => {
    const t = trace('let s = 0\nfor (const n of [4, 5]) {\n  s += n\n}')
    expect(passesAt(t)).toEqual(['1', '2 1/2', '3 1/2', '2 2/2', '3 2/2', '2 done(2)', '2 done(2)'])
  })

  it('works out a counting loop from its start and limit', () => {
    const t = trace('let s = 0\nfor (let i = 1; i <= 3; i++) {\n  s += i\n}')
    expect(passesAt(t).filter((l) => l.startsWith('3 '))).toEqual(['3 1/3', '3 2/3', '3 3/3'])
    expect(passesAt(t).at(-1)).toBe('2 done(3)')
  })

  it('ends a while loop on its failing check instead of counting another pass', () => {
    const t = trace('let n = 2\nwhile (n > 0) {\n  n -= 1\n}')
    expect(passesAt(t)).toEqual(['1', '2 1/?', '3 1/?', '2 2/?', '3 2/?', '2 done(2)', '2 done(2)'])
  })

  it('counts a do-while body as the first pass', () => {
    const t = trace('let n = 2\ndo {\n  n -= 1\n} while (n > 0)\nn = 9')
    expect(passesAt(t)).toEqual(['1', '2 1/?', '3 1/?', '4 2/?', '3 2/?', '4 done(2)', '5', '5'])
  })
})

/** The Python tracer's result for `code`, run with CPython. */
function tracePython(code: string): Good {
  const run = 'import json, sys\nsys.path.insert(0, "src/python")\nfrom tracer import run_traced\nprint(run_traced(sys.stdin.read()))'
  const done = spawnSync('python3', ['-c', run], { input: code, encoding: 'utf8' })
  return JSON.parse(done.stdout)
}

describe('loop passes in Python', () => {
  it('counts the same passes as JavaScript', () => {
    const forLoop = tracePython('s = 0\nfor n in [4, 5]:\n    s += n\n')
    expect(passesAt(forLoop)).toEqual(['1', '2 1/2', '3 1/2', '2 2/2', '3 2/2', '2 done(2)', '2 done(2)'])
    const whileLoop = tracePython('n = 2\nwhile n > 0:\n    n -= 1\n')
    expect(passesAt(whileLoop)).toEqual(['1', '2 1/?', '3 1/?', '2 2/?', '3 2/?', '2 done(2)', '2 done(2)'])
  })
})

describe('call stack', () => {
  it('lists the waiting calls with their arguments and what a call gave back', () => {
    const t = trace('function f(n) {\n  if (n === 0) return 7\n  const got = f(n - 1)\n  return got\n}\nconst x = f(1)')
    const deepest = t.steps.reduce((best, s, i) => ((s.stack?.length ?? 0) > (t.steps[best].stack?.length ?? 0) ? i : best), 0)
    const stack = callStack(t.steps, deepest)
    expect(stack.map((e) => [e.func, e.args, e.line, e.current])).toEqual([
      ['<module>', undefined, 6, false],
      ['f', 'n=1', 3, false],
      ['f', 'n=0', 2, true],
    ])
    // The waiting call's own variables, as they were when it made the call.
    expect(stack[1].step?.vars.n).toMatchObject({ value: 1 })
    expect(t.steps.filter((s) => s.returned).map((s) => [s.returned!.func, s.returned!.value[0]])).toEqual([
      ['f', '7'],
      ['f', '7'],
    ])
  })
})

describe('shapes', () => {
  it('reads an adjacency list as a graph, two-way when every edge goes back', () => {
    const g = graphOf({ type: 'dict', entries: [[prim(0), list(prim(1))], [prim(1), list(prim(0))]], truncated: false })
    expect(g).toEqual({ nodes: ['0', '1'], edges: [['0', '1'], ['1', '0']], undirected: true })
    expect(graphOf({ type: 'dict', entries: [[prim('a'), list(prim(5), prim(6))]], truncated: false })).toBeNull()
  })

  it('picks intervals, grids and heaps by shape and name', () => {
    const pairs = list(list(prim(1), prim(3)), list(prim(2), prim(6)))
    expect(isIntervals(pairs)).toBe(true)
    expect(shapesFor('intervals', pairs, new Set())[0]).toBe('intervals')
    const grid = list(list(prim(1), prim(0), prim(1)), list(prim(0), prim(1), prim(1)))
    expect(shapesFor('grid', grid, new Set())).toEqual(['grid', 'boxes'])
    expect(shapesFor('h', list(prim(1), prim(2)), new Set(['h']))[0]).toBe('heap')
    expect(shapesFor('nums', list(prim(1), prim(2)), new Set())).toEqual(['boxes', 'heap'])
  })

  it('only counts the same JavaScript list as a heap object’s storage, not a copy', () => {
    const items = (id: number): Value => ({ type: 'list', items: [prim(1), prim(2)], truncated: false, id })
    const step: Step = {
      line: 1,
      func: 'push',
      hidden: {},
      stdout: '',
      vars: { a: items(5), copy: items(6) },
      nodes: { '1': { cls: 'MinHeap', fields: [['items', items(5)]] } },
    }
    expect(heapLists(step).map((h) => h.name)).toEqual(['a'])
  })

  it('keeps the boxes around pointers in a long list, with gaps for the rest', () => {
    expect(visibleSlots(5, [])).toEqual([0, 1, 2, 3, 4])
    expect(visibleSlots(100, [50])).toEqual([0, { gap: 46 }, 47, 48, 49, 50, 51, 52, 53, { gap: 45 }, 99])
  })

  it('marks new members of a set without calling moved ones changed', () => {
    const set = (...xs: number[]): Value => ({ type: 'list', set: true, items: xs.map(prim), truncated: false })
    const step = (v: Value): Step => ({ line: 1, func: 'f', vars: { s: v }, hidden: {}, stdout: '' })
    const change = containerChanges(step(set(1, 2, 3)), step(set(1, 3)))
    expect(change.s.parts).toEqual({ 1: [{ text: 'new', from: null }] })
  })
})
