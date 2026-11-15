import { describe, expect, it } from 'vitest'
import { progressFor } from './progress'

const saved = { code: 'x', savedAt: '2026-11-15T00:00:00Z' }

describe('progress meter', () => {
  it('counts saved solutions for the language, leaving predict problems out', () => {
    const problems = [{ id: 'a' }, { id: 'b' }, { id: 'c', kind: 'predict' }, { id: 'd', kind: 'build' }]
    const solutions = { python: { a: saved, c: saved }, javascript: { b: saved }, sql: {} }
    expect(progressFor(solutions, 'python', problems)).toEqual({ solved: 1, total: 3 })
    expect(progressFor(solutions, 'javascript', problems)).toEqual({ solved: 1, total: 3 })
    expect(progressFor(solutions, 'sql', [])).toEqual({ solved: 0, total: 0 })
  })
})
