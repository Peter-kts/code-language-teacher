import type { AssignPlan, Brief, ExprPlan, LoopPlan, PointerSpec, Step, TargetPlan, Value } from '../types'
import { formatValue } from './format'

/** One value in a sum, e.g. the `12` from `ages["test"]` in `+16 = 4 + 12`. */
export interface SumPart {
  sign: 1 | -1
  /** The value as Python shows it, e.g. `12`. */
  value: string
  /** The code it came from, e.g. `ages["test"]`; null for a literal like `1`. */
  label: string | null
}

export interface DeltaPart {
  /** e.g. `+8`, `-1.5`, `new`, or `=` when the line set the value. */
  text: string
  /** Code that supplied the whole amount, e.g. `n` in `total += n` (or the new value, with `=`). */
  from: string | null
  /**
   * What the amount or new value is made of when the line combined several
   * things: `total += n + ages["test"]` gives `+16` = `4` (n) + `12` (ages["test"]).
   */
  sum?: SumPart[]
}

export interface ScalarChange {
  /** Value before this step, as shown to the user. */
  before: string
  /** Badges for the change; empty when there is nothing to add to the new value. */
  deltas: DeltaPart[]
}

export interface ContainerChange {
  /** Badges for the list or dict as a whole, e.g. `-2 items` or `reordered`. */
  summary: DeltaPart[]
  /** Badges per list index or dict key (keyed by the key as shown, e.g. `'a'`). */
  parts: Record<string, DeltaPart[]>
}

/** What the tracer worked out about the code, used to say what each change was made of. */
export interface Plans {
  plans: AssignPlan[]
  loops: LoopPlan[]
  pointers: PointerSpec[]
}

/** Something the line that ran read: a variable, or one item of a list or dict. */
export interface Read {
  name: string
  /** The list index or dict key it read, as shown (e.g. `2` or `'test'`). */
  item?: string
  /** Where its value went, e.g. `12` to `total`; empty when it was only used along the way (the `i` in `nums[i]`). */
  gave: { value: string; to: string }[]
  /** Its columns on the line that ran, for highlighting it in the editor. */
  start?: number
  end?: number
}

export interface StepRoles {
  /** Variables the line that just ran changed, e.g. `total` in `total += n`. */
  targets: string[]
  /** Variables it read to make that change, e.g. `n`. */
  sources: string[]
  /** Everything it read for the change, down to dict rows and list boxes. */
  reads: Read[]
}

const num = (v: Value | undefined): number | null =>
  v?.type === 'prim' && typeof v.value === 'number' ? v.value : null

const repr = (v: Value) => (v.type === 'prim' || v.type === 'other' ? v.repr : null)

/**
 * The step before `i` in the same call of the same function. Snapshots are
 * taken before each line runs, so the difference from that step is what its
 * line just did. Skipping other calls also credits a call's result to the line
 * that made it, and keeps recursive calls apart.
 */
export function previousInFrame(steps: Step[], i: number): Step | undefined {
  const step = steps[i]
  if (!step) return undefined
  const same = (s: Step) => (step.frame !== undefined ? s.frame === step.frame : s.func === step.func)
  for (let j = i - 1; j >= 0; j--) if (same(steps[j])) return steps[j]
  return undefined
}

/** How each scalar variable changed between `prev` and `step`, keyed by name. */
export function scalarChanges(step: Step, prev: Step | undefined, plans?: Plans): Record<string, ScalarChange> {
  if (!prev || prev.func !== step.func) return {}
  const work = lineWork(step, prev, plans)
  const out: Record<string, ScalarChange> = {}
  for (const [name, value] of Object.entries(step.vars)) {
    const old = prev.vars[name]
    const now = repr(value)
    if (!old || now === null) continue
    const before = repr(old)
    if (before === null || before === now) continue
    out[name] = { before, deltas: work.badges({ name }, old, value) }
  }
  return out
}

/**
 * How each list, tuple and dict changed between `prev` and `step`, keyed by
 * name. Items get the same badges as scalars (`+8 from n`), new items and keys
 * get `new`, and removals are summed up on the container.
 */
