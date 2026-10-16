import { useState } from 'react'
import { cardFor } from '../syntax/cards'
import type { Language, TestResult, Value } from '../types'
import { formatValue } from '../viz/format'
import { BIG_OS, say, type Complexity, type Problem } from './problems'
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
  savedAt,
  onStartOver,
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
  /** When a passing solution to this problem was last saved, if ever. */
  savedAt: string | null
  /** Put the starter code back in the editor (the saved solution stays saved). */
  onStartOver: () => void
}) {
  // How many hints are showing. The panel is keyed on the problem, so this resets when it changes.
  const [hintsShown, setHintsShown] = useState(0)
  const concepts = problem.concepts[language].flatMap((id) => cardFor(language, id) ?? [])
  // The speed test, when there is one, runs last; the rest are the cases you can step through.
  const speed = problem.speed && tests ? tests[problem.tests.length] : undefined
  const caseResults = tests?.slice(0, problem.tests.length) ?? null
  const passed = caseResults?.filter((t) => t.passed).length ?? 0
  const allPassed = !!tests?.length && tests.every((t) => t.passed)
  const current = tests?.[caseIndex]
  const concept = problem.track === 'js-concepts'
  return (
    <div className="problem">
      <div className="problem-head">
        <strong>{problem.title}</strong>
        <span className="muted">{problem.difficulty}</span>
        {caseResults && (
          <span className={passed === caseResults.length ? 'badge pass' : 'badge'}>
            {passed}/{caseResults.length} tests passing
          </span>
        )}
        {savedAt && (
          <>
            <span className="badge pass" title={`Your passing code is saved in this browser (${new Date(savedAt).toLocaleString()})`}>
              ✓ Solved, saved
            </span>
            <button className="chip" onClick={onStartOver} title="Put the starter code back; your saved solution stays saved">
              Start over
            </button>
          </>
        )}
      </div>
      {problem.statement.map((para, i) => (
        <p key={i}>{say(para, language)}</p>
      ))}
      {problem.constraints && (
        <div className="constraints">
          <button
            className="constraints-title"
            onClick={() => onOpenConcept('constraints')}
            title="What constraints tell you: open the glossary entry"
          >
            Constraints
          </button>
          <ul>
            {problem.constraints.map((c, i) => (
              <li key={i}>{say(c, language)}</li>
            ))}
          </ul>
        </div>
      )}
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
      {!concept && problem.speed && (
        <div className={`speed ${speed ? (speed.passed ? 'pass' : 'fail') : ''}`}>
          <span
            className="muted"
            title="A big input, run without the visualizer. Steps count the lines your code runs; a built-in like sorted() counts as one, even though it does more work inside."
          >
            Speed test
          </span>{' '}
          {say(problem.speed.size, language)}, within {problem.speed.maxSteps.toLocaleString('en-US')} steps
          {speed && (
            <span>
              {': '}
              {speed.passed
                ? `✓ took ${speed.steps?.toLocaleString('en-US')}`
                : speed.error
                  ? `✗ ${speed.error}`
                  : `✗ wrong answer (${speed.got && speed.got.length > 60 ? `${speed.got.slice(0, 57)}...` : speed.got})`}
            </span>
          )}
        </div>
      )}
      {!concept && problem.complexity && allPassed && <ComplexityCheck complexity={problem.complexity} language={language} />}
      {call && (
        <div className="call">
          <code>{call}</code> returned <code>{result ? formatValue(result) : language === 'python' ? 'None' : 'undefined'}</code>
          {problem.io?.result && <span className="muted"> ({problem.io.result === 'tree' ? 'the tree, level by level' : 'the list, node by node'})</span>}
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

/** Once the tests pass: how fast is it, and how much memory does it use? Pick, then check. */
function ComplexityCheck({ complexity, language }: { complexity: Complexity; language: Language }) {
  const choices = [...BIG_OS, ...(complexity.extra ?? [])]
  const [time, setTime] = useState<string | null>(null)
  const [space, setSpace] = useState<string | null>(null)
  const [checked, setChecked] = useState(false)
  const row = (label: string, title: string, picked: string | null, pick: (o: string) => void, answer: string) => (
    <div className="big-o-row">
      <span className="muted" title={title}>
        {label}
      </span>
      {choices.map((o) => (
        <button
          key={o}
          className={['chip', picked === o && 'active', checked && o === answer && 'pass', checked && picked === o && o !== answer && 'fail']
            .filter(Boolean)
            .join(' ')}
          aria-pressed={picked === o}
          onClick={() => {
            pick(o)
            setChecked(false)
          }}
        >
          {o}
        </button>
      ))}
    </div>
  )
  return (
    <div className="big-o">
      <p className="big-o-ask">All tests pass. How does the answer grow as the input grows?</p>
      {row('Time', 'How the number of steps grows with the input', time, setTime, complexity.time)}
      {row('Space', 'Extra memory it uses, not counting the answer it returns', space, setSpace, complexity.space)}
      <div className="guess-actions">
        <button className="chip" disabled={!time || !space} onClick={() => setChecked(true)}>
          Check
        </button>
        <button className="chip" onClick={() => setChecked(true)} hidden={checked}>
          Just show me
        </button>
        {checked && time && space && (
          <span className={`guess-result ${time === complexity.time && space === complexity.space ? 'pass' : 'fail'}`}>
            {time === complexity.time && space === complexity.space ? 'Both right.' : `Time is ${complexity.time}, space is ${complexity.space}.`}
          </span>
        )}
      </div>
      {checked && (
        <p className="explain">
          <span className="muted">Why: </span>
          {(!time || !space) && `Time ${complexity.time}, space ${complexity.space}. `}
          {say(complexity.why, language)}
        </p>
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
