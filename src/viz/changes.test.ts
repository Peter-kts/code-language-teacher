import { describe, expect, it } from 'vitest'
import { containerChanges, findNames, previousInFrame, scalarChanges, stepRoles } from './changes'
import type { Step, Value } from '../types'

const int = (x: number): Value => ({ type: 'prim', repr: String(x), value: x })
const str = (x: string): Value => ({ type: 'prim', repr: `'${x}'`, value: x })
const list = (...xs: (number | string)[]): Value => ({
  type: 'list',
  items: xs.map((x) => (typeof x === 'number' ? int(x) : str(x))),
  truncated: false,
})
const dict = (...entries: [string, number][]): Value => ({
  type: 'dict',
  entries: entries.map(([k, v]) => [str(k), int(v)]),
  truncated: false,
})
const step = (vars: Step['vars'], line = 1, func = '<module>'): Step => ({ line, func, vars, hidden: {}, stdout: '' })

describe('scalarChanges', () => {
  it('reports `total += n` as +n from n', () => {
    const prev = step({ total: int(4), n: int(8) }, 4)
    const next = step({ total: int(12), n: int(8) }, 3)
    expect(scalarChanges(next, prev, '    total += n')).toEqual({
      total: { before: '4', deltas: [{ text: '+8', from: 'n' }] },
    })
  })

  it('reports `total -= n` as -n from n', () => {
    const prev = step({ total: int(10), n: int(3) })
    const next = step({ total: int(7), n: int(3) })
    expect(scalarChanges(next, prev, 'total -= n').total.deltas).toEqual([{ text: '-3', from: 'n' }])
  })

  it('stacks one part per variable when several feed one change', () => {
    const prev = step({ total: int(1), a: int(3), b: int(5) })
    const next = step({ total: int(9), a: int(3), b: int(5) })
    expect(scalarChanges(next, prev, 'total += a + b').total.deltas).toEqual([
      { text: '+3', from: 'a' },
      { text: '+5', from: 'b' },
    ])
    const down = step({ total: int(-7), a: int(3), b: int(5) })
    expect(scalarChanges(down, prev, 'total -= a + b').total.deltas).toEqual([
      { text: '-3', from: 'a' },
      { text: '-5', from: 'b' },
    ])
  })

  it('gives each variable its own change when one line updates several', () => {
    const prev = step({ a: int(3), b: int(5) })
    const next = step({ a: int(5), b: int(8) })
    expect(scalarChanges(next, prev, 'a, b = b, a + b')).toEqual({
      a: { before: '3', deltas: [{ text: '+2', from: null }] },
      // `a` already holds its new value, so it isn't named as the source.
      b: { before: '5', deltas: [{ text: '+3', from: null }] },
    })
  })

  it('leaves out the source when it is not on the line, or when more than one would fit', () => {
    const prev = step({ count: int(0), i: int(1) })
    const next = step({ count: int(1), i: int(1) })
    expect(scalarChanges(next, prev, 'count += 1').count.deltas).toEqual([{ text: '+1', from: null }])
    const twins = step({ t: int(0), x: int(2), y: int(2) })
    expect(scalarChanges(step({ t: int(2), x: int(2), y: int(2) }), twins, 't += x or y').t.deltas).toEqual([
      { text: '+2', from: null },
    ])
  })

  it('handles floats and non-numbers', () => {
    const prev = step({ f: { type: 'prim', repr: '0.1', value: 0.1 }, s: str('a') })
    const next = step({ f: { type: 'prim', repr: '0.3', value: 0.30000000000000004 }, s: str('ab') })
    expect(scalarChanges(next, prev)).toEqual({
      f: { before: '0.1', deltas: [{ text: '+0.2', from: null }] },
      s: { before: "'a'", deltas: [] },
    })
  })

  it('ignores new variables and frame switches', () => {
    expect(scalarChanges(step({ a: int(1) }), step({}))).toEqual({})
    expect(scalarChanges(step({ a: int(2) }, 1, 'f'), step({ a: int(1) }))).toEqual({})
  })
})