export function containerChanges(step: Step, prev: Step | undefined, plans?: Plans): Record<string, ContainerChange> {
  if (!prev || prev.func !== step.func) return {}
  const work = lineWork(step, prev, plans)
  const out: Record<string, ContainerChange> = {}
  for (const [name, value] of Object.entries(step.vars)) {
    const old = prev.vars[name]
    if (!old || !isContainer(value) || formatValue(old) === formatValue(value)) continue
    const itemDelta = (item: string, o: Value, n: Value) => {
      const badges = work.badges({ name, item }, o, n)
      return badges.length ? badges : [{ text: `was ${short(formatValue(o))}`, from: null }]
    }
    if (value.type === 'dict' && old.type === 'dict') {
      out[name] = dictChange(old.entries, value.entries, itemDelta)
    } else if ((value.type === 'list' || value.type === 'tuple') && old.type === value.type) {
      out[name] = listChange(old.items, value.items, itemDelta)
    } else {
      out[name] = { summary: [{ text: `was ${short(formatValue(old))}`, from: null }], parts: {} }
    }
  }
  return out
}

/** Which variables the line between `prev` and `step` changed, and what it read to do it. */
export function stepRoles(step: Step, prev: Step | undefined, plans?: Plans): StepRoles {
  const scalars = scalarChanges(step, prev, plans)
  const boxes = containerChanges(step, prev, plans)
  const targets = [...Object.keys(scalars), ...Object.keys(boxes)]
  const reads = prev && prev.func === step.func ? lineWork(step, prev, plans).reads(targets) : []
  const sources = reads.filter((r) => r.item === undefined && !targets.includes(r.name)).map((r) => r.name)
  return { targets, sources: [...new Set(sources)], reads }
}

/**
 * Variables the line between `prev` and `step` created (`total = 0`, the first
 * `n` of `for n in nums`): their badges, keyed by name, and what the line read for them.
 */
export function newVars(step: Step, prev: Step | undefined, plans?: Plans): { deltas: Record<string, DeltaPart[]>; reads: Read[] } {
  if (!prev || prev.func !== step.func) return { deltas: {}, reads: [] }
  const work = lineWork(step, prev, plans)
  const names = Object.keys(step.vars).filter((name) => !(name in prev.vars))
  const deltas = Object.fromEntries(names.map((name) => [name, work.badges({ name }, NOTHING, step.vars[name])]))
  return { deltas, reads: names.length ? work.reads(names) : [] }
}

/** What a variable or item held before it existed. */
const NOTHING: Value = { type: 'other', repr: '' }

type ItemDelta = (item: string, old: Value, now: Value) => DeltaPart[]

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
      else if (v !== a[i]) parts[i] = itemDelta(String(i), oldItems[i], newItems[i])
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
    else if (formatValue(was) !== formatValue(v)) parts[key] = itemDelta(key, was, v)
    before.delete(key)
  }
  return { summary: before.size ? [removed(before.size, 'key')] : [], parts }
}

const isContainer = (v: Value) => v.type === 'list' || v.type === 'tuple' || v.type === 'dict'

const removed = (n: number, noun: string): DeltaPart => ({ text: `-${n} ${noun}${n === 1 ? '' : 's'}`, from: null })

const short = (text: string) => (text.length > 14 ? `${text.slice(0, 13)}…` : text)

/** A changed variable, or one changed item of a list or dict (its index or key as shown). */
interface Changed {
  name: string
  item?: string
}

/** One target of an assignment and the expression that gave it its value. */
interface Pair {
  target: TargetPlan
  value: ExprPlan | null
  op: string | null
}

interface Term {
  sign: 1 | -1
  part: ExprPlan
  value: Brief
}

/** How a line made one change: what it added up (`add`), set the value to (`set`), or applied (`*` for `*=`, ...). */
interface Made {
  how: string
  terms: Term[]
}

/**
 * What the line between `prev` and `step` did, worked out from the tracer's
 * plans and the values it recorded while the line ran.
 */
