// Runs JavaScript that instrument.ts rewrote and records a snapshot of the variables
// before each statement: the same TraceResult JSON that src/python/tracer.py makes,
// so the visualizer, history and console don't need to know which language ran.

import type { Brief, CallSite, CodeError, ConsoleEntry, NodeData, NodeIo, NodeKind, RunCase, Step, TestResult, TraceResult, Value } from '../types'
import { formatValue } from '../viz/format'
import { instrument, MODULE } from './instrument'

const MAX_STEPS = 2000
const MAX_LIST_ITEMS = 64
/** A variable's own array can be longer, so the boxes around a pointer far into it can still be drawn. */
const MAX_TOP_ITEMS = 200
const MAX_DEPTH = 3
const MAX_BRIEF = 60
const MAX_OTHER = 80
const TEST_SECONDS = 2
const MAX_NODES = 60
const MAX_NODE_FIELDS = 12
/** How far a returned linked list is followed before it counts as looping forever. */
const MAX_LIST_NODES = 100_000

/** Thrown when a run takes too many steps; never reported as the program's own error. */
class StepLimit {}

/** Thrown when a test case with a step budget goes over it. */
class TooSlow {}

// The node classes LeetCode defines for its linked list and tree problems. The learner's code
// gets them (it can also declare its own), and linked list and tree inputs are built from them.
export class ListNode {
  val: unknown
  next: ListNode | null
  constructor(val: unknown = 0, next: ListNode | null = null) {
    this.val = val
    this.next = next
  }
}

export class TreeNode {
  val: unknown
  left: TreeNode | null
  right: TreeNode | null
  constructor(val: unknown = 0, left: TreeNode | null = null, right: TreeNode | null = null) {
    this.val = val
    this.left = left
    this.right = right
  }
}

/** A JSON argument as the linked list or tree it stands for (see NodeIo in src/types.ts). */
export function toNodes(value: unknown, kind: NodeKind): unknown {
  if (kind === 'lists') return (value as unknown[]).map((v) => toNodes(v, 'list'))
  if (kind === 'list' || kind === 'cycle') {
    const { values, pos } = kind === 'cycle' ? (value as { values: unknown[]; pos?: number }) : { values: value as unknown[], pos: -1 }
    const nodes = values.map((v) => new ListNode(v))
    nodes.forEach((n, i) => (n.next = nodes[i + 1] ?? null))
    if (nodes.length && pos !== undefined && pos >= 0 && pos < nodes.length) nodes[nodes.length - 1].next = nodes[pos]
    return nodes[0] ?? null
  }
  const values = value as unknown[]
  if (!values.length || values[0] === null) return null
  const root = new TreeNode(values[0])
  const queue = [root]
  let i = 1
  for (let q = 0; q < queue.length && i < values.length; q++) {
    for (const side of ['left', 'right'] as const) {
      if (i < values.length && values[i] !== null) {
        const child = new TreeNode(values[i])
        queue[q][side] = child
        queue.push(child)
      }
      i++
    }
  }
  return root
}

/** A returned linked list or tree as JSON, the way the tests write it. */
export function fromNodes(value: unknown, kind: NodeKind): unknown {
  if (value === null || value === undefined) return []
  if (kind === 'lists') return (value as unknown[]).map((v) => fromNodes(v, 'list'))
  const node = value as Record<string, unknown>
  if (kind === 'list' || kind === 'cycle') {
    if (typeof value !== 'object' || !('next' in node)) throw new TypeError(`return the first node of the list (a ListNode), not ${show(value)}`)
    const out: unknown[] = []
    for (let n: Record<string, unknown> | null = node; n; n = n.next as Record<string, unknown> | null) {
      out.push(n.val)
      if (out.length > MAX_LIST_NODES) throw new Error("the list you returned never ends: some node's next leads back into it")
    }
    return out
  }
  if (typeof value !== 'object' || !('left' in node)) throw new TypeError(`return the root of the tree (a TreeNode), not ${show(value)}`)
  const out: unknown[] = []
  const queue: (Record<string, unknown> | null)[] = [node]
  for (let q = 0; q < queue.length; q++) {
    if (queue.length > MAX_LIST_NODES) throw new Error('the tree you returned loops back on itself')
    const n = queue[q]
    if (!n) {
      out.push(null)
      continue
    }
    out.push(n.val)
    queue.push((n.left as Record<string, unknown>) ?? null, (n.right as Record<string, unknown>) ?? null)
  }
  while (out.length && out[out.length - 1] === null) out.pop()
  return out
}

