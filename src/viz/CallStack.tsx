import type { StackEntry } from './shapes'

/**
 * The calls running right now, outermost at the top: each waiting call is paused on the line
 * that made the next one. Clicking a waiting call shows its variables as they were when it made
 * that call; clicking it again (or the current call) goes back.
 */
export function CallStack({
  entries,
  viewing,
  onView,
}: {
  entries: StackEntry[]
  viewing: number | null
  onView: (frame: number | null) => void
}) {
  const calls = entries.filter((e) => e.func !== '<module>').length
  return (
    <div className="call-stack">
      <div className="list-name">
        Call stack{' '}
        <span className="muted">
          ({calls} call{calls === 1 ? '' : 's'} running · the newest is at the bottom)
        </span>
      </div>
      <ol>
        {entries.map((e, i) => {
          const top = e.func === '<module>'
          const name = top ? 'the program (top level)' : `${e.func}(${e.args ?? ''})`
          const selected = viewing === e.frame && !e.current
          const cls = ['stack-row', e.current && 'current', selected && 'selected'].filter(Boolean).join(' ')
          return (
            <li key={`${e.frame}-${i}`} style={{ paddingLeft: `${i * 0.7}rem` }}>
              <button
                className={cls}
                disabled={!e.current && !e.step}
                onClick={() => onView(e.current || selected ? null : e.frame)}
                title={e.current ? 'This call is running now.' : 'Show this call’s variables, as they were when it made the call below it.'}
              >
                <span className="stack-name">{name}</span>
                <span className="stack-line">{e.current ? `running line ${e.line}` : `waiting at line ${e.line}`}</span>
              </button>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
