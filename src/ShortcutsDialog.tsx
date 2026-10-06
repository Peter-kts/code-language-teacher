import { Fragment, type RefObject } from 'react'
import { combosFor, comboKeys, SHORTCUT_SECTIONS } from './shortcuts'

/** The ? cheat sheet. A modal <dialog>: Esc or a click outside closes it. */
export function ShortcutsDialog({ dialogRef }: { dialogRef: RefObject<HTMLDialogElement | null> }) {
  return (
    <dialog
      ref={dialogRef}
      className="shortcuts"
      aria-labelledby="shortcuts-title"
      // A click on the backdrop lands on the dialog itself; the content fills the rest.
      onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
    >
      <div className="shortcuts-body">
        <div className="shortcuts-head">
          <h2 id="shortcuts-title">Keyboard shortcuts</h2>
          <button onClick={() => dialogRef.current?.close()}>Close</button>
        </div>
        <div className="shortcuts-grid">
          {SHORTCUT_SECTIONS.map((section) => (
            <section key={section.title}>
              <h3>{section.title}</h3>
              {section.note && <p className="muted">{section.note}</p>}
              <dl>
                {section.rows.map((row) => (
                  <div key={row.label} className="shortcut-row">
                    <dt>{row.label}</dt>
                    <dd>
                      {combosFor(row.keys).map((combo, i) => (
                        <Fragment key={combo}>
                          {i > 0 && <span className="or">{row.pair ? '/' : 'or'}</span>}
                          <span className="combo">
                            {comboKeys(combo).map((key, j) => (
                              <kbd key={j}>{key}</kbd>
                            ))}
                          </span>
                        </Fragment>
                      ))}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      </div>
    </dialog>
  )
}
