import type { Step, Value } from '../types'
import { formatValue } from './format'

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
 * The step before `i` in the same function. Snapshots are taken before each
 * line runs, so the difference from that step is what its line just did. Using
 * the same function also credits a call's result to the line that made it.
 */
export function previousInFrame(steps: Step[], i: number): Step | undefined {
  const func = steps[i]?.func
  for (let j = i - 1; j >= 0; j--) if (steps[j].func === func) return steps[j]
  return undefined
}

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

export interface ContainerChange {
  /** Badges for the list or dict as a whole, e.g. `-2 items` or `reordered`. */
  summary: DeltaPart[]
  /** Badges per list index or dict key (keyed by the key as shown, e.g. `'a'`). */
  parts: Record<string, DeltaPart[]>
}

/**
 * How each list, tuple and dict changed between `prev` and `step`, keyed by
 * name. Items get the same deltas as scalars (`+8 from n`), new items and keys
 * get `new`, and removals are summed up on the container.
 */
export function containerChanges(
  step: Step,
  prev: Step | undefined,
  ranLine?: string,
): Record<string, ContainerChange> {
  if (!prev || prev.func !== step.func) return {}
  const used = ranLine ? identifiers(ranLine) : []
  const itemDelta = (target: string, old: Value, now: Value): DeltaPart[] => {
    const a = num(old)
    const b = num(now)
    const d = a !== null && b !== null ? roundOff(b - a) : 0
    return d !== 0 ? explain(d, target, step, used) : [{ text: `was ${short(formatValue(old))}`, from: null }]
  }
  const out: Record<string, ContainerChange> = {}
  for (const [name, value] of Object.entries(step.vars)) {
    const old = prev.vars[name]
    if (!old || !isContainer(value) || formatValue(old) === formatValue(value)) continue
    if (value.type === 'dict' && old.type === 'dict') {
      out[name] = dictChange(old.entries, value.entries, (o, n) => itemDelta(name, o, n))
    } else if ((value.type === 'list' || value.type === 'tuple') && old.type === value.type) {
      out[name] = listChange(old.items, value.items, (o, n) => itemDelta(name, o, n))
    } else {
      out[name] = { summary: [{ text: `was ${short(formatValue(old))}`, from: null }], parts: {} }
    }
  }
  return out
}

type ItemDelta = (old: Value, now: Value) => DeltaPart[]

function listChange(oldItems: Value[], newItems: Value[], itemDelta: ItemDelta): ContainerChange {
  const a = oldItems.map(formatValue)
  const b = newItems.map(formatValue)
  const parts: Record<string, DeltaPart[]> = {}
  const summary: DeltaPart[] = []
  const grow = b.length - a.length
  const same = (x: string[], y: string[]) => x.length === y.length && x.every((v, i) => v === y[i])
  const markNew = (from: number, to: number) => {
    for (let i = from; i < to; i++) parts[i] = [{ text: 'new', from: null }]
  }
  if (grow === 0 && same([...a].sort(), [...b].sort())) {
    // sort() or reverse(): one badge instead of one per moved item.
    summary.push({ text: 'reordered', from: null })
  } else if (grow > 0 && same(b.slice(0, a.length), a)) {
    markNew(a.length, b.length) // append / extend
  } else if (grow > 0 && same(b.slice(grow), a)) {
    markNew(0, grow) // insert at the front
  } else if (grow < 0 && (same(a.slice(0, b.length), b) || same(a.slice(-grow), b))) {
    summary.push(removed(-grow, 'item')) // pop() / pop(0)
  } else {
    b.forEach((v, i) => {
      if (i >= a.length) parts[i] = [{ text: 'new', from: null }]
      else if (v !== a[i]) parts[i] = itemDelta(oldItems[i], newItems[i])
    })
    if (grow < 0) summary.push(removed(-grow, 'item'))
  }
  return { summary, parts }
}

function dictChange(oldEntries: [Value, Value][], newEntries: [Value, Value][], itemDelta: ItemDelta): ContainerChange {
  const before = new Map(oldEntries.map(([k, v]) => [formatValue(k), v]))
  const parts: Record<string, DeltaPart[]> = {}
  for (const [k, v] of newEntries) {
    const key = formatValue(k)
    const was = before.get(key)
    if (!was) parts[key] = [{ text: 'new', from: null }]
    else if (formatValue(was) !== formatValue(v)) parts[key] = itemDelta(was, v)
    before.delete(key)
  }
  return { summary: before.size ? [removed(before.size, 'key')] : [], parts }
}

const isContainer = (v: Value) => v.type === 'list' || v.type === 'tuple' || v.type === 'dict'

const removed = (n: number, noun: string): DeltaPart => ({ text: `-${n} ${noun}${n === 1 ? '' : 's'}`, from: null })

const short = (text: string) => (text.length > 14 ? `${text.slice(0, 13)}…` : text)

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

export interface StepRoles {
  /** Variables the line that just ran changed, e.g. `total` in `total += n`. */
  targets: string[]
  /** Variables it read to make that change, e.g. `n`. */
  sources: string[]
}

/** Which variables the line between `prev` and `step` changed, and which ones it used to do it. */
export function stepRoles(step: Step, prev: Step | undefined, ranLine?: string): StepRoles {
  const scalars = scalarChanges(step, prev, ranLine)
  const boxes = containerChanges(step, prev, ranLine)
  const parts = [
    ...Object.values(scalars).flatMap((c) => c.deltas),
    ...Object.values(boxes).flatMap((c) => [...c.summary, ...Object.values(c.parts).flat()]),
  ]
  return {
    targets: [...Object.keys(scalars), ...Object.keys(boxes)],
    sources: [...new Set(parts.flatMap((d) => (d.from ? [d.from] : [])))],
  }
}

export interface NameRange {
  name: string
  /** 1-based start column, as Monaco counts. */
  start: number
  end: number
}

/** Where each of `names` appears on a line of code, skipping strings and comments. */
export function findNames(line: string, names: string[]): NameRange[] {
  const wanted = new Set(names)
  const out: NameRange[] = []
  // Strings and comments are matched first so names inside them are skipped.
  const token = /#.*$|(['"])(?:\\.|(?!\1).)*\1?|[A-Za-z_]\w*/g
  for (const m of line.matchAll(token)) {
    if (wanted.has(m[0])) out.push({ name: m[0], start: m.index + 1, end: m.index + 1 + m[0].length })
  }
  return out
}
