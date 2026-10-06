import type { Step, Value } from '../types'

export interface ScalarChange {
  /** Value before this step, as shown to the user. */
  before: string
  /** e.g. `+8` or `-1.5`, when both sides are numbers. */
  delta: string | null
  /** Variable on the line that just ran whose value equals the delta, e.g. `n` in `total += n`. */
  from: string | null
}

const num = (v: Value | undefined): number | null =>
  v?.type === 'prim' && typeof v.value === 'number' ? v.value : null

const repr = (v: Value) => (v.type === 'prim' || v.type === 'other' ? v.repr : null)

/**
 * How each scalar variable changed between `prev` and `step`, keyed by name.
 * `ranLine` is the source of the line that ran in between (prev.line), used to
 * say where an added amount came from.
 */
export function scalarChanges(step: Step, prev: Step | undefined, ranLine?: string): Record<string, ScalarChange> {
  if (!prev || prev.func !== step.func) return {}
  const out: Record<string, ScalarChange> = {}
  for (const [name, value] of Object.entries(step.vars)) {
    const old = prev.vars[name]
    const now = repr(value)
    if (!old || now === null) continue
    const before = repr(old)
    if (before === null || before === now) continue
    const a = num(old)
    const b = num(value)
    let delta: string | null = null
    let from: string | null = null
    if (a !== null && b !== null) {
      const d = roundOff(b - a)
      delta = d >= 0 ? `+${d}` : `${d}`
      const used = ranLine ? identifiers(ranLine) : new Set<string>()
      const sources = Object.keys(step.vars).filter(
        (other) => other !== name && used.has(other) && num(step.vars[other]) === Math.abs(d),
      )
      if (sources.length === 1) from = sources[0]
    }
    out[name] = { before, delta, from }
  }
  return out
}

// 0.1 + 0.2 should read as +0.3, not +0.30000000000000004.
const roundOff = (x: number) => (Number.isInteger(x) ? x : Number(x.toPrecision(12)))

function identifiers(line: string): Set<string> {
  const code = line.replace(/#.*$/, '').replace(/(['"]).*?\1/g, '')
  return new Set(code.match(/[A-Za-z_]\w*/g) ?? [])
}
