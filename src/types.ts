// Mirrors the JSON produced by src/python/tracer.py.

export type Value =
  | { type: 'prim'; repr: string; value?: string | number | boolean | null }
  | { type: 'list' | 'tuple'; items: Value[]; truncated: boolean }
  | { type: 'dict'; entries: [Value, Value][]; truncated: boolean }
  | { type: 'other'; repr: string }

export interface Step {
  line: number
  func: string
  vars: Record<string, Value>
  hidden: Record<string, number>
  stdout: string
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
