import { describe, expect, it } from 'vitest'
import type { ConsoleEntry } from '../types'
import { consoleLines, rowsLater, tracebackLines } from './console'

const out = (text: string, line: number, step: number, stream: 'stdout' | 'stderr' = 'stdout'): ConsoleEntry => ({
  stream,
  text,
  line,
  step,
})

describe('consoleLines', () => {
  const entries = [out('x is 1\n', 2, 3), out('x is 2\n', 2, 6), out('done', 6, 8)]

  it('shows only what was written by the current step', () => {
    expect(consoleLines(entries, 2, false)).toEqual([])
    expect(consoleLines(entries, 5, false).map((r) => [r.text, r.line, r.step])).toEqual([['x is 1', 2, 3]])
    expect(rowsLater(entries, 5)).toBe(2)
  })

  it('shows everything on the last step, even past the final snapshot', () => {
    expect(consoleLines(entries, 4, true).map((r) => r.text)).toEqual(['x is 1', 'x is 2', 'done'])
    expect(consoleLines(entries, 4, true).at(-1)!.open).toBe(true)
  })

  it('joins print(..., end="") with what follows, and splits multi-line text', () => {
    const rows = consoleLines([out('a', 1, 2), out('b\nc\n', 2, 3)], 9, false)
    expect(rows.map((r) => [r.text, r.line, r.step, r.open])).toEqual([
      ['ab', 1, 3, false],
      ['c', 2, 3, false],
    ])
  })

  it('keeps stderr on its own rows', () => {
    const rows = consoleLines([out('a', 1, 2), out('oops\n', 2, 3, 'stderr')], 9, false)
    expect(rows.map((r) => [r.stream, r.text])).toEqual([
      ['stdout', 'a'],
      ['stderr', 'oops'],
    ])
  })

  it('keeps blank lines from print()', () => {
    expect(consoleLines([out('\n\nhi\n', 1, 2)], 9, false).map((r) => r.text)).toEqual(['', '', 'hi'])
  })
})

describe('tracebackLines', () => {
  it('lists each call with its code, then the error', () => {
    const code = 'def f(xs):\n    return xs[3]\n\nf([1])\n'
    const error = {
      kind: 'runtime' as const,
      message: 'IndexError: list index out of range',
      line: 2,
      traceback: [
        { line: 4, func: '<module>' },
        { line: 2, func: 'f' },
      ],
    }
    expect(tracebackLines(error, code).map((l) => l.text)).toEqual([
      'Traceback (most recent call last):',
      '  line 4, in <module>',
      '    f([1])',
      '  line 2, in f',
      '    return xs[3]',
      'IndexError: list index out of range',
    ])
  })

  it('leaves syntax errors to the error box', () => {
    expect(tracebackLines({ kind: 'syntax', message: 'bad', line: 1 }, 'x')).toEqual([])
  })
})
