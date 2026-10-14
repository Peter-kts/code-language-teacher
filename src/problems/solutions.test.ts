import { describe, expect, it } from 'vitest'
import { SOLUTIONS_KEY, loadSolutions, saveSolution } from './solutions'

function memoryStorage() {
  const data = new Map<string, string>()
  return {
    data,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
  }
}

describe('saved solutions', () => {
  it('saves per problem and per language, and loads them back', () => {
    const s = memoryStorage()
    const when = new Date('2026-10-13T12:00:00Z')
    let sol = saveSolution(loadSolutions(s), 'python', 'two-sum', 'def two_sum(): ...', s, when)
    sol = saveSolution(sol, 'javascript', 'two-sum', 'function twoSum() {}', s, when)
    const loaded = loadSolutions(s)
    expect(loaded.python['two-sum']).toEqual({ code: 'def two_sum(): ...', savedAt: '2026-10-13T12:00:00.000Z' })
    expect(loaded.javascript['two-sum'].code).toBe('function twoSum() {}')
    expect(loaded).toEqual(sol)
  })

  it('replaces an older solution to the same problem', () => {
    const s = memoryStorage()
    const first = saveSolution(loadSolutions(s), 'python', 'p', 'old', s)
    saveSolution(first, 'python', 'p', 'new', s)
    expect(loadSolutions(s).python.p.code).toBe('new')
  })

  it('ignores corrupt or malformed data', () => {
    const s = memoryStorage()
    s.setItem(SOLUTIONS_KEY, '{nope')
    expect(loadSolutions(s)).toEqual({ python: {}, javascript: {} })
    s.setItem(SOLUTIONS_KEY, JSON.stringify({ python: { a: { code: 1 }, b: { code: 'ok', savedAt: 'x' } }, ruby: {} }))
    expect(loadSolutions(s)).toEqual({ python: { b: { code: 'ok', savedAt: 'x' } }, javascript: {} })
  })

  it('survives a localStorage getter that throws', () => {
    const desc = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('SecurityError')
      },
    })
    try {
      expect(loadSolutions()).toEqual({ python: {}, javascript: {} })
      expect(saveSolution(loadSolutions(), 'python', 'p', 'x').python.p.code).toBe('x')
    } finally {
      if (desc) Object.defineProperty(globalThis, 'localStorage', desc)
      else delete (globalThis as { localStorage?: unknown }).localStorage
    }
  })
})
