import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type MutableRefObject } from 'react'
import Editor, { type OnMount } from '@monaco-editor/react'
import type * as monaco from 'monaco-editor/editor/editor.api'
import { editorLook } from '../monaco'
import type { Theme } from '../layout/theme'
import { PauseIcon, PlayIcon, SkipBackIcon, SkipForwardIcon, StepBackIcon, StepForwardIcon } from '../icons'
import { CodeHover } from '../syntax/CodeHover'
import { SyntaxHelper } from '../syntax/SyntaxHelper'
import { Chat } from '../chat/Chat'
import type { ChatMarks } from '../chat/marks'
import { useEditMarks } from '../chat/useEditMarks'
import { loadEditedData, saveEditedData } from './editedData'
import { PointerFlash, PointerTour, type Pointing } from '../chat/PointerTour'
import type { Ref, RefContext, TourStop, ViewSummary } from '../chat/refs'
import { withShortcut, type Command } from '../shortcuts'
import { editorFont } from '../layout/fontSize'
import type { usePaneLayout } from '../layout/usePaneLayout'
import type { SavedSolution } from '../problems/solutions'
import { SQL_CARDS } from './cards'
import type { CheckSpec, NamedResult, SqlTable as TableData } from './engine'
import { caseTables, SQL_PLAYGROUND_TABLES, SQL_PROBLEMS, starterFor, type SqlProblem } from './problems'
import { CompareView, JoinView, SqlTable, StageTable, TablesView, pickedStage, stageCount } from './SqlViews'
import { useSqlRunner, type SqlRun, type SqlStatus } from './useSqlRunner'

// The SQL workspace: the same three panes as Python and JavaScript (editor, picture, side panel), but
// the middle pane shows tables instead of a trace. A query is stepped through by its stages (the order
// SQL runs it in) rather than by lines. App keeps the header, the layout and the keyboard shortcuts.

const PLAY_MS = 1200
const glossaryIds = new Set(SQL_CARDS.map((c) => c.id))

export interface SqlStatusReport {
  status: SqlStatus
  error: boolean
}