function lineWork(step: Step, prev: Step, plans?: Plans) {
  const ran = step.ran ?? {}
  const line = prev.line
  const pairs = (plans?.plans ?? []).filter((p) => p.line === line).flatMap(pairsOf)
  const loop = plans?.loops.find((l) => l.line === line)
  /** List index or dict key as shown, for reading or writing `key` in the container `name`. */
  const itemOf = (name: string, key: ExprPlan | null, state: Step): string | null => {
    const k = key ? valueOf(key, ran) : undefined
    const box = state.vars[name]
    if (!k || !box) return null
    if (box.type === 'dict') return k[0]
    if (box.type !== 'list' && box.type !== 'tuple') return null
    if (k[1] === null || !Number.isInteger(k[1])) return null
    const i = k[1] < 0 ? box.items.length + k[1] : k[1]
    return i >= 0 && !(k[1] < 0 && box.truncated) ? String(i) : null
  }
  const matches = (target: TargetPlan, c: Changed) =>
    (target.kind === 'name' && c.item === undefined && target.name === c.name) ||
    (target.kind === 'item' && target.name === c.name && c.item !== undefined && itemOf(target.name, target.key, step) === c.item)
  /** `total = total + n`: the target itself as a part of its own value. */
  const isSelf = (part: ExprPlan, target: TargetPlan) =>
    (part.kind === 'name' && target.kind === 'name' && part.name === target.name) ||
    (part.kind === 'sub' &&
      target.kind === 'item' &&
      part.name === target.name &&
      itemOf(part.name, part.key, prev) !== null &&
      itemOf(part.name, part.key, prev) === itemOf(target.name, target.key, step))
  const withValues = (terms: { sign: 1 | -1; part: ExprPlan }[]): Term[] | null => {
    const out: Term[] = []
    for (const t of terms) {
      const value = valueOf(t.part, ran)
      if (!value) return null
      out.push({ ...t, value })
    }
    return out
  }

  /** How the line made the change `c` from `old` to `now`, if an assignment on it did. */
  const made = (c: Changed, old: Value, now: Value): Made | null => {
    const pair = pairs.find((p) => matches(p.target, c))
    if (!pair?.value) return null
    const { op, value, target } = pair
    const a = num(old)
    const b = num(now)
    if (op === '+' || op === '-') {
      const terms = withValues(sumTerms(value, op === '-' ? -1 : 1))
      return terms && a !== null && b !== null && addsUpTo(terms, b - a) ? { how: 'add', terms } : null
    }
    if (op === null) {
      const all = sumTerms(value)
      const self = all.findIndex((t) => t.sign === 1 && isSelf(t.part, target))
      if (self >= 0 && all.length > 1 && a !== null && b !== null) {
        const rest = withValues(all.filter((_, i) => i !== self))
        if (rest && addsUpTo(rest, b - a)) return { how: 'add', terms: rest }
      }
      const terms = withValues(all)
      if (!terms) return null
      // A numeric result must match; other values (text, lists) are taken as recorded.
      const total = terms.every((t) => t.value[1] !== null) && b !== null
      return !total || addsUpTo(terms, b) ? { how: 'set', terms } : null
    }
    if (op === 'call') return null // `stack.append(n)`: the list's own badges say what changed
    const v = valueOf(value, ran)
    return v ? { how: op, terms: [{ sign: 1, part: value, value: v }] } : null
  }

  /** `for n in nums`: the item a loop variable now holds, e.g. `nums[1]`. */
  const looped = (c: Changed): string | null => {
    if (!loop || c.item !== undefined || c.name !== loop.item) return null
    // A dict hands out its keys, not `d[i]`; lists, tuples and strings hand out `xs[i]`.
    const over = prev.vars[loop.over]
    const indexable = over?.type === 'list' || over?.type === 'tuple' || (over?.type === 'prim' && typeof over.value === 'string')
    if (!indexable) return null
    let index: number | null = null
    if (loop.index) index = num(step.vars[loop.index])
    else {
      const p = plans?.pointers.find((p) => p.label === loop.item && p.target === loop.over)
      if (p) index = p.var in step.hidden ? step.hidden[p.var] : num(step.vars[p.var])
    }
    return index === null ? null : String(index)
  }

  return {
    /** Badges for one change: how much it added and what from, or what it was set to. */
    badges(c: Changed, old: Value, now: Value): DeltaPart[] {
      const m = made(c, old, now)
      const a = num(old)
      const b = num(now)
      const d = a !== null && b !== null ? roundOff(b - a) : null
      if (m?.how === 'add' && d !== null) {
        if (d === 0) return []
        const named = m.terms.filter((t) => t.part.kind !== 'const')
        if (!named.length) return [{ text: signed(d), from: null }]
        if (m.terms.length === 1) return [{ text: signed(d), from: label(m.terms[0].part.text) }]
        return [{ text: signed(d), from: null, sum: m.terms.map(sumPart) }]
      }
      if (m?.how === 'set') {
        // `x = 5` or `seen = {}` says nothing the new value doesn't; `x = nums[i]` says where it came from.
        if (m.terms.every((t) => isLiteral(t.part))) return []
        if (m.terms.length === 1) return [{ text: '=', from: label(m.terms[0].part.text) }]
        return [{ text: '=', from: null, sum: m.terms.map(sumPart) }]
      }
      if (m) {
        const [t] = m.terms
        return [{ text: `${OP_SIGNS[m.how] ?? m.how}${t.value[0]}`, from: t.part.kind === 'const' ? null : label(t.part.text) }]
      }
      const index = looped(c)
      if (index !== null) return [{ text: '=', from: `${loop!.over}[${index}]` }]
      return d ? [{ text: signed(d), from: null }] : []
    },

    /** What the line read to make the `changed` variables' changes, and what each read gave to which. */
    reads(changed: string[]): Read[] {
      // One read per part of the code, so `n + n` lights up both.
      const byPart = new Map<number, Read>()
      const loopReads: Read[] = []
      const walk = (e: ExprPlan | null) => {
        if (!e) return
        if ((e.kind === 'name' || e.kind === 'sub') && e.id !== undefined && ran[e.id] && !byPart.has(e.id)) {
          const at = e.line === line ? { start: e.start, end: e.end } : {}
          const item = e.kind === 'sub' && e.name ? itemOf(e.name, e.key, prev) : null
          if (e.kind === 'name') byPart.set(e.id, { name: e.name, gave: [], ...at })
          else if (e.name && item !== null) byPart.set(e.id, { name: e.name, item, gave: [], ...at })
        }
        if (e.kind === 'sub') [e.of, e.key].forEach(walk)
        if (e.kind === 'bin') [e.left, e.right].forEach(walk)
        if (e.kind === 'unary') walk(e.operand)
        if (e.kind === 'seq') e.items.forEach(walk)
        if (e.kind === 'other') e.parts.forEach(walk)
      }
      for (const name of changed) {
        const old = prev.vars[name] ?? NOTHING
        const now = step.vars[name]
        if (!now) continue
        // The variable itself, and each of its items that changed.
        for (const c of [{ name }, ...(isContainer(now) ? changedItems(name, old, now) : [])]) {
          for (const pair of pairs.filter((p) => matches(p.target, c))) {
            walk(pair.value)
            if (pair.target.kind === 'item') walk(pair.target.key)
          }
          const m = made(c, itemValue(old, c.item), itemValue(now, c.item))
          const to = c.item === undefined ? c.name : `${c.name}[${c.item}]`
          for (const t of m?.terms ?? []) {
            if (t.part.id !== undefined) byPart.get(t.part.id)?.gave.push({ value: gave(t), to })
          }
          const index = looped(c)
          if (index !== null) loopReads.push({ name: loop!.over, item: index, gave: [], start: loop!.start, end: loop!.end })
        }
      }
      return [...byPart.values(), ...loopReads]
    },
  }
}

