import type { PointerSpec, Step, Value } from '../types'

export interface PlacedPointer {
  label: string
  /** Box index; equal to the list length when the pointer sits just past the end. */
  index: number
}

/** Work out which box each pointer sits under, per list variable, for one step. */
export function placePointers(step: Step, pointers: PointerSpec[]): Record<string, PlacedPointer[]> {
  const placed: Record<string, PlacedPointer[]> = {}
  const seen = new Set<string>()
  for (const p of pointers) {
    const length = lengthOf(step.vars[p.target])
    if (length === null) continue
    const index = p.var in step.hidden ? step.hidden[p.var] : indexValue(step, p.var)
    if (index === null || index < 0 || index > length) continue
    const key = `${p.target}:${p.label}`
    if (seen.has(key)) continue
    seen.add(key)
    ;(placed[p.target] ??= []).push({ label: p.label, index })
  }
  return placed
}

/** How many boxes a list, tuple or string has; null for anything else (a set has no places). */
function lengthOf(v: Value | undefined): number | null {
  if (!v) return null
  if (v.type === 'list' || v.type === 'tuple') return v.set ? null : v.items.length
  if (v.type === 'prim' && typeof v.value === 'string') return v.value.length
  return null
}

function indexValue(step: Step, name: string): number | null {
  const v = step.vars[name]
  if (v?.type === 'prim' && typeof v.value === 'number' && Number.isInteger(v.value)) return v.value
  return null
}
