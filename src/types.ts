// Mirrors the JSON produced by src/python/tracer.py, and by src/js/runtime.ts for JavaScript.

export type Language = 'python' | 'javascript'

/**
 * A traced value. JavaScript values also carry `t`, their type as JavaScript names it
 * (`number`, `Array`, `Map`, a class name, ...); Python values leave it out.
 */
export type Value = { t?: string } & (
  | { type: 'prim'; repr: string; value?: string | number | boolean | null }
  | { type: 'list' | 'tuple'; items: Value[]; truncated: boolean; id?: number }
  | { type: 'dict'; entries: [Value, Value][]; truncated: boolean; id?: number }
  /** A JavaScript closure carries `captured`: the outer variables it remembers, and their values now. */
  | { type: 'other'; repr: string; captured?: Record<string, Value> }
  /**
   * An object of a class (a linked list or tree node, say): it lives in the step's `nodes`
   * under this id, so two variables (or two nodes) pointing at it share one drawing.
   */
  | { type: 'ref'; id: number; cls: string }
)

/** A class instance a `ref` points at: its class and its fields, in order. */
export interface NodeData {
  cls: string
  fields: [string, Value][]
}
// `id` (JavaScript only) names the object a list or dict is, so two variables holding
// the same object can be told apart from two that hold equal copies.

export interface Step {
  line: number
  func: string
  /** Which call of `func` this is, so recursive calls keep their steps apart. */
  frame?: number
  vars: Record<string, Value>
  hidden: Record<string, number>
  stdout: string
  /** Values the frame's previous line computed, by part id (see `ExprPlan`). */
  ran?: Record<string, Brief>
  /** Variables in `vars` that belong to an outer function: the ones this closure remembers. */
  captured?: string[]
  /** Every class instance the variables reach, by the id their `ref`s carry. */
  nodes?: Record<string, NodeData>
  /** Nodes that calls further out point at (ids in `nodes`), drawn too so a recursive call keeps the whole tree in view. */
  outer?: string[]
}

/** A value recorded while a line ran: its text (Python's repr), and the number when it is one. */
export type Brief = [repr: string, num: number | null]

/**
 * One part of the right-hand side of an assignment, as the tracer saw it.
 * Parts with an `id` have their value recorded in `Step.ran` whenever they run.
 */
export type ExprPlan = {
  id?: number
  /** Source text, e.g. `ages["test"]`. */
  text: string
  /** Where it sits, as 1-based columns on `line` (absent when it spans lines). */
  line?: number
  start?: number
  end?: number
} & (
  | { kind: 'const'; value: Brief }
  | { kind: 'name'; name: string }
  /** `name[key]` (or `of[key]` when the container isn't a plain variable). */
  | { kind: 'sub'; name: string | null; of: ExprPlan | null; key: ExprPlan | null }
  | { kind: 'bin'; op: string; left: ExprPlan | null; right: ExprPlan | null }
  | { kind: 'unary'; op: string; operand: ExprPlan | null }
  | { kind: 'seq'; items: (ExprPlan | null)[] }
  /** A call, comparison or the like: one part, with the parts it read. */
  | { kind: 'other'; parts: ExprPlan[] }
)

export type TargetPlan =
  | { kind: 'name'; name: string }
  | { kind: 'item'; name: string; key: ExprPlan | null; text: string }
  | { kind: 'seq'; items: TargetPlan[] }
  | { kind: 'other' }

/** An assignment (`targets = value`, `target op= value`), or a method call like `stack.append(n)`. */
export interface AssignPlan {
  line: number
  /** `+` for `+=`, null for plain `=`, `call` for a method call on `targets[0]`. */
  op: string | null
  targets: TargetPlan[]
  value: ExprPlan | null
}

/** `for item in over:` or `for index, item in enumerate(over):`. */
export interface LoopPlan {
  line: number
  item: string
  over: string
  index: string | null
  /** Columns of `over` on the line, when it fits on one. */
  start?: number
  end?: number
}

export interface PointerSpec {
  /** Name shown under the arrow, e.g. `n` in `for n in nums`. */
  label: string
  /** Variable holding the index: the label itself, or a hidden loop counter. */
  var: string
  /** List the pointer indexes into. */
  target: string
}

export interface CodeError {
  kind: 'syntax' | 'runtime' | 'internal'
  message: string
  line: number | null
  col?: number
  /** For a runtime error: the calls of the user's code it went through, outermost first. */
  traceback?: { line: number; func: string }[]
}

/** A piece of what the program wrote, merged per line of code and step. */
export interface ConsoleEntry {
  stream: 'stdout' | 'stderr'
  text: string
  /** The line of code that wrote it (null if it came from outside the user's code). */
  line: number | null
  /** The first step that shows it: the one after its line ran. */
  step: number
}

export type TraceResult =
  | { ok: false; error: CodeError }
  | {
      ok: true
      steps: Step[]
      pointers: PointerSpec[]
      truncated: boolean
      error: CodeError | null
      stdout: string
      /** print(), sys.stderr and logging output, with the line that wrote each piece. */
      console: ConsoleEntry[]
      /** Return value of the problem's function, when one was called. */
      result: Value | null
      /** e.g. `twoSum([2, 7, 11, 15], 9)` */
      call: string | null
      /** Every assignment in the code, so a step can say what a change was made of. */
      plans: AssignPlan[]
      loops: LoopPlan[]
    }

export interface TestResult {
  passed: boolean
  got: string | null
  error: string | null
  /** Lines of the learner's code the case ran (only counted for a case with `maxSteps`). */
  steps?: number
}

/**
 * How a problem's arguments and answer travel as JSON: `list` is a linked list written as
 * its values ([1, 2, 3]), `tree` a binary tree in level order with null gaps ([2, 1, 3, null, 4]),
 * `cycle` a linked list whose tail links back to a node ({values: [3, 2, 0], pos: 1}), and
 * `lists` an array of linked lists ([[1, 4], [2, 3]]).
 */
export type NodeKind = 'list' | 'tree' | 'cycle' | 'lists'
export interface NodeIo {
  args: (NodeKind | null)[]
  result?: NodeKind
}

export interface RunCase {
  args: unknown[]
  expected: unknown
  unordered?: boolean
  run?: string
  /** Stop the case as too slow once the learner's code has run this many lines. */
  maxSteps?: number
}

export interface RunRequest {
  code: string
  /** Problem function to call and trace after the module runs. */
  call?: { name: string; args: unknown[] }
  /** Test cases to run (untraced) against `call.name`. */
  tests?: RunCase[]
  /** The function the tests use when no `call` is traced (the JavaScript concept problems). */
  testFor?: string
  /** Arguments and answers that are linked lists or trees. */
  io?: NodeIo
}
