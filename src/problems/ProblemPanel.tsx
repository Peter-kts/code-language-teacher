import type { TestResult, Value } from '../types'
import { formatValue } from '../viz/Visualizer'
import type { Problem } from './problems'

export function ProblemPanel({
  problem,
  tests,
  caseIndex,
  onSelectCase,
  result,
  call,
  stale,
}: {
  problem: Problem
  tests: TestResult[] | null
  caseIndex: number
  onSelectCase: (i: number) => void
  result: Value | null
  call: string | null
  /** True while the code doesn't compile, so the run shown is from an older version. */
  stale: boolean
}) {
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