export function SqlWorkspace({
  layout,
  mode,
  onOpenProblem,
  code,
  setCode,
  solutions,
  onSolved,
  fontScale,
  theme,
  commandsRef,
  runCommand,
  onStatus,
}: {
  layout: ReturnType<typeof usePaneLayout>
  /** 'playground' or a SQL problem id. */
  mode: string
  onOpenProblem: (id: string) => void
  code: string
  setCode: (code: string) => void
  /** Saved passing queries, by problem id. */
  solutions: Record<string, SavedSolution>
  onSolved: (problemId: string, code: string) => void
  fontScale: number
  /** The app's color theme, for the editor's matching colors. */
  theme: Theme
  /** Filled in here, so App's keyboard shortcuts step through stages instead of trace steps. */
  commandsRef: MutableRefObject<Partial<Record<Command, () => void>>>
  /** Runs one of App's commands (for the editor's own key bindings). */
  runCommand: (command: Command) => void
  onStatus: (report: SqlStatusReport) => void
}) {
  const problem = SQL_PROBLEMS.find((p) => p.id === mode)
  const [caseIndex, setCaseIndex] = useState(0)
  useEffect(() => setCaseIndex(0), [mode])
  const shownCase = problem ? Math.min(caseIndex, problem.cases.length - 1) : 0
  const originalTables = useMemo(() => (problem ? caseTables(problem, shownCase) : SQL_PLAYGROUND_TABLES), [problem, shownCase])
  // The chat can change the data a query runs on (the playground's, or one test case's, to explore with).
  // The tests always keep their own data.
  const dataKey = problem ? `${problem.id}#${shownCase}` : 'playground'
  const [editedData, setEditedData] = useState(loadEditedData)
  const tables = editedData[dataKey] ?? originalTables
  const setTables = (next: TableData[] | null) =>
    setEditedData((all) => {
      const { [dataKey]: _old, ...rest } = all
      const out = next && JSON.stringify(next) !== JSON.stringify(originalTables) ? { ...rest, [dataKey]: next } : rest
      saveEditedData(out)
      return out
    })
  // What the chat just changed, lit up until the next change (or switching problem or case).
  const [chatMarks, setChatMarks] = useState<ChatMarks | null>(null)
  useEffect(() => setChatMarks(null), [dataKey])
  const check: CheckSpec | undefined = useMemo(
    () =>
      problem && {
        cases: problem.cases.map((c, i) => ({ name: c.name, tables: caseTables(problem, i) })),
        reference: problem.answer,
        ordered: problem.ordered,
        checkTable: problem.checkTable,
      },
    [problem],
  )
  const { status, output, good, failure } = useSqlRunner(code, tables, check, true)
  // A problem's starter is an unfinished SELECT on purpose: no red error before the learner has typed.
  const untouched = !!problem && code.trim() === starterFor(problem).trim()
  // While the query is broken, keep showing the last one that ran.
  const shown: SqlRun | null = output?.error ? good : output
  useEffect(() => onStatus({ status, error: !!((output?.error && !untouched) || failure) }), [status, output, failure, untouched])

  // Code that passes every case is saved, like the other problems.
  const passedCode = problem && output && !output.error && output.cases?.length && output.cases.every((c) => c.passed) ? output.code : null
  useEffect(() => {
    if (problem && passedCode !== null && solutions[problem.id]?.code !== passedCode) onSolved(problem.id, passedCode)
  }, [passedCode, problem, solutions])

  // ---------- Stages ----------
  const stages = shown?.stages ?? []
  // Which stage is showing, by its label, so it stays put while the query is edited. None picked: the last.
  // If that stage is gone after an edit (say you deleted the WHERE), stay at the same position, moving back
  // only if the query now has fewer stages: the same rule the Python and JavaScript step scrubber follows.
  const [picked, setPicked] = useState<{ label: string; index: number } | null>(null)
  const stageIndex = pickedStage(picked, stages.map((s) => s.label))
  const stage = stages[stageIndex]
  const [playing, setPlaying] = useState(false)
  const goTo = (i: number) => {
    if (!stages.length) return
    const next = Math.max(0, Math.min(stages.length - 1, i))
    // The last stage stays "the last" as stages come and go.
    setPicked(next === stages.length - 1 ? null : { label: stages[next].label, index: next })
  }
  useEffect(() => {
    if (!playing) return
    if (stageIndex >= stages.length - 1) {
      setPlaying(false)
      return
    }
    const t = window.setTimeout(() => goTo(stageIndex + 1), PLAY_MS)
    return () => window.clearTimeout(t)
  }, [playing, stageIndex, stages.length])

  // ---------- Editor, side panel, chat pointing ----------
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null)
  const [mounted, setMounted] = useState<{ editor: monaco.editor.IStandaloneCodeEditor; api: typeof monaco } | null>(null)
  const chatInputRef = useRef<HTMLInputElement>(null)
  const [sidePanel, setSidePanel] = useState<'chat' | 'cards'>('chat')
  const [glossaryFocus, setGlossaryFocus] = useState<string | null>(null)
  const openConcept = (id: string) => {
    setGlossaryFocus(id)
    setSidePanel('cards')
  }

  const commands: Partial<Record<Command, () => void>> = {
    playPause: () => {
      if (stages.length < 2) return
      if (stageIndex >= stages.length - 1) goTo(0)
      setPlaying((p) => !p)
    },
    firstStep: () => goTo(0),
    prevStep: () => goTo(stageIndex - 1),
    nextStep: () => goTo(stageIndex + 1),
    lastStep: () => {
      setPlaying(false)
      goTo(stages.length - 1)
    },
    askClaude: () => {
      if (document.activeElement === chatInputRef.current) {
        editorRef.current?.focus()
        return
      }
      setSidePanel('chat')
      requestAnimationFrame(() => chatInputRef.current?.focus())
    },
    focusEditor: () => editorRef.current?.focus(),
  }
  commandsRef.current = commands
  useEffect(() => () => void (commandsRef.current = {}), [])

  const onMount: OnMount = (editor, m) => {
    editorRef.current = editor
    setMounted({ editor, api: m })
    const { KeyMod, KeyCode } = m
    const action = (id: Command, label: string, keybindings: number[] = []) =>
      editor.addAction({ id: `app.${id}`, label, keybindings, keybindingContext: 'editorTextFocus', run: () => runCommand(id) })
    action('playPause', 'Play / pause the stages', [KeyMod.CtrlCmd | KeyCode.Enter])
    action('nextStep', 'Next stage', [KeyMod.Alt | KeyCode.Period])
    action('prevStep', 'Previous stage', [KeyMod.Alt | KeyCode.Comma])
    action('lastStep', 'Last stage', [KeyMod.Alt | KeyMod.Shift | KeyCode.Period])
    action('firstStep', 'First stage', [KeyMod.Alt | KeyMod.Shift | KeyCode.Comma])
    action('askClaude', 'Ask Claude', [KeyMod.CtrlCmd | KeyCode.KeyI])
    action('showShortcuts', 'Keyboard shortcuts')
    action('toggleTopBar', 'Hide / show the top bar')
    action('toggleTheme', 'Next theme (galaxy, green terminal, black and white, focus)')
  }

  // Squiggle the line SQLite complained about.
  useEffect(() => {
    if (!mounted) return
    const model = mounted.editor.getModel()
    if (!model) return
    const err = untouched ? null : output?.error
    const line = err?.line && err.line <= model.getLineCount() ? err.line : null
    mounted.api.editor.setModelMarkers(
      model,
      'sql',
      err && line
        ? [{ severity: mounted.api.MarkerSeverity.Error, message: err.message, startLineNumber: line, startColumn: 1, endLineNumber: line, endColumn: model.getLineMaxColumn(line) }]
        : [],
    )
  }, [output, mounted, untouched])

  useEditMarks(mounted?.editor ?? null, mounted?.api ?? null, code, chatMarks)

  const insert = (snippet: string) => {
    const editor = editorRef.current
    const selection = editor?.getSelection()
    if (!editor || !selection) return
    editor.executeEdits('syntax-helper', [{ range: selection, text: snippet, forceMoveMarkers: true }])
    editor.focus()
  }

  // A problem shows its tables as they were before your statement; the playground, as they are after it.
  // Both come from the run when there is one, since only those carry rowids for the coloring.
  const inputTables = () => tables.map((t) => ({ name: t.name, columns: columnNames(t.columns), rows: t.rows }))
  const shownTables: NamedResult[] = (problem ? shown?.before : shown?.tables) ?? inputTables()

  const refContext: RefContext = useMemo(
    () => ({ lineCount: code.split('\n').length, stepCount: stages.length, vars: new Set(), glossary: glossaryIds }),
    [code, stages.length],
  )
  const view: ViewSummary = {
    step: stages.length ? stageIndex + 1 : 0,
    steps: stages.length,
    vars: [],
    glossary: [...glossaryIds],
    stages: stages.map((s) => s.label),
    tables: shownTables.map((t) => `${t.name}(${t.columns.join(', ')})`),
  }
  const [flash, setFlash] = useState<{ ref: Ref; n: number } | null>(null)
  const [tour, setTour] = useState<{ stops: TourStop[]; from: { x: number; y: number } } | null>(null)
  const endFlash = useCallback(() => setFlash(null), [])
  const placesRef = useRef({ stages, goTo })
  placesRef.current = { stages, goTo }
  const pointing: Pointing = useMemo(() => {
    const element = (ref: Ref) =>
      ref.kind === 'step' ? document.querySelector('.sql-stages') : ref.kind === 'glossary' ? document.querySelector('.syntax-pane') : null
    const shownRect = (r: DOMRect | null) => (r && r.width > 0 && r.height > 0 ? r : null)
    const locate = (ref: Ref): DOMRect | null => {
      if (ref.kind !== 'line') return shownRect(element(ref)?.getBoundingClientRect() ?? null)
      const editor = editorRef.current
      const model = editor?.getModel()
      const n = Number(ref.arg)
      if (!editor || !model || n > model.getLineCount()) return null
      const start = editor.getScrolledVisiblePosition({ lineNumber: n, column: model.getLineFirstNonWhitespaceColumn(n) || 1 })
      const end = editor.getScrolledVisiblePosition({ lineNumber: n, column: model.getLineMaxColumn(n) })
      const box = editor.getDomNode()?.getBoundingClientRect()
      if (!start || !end || !box || start.top < 0 || start.top > box.height) return null
      return shownRect(new DOMRect(box.left + start.left, box.top + start.top, Math.max(end.left - start.left, 24), start.height))
    }
    const settle = () => new Promise<void>((done) => requestAnimationFrame(() => requestAnimationFrame(() => done())))
    return {
      locate,
      async reveal(ref) {
        if (ref.kind === 'step') {
          setPlaying(false)
          placesRef.current.goTo(Number(ref.arg) - 1)
        }
        if (ref.kind === 'glossary') {
          setGlossaryFocus(ref.arg)
          setSidePanel('cards')
        }
        await settle()
        if (ref.kind === 'line') editorRef.current?.revealLineInCenterIfOutsideViewport(Number(ref.arg))
        else element(ref)?.scrollIntoView({ block: 'nearest' })
        await settle()
        return locate(ref)
      },
    }
  }, [])

  const chatProblem = problem
    ? `${problem.title} (SQL)\n${problem.statement.join('\n')}\nTables: ${problem.tables.map((t) => `${t.name}(${t.columns})`).join('; ')}`
    : null

  return (
    <>
      <main className={layout.panesClass} ref={layout.panesRef} style={layout.panesStyle}>
        <section className={`pane editor-pane${layout.paneClass(0)}`}>
          {problem && (
            <SqlProblemPanel
              key={problem.id}
              problem={problem}
              run={output}
              caseIndex={shownCase}
              onSelectCase={setCaseIndex}
              onOpenConcept={openConcept}
              savedAt={solutions[problem.id]?.savedAt ?? null}
              onStartOver={() => setCode(starterFor(problem))}
              onUseAnswer={() => setCode(problem.answer + '\n')}
            />
          )}
          <div className="editor-wrap">
            <Editor
              height="100%"
              path={`sql/${mode}`}
              language="sql"
              value={code}
              onChange={(v) => setCode(v ?? '')}
              onMount={onMount}
              theme={editorLook(theme).theme}
              options={{
                ...editorFont(fontScale),
                cursorStyle: editorLook(theme).cursorStyle,
                fontFamily: "'JetBrains Mono', ui-monospace, Consolas, monospace",
                padding: { top: 14 },
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                tabSize: 2,
                quickSuggestions: false,
                automaticLayout: true,
              }}
            />
            <CodeHover
              editor={mounted?.editor ?? null}
              monacoApi={mounted?.api ?? null}
              step={undefined}
              stepNumber={0}
              variables={NO_VARIABLES}
              language="sql"
              onOpenConcept={openConcept}
            />
          </div>
        </section>
        <div {...layout.columnDivider(0)} />
        <section className={`pane viz-pane${layout.paneClass(1)}`} ref={layout.vizRef}>
          <div className="viz-scroll sql-viz">
            {failure && <div className="error">{failure}</div>}
            {output?.error && !untouched && (
              <div className="error">
                {output.error.line ? `Line ${output.error.line}: ` : ''}
                {output.error.message}
                {good ? ' (showing the last query that ran)' : ''}
              </div>
            )}
            <div className="sql-stages">
              <div className="controls">
                <button className="icon-btn" onClick={commands.firstStep} disabled={!stages.length} aria-label="First stage" title={withShortcut('First stage', 'firstStep')}>
                  <SkipBackIcon />
                </button>
                <button className="icon-btn" onClick={commands.prevStep} disabled={!stages.length} aria-label="Previous stage" title={withShortcut('Previous stage', 'prevStep')}>
                  <StepBackIcon />
                </button>
                <button
                  className="icon-btn play-btn"
                  onClick={commands.playPause}
                  disabled={stages.length < 2}
                  aria-label={playing ? 'Pause' : 'Play the stages'}
                  title={withShortcut(playing ? 'Pause' : 'Play through the stages', 'playPause')}
                >
                  {playing ? <PauseIcon /> : <PlayIcon />}
                </button>
                <button className="icon-btn" onClick={commands.nextStep} disabled={!stages.length} aria-label="Next stage" title={withShortcut('Next stage', 'nextStep')}>
                  <StepForwardIcon />
                </button>
                <button className="icon-btn" onClick={commands.lastStep} disabled={!stages.length} aria-label="Last stage" title={withShortcut('Last stage', 'lastStep')}>
                  <SkipForwardIcon />
                </button>
                <input
                  className="scrubber"
                  type="range"
                  aria-label="Stage"
                  min={0}
                  max={Math.max(0, stages.length - 1)}
                  value={Math.max(0, stageIndex)}
                  style={{ '--pct': `${stages.length > 1 ? (stageIndex / (stages.length - 1)) * 100 : 0}%` } as CSSProperties}
                  onChange={(e) => {
                    setPlaying(false)
                    goTo(Number(e.target.value))
                  }}
                />
                <span className="step-count">{stages.length ? `${stageIndex + 1} / ${stages.length}` : ''}</span>
              </div>
              {stages.length > 0 && (
                <ol className="sql-stage-chips" aria-label="The order SQL runs this query">
                  {stages.map((s, i) => (
                    <li key={`${s.label}-${i}`}>
                      <button
                        className={`chip${i === stageIndex ? ' active' : ''}${i < stageIndex ? ' done' : ''}`}
                        aria-current={i === stageIndex ? 'step' : undefined}
                        onClick={() => {
                          setPlaying(false)
                          goTo(i)
                        }}
                      >
                        {s.label}
                      </button>
                    </li>
                  ))}
                </ol>
              )}
              {stage ? (
                <div className="sql-stage">
                  <p className="sql-stage-explain">
                    <span className="sql-stage-count">{stageCount(stages, stageIndex)}</span> {stage.explain}
                  </p>
                  <StageTable stage={stage} />
                </div>
              ) : (
                <p className="muted">
                  {status === 'loading' ? 'Starting SQLite in your browser…' : shown?.result ? '' : 'Write a SELECT query to see it run, stage by stage.'}
                </p>
              )}
              {!stages.length && shown?.result && <SqlTable result={shown.result} caption={<strong>Result</strong>} />}
              {!problem && shown && <ChangeNotes run={shown} />}
            </div>
            {problem && shown?.expected && (
              <CompareView
                got={shown.result}
                expected={shown.expected}
                comparison={shown.comparison}
                title={problem.checkTable ? `The ${problem.checkTable} table after your statement` : `Case ${shownCase + 1}: your result and the expected one`}
              />
            )}
            <TablesView
              tables={shownTables}
              title={problem ? (problem.checkTable ? 'Tables before your statement' : 'Tables') : 'Tables'}
              effects={untouched ? null : shown?.effects}
              stage={stage?.id ?? null}
              when={problem ? 'before' : 'after'}
              chatMarks={chatMarks}
              edited={
                editedData[dataKey]
                  ? {
                      note: problem
                        ? `The chat changed the data for case ${shownCase + 1}, to explore with. The tests still use their own data.`
                        : `The chat changed this data${chatMarks?.dropped.length ? ` (deleted ${chatMarks.dropped.join(', ')})` : ''}.`,
                      onReset: () => {
                        setTables(null)
                        setChatMarks(null)
                      },
                    }
                  : null
              }
            />
            {shown?.join && <JoinView join={shown.join} />}
          </div>
        </section>
        <div {...layout.columnDivider(1)} />
        <section className={`pane syntax-pane${layout.paneClass(2)}`}>
          <div className="side-tabs">
            <button className={sidePanel === 'chat' ? 'tab active' : 'tab'} onClick={() => setSidePanel('chat')}>
              Ask Claude
            </button>
            <button className={sidePanel === 'cards' ? 'tab active' : 'tab'} onClick={() => setSidePanel('cards')}>
              Glossary
            </button>
          </div>
          <div hidden={sidePanel !== 'chat'} className="side-body">
            <Chat
              playground={{ code, tables }}
              onPlaygroundChange={(next, marks) => {
                setCode(next.code)
                if (next.tables) setTables(next.tables)
                setChatMarks(marks)
              }}
              language="sql"
              problem={chatProblem}
              onInsert={insert}
              inputRef={chatInputRef}
              view={view}
              refContext={refContext}
              onPoint={(ref) => setFlash((f) => ({ ref, n: (f?.n ?? 0) + 1 }))}
              onShowMe={(stops, from) => {
                setFlash(null)
                setTour({ stops, from })
              }}
            />
          </div>
          {sidePanel === 'cards' && (
            <SyntaxHelper language="sql" onInsert={insert} focus={glossaryFocus} onFocus={setGlossaryFocus} onOpenProblem={onOpenProblem} />
          )}
        </section>
      </main>
      {flash && <PointerFlash key={flash.n} target={flash.ref} pointing={pointing} onDone={endFlash} />}
      {tour && <PointerTour stops={tour.stops} origin={tour.from} pointing={pointing} onClose={() => setTour(null)} />}
    </>
  )
}

