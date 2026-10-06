import type { Step, Value } from '../types'
import { formatValue } from './format'

export type ChangeTone = 'up' | 'down' | 'set' | 'new'

export interface Change {
  /** Badge text, e.g. `+8`, `was 'a'`, `new`. */
  text: string
  tone: ChangeTone
}

/**
 * What changed to reach a step. Every target holds a list of changes so the UI
 * can stack them when several things touch the same variable or item at once.
 */
export interface StepChanges {
  vars: Record<string, Change[]>
  /** Changes to individual list items: items[listName][index]. */
  items: Record<string, Record<number, Change[]>>
  /** The line whose execution produced these changes. */
  line: number | null
}

const NONE: StepChanges = { vars: {}, items: {}, line: null }

/**
 * The step before `i` in the same function. Snapshots are taken before each
 * line runs, so the difference from that step is what its line just did. Using
 * the same function also credits a call's result to the line that made it.
 */
export function previousInFrame(steps: Step[], i: number): Step | undefined {
  const func = steps[i]?.func
  for (let j = i - 1; j >= 0; j--) if (steps[j].func === func) return steps[j]
  return undefined
}

export function diffStep(prev: Step | undefined, step: Step): StepChanges {
  if (!prev || prev.func !== step.func) return NONE
  const out: StepChanges = { vars: {}, items: {}, line: prev.line }
  const add = (name: string, change: Change) => (out.vars[name] ??= []).push(change)
  const addItem = (name: string, index: number, change: Change) =>
    ((out.items[name] ??= {})[index] ??= []).push(change)

  for (const [name, value] of Object.entries(step.vars)) {
    const before = prev.vars[name]
    if (!before) {
      add(name, { text: 'new', tone: 'new' })
      continue
    }
    if (formatValue(before) === formatValue(value)) continue

    const a = asNumber(before)
    const b = asNumber(value)
    if (a !== null && b !== null) {
      add(name, delta(b - a))
    } else if ((value.type === 'list' || value.type === 'tuple') && before.type === value.type) {
      value.items.forEach((item, i) => {
        const old = before.items[i]
        if (!old) addItem(name, i, { text: 'new', tone: 'new' })
        else if (formatValue(old) !== formatValue(item)) addItem(name, i, itemChange(old, item))
      })
      const lost = before.items.length - value.items.length
      if (lost > 0) add(name, { text: `−${lost} ${lost === 1 ? 'item' : 'items'}`, tone: 'down' })
    } else if (value.type === 'dict' && before.type === 'dict') {
      // Changed rows are highlighted in the table; the badge sums up the size change.
      const grow = value.entries.length - before.entries.length
      if (grow === 0) add(name, { text: 'updated', tone: 'set' })
      else add(name, { text: `${grow > 0 ? '+' : '−'}${Math.abs(grow)} ${Math.abs(grow) === 1 ? 'key' : 'keys'}`, tone: grow > 0 ? 'up' : 'down' })
    } else {
      add(name, { text: `was ${short(formatValue(before))}`, tone: 'set' })
    }
  }
  return out
}

function asNumber(v: Value): number | null {
  return v.type === 'prim' && typeof v.value === 'number' ? v.value : null
}

function itemChange(old: Value, item: Value): Change {
  const a = asNumber(old)
  const b = asNumber(item)
  return a !== null && b !== null ? delta(b - a) : { text: `was ${short(formatValue(old))}`, tone: 'set' }
}

function delta(d: number): Change {
  // toPrecision trims float noise such as 0.30000000000000004.
  const size = Number(Math.abs(d).toPrecision(12))
  return { text: `${d >= 0 ? '+' : '−'}${size}`, tone: d >= 0 ? 'up' : 'down' }
}

function short(text: string): string {
  return text.length > 14 ? `${text.slice(0, 13)}…` : text
}
