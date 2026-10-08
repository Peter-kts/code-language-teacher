import { describe, expect, it } from 'vitest'
import { PYTHON_CARDS } from '../syntax/cards'
import { PROBLEMS } from './problems'

describe('problems', () => {
  it('have unique ids, hints and tests', () => {
    const ids = PROBLEMS.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const p of PROBLEMS) {
      expect(p.hints.length, p.id).toBeGreaterThan(0)
      expect(p.tests.length, p.id).toBeGreaterThan(0)
      expect(p.starter, p.id).toContain(`def ${p.functionName}(`)
    }
  })

  it('link only to glossary entries that exist', () => {
    const cards = new Set(PYTHON_CARDS.map((c) => c.id))
    for (const p of PROBLEMS) for (const c of p.concepts) expect(cards.has(c), `${p.id} → ${c}`).toBe(true)
  })
})