/** A value written out in the code, like `5`, `[4, 8, 15]` or `{}`, that reads no variables. */
function isLiteral(e: ExprPlan | null): boolean {
  if (!e) return false
  if (e.kind === 'const') return true
  if (e.kind === 'seq') return e.items.every(isLiteral)
  if (e.kind === 'unary') return isLiteral(e.operand)
  return e.kind === 'other' && !e.parts.length && /^[[{(]/.test(e.text)
}

/** Each target of an assignment with the expression that gave it its value (`a, b = b, a + b` pairs up). */
function pairsOf(stmt: AssignPlan): Pair[] {
  const out: Pair[] = []
  const add = (target: TargetPlan, value: ExprPlan | null) => {
    if (target.kind === 'seq') {
      const items = value?.kind === 'seq' && value.items.length === target.items.length ? value.items : null
      target.items.forEach((t, i) => add(t, items?.[i] ?? null))
    } else out.push({ target, value, op: stmt.op })
  }
  for (const t of stmt.targets) add(t, stmt.value)
  return out
}

/** `a - (b + c)` gives +a, -b, -c: the parts a sum adds up from. */
function sumTerms(e: ExprPlan, sign: 1 | -1 = 1): { sign: 1 | -1; part: ExprPlan }[] {
  if (e.kind === 'bin' && (e.op === '+' || e.op === '-') && e.left && e.right) {
    return [...sumTerms(e.left, sign), ...sumTerms(e.right, e.op === '-' ? (-sign as 1 | -1) : sign)]
  }
  if (e.kind === 'unary' && (e.op === '-' || e.op === '+') && e.operand) {
    return sumTerms(e.operand, e.op === '-' ? (-sign as 1 | -1) : sign)
  }
  return [{ sign, part: e }]
}

/** The value a part had when its line ran; undefined if it didn't run. */
function valueOf(e: ExprPlan, ran: Record<string, Brief>): Brief | undefined {
  return e.kind === 'const' ? e.value : e.id !== undefined ? ran[e.id] : undefined
}

function addsUpTo(terms: Term[], target: number) {
  if (terms.some((t) => t.value[1] === null)) return false
  return close(terms.reduce((s, t) => s + t.sign * t.value[1]!, 0), target)
}

function changedItems(name: string, old: Value, now: Value): Changed[] {
  const keys = (v: Value) =>
    v.type === 'dict'
      ? new Map(v.entries.map(([k, val]) => [formatValue(k), formatValue(val)]))
      : v.type === 'list' || v.type === 'tuple'
        ? new Map(v.items.map((val, i) => [String(i), formatValue(val)]))
        : new Map<string, string>()
  const a = keys(old)
  return [...keys(now)].filter(([k, v]) => a.get(k) !== v).map(([item]) => ({ name, item }))
}

/** A variable's value, or one of its items; a missing item (a new key) reads as nothing. */
function itemValue(v: Value, item: string | undefined): Value {
  if (item === undefined) return v
  const found =
    v.type === 'dict'
      ? v.entries.find(([k]) => formatValue(k) === item)?.[1]
      : v.type === 'list' || v.type === 'tuple'
        ? v.items[Number(item)]
        : undefined
  return found ?? NOTHING
}

const sumPart = (t: Term): SumPart => ({ sign: t.sign, value: t.value[0], label: t.part.kind === 'const' ? null : label(t.part.text) })

/** Code short enough for a badge: `max(best, count[c])` reads as `max(…)`. */
function label(text: string) {
  if (text.length <= 16) return text
  const call = /^([\w.]+)\(/.exec(text)
  return call ? `${call[1]}(…)` : `${text.slice(0, 15)}…`
}

/** What one part gave to a change, e.g. `12`, or `-4` when it was subtracted. */
function gave(t: Term) {
  const n = t.value[1]
  if (n !== null) return String(roundOff(t.sign * n))
  return t.sign < 0 ? `-${t.value[0]}` : t.value[0]
}

const OP_SIGNS: Record<string, string> = { '*': '×' }

const close = (x: number, y: number) => Math.abs(x - y) <= 1e-9 * Math.max(1, Math.abs(y))

const signed = (x: number) => (x >= 0 ? `+${x}` : `${x}`)

// 0.1 + 0.2 should read as +0.3, not +0.30000000000000004.
const roundOff = (x: number) => (Number.isInteger(x) ? x : Number(x.toPrecision(12)))

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
