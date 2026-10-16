/**
 * Worked answers for a problem, used only by the tests (reference.test.ts): every problem
 * must be solvable in both languages, and its slow version (when it has a speed test) must
 * run out of steps, so the speed test really tells a slow answer from a fast one.
 */
export interface Reference {
  python: string
  javascript: string
  /** The simple slow answer the first hint describes. Required when the problem has a speed test. */
  slow?: { python: string; javascript: string }
}

/** By problem id. */
export type References = Record<string, Reference>
