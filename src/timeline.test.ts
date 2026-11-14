import { describe, expect, it } from 'vitest'
import { stepAfterRerun } from './timeline'

describe('stepAfterRerun', () => {
  it('keeps the step you were on after an edit', () => {
    expect(stepAfterRerun({ index: 4, length: 10 }, 12, true)).toBe(4)
    expect(stepAfterRerun({ index: 4, length: 10 }, 8, true)).toBe(4)
  })
  it('moves to the new last step only when the run got shorter than your spot', () => {
    // On step 5 (index 4), the edit leaves 2 steps: land on step 2.
    expect(stepAfterRerun({ index: 4, length: 10 }, 2, true)).toBe(1)
    expect(stepAfterRerun({ index: 4, length: 10 }, 5, true)).toBe(4)
  })
  it('follows the end when you were already on the last step', () => {
    expect(stepAfterRerun({ index: 9, length: 10 }, 15, true)).toBe(14)
    expect(stepAfterRerun({ index: 9, length: 10 }, 3, true)).toBe(2)
  })
  it('starts at the last step for a first run or a different problem, case or language', () => {
    expect(stepAfterRerun(null, 7, true)).toBe(6)
    expect(stepAfterRerun({ index: 2, length: 10 }, 7, false)).toBe(6)
    expect(stepAfterRerun({ index: 0, length: 0 }, 7, true)).toBe(6)
  })
  it('handles a run with no steps', () => {
    expect(stepAfterRerun({ index: 3, length: 10 }, 0, true)).toBe(0)
  })
})