describe('containerChanges', () => {
  const NEW = { text: 'new', from: null }

  it('gives changed list items a delta, with the source when the line names it', () => {
    const prev = step({ xs: list(1, 2, 3), n: int(8) })
    const next = step({ xs: list(1, 10, 3), n: int(8) })
    expect(containerChanges(next, prev, 'xs[1] += n')).toEqual({
      xs: { summary: [], parts: { 1: [{ text: '+8', from: 'n' }] } },
    })
  })

  it('marks appended and front-inserted items as new', () => {
    expect(containerChanges(step({ xs: list(1, 2, 9) }), step({ xs: list(1, 2) })).xs.parts).toEqual({ 2: [NEW] })
    expect(containerChanges(step({ xs: list(0, 1, 2) }), step({ xs: list(1, 2) })).xs.parts).toEqual({ 0: [NEW] })
  })

  it('sums up removals and reorders on the list itself', () => {
    expect(containerChanges(step({ xs: list(1, 2) }), step({ xs: list(1, 2, 3) })).xs).toEqual({
      summary: [{ text: '-1 item', from: null }],
      parts: {},
    })
    expect(containerChanges(step({ xs: list(3) }), step({ xs: list(1, 2, 3) })).xs.summary).toEqual([
      { text: '-2 items', from: null },
    ])
    expect(containerChanges(step({ xs: list(1, 2, 3) }), step({ xs: list(3, 1, 2) })).xs).toEqual({
      summary: [{ text: 'reordered', from: null }],
      parts: {},
    })
  })

  it('stacks badges on several items changed by one line', () => {
    const prev = step({ xs: list(1, 2, 'a') })
    const next = step({ xs: list(8, 2, 'z') })
    expect(containerChanges(next, prev, "xs[0], xs[2] = 8, 'z'").xs.parts).toEqual({
      0: [{ text: '+7', from: null }],
      2: [{ text: "was 'a'", from: null }],
    })
  })

  it('tracks dict keys: new, updated and removed', () => {
    const prev = step({ seen: dict(['a', 1], ['b', 2]), c: int(3) })
    const next = step({ seen: dict(['a', 4], ['c', 0]), c: int(3) })
    expect(containerChanges(next, prev, 'seen[k] += c').seen).toEqual({
      summary: [{ text: '-1 key', from: null }],
      parts: { "'a'": [{ text: '+3', from: 'c' }], "'c'": [NEW] },
    })
  })

  it('ignores unchanged containers, scalars and frame switches', () => {
    expect(containerChanges(step({ xs: list(1), n: int(2) }), step({ xs: list(1), n: int(1) }))).toEqual({})
    expect(containerChanges(step({ xs: list(2) }, 1, 'f'), step({ xs: list(1) }))).toEqual({})
  })
})

describe('previousInFrame', () => {
  it('compares against the previous step in the same function, skipping the call', () => {
    const steps = [step({}, 1), step({ x: int(1) }, 2, 'f'), step({ r: int(1) }, 3)]
    expect(previousInFrame(steps, 2)).toBe(steps[0])
    expect(previousInFrame(steps, 1)).toBeUndefined()
  })
})

describe('stepRoles', () => {
  it('splits `total += n` into target total and source n', () => {
    const prev = step({ total: int(39), n: int(23) }, 4)
    const next = step({ total: int(62), n: int(23) }, 3)
    expect(stepRoles(next, prev, '    total += n')).toEqual({ targets: ['total'], sources: ['n'] })
  })

  it('has no roles when nothing changed', () => {
    const s = step({ total: int(1) })
    expect(stepRoles(s, s, 'print(total)')).toEqual({ targets: [], sources: [] })
  })
})

describe('findNames', () => {
  it('finds whole names and skips strings and comments', () => {
    expect(findNames("    total += n  # add n", ['total', 'n'])).toEqual([
      { name: 'total', start: 5, end: 10 },
      { name: 'n', start: 14, end: 15 },
    ])
    expect(findNames("print('n', nums[n])", ['n'])).toEqual([{ name: 'n', start: 17, end: 18 }])
  })
})
