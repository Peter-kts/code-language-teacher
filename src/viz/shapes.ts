import type { CallSite, CheckPlan, ExprPlan, LoopBlock, NodeData, Step, Value } from '../types'
import { formatValue } from './format'

// What the visualizer works out about a step beyond its variables: why an `if` or `while`
// went the way it did, which pass of a loop this is, the calls waiting on this one, and which
// lists and dicts look like heaps, graphs or intervals. Pure functions, so they can be
// tested without a browser; Visualizer.tsx and the views draw them.

// ---- decisions ----

export interface Decision {
  line: number
  kind: CheckPlan['kind']
  /** The test as written, e.g. `nums[mid] < target`. */
  text: string
  /** The same test with the values it read put in, e.g. `7 < 9`; null when that adds nothing. */
  filled: string | null
  result: boolean
  /** What that meant, e.g. `so the loop goes round again`. */
  meaning: string
}

const MEANINGS: Record<CheckPlan['kind'], [string, string]> = {
  if: ['so it runs the if block', 'so it skips the if block'],
  elif: ['so it runs this branch', 'so it skips this branch'],
  while: ['so the loop goes round again', 'so the loop stops'],
  for: ['so the loop goes round again', 'so the loop stops'],
}

/** The `if`, `while` or `for` test the line before this step ran, and what it came out as. */
export function decisionAt(step: Step, prev: Step | undefined, checks: CheckPlan[] | undefined): Decision | null {
  if (!prev || !checks?.length || prev.func !== step.func) return null
  const ran = step.ran ?? {}
  for (const c of checks) {
    if (c.line !== prev.line || !ran[c.id]) continue
    const result = /^(true|True)$/.test(ran[c.id][0])
    // `if stack:` has no parts to fill in: show what stack held instead.
    const own = c.value.id !== undefined && c.value.kind !== 'const' && !isLogic(c.value) ? ran[c.value.id] : undefined
    const filled = own && c.value.kind !== 'other' ? shortValue(own[0]) : fillIn(c.value, ran)
    return {
      line: c.line,
      kind: c.kind,
      text: c.value.text,
      filled: filled && filled !== c.value.text ? filled : null,
      result,
      meaning: MEANINGS[c.kind][result ? 0 : 1],
    }
  }
  return null
}

/**
 * A test with the values its parts had put in their place: `nums[mid] < target` reads `7 < 9`.
 * Comparisons, `and`/`or` and `not` are opened up; anything else that was recorded (a name,
 * an index, a sum, a call) becomes its value. Parts that never ran (after a short-circuit) stay as written.
 */
function fillIn(test: ExprPlan, ran: Record<string, [string, number | null]>): string | null {
  if (test.start === undefined || test.end === undefined) return null
  const base = test.start
  const swaps: { start: number; end: number; text: string }[] = []
  const visit = (e: ExprPlan | null, top: boolean) => {
    if (!e) return
    const opens = top || isLogic(e)
    if (!opens && e.id !== undefined && ran[e.id] && e.start !== undefined && e.end !== undefined && e.kind !== 'const') {
      swaps.push({ start: e.start - base, end: e.end - base, text: shortValue(ran[e.id][0]) })
      return
    }
    if (e.kind === 'other') e.parts.forEach((p) => visit(p, false))
    else if (e.kind === 'unary') visit(e.operand, false)
    else if (e.kind === 'seq') e.items.forEach((p) => visit(p, false))
  }
  visit(test, true)
  if (!swaps.length) return null
  let out = test.text
  // Columns are from the source line; the plan's text has its spaces squeezed, so only use them when it matches.
  if (test.end - test.start !== test.text.length) return null
  for (const s of swaps.sort((a, b) => b.start - a.start)) out = out.slice(0, s.start) + s.text + out.slice(s.end)
  return out
}

