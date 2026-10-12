import { useState } from 'react'
import { cardFor } from '../syntax/cards'
import type { Language, TestResult, Value } from '../types'
import { formatValue } from '../viz/format'
import { say, type Problem } from './problems'
import { checkGuess, type GuessCheck } from './guess'

export function ProblemPanel({
  problem,
  language,
  tests,
  caseIndex,
  onSelectCase,
  result,
  call,
  stale,
  onOpenConcept,
  output,
  revealed,
  onReveal,
}: {
  problem: Problem
  language: Language
  tests: TestResult[] | null
  caseIndex: number
  onSelectCase: (i: number) => void
  result: Value | null
  call: string | null
  /** True while the code doesn't compile, so the run shown is from an older version. */
  stale: boolean
  /** Show a glossary entry, by id. */
  onOpenConcept: (id: string) => void
  /** What the code printed: a predict problem's answer. */
  output: string | null
  /** For a predict problem: whether the output and steps are showing yet. */
  revealed: boolean
  onReveal: () => void
}) {
  // How many hints are showing. The panel is keyed on the problem, so this resets when it changes.
  const [hintsShown, setHintsShown] = useState(0)
  const concepts = problem.concepts[language].flatMap((id) => cardFor(language, id) ?? [])
  const passed = tests?.filter((t) => t.passed).length ?? 0
  const current = tests?.[caseIndex]
  const concept = problem.track === 'js-concepts'
  return (
    <div className="problem">
      <div className="problem-head">
        <strong>{problem.title}</strong>
        <span className="muted">{problem.difficulty}</span>
        {tests && (
          <span className={passed === tests.length ? 'badge pass' : 'badge'}>
            {passed}/{tests.length} tests passing
          </span>
        )}
      </div>
      {problem.statement.map((para, i) => (
        <p key={i}>{say(para, language)}</p>
      ))}
      {problem.hints.slice(0, hintsShown).map((hint, i) => (
        <p key={i} className="hint">
          <span className="muted">Hint {i + 1}:</span> {say(hint, language)}
        </p>
      ))}
      <div className="concepts">
        {hintsShown < problem.hints.length && (
          <button className="chip" onClick={() => setHintsShown((n) => n + 1)}>
            {hintsShown === 0 ? 'Show a hint' : 'Another hint'}
          </button>
        )}
        {concepts.length > 0 && <span className="muted">Concepts:</span>}
        {concepts.map((c) => (
          <button key={c.id} className="chip" onClick={() => onOpenConcept(c.id)} title="Open in the glossary">
            {c.title}
          </button>
        ))}
      </div>
      {problem.kind === 'predict' && <Predict problem={problem} output={output} revealed={revealed} onReveal={onReveal} />}
      {concept && problem.kind === 'build' && (
        <ul className="check-list">
          {problem.tests.map((t, i) => {
            const r = tests?.[i]
            return (
              <li key={i} className={r ? (r.passed ? 'pass' : 'fail') : undefined}>
                {r ? (r.passed ? '✓ ' : '✗ ') : '· '}
                {t.name}
                {r && !r.passed && (
                  <span className="muted">
                    {' '}
                    ({r.error ?? `got ${r.got}, expected ${JSON.stringify(t.expected)}`})
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      )}
      {!concept && (
      <div className="cases">
        <span className="muted">Visualize case:</span>
        {problem.tests.map((t, i) => (
          <button
            key={i}
            className={`case ${i === caseIndex ? 'active' : ''} ${tests ? (tests[i]?.passed ? 'pass' : 'fail') : ''}`}
            onClick={() => onSelectCase(i)}
            title={`expected ${JSON.stringify(t.expected)}`}
          >
            {tests ? (tests[i]?.passed ? '✓ ' : '✗ ') : ''}
            {i + 1}
          </button>
        ))}
      </div>
      )}
      {call && (
        <div className="call">
          <code>{call}</code> returned <code>{result ? formatValue(result) : language === 'python' ? 'None' : 'undefined'}</code>
          {stale && <span className="muted"> (from the last version that compiled)</span>}
          {!stale && current && !current.passed && (
            <span className="fail-text">
              {' '}
              (expected {JSON.stringify(problem.tests[caseIndex].expected)}
              {current.error ? `; ${current.error}` : ''})
            </span>
          )}
        </div>
      )}
    </div>
  )
}

/** Guess what the code prints, then see the real output and why. */
function Predict({
  problem,
  output,
  revealed,
  onReveal,
}: {
  problem: Problem
  output: string | null
  revealed: boolean
  onReveal: () => void
}) {
  const [guess, setGuess] = useState('')
  const [checked, setChecked] = useState<GuessCheck | null>(null)
  const check = () => {
    if (output === null) return
    setChecked(checkGuess(guess, output))
    onReveal()
  }
  return (
    <div className="guess">
      <textarea
        value={guess}
        onChange={(e) => setGuess(e.target.value)}
        placeholder="Your guess: what it prints, one line per console.log"
        aria-label="Your guess"
        spellCheck={false}
      />
      <div className="guess-actions">
        <button className="chip" onClick={check} disabled={!guess.trim() || output === null}>
          Check my guess
        </button>
        {!revealed && (
          <button className="chip" onClick={onReveal}>
            Just show me
          </button>
        )}
        {checked && (
          <span className={`guess-result ${checked.wrong ? 'fail' : 'pass'}`}>
            {checked.wrong
              ? `${checked.right} of ${checked.total} lines right. Line ${checked.wrong.line} printed ${checked.wrong.actual || 'nothing'}${checked.wrong.guess ? `, not ${checked.wrong.guess}` : ''}.`
              : `Spot on: all ${checked.total} lines.`}
          </span>
        )}
      </div>
      {revealed &&
        problem.explain?.map((para, i) => (
          <p key={i} className="explain">
            {i === 0 && <span className="muted">Why: </span>}
            {para}
          </p>
        ))}
    </div>
  )
}
