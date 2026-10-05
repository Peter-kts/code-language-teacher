import { describe, expect, it } from 'vitest'
import { placePointers } from './pointers'
import type { Step, Value } from '../types'

const list = (...xs: number[]): Value => ({
  type: 'list',
  items: xs.map((x) => ({ type: 'prim', repr: String(x), value: x })),
  truncated: false,
})
const int = (x: number): Value => ({ type: 'prim', repr: String(x), value: x })
const step = (vars: Step['vars'], hidden: Step['hidden'] = {}): Step => ({
  line: 1,
  func: '<module>',
  vars,
  hidden,
  stdout: '',
})

describe('placePointers', () => {
  it('uses the hidden loop counter for `for n in nums`', () => {
    const placed = placePointers(step({ nums: list(5, 5, 5), n: int(5) }, { _ct_idx_2_0: 1 }), [
      { label: 'n', var: '_ct_idx_2_0', target: 'nums' },
    ])
    expect(placed).toEqual({ nums: [{ label: 'n', index: 1 }] })
  })

  it('places index variables and allows one past the end', () => {
    const placed = placePointers(step({ a: list(1, 2), l: int(0), r: int(2) }), [
      { label: 'l', var: 'l', target: 'a' },
      { label: 'r', var: 'r', target: 'a' },
    ])
    expect(placed.a).toEqual([
      { label: 'l', index: 0 },
      { label: 'r', index: 2 },
    ])
  })

  it('skips pointers that are out of range or not yet defined', () => {
    const placed = placePointers(step({ a: list(1), i: int(-1) }), [
      { label: 'i', var: 'i', target: 'a' },
      { label: 'j', var: 'j', target: 'a' },
    ])
    expect(placed).toEqual({})
  })
})