const callArgs = (args: unknown[], io?: NodeIo) =>
  copy(args).map((a, i) => (io?.args[i] ? toNodes(a, io.args[i] as NodeKind) : a))
const answer = (value: unknown, io?: NodeIo) => (io?.result ? fromNodes(value, io.result) : value)

interface Frame {
  id: number
  func: string
  /** The line it last stepped on. */
  line: number
  getters: Record<string, () => unknown> | null
  hidden: Record<string, number>
  /** Values recorded since its last step, by part id. */
  pending: Record<string, Brief> | null
  /** Its last step, so a loop line can keep showing the item from the pass that just ended. */
  last: Step | null
  /** Outer variables it can read, when it is a closure. */
  captured: string[]
  /** What its `return` handed back. */
  ret?: Brief
  /** An error is leaving it, so it gives nothing back. */
  threw?: boolean
  /** What a call it made just gave back, for its next step. */
  returned?: Step['returned']
  /** Its parameters' names, and their values as they came in (read on its first step). */
  params: string[]
  args?: string
}

type Getters = Record<string, () => unknown>

/** What the rewritten code calls: steps, recorded values, and function starts and ends. */
interface Hooks {
  s(line: number, getters: Getters): void
  r<T>(id: number, value: T): T
  e(func: string, captured?: string[], params?: string[]): void
  o(): void
  f<F extends object>(fn: F, getters: Getters, name: string): F
  x(err: unknown): void
  i(line: number, iterable: Iterable<unknown>, getters: Getters, carry: string[], hidden: string | null, id: number): Iterable<unknown>
  k(obj: object): string[]
  /** Whether an `if`, `while` or `for` test came out true. */
  b<T>(id: number, value: T): T
  /** What a `return` hands back. */
  v<T>(value: T): T
}

/** How many items a loop will go over, when that can be told without running through it. */
function sizeOf(iterable: unknown): number | null {
  if (typeof iterable === 'string' || Array.isArray(iterable)) return iterable.length
  if (iterable instanceof Map || iterable instanceof Set) return iterable.size
  return null
}

/** The keys a `for...in` loop visits. */
function forInKeys(obj: object): string[] {
  const out: string[] = []
  for (const k in obj) out.push(k)
  return out
}

/** What each closure the program made remembers, and how to read it; and which object is which. */
interface Memory {
  closures: WeakMap<object, { getters: Getters; name: string }>
  ids: WeakMap<object, number>
  nextId: number
}

/** Set while a traced run is going, so serialize can draw closures and tell objects apart. */
let memory: Memory | null = null

/** Set while a step's snapshot is taken: the class instances its variables reach, by id. */
let heap: Record<string, NodeData> | null = null

class Tracer implements Hooks {
  steps: Step[] = []
  console: ConsoleEntry[] = []
  stdout = ''
  truncated = false
  /** The calls of the user's code an error went up through, outermost first. */
  traces = new WeakMap<object, { line: number; func: string }[]>()
  lastTrace: { line: number; func: string }[] | null = null
  private stack: Frame[] = []
  private nextFrame = 1

  constructor(private maxSteps = MAX_STEPS) {}

  s(line: number, getters: Getters) {
    const frame = this.top()
    frame.line = line
    frame.getters = getters
    this.snapshot(frame, line, getters)
  }

  r<T>(id: number, value: T): T {
    const frame = this.stack[this.stack.length - 1]
    if (frame) (frame.pending ??= {})[id] = brief(value)
    return value
  }

