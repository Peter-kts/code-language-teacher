import type { CodeError, ConsoleEntry } from '../types'

/** One row of the console. */
export interface ConsoleLine {
  text: string
  stream: 'stdout' | 'stderr'
  /** The line of code that started writing it. */
  line: number | null
  /** The step it was finished on, so the newest rows can be marked. */
  step: number
  /** True while the row waits for its newline (print(..., end='')). */
  open: boolean
}

/**
 * What the console shows at step `upTo`: the entries written by then, split into rows.
 * On the last step everything shows, including output written after the final snapshot
 * (just before an error, say).
 */
export function consoleLines(entries: ConsoleEntry[], upTo: number, isLast: boolean): ConsoleLine[] {
  const rows: ConsoleLine[] = []
  let row: ConsoleLine | null = null
  for (const entry of entries) {
    if (!isLast && entry.step > upTo) break
    // stdout and stderr each get their own rows, so stderr can be colored.
    if (row && row.stream !== entry.stream) row = null
    const parts = entry.text.split('\n')
    for (let i = 0; i < parts.length; i++) {
      const last = i === parts.length - 1
      // Nothing left after a trailing newline.
      if (last && parts[i] === '') break
      if (!row) {
        row = { text: '', stream: entry.stream, line: entry.line, step: entry.step, open: true }
        rows.push(row)
      }
      row.text += parts[i]
      row.step = entry.step
      if (!last) {
        row.open = false
        row = null
      }
    }
  }
  return rows
}

/** How many rows the program has yet to write after step `upTo`. */
export function rowsLater(entries: ConsoleEntry[], upTo: number): number {
  return consoleLines(entries, Infinity, true).length - consoleLines(entries, upTo, false).length
}

/** A Python-style traceback of the user's frames, with the code of each line. Only the frame rows carry a line number. */
export function tracebackLines(error: CodeError, code: string): { line: number | null; text: string }[] {
  if (error.kind !== 'runtime') return []
  const source = code.split('\n')
  const frames = error.traceback ?? []
  return [
    ...(frames.length ? [{ line: null, text: 'Traceback (most recent call last):' }] : []),
    ...frames.flatMap(({ line, func }) => [
      { line, text: `  line ${line}, in ${func}` },
      ...(source[line - 1]?.trim() ? [{ line: null, text: `    ${source[line - 1].trim()}` }] : []),
    ]),
    { line: null, text: error.message },
  ]
}
