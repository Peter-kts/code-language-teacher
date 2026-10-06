// Mirrors the JSON produced by src/python/tracer.py.

export type Value =
  | { type: 'prim'; repr: string; value?: string | number | boolean | null }
  | { type: 'list' | 'tuple'; items: Value[]; truncated: boolean }
  | { type: 'dict'; entries: [Value, Value][]; truncated: boolean }
  | { type: 'other'; repr: string }

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
}

/** A value recorded while a line ran: its Python repr, and the number when it is one. */
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
}

export interface RunRequest {
  code: string
  /** Problem function to call and trace after the module runs. */
  call?: { name: string; args: unknown[] }
  /** Test cases to run (untraced) against `call.name`. */
  tests?: { args: unknown[]; expected: unknown; unordered?: boolean }[]
}
