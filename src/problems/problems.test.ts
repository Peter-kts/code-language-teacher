import { describe, expect, it } from 'vitest'
import { CARDS } from '../syntax/cards'
import { JS_CONCEPTS } from './concepts'
import { BIG_OS, PROBLEMS, say } from './problems'

describe('problems', () => {
  it('have unique ids, hints and tests', () => {
    const ids = PROBLEMS.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const p of PROBLEMS) {
      expect(p.hints.length, p.id).toBeGreaterThan(0)
      expect(p.tests.length, p.id).toBeGreaterThan(0)
      expect(p.starters.python, p.id).toContain(`def ${p.functionName}(`)
      expect(p.starters.javascript, p.id).toContain(`function ${p.functionName}(`)
    }
  })

  it('read like LeetCode: a topic, constraints, and a time and space answer that can be picked', () => {
    for (const p of PROBLEMS) {
      expect(p.topic, p.id).toBeDefined()
      expect(p.constraints?.length, p.id).toBeGreaterThan(0)
      expect(p.complexity, p.id).toBeDefined()
      const choices = [...BIG_OS, ...(p.complexity!.extra ?? [])]
      expect(choices, p.id).toContain(p.complexity!.time)
      expect(choices, p.id).toContain(p.complexity!.space)
    }
  })

  it('keep the data structure in Warm-up and Easy starters, and leave Medium and Hard ones blank', () => {
    for (const p of PROBLEMS) {
      const lines = (code: string) => code.split('\n').filter((l) => l.trim() && !l.trim().startsWith('#') && !l.trim().startsWith('//') && !l.trim().startsWith('*') && !l.trim().startsWith('/*'))
      if (p.difficulty === 'Medium' || p.difficulty === 'Hard') {
        // Just the function line (and its closing brace); helper classes like a heap may come before it.
        const after = (code: string, head: string) => lines(code.slice(code.indexOf(head)))
        expect(after(p.starters.python, `def ${p.functionName}(`).length, p.id).toBeLessThanOrEqual(2)
        expect(after(p.starters.javascript, `function ${p.functionName}(`).length, p.id).toBeLessThanOrEqual(2)
      }
    }
  })

  it('link only to glossary entries that exist, in each language', () => {
    for (const [language, cards] of Object.entries(CARDS)) {
      const ids = new Set(cards.map((c) => c.id))
      for (const p of [...PROBLEMS, ...JS_CONCEPTS]) {
        for (const c of p.concepts[language as keyof typeof CARDS]) expect(ids.has(c), `${language}: ${p.id} → ${c}`).toBe(true)
      }
    }
    for (const p of PROBLEMS) {
      expect(p.concepts.python.length, p.id).toBeGreaterThan(0)
      expect(p.concepts.javascript.length, p.id).toBeGreaterThan(0)
    }
    for (const p of JS_CONCEPTS) expect(p.concepts.javascript.length, p.id).toBeGreaterThan(0)
  })

  it("use each language's own words", () => {
    // Python words that would mislead in JavaScript, and the other way round.
    const python = /\b(True|False|None|dict|elif|append|lists?|tuple)\b|(?<!\.)\b(sorted|max|len)\(| \/\/ /
    const javascript = /\b(true|false|null|undefined|Map|push|Math)\b|===/
    for (const p of PROBLEMS) {
      for (const text of [...p.statement, ...p.hints, ...(p.constraints ?? []), ...(p.complexity ? [p.complexity.why] : [])]) {
        expect(say(text, 'javascript'), p.id).not.toMatch(python)
        expect(say(text, 'python'), p.id).not.toMatch(javascript)
      }
    }
  })
})