  b<T>(id: number, value: T): T {
    const frame = this.top()
    if (frame) (frame.pending ??= {})[id] = [value ? 'true' : 'false', null]
    return value
  }

  v<T>(value: T): T {
    const frame = this.top()
    if (frame) frame.ret = brief(value)
    return value
  }

  e(func: string, captured: string[] = [], params: string[] = []) {
    this.stack.push({ id: this.nextFrame++, func, line: this.top()?.line ?? 1, getters: null, hidden: {}, pending: null, last: null, captured, params })
  }

  f<F extends object>(fn: F, getters: Getters, name: string): F {
    memory?.closures.set(fn, { getters, name })
    return fn
  }

  o() {
    const frame = this.stack.pop()
    // The final state of the program, or of the problem's function when it was called.
    if (frame && !this.stack.length && frame.getters && !this.truncated) this.snapshot(frame, frame.line, frame.getters)
    const caller = this.top()
    if (frame && caller && !frame.threw) caller.returned = { func: frame.func, value: frame.ret ?? brief(undefined) }
  }

  x(err: unknown) {
    const top = this.top()
    if (top) top.threw = true
    if (err instanceof StepLimit) return
    const trace = this.stack.map((f) => ({ line: f.line, func: f.func }))
    if (err !== null && typeof err === 'object') {
      if (!this.traces.has(err)) this.traces.set(err, trace)
    } else if (!this.lastTrace) this.lastTrace = trace
  }

  *i(line: number, iterable: Iterable<unknown>, getters: Getters, carry: string[], hidden: string | null, id: number) {
    const frame = this.top()
    const size = sizeOf(iterable)
    if (size !== null) (frame.pending ??= {})[id] = [String(size), size]
    let index = 0
    for (const item of iterable) {
      // The step before the first pass is the one in front of the loop.
      if (index > 0) this.loopStep(frame, line, getters, carry)
      if (hidden) frame.hidden[hidden] = index
      index++
      yield item
    }
    if (index > 0) this.loopStep(frame, line, getters, carry)
  }

  k(obj: object) {
    return forInKeys(obj)
  }

  /** Writes from console.log and friends, merged per line and step. */
  write(stream: 'stdout' | 'stderr', text: string) {
    if (stream === 'stdout') this.stdout += text
    const line = this.stack.length ? this.top().line : null
    const last = this.console[this.console.length - 1]
    if (last && last.stream === stream && last.line === line && last.step === this.steps.length) last.text += text
    else this.console.push({ stream, text, line, step: this.steps.length })
  }

  private top() {
    return this.stack[this.stack.length - 1]
  }

  /** The loop line again between passes; its own variables keep the values of the pass that ended. */
  private loopStep(frame: Frame, line: number, getters: Getters, carry: string[]) {
    frame.line = line
    const kept: Record<string, Value> = {}
    for (const name of carry) if (frame.last && name in frame.last.vars) kept[name] = frame.last.vars[name]
    this.snapshot(frame, line, getters, kept)
  }

