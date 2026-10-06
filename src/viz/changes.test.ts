import { describe, expect, it } from 'vitest'
import { scalarChanges } from './changes'
import type { Step, Value } from '../types'

const int = (x: number): Value => ({ type: 'prim', repr: String(x), value: x })
const str = (x: string): Value => ({ type: 'prim', repr: `'${x}'`, value: x })
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
