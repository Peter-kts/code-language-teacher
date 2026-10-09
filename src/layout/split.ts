/** Column sizes are fr units (any positive scale); 0 means the column is collapsed. */

export const DEFAULT_COLUMNS = [1.1, 1.2, 0.8]

/**
 * Move the divider between columns i and i+1 by `delta` fr. A column dragged
 * narrower than `min` snaps shut; dragging past `min` again opens it.
 */
export function dragDivider(start: number[], i: number, delta: number, min: number): number[] {
  const pair = start[i] + start[i + 1]
  let left = Math.min(Math.max(start[i] + delta, 0), pair)
  if (left < min) left = 0
  else if (pair - left < min) left = pair
  const next = [...start]
  next[i] = left
  next[i + 1] = pair - left
  return next
}

/**
 * Double-click on the divider between columns i and i+1: reopen a collapsed
 * neighbour at its remembered size, or else reset the pair to the default ratio.
 */
export function toggleDivider(sizes: number[], i: number, remembered: number[], min: number): number[] {
  const pair = sizes[i] + sizes[i + 1]
  const next = [...sizes]
  const closed = sizes[i] === 0 ? i : sizes[i + 1] === 0 ? i + 1 : -1
  if (closed === -1) {
    const ratio = DEFAULT_COLUMNS[i] / (DEFAULT_COLUMNS[i] + DEFAULT_COLUMNS[i + 1])
    next[i] = pair * ratio
    next[i + 1] = pair - next[i]
    return next
  }
  const other = closed === i ? i + 1 : i
  let open = Math.min(remembered[closed] || DEFAULT_COLUMNS[closed], pair - min)
  if (open < min) open = pair / 2
  next[closed] = open
  next[other] = pair - open
  return next
}

/** Console height in px after a drag; below `min` it collapses to its header (0). */
export function dragConsole(start: number, delta: number, min: number, max: number): number {
  const h = Math.min(Math.max(start - delta, 0), max)
  return h < min ? 0 : h
}
