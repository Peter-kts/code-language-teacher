import type { PointerSpec, Step } from '../types'

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
    const list = step.vars[p.target]
    if (!list || (list.type !== 'list' && list.type !== 'tuple')) continue
    const index = p.var in step.hidden ? step.hidden[p.var] : indexValue(step, p.var)
    if (index === null || index < 0 || index > list.items.length) continue
    const key = `${p.target}:${p.label}`
    if (seen.has(key)) continue
    seen.add(key)
    ;(placed[p.target] ??= []).push({ label: p.label, index })
  }
  return placed
}

function indexValue(step: Step, name: string): number | null {
  const v = step.vars[name]
  if (v?.type === 'prim' && typeof v.value === 'number' && Number.isInteger(v.value)) return v.value
  return null
}
