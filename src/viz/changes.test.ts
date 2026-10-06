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
    expect(scalarChanges(next, prev, '    total += n')).toEqual({ total: { before: '4', delta: '+8', from: 'n' } })
  })

  it('leaves out the source when it is not on the line that ran', () => {
    const prev = step({ count: int(0), i: int(1) })
    const next = step({ count: int(1), i: int(1) })
    expect(scalarChanges(next, prev, 'count += 1')).toEqual({ count: { before: '0', delta: '+1', from: null } })
  })

  it('handles subtraction, floats and non-numbers', () => {
    const prev = step({ x: int(10), f: { type: 'prim', repr: '0.1', value: 0.1 }, s: str('a') })
    const next = step({ x: int(7), f: { type: 'prim', repr: '0.3', value: 0.30000000000000004 }, s: str('ab') })
    expect(scalarChanges(next, prev)).toEqual({
      x: { before: '10', delta: '-3', from: null },
      f: { before: '0.1', delta: '+0.2', from: null },
      s: { before: "'a'", delta: null, from: null },
    })
  })

  it('ignores new variables and frame switches', () => {
    expect(scalarChanges(step({ a: int(1) }), step({}))).toEqual({})
    expect(scalarChanges(step({ a: int(2) }, 1, 'f'), step({ a: int(1) }))).toEqual({})
  })
})