/** A comparison, `and`/`or` or `not`: opened up rather than replaced by its value. */
function isLogic(e: ExprPlan): boolean {
  if (e.kind === 'unary') return e.op === 'not' || e.op === '!'
  if (e.kind !== 'other') return false
  // A call reads like `name(…)`; a comparison or `and` has its parts side by side.
  if (/^[\w.$]+\s*\(/.test(e.text) && e.text.endsWith(')')) return false
  return e.parts.length > 0 && !/^[[{(]/.test(e.text)
}

const shortValue = (text: string) => (text.length > 14 ? `${text.slice(0, 13)}…` : text)

// ---- loop passes ----

export interface LoopPass {
  line: number
  kind: LoopBlock['kind']
  /** Which pass of the loop this step is in, counting from 1. */
  pass: number
  total: number | null
  /** The loop has gone through everything and is about to stop. */
  done: boolean
}

/**
 * The loops around this step and which pass each is on, outermost first. A loop's line
 * steps once before each pass (and once more when it ends), so counting those steps since the
 * loop began gives the pass. How many passes there will be comes from what the loop goes
 * over (its length), or for a JavaScript counting loop from its start and limit.
 */
export function loopPasses(steps: Step[], index: number, blocks: LoopBlock[] | undefined): LoopPass[] {
  const step = steps[index]
  if (!step || !blocks?.length) return []
  const same = (s: Step) => (step.frame !== undefined ? s.frame === step.frame : s.func === step.func)
  const around = blocks.filter((b) => b.line <= step.line && step.line <= b.end).sort((a, b) => a.line - b.line || b.end - a.end)
  return around.map((b) => {
    let count = 0
    let total: number | null = null
    for (let j = index; j >= 0; j--) {
      const s = steps[j]
      if (!same(s)) continue
      if (s.line < b.line || s.line > b.end) break
      if (s.line === b.line) count++
      const ran = s.ran ?? {}
      if (b.id !== undefined && ran[b.id]?.[1] != null) total = ran[b.id][1]
      if (b.count) {
        const from = ran[b.count.from]?.[1]
        const to = ran[b.count.to]?.[1]
        // The values from the loop's first check: the counter's start and the limit.
        if (from != null && to != null) total = Math.max(0, (to - from) * b.count.step + (b.count.inclusive ? 1 : 0))
      }
    }
    const pass = Math.max(1, count)
    const done = total !== null && pass > total
    return { line: b.line, kind: b.kind, pass: done ? total! : pass, total, done }
  })
}

// ---- the call stack ----

export interface StackEntry extends CallSite {
  /** The variables of a waiting call, as they were when it made the call (its last step before now). */
  step?: Step
  current: boolean
}

/** The calls running at step `index`, outermost first, each with its last snapshot so it can be shown. */
export function callStack(steps: Step[], index: number): StackEntry[] {
  const step = steps[index]
  if (!step?.stack?.length) return []
  return step.stack.map((site, i) => {
    const current = i === step.stack!.length - 1
    let last: Step | undefined
    if (!current) {
      for (let j = index - 1; j >= 0; j--) {
        if (steps[j].frame === site.frame && steps[j].func === site.func) {
          last = steps[j]
          break
        }
      }
    }
    return { ...site, current, step: current ? step : last }
  })
}

// ---- what a list or dict looks like ----

/** How a variable can be drawn; the first one a value allows is its default. */
export type Shape = 'boxes' | 'heap' | 'grid' | 'graph' | 'intervals' | 'table'

export const SHAPE_LABELS: Record<Shape, string> = {
  boxes: 'boxes',
  heap: 'heap (tree)',
  grid: 'grid',
  graph: 'graph',
  intervals: 'timeline',
  table: 'table',
}

const MAX_GRID = 24
const MAX_GRAPH = 24

const isNum = (v: Value) => v.type === 'prim' && typeof v.value === 'number'
const isSeq = (v: Value): v is Extract<Value, { items: Value[] }> => v.type === 'list' || v.type === 'tuple'

/** A list of lists of plain values (a grid, a DP table), small enough to draw as a table. */
export function isGrid(v: Value): boolean {
  if (v.type !== 'list' || v.set || v.items.length < 2 || v.items.length > MAX_GRID) return false
  return v.items.every((row) => row.type === 'list' && row.items.length > 0 && row.items.length <= MAX_GRID && row.items.every((c) => c.type === 'prim'))
}

/** `[[1, 3], [2, 6]]`: pairs of numbers, each start no bigger than its end. */
export function isIntervals(v: Value): boolean {
  if (!isSeq(v) || v.set || !v.items.length || v.items.length > 40) return false
  return v.items.every((p) => isSeq(p) && p.items.length === 2 && p.items.every(isNum) && num(p.items[0])! <= num(p.items[1])!)
}

const num = (v: Value | undefined) => (v?.type === 'prim' && typeof v.value === 'number' ? v.value : null)

/** A graph's nodes and edges, by key as shown. */
export interface GraphData {
  nodes: string[]
  edges: [string, string][]
  /** Every edge goes both ways, so it is drawn as a plain line. */
  undirected: boolean
}

/**
 * An adjacency list: a dict (or Map, or object) from each node to a list or set of its neighbors,
 * or a list whose item i lists the neighbors of node i. Neighbors must be nodes of the graph, or
 * at least plain values (a node with no list of its own is added).
 */
export function graphOf(v: Value): GraphData | null {
  let rows: [string, Value][]
  if (v.type === 'dict') rows = v.entries.map(([k, val]) => [formatValue(k), val])
  else if (v.type === 'list' && !v.set) rows = v.items.map((val, i) => [String(i), val])
  else return null
  if (!rows.length || rows.length > MAX_GRAPH || v.truncated) return null
  const nodes = rows.map(([k]) => k)
  const known = new Set(nodes)
  const edges: [string, string][] = []
  let fromKeys = 0
  for (const [k, val] of rows) {
    if (!isSeq(val) || val.truncated) return null
    for (const n of val.items) {
      if (n.type !== 'prim') return null
      const key = formatValue(n)
      if (known.has(key)) fromKeys++
      else if (v.type === 'list') return null // a list's nodes are its indexes
      else {
        nodes.push(key)
        known.add(key)
      }
      edges.push([k, key])
    }
  }
  // Most neighbors should be nodes the graph lists, or it is just a dict of lists.
  if (!edges.length || fromKeys < edges.length / 2 || nodes.length > MAX_GRAPH) return null
  const has = new Set(edges.map(([a, b]) => `${a}\0${b}`))
  const undirected = edges.every(([a, b]) => has.has(`${b}\0${a}`))
  return { nodes, edges, undirected }
}

/** Every way `value` can be drawn, its default first. `name` and `heaps` help guess heaps and graphs. */
export function shapesFor(name: string, value: Value, heaps: Set<string>): Shape[] {
  const out: Shape[] = []
  if (value.type === 'dict') {
    const graph = graphOf(value) !== null
    if (graph && GRAPH_NAME.test(name)) out.push('graph', 'table')
    else out.push('table', ...(graph ? (['graph'] as Shape[]) : []))
    return out
  }
  if (!isSeq(value) || value.set) return ['boxes']
  const grid = isGrid(value)
  const intervals = isIntervals(value)
  const graph = graphOf(value) !== null
  const numbers = value.items.length > 1 && value.items.every((i) => i.type === 'prim' || isSeq(i))
  if (heaps.has(name) || (HEAP_NAME.test(name) && numbers)) out.push('heap', 'boxes')
  if (graph && GRAPH_NAME.test(name)) out.push('graph')
  // Two numbers per row, start before end: almost always intervals (a 2-wide DP table is rare).
  if (intervals && (!grid || value.items.every((p) => isSeq(p) && p.items.length === 2))) out.push('intervals')
  if (grid) out.push('grid')
  if (intervals && !out.includes('intervals')) out.push('intervals')
  if (graph && !out.includes('graph')) out.push('graph')
  if (!out.includes('boxes')) out.push('boxes')
  if (numbers && !out.includes('heap')) out.push('heap')
  return out
}

const HEAP_NAME = /heap|^pq$|^h$|priority/i
const GRAPH_NAME = /graph|adj|neighbou?rs|edges|^g$|prereq|children|links/i

/**
 * Lists that a heap object keeps its items in, by variable: a node of a class named like a heap
 * (MinHeap, say) whose field is a list. Inside its methods the list is a local variable too
 * (`const a = this.items`), so a variable holding the same list counts as a heap.
 */
export function heapLists(step: Step): { name: string; value: Value; owner?: string }[] {
  const out: { name: string; value: Value; owner?: string }[] = []
  const lists: Value[] = []
  const nodes = step.nodes ?? {}
  for (const [id, data] of Object.entries(nodes)) {
    if (!/heap/i.test(data.cls)) continue
    for (const [field, v] of data.fields) {
      if (v.type === 'list' && !v.set) {
        lists.push(v)
        const owner = Object.entries(step.vars).find(([, val]) => val.type === 'ref' && String(val.id) === id)?.[0]
        if (owner) out.push({ name: `${owner}.${field}`, value: v, owner: id })
      }
    }
  }
  // Same object (JavaScript knows) or the same items (Python, where `a = self.items`).
  for (const [name, v] of Object.entries(step.vars)) {
    if (v.type !== 'list' || v.set || !v.items.length) continue
    if (lists.some((l) => l.type === 'list' && ((l.id !== undefined && l.id === v.id) || formatValue(l) === formatValue(v)))) out.push({ name, value: v })
  }
  return out
}

/** Ids of heap nodes drawn as a heap instead of in the node drawing. */
export function heapNodeIds(step: Step): Set<string> {
  const out = new Set<string>()
  for (const [id, data] of Object.entries(step.nodes ?? {}) as [string, NodeData][]) {
    if (/heap/i.test(data.cls) && data.fields.some(([, v]) => v.type === 'list') && !data.fields.some(([, v]) => v.type === 'ref')) out.add(id)
  }
  return out
}

// ---- long lists ----

/** A box to draw, or a gap standing for the boxes left out between two shown ones. */
export type Slot = number | { gap: number }

const WINDOW = 30
const PAD = 3

/**
 * Which boxes of a long list to draw: all of them when there are few, otherwise the ones
 * around the pointers and the boxes the step changed or read, with gaps for the rest.
 */
export function visibleSlots(length: number, important: number[]): Slot[] {
  if (length <= WINDOW) return Array.from({ length }, (_, i) => i)
  const keep = new Set<number>()
  const marks = important.filter((i) => i >= 0 && i < length)
  if (!marks.length) for (let i = 0; i < 20; i++) keep.add(i)
  for (const m of marks) for (let i = m - PAD; i <= m + PAD; i++) if (i >= 0 && i < length) keep.add(i)
  keep.add(0)
  keep.add(length - 1)
  const sorted = [...keep].sort((a, b) => a - b)
  const out: Slot[] = []
  sorted.forEach((i, k) => {
    const before = k === 0 ? -1 : sorted[k - 1]
    if (i - before > 1) out.push({ gap: i - before - 1 })
    out.push(i)
  })
  return out
}