  private snapshot(frame: Frame, line: number, getters: Getters, extra: Record<string, Value> = {}) {
    if (this.steps.length >= this.maxSteps) {
      this.truncated = true
      throw new StepLimit()
    }
    const vars: Record<string, Value> = {}
    const nodes: Record<string, NodeData> = {}
    const outer: string[] = []
    heap = nodes
    try {
      for (const [name, get] of Object.entries(getters)) {
        let value: unknown
        try {
          value = get()
        } catch {
          continue // declared with let or const further down: not there yet
        }
        // Plain functions are code, not data; closures are drawn with what they remember.
        if (typeof value === 'function' && !memory?.closures.has(value)) continue
        vars[name] = serialize(value)
      }
      // Nodes the calls further out hold (the whole tree while a recursive call looks at one
      // branch), so the drawing keeps its context.
      for (const outerFrame of this.stack) {
        if (outerFrame === frame || outerFrame.func === MODULE || !outerFrame.getters) continue
        for (const get of Object.values(outerFrame.getters)) {
          let value: unknown
          try {
            value = get()
          } catch {
            continue
          }
          if (value !== null && typeof value === 'object') refs(serialize(value), outer)
        }
      }
    } finally {
      heap = null
    }
    for (const [name, value] of Object.entries(extra)) if (!(name in vars)) vars[name] = value
    const step: Step = { line, func: frame.func, frame: frame.id, vars, hidden: { ...frame.hidden }, stdout: this.stdout }
    if (frame.args === undefined) frame.args = frame.params.filter((p) => p in vars).map((p) => `${p}=${brief(getters[p]?.())[0]}`).join(', ')
    const waiting = this.stack.filter((f) => f !== frame)
    const site = (f: Frame, at: number): CallSite => ({ func: f.func, line: at, frame: f.id, ...(f.func !== MODULE && f.args !== undefined && { args: f.args }) })
    if (waiting.length) step.stack = [...waiting.map((f) => site(f, f.line)), site(frame, line)]
    if (frame.returned) {
      step.returned = frame.returned
      frame.returned = undefined
    }
    if (Object.keys(nodes).length) {
      step.nodes = nodes
      if (outer.length) step.outer = [...new Set(outer)]
    }
    const captured = frame.captured.filter((n) => n in vars)
    if (captured.length) step.captured = captured
    if (frame.pending) {
      step.ran = frame.pending
      frame.pending = null
    }
    frame.last = step
    this.steps.push(step)
  }
}

/** Steps nothing, only stops code that runs too long (for the untraced test runs). */
class Guard implements Hooks {
  /** Statements run since start: the steps a speed test counts. */
  steps = 0
  private limit = Infinity
  private deadline = 0

  start(maxSteps?: number) {
    this.deadline = Date.now() + TEST_SECONDS * 1000
    this.steps = 0
    this.limit = maxSteps ?? Infinity
  }

  s() {
    if (++this.steps > this.limit) throw new TooSlow()
    if (this.steps % 1024 === 0 && Date.now() > this.deadline) throw this.limit < Infinity ? new TooSlow() : new Error('took too long')
  }
  r<T>(_id: number, value: T) {
    return value
  }
  e() {}
  o() {}
  f<F extends object>(fn: F) {
    return fn
  }
  x() {}
  *i(_line: number, iterable: Iterable<unknown>) {
    for (const item of iterable) {
      this.s()
      yield item
    }
  }
  k(obj: object) {
    return forInKeys(obj)
  }
  b<T>(_id: number, value: T) {
    return value
  }
  v<T>(value: T) {
    return value
  }
}

/** A console that sends what the program writes to `write`. */
function makeConsole(write: (stream: 'stdout' | 'stderr', text: string) => void) {
  const out = (stream: 'stdout' | 'stderr') => (...args: unknown[]) => write(stream, args.map(show).join(' ') + '\n')
  return { log: out('stdout'), info: out('stdout'), debug: out('stdout'), table: out('stdout'), error: out('stderr'), warn: out('stderr') }
}

/** Text for console.log: strings as they are, other values as code. */
function show(v: unknown): string {
  return typeof v === 'string' ? v : formatValue(serialize(v))
}

/**
 * Compile the rewritten code into a function of (__ct, console). The node classes sit in an
 * outer scope, so the learner's own `class ListNode` shadows them instead of clashing.
 */
function compile(code: string): (hooks: Hooks, console: unknown) => unknown {
  const run = new Function('__ct', 'console', '__nodes', `"use strict"; const { ListNode, TreeNode } = __nodes; return (function () {\n${code}\n})()`)
  return (hooks, console) => run(hooks, console, { ListNode, TreeNode })
}

function errorText(err: unknown): string {
  if (err instanceof Error) return `${err.name}: ${err.message}`
  return `Uncaught ${show(err)}`
}

const copy = (args: unknown[]): unknown[] => JSON.parse(JSON.stringify(args))

