import { useEffect, useRef } from 'react'
import type { CodeError, ConsoleEntry } from '../types'
import { consoleLines, rowsLater, tracebackLines } from './console'

interface Props {
  entries: ConsoleEntry[]
  error: CodeError | null
  /** The code the trace ran, for the traceback. */
  code: string
  current: number
  isLast: boolean
  onJump: (step: number) => void
}

/** What the program printed or logged up to the current step, with the line that wrote each row. */
export function ConsolePanel({ entries, error, code, current, isLast, onJump }: Props) {
  const rows = consoleLines(entries, current, isLast)
  const later = isLast ? 0 : rowsLater(entries, current)
  const traceback = isLast && error ? tracebackLines(error, code) : []
  const bodyRef = useRef<HTMLDivElement>(null)

  // Keep the newest output in view, like a terminal.
  useEffect(() => {
    const body = bodyRef.current
    if (body) body.scrollTop = body.scrollHeight
  }, [rows.length, traceback.length])

  const lineLabel = (line: number | null, step?: number) =>
    line === null || step === undefined ? (
      <span className="console-at">{line === null ? '' : `L${line}`}</span>
    ) : (
      <button className="console-at" onClick={() => onJump(step)} title={`Line ${line} wrote this · go to that step`}>
        L{line}
      </button>
    )

  return (
    <div className="console">
      <div className="console-head">
        <span className="output-title">Console</span>
        {later > 0 && (
          <span className="console-later">
            {later} more {later === 1 ? 'line' : 'lines'} later in the run
          </span>
        )}
      </div>
      <div className="console-body" ref={bodyRef} role="log" aria-label="Console output">
        {rows.length === 0 && traceback.length === 0 && (
          <p className="console-empty">
            {entries.length ? 'Nothing printed yet at this step.' : 'Use print() to log here.'}
          </p>
        )}
        {rows.map((row, i) => (
          <div
            key={i}
            className={`console-row${row.stream === 'stderr' ? ' stderr' : ''}${row.step >= current ? ' fresh' : ''}`}
          >
            {lineLabel(row.line, row.step)}
            <span className="console-text">{row.text}</span>
          </div>
        ))}
        {traceback.map((t, i) => (
          <div key={`tb${i}`} className="console-row stderr traceback">
            {lineLabel(t.line)}
            <span className="console-text">{t.text}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
