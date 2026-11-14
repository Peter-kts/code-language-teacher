/**
 * Where the step scrubber lands when a new trace arrives.
 *
 * Re-running after an edit keeps your place: if you were on step 5, you stay on step 5. Only when the new
 * run is shorter than that does it move back, to the new last step. If you were on the last step (where a
 * run starts out), you stay on the last step, so the final state stays in view as the code grows.
 * A new trace for something else (another problem, test case or language) starts at its last step.
 */
export function stepAfterRerun(
  before: { index: number; length: number } | null,
  newLength: number,
  sameContext: boolean,
): number {
  const last = Math.max(0, newLength - 1)
  if (!before || !sameContext || before.length === 0 || before.index >= before.length - 1) return last
  return Math.max(0, Math.min(before.index, last))
}
