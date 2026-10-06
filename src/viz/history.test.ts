import { describe, expect, it } from 'vitest'
import { buildHistory, deltaText, entryLabel, type HistoryEntry } from './history'
import type { TraceResult } from '../types'
import sumTrace from './fixtures/sum.json'
import twoSumTrace from './fixtures/twosum.json'

// Real traces from src/python/tracer.py (made with run_traced; their `code` is the source that ran).
type Trace = Extract<TraceResult, { ok: true }>
const history = (t: unknown) => {
  const trace = t as Trace
  return buildHistory(trace.steps, trace)
}
/** One line per change, as the panel reads it. */
const show = (e: HistoryEntry) =>
  [
    `step ${e.step} line ${e.line}: ${entryLabel(e)} ${e.before ?? 'new'} → ${e.after}`,
    ...e.deltas.map(deltaText),
    ...e.sources.map((s) => `[${entryLabel(s)} gave ${s.value}${s.step === null ? '' : ` from step ${s.step}: ${s.how}`}]`),
  ].join(' ')

describe('buildHistory', () => {
  it('follows `total += n` back to the box n came from', () => {
    const rows = history(sumTrace).map(show)
    expect(rows.slice(0, 5)).toEqual([
      'step 1 line 1: nums new → [4, 8, 15, 16, 23, 42]',
      'step 2 line 2: total new → 0',
      'step 3 line 3: n new → 4 = nums[0] [nums[0] gave 4]',
      'step 4 line 4: total 0 → 4 +4 from n [n gave 4 from step 3: = nums[0]]',
      'step 5 line 3: n 4 → 8 = nums[1] [nums[1] gave 8]',
    ])
    expect(rows.at(-1)).toBe('step 14 line 4: total 66 → 108 +42 from n [n gave 42 from step 13: = nums[5]]')
  })

  it('records dict writes per key, with the values they were made from', () => {
    const rows = history(twoSumTrace).map(show)
    expect(rows).toContain('step 3 line 2: seen new → {}')
    // `need = target - n`: n gave 2 (not -2), and came from nums[0] a step earlier.
    expect(rows).toContain('step 5 line 4: need new → 7 = 9 (target) − 2 (n) [target gave 9] [n gave 2 from step 4: = nums[0]]')
    expect(rows).toContain("step 7 line 7: seen[2] new → 0 [i gave 0 from step 4: = 0]")
  })
})
