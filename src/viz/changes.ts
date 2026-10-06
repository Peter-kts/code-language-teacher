import type { Step, Value } from '../types'

export interface DeltaPart {
  /** e.g. `+8` or `-1.5`. */
  text: string
  /** Variable on the line that just ran that supplied this amount, e.g. `n` in `total += n`. */
  from: string | null
}

export interface ScalarChange {
  /** Value before this step, as shown to the user. */
  before: string
  /**
   * What was added or subtracted. One part normally; several when the line
   * combined variables (`total += a + b` gives `+a from a`, `+b from b`), and
   * the UI stacks them. Empty when either side isn't a number.
   */
  deltas: DeltaPart[]
}

const num = (v: Value | undefined): number | null =>
  v?.type === 'prim' && typeof v.value === 'number' ? v.value : null

const repr = (v: Value) => (v.type === 'prim' || v.type === 'other' ? v.repr : null)

/** Most variables one line can combine before we stop looking for which ones made the change. */
const MAX_PARTS = 3
const MAX_CANDIDATES = 6

/**
 * How each scalar variable changed between `prev` and `step`, keyed by name.
 * `ranLine` is the source of the line that ran in between (prev.line), used to
 * say where an added amount came from.
 */
export function scalarChanges(step: Step, prev: Step | undefined, ranLine?: string): Record<string, ScalarChange> {
  if (!prev || prev.func !== step.func) return {}
  const used = ranLine ? identifiers(ranLine) : []
  const out: Record<string, ScalarChange> = {}
  for (const [name, value] of Object.entries(step.vars)) {
    const old = prev.vars[name]
    const now = repr(value)
    if (!old || now === null) continue
    const before = repr(old)
    if (before === null || before === now) continue
    const a = num(old)
    const b = num(value)
    let deltas: DeltaPart[] = []
    if (a !== null && b !== null) {
      const d = roundOff(b - a)
      if (d !== 0) deltas = explain(d, name, step, used)
    }
    out[name] = { before, deltas }
  }
  return out
}

/** Split a change into the variables on the line that add up to it, or give it as one amount. */
function explain(d: number, target: string, step: Step, used: string[]): DeltaPart[] {
  const candidates = used
    .filter((other) => other !== target)
    .map((other) => ({ name: other, value: num(step.vars[other]) }))
    .filter((c): c is { name: string; value: number } => c.value !== null && c.value !== 0)
    .slice(0, MAX_CANDIDATES)
  // Only name sources when exactly one combination fits; a guess would teach the wrong thing.
  for (let size = 1; size <= MAX_PARTS; size++) {
    const fits = subsets(candidates, size).filter((set) => {
      const sum = set.reduce((s, c) => s + c.value, 0)
      return close(sum, d) || close(sum, -d)
    })
    if (fits.length === 1) {
      const sign = Math.sign(d) * Math.sign(fits[0].reduce((s, c) => s + c.value, 0))
      return fits[0].map((c) => ({ text: signed(roundOff(sign * c.value)), from: c.name }))
    }
    if (fits.length > 1) break
  }
  return [{ text: signed(d), from: null }]
}

function subsets<T>(items: T[], size: number, start = 0): T[][] {
  if (size === 0) return [[]]
  const out: T[][] = []
  for (let i = start; i <= items.length - size; i++) {
    for (const rest of subsets(items, size - 1, i + 1)) out.push([items[i], ...rest])
  }
  return out
}

const close = (x: number, y: number) => Math.abs(x - y) <= 1e-9 * Math.max(1, Math.abs(y))

const signed = (x: number) => (x >= 0 ? `+${x}` : `${x}`)

// 0.1 + 0.2 should read as +0.3, not +0.30000000000000004.
const roundOff = (x: number) => (Number.isInteger(x) ? x : Number(x.toPrecision(12)))

/** Names on the line, in order of first appearance. */
function identifiers(line: string): string[] {
  const code = line.replace(/#.*$/, '').replace(/(['"]).*?\1/g, '')
  return [...new Set(code.match(/[A-Za-z_]\w*/g) ?? [])]
}