const NO_VARIABLES = new Set<string>()

/** Column names from a CREATE TABLE column list like "id INTEGER PRIMARY KEY, name TEXT". */
const columnNames = (columns: string) => columns.split(',').map((c) => c.trim().split(/\s+/)[0])

/** In the playground: what statements that change data did (INSERT, UPDATE...). */
function ChangeNotes({ run }: { run: SqlRun }) {
  const changes = run.statements.filter((s) => !s.result)
  if (!changes.length) return null
  return (
    <p className="muted sql-changes">
      {changes.map((s) => `Line ${s.line}: ${s.changes} row${s.changes === 1 ? '' : 's'} changed`).join(' · ')}
    </p>
  )
}

function SqlProblemPanel({
  problem,
  run,
  caseIndex,
  onSelectCase,
  onOpenConcept,
  savedAt,
  onStartOver,
  onUseAnswer,
}: {
  problem: SqlProblem
  run: SqlRun | null
  caseIndex: number
  onSelectCase: (i: number) => void
  onOpenConcept: (id: string) => void
  savedAt: string | null
  onStartOver: () => void
  onUseAnswer: () => void
}) {
  const [hintsShown, setHintsShown] = useState(0)
  const [answerShown, setAnswerShown] = useState(false)
  const cases = run?.error ? null : run?.cases
  const passed = cases?.filter((c) => c.passed).length ?? 0
  const current = cases?.[caseIndex]
  const concepts = problem.concepts.flatMap((id) => SQL_CARDS.find((c) => c.id === id) ?? [])
  return (
    <div className="problem">
      <div className="problem-head">
        <strong>{problem.title}</strong>
        <span className="muted">{problem.difficulty}</span>
        {cases && <span className={passed === cases.length ? 'badge pass' : 'badge'}>{passed}/{cases.length} tests passing</span>}
        {savedAt && (
          <>
            <span className="badge pass" title={`Your passing query is saved in this browser (${new Date(savedAt).toLocaleString()})`}>
              ✓ Solved, saved
            </span>
            <button className="chip" onClick={onStartOver} title="Put the starter back; your saved query stays saved">
              Start over
            </button>
          </>
        )}
      </div>
      {problem.statement.map((para, i) => (
        <p key={i}>
          <Ticks text={para} />
        </p>
      ))}
      {problem.hints.slice(0, hintsShown).map((hint, i) => (
        <p key={i} className="hint">
          <span className="muted">Hint {i + 1}:</span> <Ticks text={hint} />
        </p>
      ))}
      {answerShown && (
        <div className="sql-answer">
          <pre>{problem.answer}</pre>
          <p className="explain">
            <span className="muted">Why: </span>
            {problem.why}
          </p>
          <button className="chip" onClick={onUseAnswer}>
            Put it in the editor
          </button>
        </div>
      )}
      <div className="concepts">
        {hintsShown < problem.hints.length && (
          <button className="chip" onClick={() => setHintsShown((n) => n + 1)}>
            {hintsShown === 0 ? 'Show a hint' : 'Another hint'}
          </button>
        )}
        {!answerShown && (
          <button className="chip" onClick={() => setAnswerShown(true)} title="A worked answer and why it works">
            Show the answer
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
        <span className="muted">Test case:</span>
        {problem.cases.map((c, i) => (
          <button
            key={i}
            className={`case ${i === caseIndex ? 'active' : ''} ${cases ? (cases[i]?.passed ? 'pass' : 'fail') : ''}`}
            onClick={() => onSelectCase(i)}
            title={`${c.name}${cases?.[i] && !cases[i].passed ? `: ${cases[i].reason}` : ''}`}
          >
            {cases ? (cases[i]?.passed ? '✓ ' : '✗ ') : ''}
            {i + 1}
          </button>
        ))}
      </div>
      <div className="call">
        <span className="muted">Case {caseIndex + 1}, {problem.cases[caseIndex].name}</span>
        {current && !current.passed && <span className="fail-text">: {current.reason}</span>}
      </div>
    </div>
  )
}

/** Text with `backtick` parts shown as code. */
function Ticks({ text }: { text: string }) {
  return (
    <>
      {text.split('`').map((part, i) => (i % 2 ? <code key={i}>{part}</code> : part))}
    </>
  )
}