/** `twoSum([2, 7, 11, 15], 9)` */
const callText = (call: { name: string; args: unknown[] }) => `${call.name}(${call.args.map(show).join(', ')})`

/**
 * Trace `source`. With `call`, also call that function once the code has run
 * (LeetCode style) and trace its body.
 */
export function runTraced(
  source: string,
  call: { name: string; args: unknown[] } | null = null,
  maxSteps = MAX_STEPS,
  io?: NodeIo,
): TraceResult {
  const made = instrument(source, call?.name ?? null)
  if ('error' in made) return { ok: false, error: made.error }
  const tracer = new Tracer(maxSteps)
  const console = makeConsole((stream, text) => tracer.write(stream, text))
  let error: CodeError | null = null
  let result: Value | null = null
  memory = { closures: new WeakMap(), ids: new WeakMap(), nextId: 1 }
  try {
    const fn = compile(made.code)(tracer, console)
    if (call) {
      if (typeof fn !== 'function') throw new ReferenceError(`define a function named ${call.name}`)
      result = serialize(answer(fn(...callArgs(call.args, io)), io))
    }
  } catch (err) {
    if (!(err instanceof StepLimit)) {
      const frames = (err !== null && typeof err === 'object' ? tracer.traces.get(err) : tracer.lastTrace) ?? []
      error = { kind: 'runtime', message: errorText(err), line: frames.length ? frames[frames.length - 1].line : null, traceback: frames }
    }
  } finally {
    memory = null
  }
  return {
    ok: true,
    steps: tracer.steps,
    pointers: made.pointers,
    truncated: tracer.truncated,
    error,
    stdout: tracer.stdout,
    console: tracer.console,
    result,
    call: call ? callText(call) : null,
    plans: made.plans,
    loops: made.loops,
    checks: made.checks,
    blocks: made.blocks,
    cells: made.cells,
    heaps: [],
  }
}

/**
 * Run `name(...case.args)` for each case without tracing. Answers are compared in any order when `case.unordered` is set.
 * A case with `run` instead runs that code (a function body that can use `name`) and checks what it returns.
 */
export function runTests(source: string, name: string, cases: RunCase[], io?: NodeIo): TestResult[] {
  const made = instrument(source, name)
  if ('error' in made) return cases.map(() => ({ passed: false, got: null, error: `SyntaxError: ${made.error.message}` }))
  const guard = new Guard()
  const quiet = makeConsole(() => {})
  let fn: unknown
  try {
    guard.start()
    fn = compile(made.code)(guard, quiet)
  } catch (err) {
    return cases.map(() => ({ passed: false, got: null, error: errorText(err) }))
  }
  return cases.map((c) => {
    if (typeof fn !== 'function') return { passed: false, got: null, error: `define a function named ${name}` }
    const counted = () => (c.maxSteps !== undefined ? { steps: guard.steps } : {})
    try {
      const args = c.run ? [] : callArgs(c.args, io)
      guard.start(c.maxSteps)
      const raw = c.run ? new Function(name, `"use strict";\n${c.run}`)(fn) : fn(...args)
      const stepsTaken = counted()
      guard.start()
      // A function that returns nothing gets undefined back, so it can't pass as an empty list or tree.
      const got = c.run || raw === undefined ? raw : answer(raw, io)
      const passed = c.unordered && Array.isArray(got) && Array.isArray(c.expected) ? sameItems(got, c.expected) : equal(got, c.expected)
      return { passed, got: show(got), error: null, ...stepsTaken }
    } catch (err) {
      if (err instanceof TooSlow) {
        const why =
          guard.steps > c.maxSteps! ? `still running after ${c.maxSteps!.toLocaleString('en-US')} steps` : `ran out of time after ${guard.steps.toLocaleString('en-US')} steps`
        return { passed: false, got: null, error: `too slow: ${why}`, ...counted() }
      }
      return { passed: false, got: null, error: errorText(err), ...counted() }
    }
  })
}

