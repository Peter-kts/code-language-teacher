import { describe, expect, it } from 'vitest'
import { diffStep, previousInFrame } from './changes'
import type { Step, Value } from '../types'

const int = (x: number): Value => ({ type: 'prim', repr: String(x), value: x })
const str = (x: string): Value => ({ type: 'prim', repr: `'${x}'`, value: x })
const list = (...xs: number[]): Value => ({ type: 'list', items: xs.map(int), truncated: false })
const step = (vars: Step['vars'], line = 1, func = '<module>'): Step => ({ line, func, vars, hidden: {}, stdout: '' })

describe('diffStep', () => {
  it('shows numeric changes as a signed delta credited to the previous line', () => {
    const changes = diffStep(step({ total: int(4) }, 4), step({ total: int(12) }, 3))
    expect(changes.vars).toEqual({ total: [{ text: '+8', tone: 'up' }] })
    expect(changes.line).toBe(4)
  })

  it('attributes a numeric delta to a unique matching variable on the line', () => {
    const changes = diffStep(step({ total: int(4), n: int(8) }, 4), step({ total: int(12), n: int(8) }, 3), 'total += n')
    expect(changes.vars.total).toEqual([{ text: '+8', tone: 'up', from: 'n' }])
  })

  it('gives each variable its own stack when one line changes several', () => {
    // a, b = b, a + b
    const changes = diffStep(step({ a: int(1), b: int(1) }), step({ a: int(1), b: int(2) }))
    expect(changes.vars).toEqual({ b: [{ text: '+1', tone: 'up' }] })
    const swap = diffStep(step({ a: int(3), b: int(5) }), step({ a: int(5), b: int(8) }))
    expect(swap.vars).toEqual({ a: [{ text: '+2', tone: 'up' }], b: [{ text: '+3', tone: 'up' }] })
  })

  it('stacks several changes to one list: item edits, new items and removals', () => {
    const grown = diffStep(step({ xs: list(1, 2) }), step({ xs: list(1, 5, 7) }))
    expect(grown.items.xs).toEqual({ 1: [{ text: '+3', tone: 'up' }], 2: [{ text: 'new', tone: 'new' }] })
    const shrunk = diffStep(step({ xs: list(1, 2, 3) }), step({ xs: list(1) }))
    expect(shrunk.vars.xs).toEqual([{ text: '−2 items', tone: 'down' }])
  })

  it('marks new variables, non-numeric changes and float noise', () => {
    const changes = diffStep(
      step({ s: str('a'), f: { type: 'prim', repr: '0.1', value: 0.1 } }),
      step({ s: str('ab'), f: { type: 'prim', repr: '0.30000000000000004', value: 0.30000000000000004 }, n: int(0) }),
    )
    expect(changes.vars).toEqual({
      s: [{ text: "was 'a'", tone: 'set' }],
      f: [{ text: '+0.2', tone: 'up' }],
      n: [{ text: 'new', tone: 'new' }],
    })
  })

  it('shows nothing when unchanged or across functions', () => {
    expect(diffStep(step({ x: int(1) }), step({ x: int(1) })).vars).toEqual({})
    expect(diffStep(step({ x: int(1) }, 1, 'f'), step({ x: int(2) })).vars).toEqual({})
    expect(diffStep(undefined, step({ x: int(1) })).vars).toEqual({})
  })
})

describe('previousInFrame', () => {
  it('skips steps inside called functions so a call result is credited to its line', () => {
    const steps = [step({}, 1), step({}, 5, 'f'), step({}, 6, 'f'), step({ r: int(3) }, 2)]
    expect(previousInFrame(steps, 3)).toBe(steps[0])
    expect(previousInFrame(steps, 2)).toBe(steps[1])
    expect(previousInFrame(steps, 0)).toBeUndefined()
  })
})
