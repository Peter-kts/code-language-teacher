import { useState } from 'react'
import { PYTHON_CARDS } from '../syntax/cards'
import type { TestResult, Value } from '../types'
import { formatValue } from '../viz/format'
import type { Problem } from './problems'

export function ProblemPanel({
  problem,
  tests,
  caseIndex,
  onSelectCase,
  result,
  call,
  stale,
  onOpenConcept,
}: {
  problem: Problem
  tests: TestResult[] | null
  caseIndex: number
  onSelectCase: (i: number) => void
  result: Value | null
  call: string | null
  /** True while the code doesn't compile, so the run shown is from an older version. */
  stale: boolean
  /** Show a glossary entry, by id. */
  onOpenConcept: (id: string) => void
}) {
  // How many hints are showing. The panel is keyed on the problem, so this resets when it changes.
  const [hintsShown, setHintsShown] = useState(0)
  const concepts = problem.concepts.flatMap((id) => PYTHON_CARDS.filter((c) => c.id === id))
  const passed = tests?.filter((t) => t.passed).length ?? 0
  const current = tests?.[caseIndex]
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
        <p key={i}>{para}</p>
      ))}
      {problem.hints.slice(0, hintsShown).map((hint, i) => (
        <p key={i} className="hint">
          <span className="muted">Hint {i + 1}:</span> {hint}
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
      {call && (
        <div className="call">
          <code>{call}</code> returned <code>{result ? formatValue(result) : 'None'}</code>
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