function equal(a: unknown, b: unknown): boolean {
  if (Object.is(a, b) || a === b) return true
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((v, i) => equal(v, b[i]))
  if (a && b && typeof a === 'object' && typeof b === 'object' && !Array.isArray(a) && !Array.isArray(b)) {
    const ka = Object.keys(a)
    const kb = Object.keys(b)
    return ka.length === kb.length && ka.every((k) => equal((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]))
  }
  return false
}

/** The same items in any order (each list's items compared as written). */
function sameItems(a: unknown[], b: unknown[]) {
  const key = (v: unknown) => JSON.stringify(v) ?? String(v)
  const sa = a.map(key).sort()
  const sb = b.map(key).sort()
  return sa.length === sb.length && sa.every((v, i) => v === sb[i])
}

// ---- values ----

const constructorName = (v: object): string => {
  const proto = Object.getPrototypeOf(v)
  if (proto === null) return 'Object'
  const name = proto.constructor?.name
  return typeof name === 'string' && name ? name : 'Object'
}

/** A traced value as the visualizer draws it (see Value in src/types.ts). */
export function serialize(value: unknown, depth = 0): Value {
  switch (typeof value) {
    case 'undefined':
      return { type: 'prim', repr: 'undefined', t: 'undefined' }
    case 'boolean':
      return { type: 'prim', repr: String(value), value, t: 'boolean' }
    case 'number':
      // JSON has no NaN or Infinity, so those keep only their text.
      if (!Number.isFinite(value)) return { type: 'prim', repr: String(value), t: 'number' }
      return { type: 'prim', repr: Object.is(value, -0) ? '-0' : String(value), value, t: 'number' }
    case 'string':
      return { type: 'prim', repr: JSON.stringify(value), value, t: 'string' }
    case 'bigint':
      return { type: 'prim', repr: `${value}n`, t: 'bigint' }
    case 'symbol':
      return { type: 'other', repr: String(value), t: 'symbol' }
    case 'function': {
      const closure = memory?.closures.get(value)
      const name = closure?.name && !closure.name.startsWith('<') ? closure.name : value.name
      const repr = `[Function: ${name || 'anonymous'}]`
      if (!closure || depth >= MAX_DEPTH) return { type: 'other', repr, t: 'function' }
      const captured: Record<string, Value> = {}
      for (const [n, get] of Object.entries(closure.getters)) {
        try {
          captured[n] = serialize(get(), depth + 1)
        } catch {
          // not set yet (its let or const line hasn't run)
        }
      }
      return { type: 'other', repr, t: 'function', captured }
    }
  }
  if (value === null) return { type: 'prim', repr: 'null', value: null, t: 'null' }
  const obj = value as object
  const cls = constructorName(obj)
  // An instance of a class (a ListNode, a TreeNode, the learner's own): drawn as a node.
  if (heap && memory && isNode(obj, cls)) return nodeRef(obj, cls, objectId(obj)!, heap)
  if (depth >= MAX_DEPTH) return { type: 'other', repr: shortText(obj), t: cls }
  const id = objectId(obj)
  const limit = depth === 0 ? MAX_TOP_ITEMS : MAX_LIST_ITEMS
  if (Array.isArray(obj)) {
    const items: Value[] = []
    for (let i = 0; i < Math.min(obj.length, limit); i++) items.push(serialize(obj[i], depth + 1))
    return { type: 'list', items, truncated: obj.length > limit, t: 'Array', id }
  }
  if (obj instanceof Set) {
    const all = [...obj]
    return { type: 'list', set: true, items: all.slice(0, limit).map((v) => serialize(v, depth + 1)), truncated: all.length > limit, t: 'Set', id }
  }
  if (obj instanceof Map) {
    const all = [...obj]
    return {
      type: 'dict',
      entries: all.slice(0, MAX_LIST_ITEMS).map(([k, v]) => [serialize(k, depth + 1), serialize(v, depth + 1)]),
      truncated: all.length > MAX_LIST_ITEMS,
      t: 'Map',
      id,
    }
  }
  if (obj instanceof Date || obj instanceof RegExp || obj instanceof Error || ArrayBuffer.isView(obj)) {
    return { type: 'other', repr: clip(String(obj)), t: constructorName(obj) }
  }
  // Plain objects, and class instances outside a snapshot: their own data properties.
  const keys = Object.keys(obj)
  const entries: [Value, Value][] = []
  for (const key of keys.slice(0, MAX_LIST_ITEMS)) {
    const desc = Object.getOwnPropertyDescriptor(obj, key)
    // A getter is the learner's code: don't run it while taking a snapshot.
    const v = desc && 'value' in desc ? serialize(desc.value, depth + 1) : ({ type: 'other', repr: '[Getter]' } as Value)
    entries.push([{ type: 'prim', repr: JSON.stringify(key), value: key, t: 'string' }, v])
  }
  return { type: 'dict', entries, truncated: keys.length > MAX_LIST_ITEMS, t: constructorName(obj), id }
}

