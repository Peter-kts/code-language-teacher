import { describe, expect, it } from 'vitest'
import { runTests, runTraced } from '../js/runtime'
import { PROBLEMS } from './problems'
import { JS_CONCEPTS } from './concepts'
import { checkGuess } from './guess'

describe('JavaScript concept problems', () => {
  it('have ids of their own, hints, and tests or an explanation', () => {
    const ids = [...PROBLEMS, ...JS_CONCEPTS].map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const p of JS_CONCEPTS) {
      expect(p.track, p.id).toBe('js-concepts')
      expect(p.hints.length, p.id).toBeGreaterThan(0)
      if (p.kind === 'build') {
        expect(p.tests.length, p.id).toBeGreaterThan(0)
        expect(p.starters.javascript, p.id).toContain(`function ${p.functionName}(`)
      } else {
        expect(p.explain?.length, p.id).toBeGreaterThan(0)
      }
    }
  })

  it('have starters that run without an error', () => {
    for (const p of JS_CONCEPTS) {
      const run = runTraced(p.starters.javascript)
      expect(run.ok && run.error, p.id).toBe(null)
    }
  })

  it('fail their tests until solved, and pass once solved', () => {
    for (const p of JS_CONCEPTS.filter((p) => p.kind === 'build')) {
      const before = runTests(p.starters.javascript, p.functionName, p.tests)
      expect(before.some((r) => !r.passed), p.id).toBe(true)
      const after = runTests(SOLUTIONS[p.id], p.functionName, p.tests)
      expect(after.filter((r) => !r.passed), p.id).toEqual([])
    }
  })

  it('print what the predict explanations say', () => {
    for (const p of JS_CONCEPTS.filter((p) => p.kind === 'predict')) {
      const run = runTraced(p.starters.javascript)
      if (!run.ok) throw new Error(p.id)
      expect(run.stdout, p.id).toBe(OUTPUTS[p.id])
    }
  })
})

describe('checkGuess', () => {
  it('ignores spacing, blank lines and the kind of quotes', () => {
    expect(checkGuess('  [1, 2,3]\n\nAda [\'math\']', '[1, 2, 3]\nAda ["math"]\n')).toEqual({ right: 2, total: 2, wrong: null })
  })

  it('says which line is off', () => {
    expect(checkGuess('a\nc', 'a\nb\n')).toEqual({ right: 1, total: 2, wrong: { line: 2, guess: 'c', actual: 'b' } })
    expect(checkGuess('a', 'a\nb\n')).toEqual({ right: 1, total: 2, wrong: { line: 2, guess: '', actual: 'b' } })
  })
})

const OUTPUTS: Record<string, string> = {
  'js-why-both-changed': '[1, 2, 3, 4]\n[1, 2, 3, 4, 5]\nAda ["math", "code"]\n',
  'js-stale-closure': 'Hi Grace\ncount is 0\ncount is 2\n',
}

// One answer per build problem, to check the tests agree with the statement.
const SOLUTIONS: Record<string, string> = {
  'js-counter': `function makeCounter() {
  let count = 0
  return function increment() {
    count++
    return count
  }
}`,
  'js-memoize': `function memoize(fn) {
  const cache = new Map()
  return function remembered(n) {
    if (cache.has(n)) return cache.get(n)
    const answer = fn(n)
    cache.set(n, answer)
    return answer
  }
}`,
  'js-group-by': `function groupBy(items, keyOf) {
  return items.reduce((groups, item) => {
    const key = keyOf(item)
    ;(groups[key] ??= []).push(item)
    return groups
  }, {})
}`,
  'js-update-state': `function moveUser(state, city) {
  return { ...state, user: { ...state.user, address: { ...state.user.address, city } } }
}`,
}
