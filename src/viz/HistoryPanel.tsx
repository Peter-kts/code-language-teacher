import { useEffect, useRef, useState } from 'react'
import { deltaText, entryLabel, historyGroups, type HistoryEntry } from './history'

/**
 * Every change in the run, one row per change: what changed, how, and where the
 * values it used came from. Rows after the current step stay listed but dimmed,
 * so going back and forth is a replay. Clicking a row or an origin jumps there.
 */
export function HistoryPanel({
  entries,
  current,
  code,
  onJump,
}: {
  entries: HistoryEntry[]
  /** The step on screen; its rows are highlighted and later ones dimmed. */
  current: number
  /** The code that ran, to show each row's line. */
  code: string
  onJump: (step: number) => void
}) {
  const [only, setOnly] = useState<string | null>(null)
  const names = [...new Set(entries.map((e) => e.name))]
  const lines = code.split('\n')
  const listRef = useRef<HTMLOListElement>(null)

  // Keep the current step's rows in view as the run plays.
  useEffect(() => {
    // Only the list scrolls, so the tabs above it stay put.
    const list = listRef.current
    // The current step's rows, else the last change before it, else the top.
    const past = list?.querySelectorAll<HTMLElement>('.hist-row.past')
    const row = list?.querySelector<HTMLElement>('.hist-row.current') ?? past?.[past.length - 1] ?? list?.firstElementChild
    if (!list || !(row instanceof HTMLElement)) return
    // The list is positioned, so offsetTop is measured from its top.
    const top = row.offsetTop
    if (top < list.scrollTop) list.scrollTop = top
    else if (top + row.offsetHeight > list.scrollTop + list.clientHeight) list.scrollTop = top + row.offsetHeight - list.clientHeight
  }, [current, only])

  // A filter on a variable the new code no longer has would hide everything.
  useEffect(() => {
    if (only !== null && !names.includes(only)) setOnly(null)
  })

  if (!entries.length) return <p className="muted">Changes to variables show up here as the code runs.</p>

  // Rows of one step share a header with the line that made them.
  const groups = historyGroups(entries, current, only)

  return (
    <div className="history">
      <div className="hist-filters" role="group" aria-label="Show changes to">
        <button className={only === null ? 'chip active' : 'chip'} onClick={() => setOnly(null)}>
          all
        </button>
        {names.map((n) => (
          <button key={n} className={only === n ? 'chip active' : 'chip'} onClick={() => setOnly(only === n ? null : n)}>
            {n}
          </button>
        ))}
      </div>
      <ol className="hist-list" ref={listRef}>
        {groups.map(({ step, line, when, entries: changes }) => {
          return (
            <li key={`${step}:${changes[0].name}`} className={`hist-row ${when}`}>
              <button className="hist-head" onClick={() => onJump(step)} title={`Go to step ${step + 1}`}>
                <span className="hist-step">step {step + 1}</span>
                <span className="hist-line">line {line}</span>
                <code className="hist-code">{lines[line - 1]?.trim()}</code>
              </button>
              {changes.map((e, i) => (
                <div key={i} className="hist-change">
                  <div className="hist-what">
                    <span className="hist-name">{entryLabel(e)}</span>
                    {e.before === null ? (
                      <span className="hist-new">new</span>
                    ) : (
                      <span className="hist-before">{e.before}</span>
                    )}
                    <span className="hist-arrow">→</span>
                    <span className="hist-after">{e.after}</span>
                    {e.deltas.map((d, j) => (
                      <span key={j} className="hist-delta">
                        {deltaText(d)}
                      </span>
                    ))}
                  </div>
                  {e.sources.map((s, j) => (
                    <button
                      key={j}
                      className="hist-source"
                      disabled={s.step === null}
                      onClick={() => s.step !== null && onJump(s.step)}
                      title={s.step !== null ? `Go to step ${s.step + 1}, where it was set` : undefined}
                    >
                      <span className="hist-src-name">{entryLabel(s)}</span> gave {s.value}
                      {s.step !== null && (
                        <span className="muted">
                          {' '}
                          · set at step {s.step + 1}
                          {s.how && ` (${s.how})`}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              ))}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
