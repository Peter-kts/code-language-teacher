import { describe, expect, it } from 'vitest'
import { runTraced } from '../js/runtime'
import { sharedObjects } from './sharing'

function lastVars(code: string) {
  const t = runTraced(code)
  if (!t.ok) throw new Error(t.error.message)
  return t.steps[t.steps.length - 1].vars
}

describe('sharedObjects', () => {
  it('links two names for one array, but not a copy', () => {
    const notes = sharedObjects(lastVars('const a = [1]\nconst b = a\nconst c = [...a]\n'))
    expect(notes.a).toEqual([{ path: 'a', others: ['b'], kind: 'array', group: 0 }])
    expect(notes.b).toEqual([{ path: 'b', others: ['a'], kind: 'array', group: 0 }])
    expect(notes.c).toBeUndefined()
  })

  it('finds what a shallow copy still shares', () => {
    const notes = sharedObjects(lastVars('const user = { name: "Ada", tags: ["math"] }\nconst copy = { ...user }\n'))
    expect(notes.user).toEqual([{ path: 'user.tags', others: ['copy.tags'], kind: 'array', group: 0 }])
    expect(notes.copy).toEqual([{ path: 'copy.tags', others: ['user.tags'], kind: 'array', group: 0 }])
  })

  it('says nothing for values without ids', () => {
    expect(sharedObjects({ a: { type: 'list', items: [], truncated: false } })).toEqual({})
  })

  it('finds a Python list shared through a tuple, which has no id of its own', () => {
    const a = { type: 'list' as const, items: [], truncated: false, id: 1 }
    const shared = sharedObjects({ a, pair: { type: 'tuple', items: [a, { type: 'prim', repr: '2', value: 2 }], truncated: false } })
    expect(shared.pair).toEqual([{ path: 'pair[0]', others: ['a'], kind: 'list', group: 0 }])
  })
})