/** The node ids a serialized value points at, added to `out`. */
function refs(v: Value, out: string[]): string[] {
  if (v.type === 'ref') out.push(String(v.id))
  else if (v.type === 'list' || v.type === 'tuple') v.items.forEach((i) => refs(i, out))
  else if (v.type === 'dict') v.entries.forEach(([k, val]) => (refs(k, out), refs(val, out)))
  return out
}

/** An object made by a class, other than the built-in ones (arrays, Maps, dates and the like are handled before). */
const isNode = (obj: object, cls: string) =>
  cls !== 'Object' && !Array.isArray(obj) && !(obj instanceof Map) && !(obj instanceof Set) && !(obj instanceof Date) && !(obj instanceof RegExp) && !(obj instanceof Error) && !ArrayBuffer.isView(obj) && !(obj instanceof Promise)

/** A class instance as a `ref`, listing it (and what it reaches) in the snapshot's nodes. */
function nodeRef(obj: object, cls: string, id: number, nodes: Record<string, NodeData>): Value {
  const key = String(id)
  if (!(key in nodes) && Object.keys(nodes).length < MAX_NODES) {
    const data: NodeData = { cls, fields: [] }
    nodes[key] = data // listed before its fields, so a cycle stops here
    for (const k of Object.keys(obj).slice(0, MAX_NODE_FIELDS)) {
      const desc = Object.getOwnPropertyDescriptor(obj, k)
      if (desc && 'value' in desc && typeof desc.value !== 'function') data.fields.push([k, serialize(desc.value, 1)])
    }
  }
  return { type: 'ref', id, cls }
}

/** The same number for the same object for the whole run (none outside a traced run). */
function objectId(obj: object): number | undefined {
  if (!memory) return undefined
  let id = memory.ids.get(obj)
  if (id === undefined) {
    id = memory.nextId++
    memory.ids.set(obj, id)
  }
  return id
}

const clip = (text: string, max = MAX_OTHER) => (text.length > max ? `${text.slice(0, max - 1)}…` : text)

/** A value too deep to draw, in a few characters: `[…3 items]`, `{…}`. */
function shortText(obj: object): string {
  if (Array.isArray(obj)) return `[…${obj.length} item${obj.length === 1 ? '' : 's'}]`
  if (obj instanceof Map || obj instanceof Set) return `${constructorName(obj)}(${obj.size})`
  return '{…}'
}

/** A recorded value: its text (short), and the number when it is one. */
export function brief(value: unknown): Brief {
  if (typeof value === 'number') return [Object.is(value, -0) ? '-0' : String(value), Number.isFinite(value) ? value : null]
  let text: string
  try {
    text = typeof value === 'string' ? JSON.stringify(value.slice(0, MAX_BRIEF + 1)) : formatValue(serialize(value, MAX_DEPTH - 1))
  } catch {
    text = '?'
  }
  return [clip(text, MAX_BRIEF), null]
}

