import type { Step } from '../types'
import {
  containerChanges,
  newVars,
  previousInFrame,
  scalarChanges,
  stepRoles,
  type DeltaPart,
  type Plans,
  type Read,
} from './changes'
import { formatValue } from './format'

/** Where a value a change used came from: the step that last set it, if there was one. */
export interface Origin {
  name: string
  /** List index or dict key as shown, for a value read out of a list or dict. */
  item?: string
  /** The value it gave, e.g. `23`. */
  value: string
  /** The step whose change set it, and how (e.g. `= nums[4]`); null when it was set before anything we saw. */
  step: number | null
  how: string | null
}

/** One change in the run: a variable, or one item of a list or dict, that a line changed. */
export interface HistoryEntry {
  /** The step the change shows on (the line ran just before it). */
  step: number
  /** The line that made it. */
  line: number
  name: string
  item?: string
  /** Value before, as shown; null for a new variable, list item or dict key. */
  before: string | null
  after: string
  /** Badges, as on the card: `+23 from n`, `= nums[4]`, `+16 = 4 + 12`. */
  deltas: DeltaPart[]
  /** The values the line used to make this change, and where each one came from. */
  sources: Origin[]
}

/** The name of a change as code, e.g. `total` or `seen['a']`. */
export const entryLabel = (e: { name: string; item?: string }) => (e.item === undefined ? e.name : `${e.name}[${e.item}]`)

/** A badge as text, e.g. `+23 from n`, `= nums[4]` or `+16 = 4 (n) + 12 (ages["test"])`. */
export function deltaText(d: DeltaPart): string {
  let out = d.text
  if (d.from) out += d.text === '=' ? ` ${d.from}` : ` from ${d.from}`
  if (d.sum) {
    const parts = d.sum.map((p, i) => {
      const op = p.sign < 0 ? '− ' : i > 0 ? '+ ' : ''
      return `${op}${p.value}${p.label ? ` (${p.label})` : ''}`
    })
    out += `${d.text === '=' ? ' ' : ' = '}${parts.join(' ')}`
  }
  return out
}

/**
 * Every change the run made, in order: which variable (or item) each line
 * changed, how, and what it read to do it. Built from the same per-step change
 * logic as the badges, so the history and the visual always agree.
 */
export function buildHistory(steps: Step[], plans?: Plans): HistoryEntry[] {
  const out: HistoryEntry[] = []
  const frameOf = (s: Step) => s.frame ?? s.func
  /** Index of the latest entry per frame and label, to say where a value came from. */
  const last = new Map<string, HistoryEntry>()
  const key = (frame: unknown, label: string) => `${String(frame)}\u0000${label}`

  steps.forEach((step, i) => {
    const prev = previousInFrame(steps, i)
    if (!prev || prev.func !== step.func) return
    const scalars = scalarChanges(step, prev, plans)
    const boxes = containerChanges(step, prev, plans)
    const born = newVars(step, prev, plans)
    const fresh = born.deltas
    const roles = stepRoles(step, prev, plans)
    const reads = [...roles.reads, ...born.reads]
    const changed = new Set([...roles.targets, ...Object.keys(fresh)])
    const here: HistoryEntry[] = []
    const frame = frameOf(step)

    const originOf = (r: Read, value: string): Origin => {
      const found = last.get(key(frame, entryLabel(r)))
      const how = found ? found.deltas.map(deltaText).join(', ') || `= ${found.after}` : null
      return { name: r.name, ...(r.item !== undefined && { item: r.item }), value, step: found?.step ?? null, how }
    }
    /** What fed the change to `label`: reads that gave to it, else (when it is the only change) what the line read. */
    const sourcesFor = (label: string): Origin[] => {
      // The value as it was read, not as it counted (`n` in `target - n` gave 2, not -2).
      const valueOf = (r: Read) =>
        (r.item === undefined ? (prev.vars[r.name] ? formatValue(prev.vars[r.name]) : null) : itemText(prev.vars[r.name], r.item)) ?? '?'
      const gave = reads.filter((r) => r.gave.some((g) => g.to === label))
      if (gave.length || changed.size > 1) return gave.map((r) => originOf(r, valueOf(r)))
      const seen = new Set<string>()
      return reads
        .filter((r) => !(r.item === undefined && changed.has(r.name)))
        .filter((r) => !seen.has(entryLabel(r)) && !!seen.add(entryLabel(r)))
        .map((r) => originOf(r, valueOf(r)))
    }
    const add = (e: Omit<HistoryEntry, 'step' | 'line' | 'sources'>) =>
      here.push({ step: i, line: prev.line, ...e, sources: sourcesFor(entryLabel(e)) })

    for (const [name, value] of Object.entries(step.vars)) {
      if (name in fresh) {
        add({ name, before: null, after: formatValue(value), deltas: fresh[name] })
      } else if (scalars[name]) {
        add({ name, before: scalars[name].before, after: formatValue(value), deltas: scalars[name].deltas })
      } else if (boxes[name]) {
        const old = prev.vars[name]
        const { summary, parts } = boxes[name]
        for (const [item, deltas] of Object.entries(parts)) {
          const isNew = deltas.length === 1 && deltas[0].text === 'new' && !deltas[0].from
          add({
            name,
            item,
            before: isNew ? null : itemText(old, item),
            after: itemText(value, item) ?? '',
            deltas: isNew ? [] : deltas,
          })
        }
        if (summary.length || !Object.keys(parts).length) {
          add({ name, before: formatValue(old), after: formatValue(value), deltas: summary })
        }
      }
    }
    for (const e of here) last.set(key(frame, entryLabel(e)), e)
    out.push(...here)
  })
  return out
}

function itemText(v: Step['vars'][string] | undefined, item: string): string | null {
  if (!v) return null
  if (v.type === 'dict') {
    const found = v.entries.find(([k]) => formatValue(k) === item)
    return found ? formatValue(found[1]) : null
  }
  if (v.type === 'list' || v.type === 'tuple') {
    const found = v.items[Number(item)]
    return found ? formatValue(found) : null
  }
  return null
}
