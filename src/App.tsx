import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { flushSync } from 'react-dom'
import Editor, { type OnMount } from '@monaco-editor/react'
import type * as monaco from 'monaco-editor/editor/editor.api'
import { EDITOR_THEME } from './monaco'
import { GalaxyBackground } from './galaxy/GalaxyBackground'
import { AutoLayoutIcon, ColumnsIcon, KeyboardIcon, PauseIcon, PlayIcon, RowsIcon, SkipBackIcon, SkipForwardIcon, StepBackIcon, StepForwardIcon } from './icons'
import { useRunner } from './runner/useRunner'
import { Visualizer } from './viz/Visualizer'
import { findNames, previousInFrame, stepRoles } from './viz/changes'
import { buildHistory } from './viz/history'
import { HistoryPanel } from './viz/HistoryPanel'
import { ConsolePanel } from './console/ConsolePanel'
import { SyntaxHelper } from './syntax/SyntaxHelper'
import { CodeHover } from './syntax/CodeHover'
import { Chat } from './chat/Chat'
import { DIFFICULTIES, PROBLEM_TOPICS, PROBLEMS, type Problem } from './problems/problems'
import { ProblemPanel } from './problems/ProblemPanel'
import { loadSolutions, saveSolution, type Solutions } from './problems/solutions'
import { JS_CONCEPTS } from './problems/concepts'
import { commandFor, focusKind, withShortcut, type Command } from './shortcuts'
import { ShortcutsDialog } from './ShortcutsDialog'
import { TapTip } from './TapTip'
import { usePaneLayout, type LayoutMode } from './layout/usePaneLayout'
import type { Language, RunRequest } from './types'

const STARTERS: Record<Language, string> = {
  python: `nums = [4, 8, 15, 16, 23, 42]
total = 0
for n in nums:
    total += n
print(total)
`,
  javascript: `const nums = [4, 8, 15, 16, 23, 42]
let total = 0
for (const n of nums) {
  total += n
}
console.log(total)
`,
}

const LANGUAGES: { id: Language; label: string }[] = [
  { id: 'python', label: 'Python' },
  { id: 'javascript', label: 'JavaScript' },
]

const LANGUAGE_KEY = 'clt.language.v1'

function savedLanguage(): Language {
  try {
    const saved = localStorage.getItem(LANGUAGE_KEY)
    if (LANGUAGES.some((l) => l.id === saved)) return saved as Language
  } catch {
    // storage blocked: start in Python
  }
  return 'python'
}

/** Everyone's starting code: the playground and each problem, in each language. */
const starterCode = (): Record<Language, Record<string, string>> => ({
  python: { [PLAYGROUND]: STARTERS.python, ...Object.fromEntries(PROBLEMS.map((p) => [p.id, p.starters.python])) },
  javascript: {
    [PLAYGROUND]: STARTERS.javascript,
    ...Object.fromEntries([...PROBLEMS, ...JS_CONCEPTS].map((p) => [p.id, p.starters.javascript])),
  },
})

/** The starters, with each solved problem opening on its saved solution instead. */
const startingCode = (solutions: Solutions) => {
  const code = starterCode()
  for (const language of Object.keys(code) as Language[]) {
    for (const [id, s] of Object.entries(solutions[language])) if (id in code[language]) code[language][id] = s.code
  }
  return code
}

const PLAY_MS = 700

const PLAYGROUND = 'playground'

const LAYOUT_OPTIONS: { mode: LayoutMode; label: string; Icon: () => ReactNode }[] = [
  { mode: 'auto', label: 'Layout: auto (stacked when the screen is taller than wide)', Icon: AutoLayoutIcon },
  { mode: 'columns', label: 'Layout: side by side', Icon: ColumnsIcon },
  { mode: 'stacked', label: 'Layout: stacked (portrait)', Icon: RowsIcon },
]

export default function App() {
  const [mode, setMode] = useState<string>(PLAYGROUND)
  const [language, setLanguageState] = useState<Language>(savedLanguage)
  const setLanguage = (next: Language) => {
    setLanguageState(next)
    // The concept problems are JavaScript only.
    if (next !== 'javascript' && JS_CONCEPTS.some((p) => p.id === mode)) setMode(PLAYGROUND)
    try {
      localStorage.setItem(LANGUAGE_KEY, next)
    } catch {
      // not remembered, which is fine
    }
  }
  // Each language keeps its own code, so switching back finds the code where it was left.
  // Code that passes every test is saved per problem and language, and reopens on the next visit.
  const [solutions, setSolutions] = useState(loadSolutions)
  const [codeByMode, setCodeByMode] = useState(() => startingCode(solutions))
  const [caseIndex, setCaseIndex] = useState(0)
  const layout = usePaneLayout()
  const [sidePanel, setSidePanel] = useState<'chat' | 'history' | 'cards'>('chat')
  const problem: Problem | undefined = PROBLEMS.find((p) => p.id === mode) ?? JS_CONCEPTS.find((p) => p.id === mode)
  // Predict problems keep the output and steps covered until the learner has guessed (or skipped).
  const [revealed, setRevealed] = useState<Set<string>>(() => new Set())
  const covered = problem?.kind === 'predict' && !revealed.has(problem.id)
  // The glossary entry a concept chip opened, shown on its own until the learner goes back to the list.
  const [glossaryFocus, setGlossaryFocus] = useState<string | null>(null)
  const openConcept = (id: string) => {
    setGlossaryFocus(id)
    setSidePanel('cards')
  }
  const openProblem = (id: string) => {
    setMode(id)
    setCaseIndex(0)
  }
  const code = codeByMode[language][mode]
  const setCode = (next: string) => setCodeByMode((c) => ({ ...c, [language]: { ...c[language], [mode]: next } }))
  // Concept problems run their code as a whole, examples and all; their tests are separate.
  const request: RunRequest = !problem
    ? { code }
    : problem.track
      ? problem.tests.length
        ? { code, tests: problem.tests, testFor: problem.functionName }
        : { code }
      : {
          code,
          call: { name: problem.functionName, args: problem.tests[caseIndex].args },
          // The speed test (a big input with a step budget) runs after the ordinary cases.
          tests: problem.speed ? [...problem.tests, problem.speed] : problem.tests,
          ...(problem.io && { io: problem.io }),
        }
  const { status, trace, error, tests, ranFor } = useRunner(request, language)
  // Right after switching problems, the last results are still the old problem's until the new run lands.
  const resultsFresh = problem !== undefined && (ranFor ?? '') === problem.functionName
  // trace.code is the exact source those tests ran, even if the editor has changed since. Both languages
  // share function names, so also check the run was in this language (a switch shows the old one briefly).
  const solvedCode =
    resultsFresh && trace?.language === language && tests?.length && tests.every((t) => t.passed) ? trace.code : null
  useEffect(() => {
    if (!problem || solvedCode === null || solutions[language][problem.id]?.code === solvedCode) return
    setSolutions((s) => saveSolution(s, language, problem.id, solvedCode))
  }, [solvedCode, problem, language, solutions])
  const [stepIndex, setStepIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null)
  const monacoRef = useRef<typeof monaco | null>(null)
  // The same editor as state, for the parts that render once it exists.
  const [mounted, setMounted] = useState<{ editor: monaco.editor.IStandaloneCodeEditor; api: typeof monaco } | null>(null)
  const decorations = useRef<monaco.editor.IEditorDecorationsCollection | null>(null)
  const chatInputRef = useRef<HTMLInputElement>(null)
  const shortcutsRef = useRef<HTMLDialogElement>(null)

  // While a predict problem is covered there are no steps to walk, so nothing (line highlights, the scrubber) gives the answer away.
  const steps = covered ? [] : (trace?.steps ?? [])
  const shownStep = Math.min(stepIndex, Math.max(0, steps.length - 1))
  const step = steps[shownStep]
  const prevStep = previousInFrame(steps, shownStep)
  const history = useMemo(() => (trace && !covered ? buildHistory(trace.steps, trace) : []), [trace, covered])
  const variables = useMemo(() => new Set(steps.flatMap((s) => Object.keys(s.vars))), [trace])

  // What the step buttons and the keyboard shortcuts do (keys in src/shortcuts.ts).
  const stepTo = (next: (i: number) => number) => {
    if (steps.length) setStepIndex((i) => Math.max(0, Math.min(steps.length - 1, next(i))))
  }
  const commands: Record<Command, () => void> = {
    playPause: () => {
      if (steps.length < 2) return
      if (stepIndex >= steps.length - 1) setStepIndex(0)
      setPlaying((p) => !p)
    },
    firstStep: () => stepTo(() => 0),
    prevStep: () => stepTo((i) => i - 1),
    nextStep: () => stepTo((i) => i + 1),
    lastStep: () => {
      setPlaying(false)
      stepTo(() => steps.length - 1)
    },
    // Toggles between the code and the question box.
    askClaude: () => {
      if (chatInputRef.current && document.activeElement === chatInputRef.current) {
        editorRef.current?.focus()
        return
      }
      flushSync(() => setSidePanel('chat'))
      chatInputRef.current?.focus()
    },
    focusEditor: () => editorRef.current?.focus(),
    showShortcuts: () => {
      const dialog = shortcutsRef.current
      if (dialog?.open) dialog.close()
      else dialog?.showModal()
    },
    save: () => {},
  }
  // The editor actions and the key listener are set up once; this keeps them current.
  const commandsRef = useRef(commands)
  useEffect(() => {
    commandsRef.current = commands
  })

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.isComposing) return
      const command = commandFor(e, focusKind(e.target instanceof Element ? e.target : null))
      if (!command) return
      // While the cheat sheet is open, only ? (to close it) and the Save block apply.
      if (shortcutsRef.current?.open && command !== 'showShortcuts' && command !== 'save') return
      e.preventDefault()
      // Holding Space would flip between play and pause.
      if (e.repeat && command === 'playPause') return
      commandsRef.current[command]()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  // A fresh trace shows the final state; Play walks through it from the top.
  useEffect(() => {
    setStepIndex(Math.max(0, (trace?.steps.length ?? 1) - 1))
    setPlaying(false)
  }, [trace])

  useEffect(() => {
    if (!playing) return
    if (stepIndex >= steps.length - 1) {
      setPlaying(false)
      return
    }
    const t = window.setTimeout(() => setStepIndex((i) => i + 1), PLAY_MS)
    return () => window.clearTimeout(t)
  }, [playing, stepIndex, steps.length])

  // Highlight the line the current step is on, and squiggle any error.
  useEffect(() => {
    const editor = editorRef.current
    const m = monacoRef.current
    if (!editor || !m) return
    decorations.current ??= editor.createDecorationsCollection()
    const model = editor.getModel()
    if (!model) return
    decorations.current.set(
      step
        ? [
            { range: new m.Range(step.line, 1, step.line, 1), options: { isWholeLine: true, className: 'current-line' } },
            ...roleDecorations(m, model),
          ]
        : [],
    )
    m.editor.setModelMarkers(
      model,
      'code',
      error?.line
        ? [
            {
              severity: m.MarkerSeverity.Error,
              message: error.message,
              startLineNumber: error.line,
              startColumn: error.col ?? 1,
              endLineNumber: error.line,
              endColumn: model.getLineMaxColumn(error.line),
            },
          ]
        : [],
    )
  }, [step, error, prevStep, trace])

  // Color the names on the line that just ran: what it changed and what it read.
  const roleDecorations = (m: typeof monaco, model: monaco.editor.ITextModel) => {
    if (!step || !prevStep || !trace) return []
    const line = trace.code.split('\n')[prevStep.line - 1]
    // Skip it while the editor holds newer code than the trace ran.
    if (line === undefined || prevStep.line > model.getLineCount() || model.getLineContent(prevStep.line) !== line) return []
    const { targets, sources, reads } = stepRoles(step, prevStep, trace)
    const at = (start: number, end: number, className: string) => ({
      range: new m.Range(prevStep.line, start, prevStep.line, end),
      options: { inlineClassName: className },
    })
    // The exact spots it read, like all of ages["test"]; a name read without one lights up everywhere.
    const spots = reads.filter((r) => r.start && r.end && (r.item !== undefined || !targets.includes(r.name)))
    const spotted = new Set(spots.map((r) => r.name))
    return [
      ...findNames(line, [...targets, ...sources.filter((s) => !spotted.has(s))], language).map((r) =>
        at(r.start, r.end, targets.includes(r.name) ? 'code-target' : 'code-source'),
      ),
      ...spots.map((r) => at(r.start!, r.end!, 'code-source')),
    ]
  }

  const onMount: OnMount = (editor, m) => {
    editorRef.current = editor
    monacoRef.current = m
    setMounted({ editor, api: m })
    // The same shortcuts while typing. As editor actions they also show up in F1.
    const { KeyMod, KeyCode } = m
    const action = (id: Command, label: string, keybindings: number[] = []) =>
      editor.addAction({
        id: `app.${id}`,
        label,
        keybindings,
        keybindingContext: 'editorTextFocus',
        run: () => commandsRef.current[id](),
      })
    action('playPause', 'Play / pause the run', [KeyMod.CtrlCmd | KeyCode.Enter])
    action('nextStep', 'Next step', [KeyMod.Alt | KeyCode.Period])
    action('prevStep', 'Previous step', [KeyMod.Alt | KeyCode.Comma])
    action('lastStep', 'Last step', [KeyMod.Alt | KeyMod.Shift | KeyCode.Period])
    action('firstStep', 'First step', [KeyMod.Alt | KeyMod.Shift | KeyCode.Comma])
    action('askClaude', 'Ask Claude', [KeyMod.CtrlCmd | KeyCode.KeyI])
    action('showShortcuts', 'Keyboard shortcuts')
  }

  const insert = (snippet: string) => {
    const editor = editorRef.current
    if (!editor) return
    const selection = editor.getSelection()
    if (!selection) return
    editor.executeEdits('syntax-helper', [{ range: selection, text: snippet, forceMoveMarkers: true }])
    editor.focus()
  }

  const statusText =
    status === 'loading' ? (language === 'python' ? 'Loading Python…' : 'Starting…') : status === 'running' ? 'Running…' : error ? 'Error' : 'Up to date'

  return (
    <div className="app">
      <GalaxyBackground />
      <span className="tick tl" aria-hidden="true" />
      <span className="tick tr" aria-hidden="true" />
      <span className="tick bl" aria-hidden="true" />
      <span className="tick br" aria-hidden="true" />
      <div className="frame">
        <header className="top">
          <nav className="tabs">
            <button className={mode === PLAYGROUND ? 'tab active' : 'tab'} onClick={() => openProblem(PLAYGROUND)}>
              Playground
            </button>
            <select
              className={problem && !problem.track ? 'problem-select active' : 'problem-select'}
              value={problem && !problem.track ? problem.id : ''}
              onChange={(e) => openProblem(e.target.value)}
              aria-label="Problem"
            >
              {(!problem || problem.track) && (
                <option value="" disabled>
                  Problems ({PROBLEMS.length})
                </option>
              )}
              {PROBLEM_TOPICS.map((t) => {
                // Easiest first within a section.
                const group = PROBLEMS.filter((p) => p.topic === t.id).sort(
                  (a, b) => DIFFICULTIES.indexOf(a.difficulty) - DIFFICULTIES.indexOf(b.difficulty),
                )
                return (
                  group.length > 0 && (
                    <optgroup key={t.id} label={t.label}>
                      {group.map((p) => (
                        <option key={p.id} value={p.id}>
                          {`${solutions[language][p.id] ? '✓ ' : ''}${p.title} · ${p.difficulty}`}
                        </option>
                      ))}
                    </optgroup>
                  )
                )
              })}
            </select>
            {language === 'javascript' && (
              <select
                className={problem?.track ? 'problem-select concept-select active' : 'problem-select concept-select'}
                value={problem?.track ? problem.id : ''}
                onChange={(e) => openProblem(e.target.value)}
                aria-label="JavaScript concept"
                title="How JavaScript itself behaves: closures, references, array methods"
              >
                {!problem?.track && (
                  <option value="" disabled>
                    JS concepts ({JS_CONCEPTS.length})
                  </option>
                )}
                {JS_CONCEPTS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.kind === 'predict' ? `${p.title} (predict)` : solutions.javascript[p.id] ? `✓ ${p.title}` : p.title}
                  </option>
                ))}
              </select>
            )}
          </nav>
          <h1 className="wordmark">Code Language Teacher</h1>
          <div className="top-right">
            <div className="lang-switch" role="group" aria-label="Language">
              {LANGUAGES.map((l) => (
                <button
                  key={l.id}
                  className={language === l.id ? 'tab active' : 'tab'}
                  aria-pressed={language === l.id}
                  onClick={() => setLanguage(l.id)}
                >
                  {l.label}
                </button>
              ))}
            </div>
            <div className="layout-switch" role="group" aria-label="Layout">
              {LAYOUT_OPTIONS.map(({ mode: m, label, Icon }) => (
                <button
                  key={m}
                  className={layout.mode === m ? 'icon-btn active' : 'icon-btn'}
                  aria-pressed={layout.mode === m}
                  aria-label={label}
                  title={label}
                  onClick={() => layout.setMode(m)}
                >
                  <Icon />
                </button>
              ))}
            </div>
            <button
              className="icon-btn keys-btn"
              onClick={commands.showShortcuts}
              aria-label="Keyboard shortcuts"
              title={withShortcut('Keyboard shortcuts', 'showShortcuts')}
            >
              <KeyboardIcon />
            </button>
            <span className={`status status-${error ? 'error' : status}`}>{statusText}</span>
          </div>
        </header>
        <main className={layout.panesClass} ref={layout.panesRef} style={layout.panesStyle}>
          <section className={`pane editor-pane${layout.paneClass(0)}`}>
            {problem && (
              <ProblemPanel
                key={problem.id}
                problem={problem}
                language={language}
                tests={resultsFresh ? tests : null}
                caseIndex={caseIndex}
                onSelectCase={setCaseIndex}
                result={resultsFresh ? (trace?.result ?? null) : null}
                call={resultsFresh ? (trace?.call ?? null) : null}
                stale={error?.kind === 'syntax'}
                onOpenConcept={openConcept}
                output={trace && !error ? trace.stdout : null}
                revealed={!covered}
                onReveal={() => setRevealed((r) => new Set(r).add(problem.id))}
                savedAt={solutions[language][problem.id]?.savedAt ?? null}
                onStartOver={() => setCode(problem.starters[language])}
              />
            )}
            <div className="editor-wrap">
            <Editor
              height="100%"
              path={`${language}/${mode}`}
              language={language}
              value={code}
              onChange={(v) => setCode(v ?? '')}
              onMount={onMount}
              theme={EDITOR_THEME}
              options={{
                fontSize: 15,
                fontFamily: "'JetBrains Mono', ui-monospace, Consolas, monospace",
                lineHeight: 24,
                padding: { top: 14 },
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                tabSize: language === 'python' ? 4 : 2,
                // Word suggestions only on Ctrl+Space, so they don't pop up (and grab Enter) while typing.
                quickSuggestions: false,
                // Re-measure when a divider drag resizes the pane.
                automaticLayout: true,
              }}
            />
            <CodeHover
              editor={mounted?.editor ?? null}
              monacoApi={mounted?.api ?? null}
              step={covered ? undefined : step}
              stepNumber={shownStep + 1}
              variables={variables}
              language={language}
              onOpenConcept={openConcept}
            />
            </div>
          </section>
          <div {...layout.columnDivider(0)} />
          <section className={`pane viz-pane${layout.paneClass(1)}`} ref={layout.vizRef}>
            <div className="viz-scroll">
            <div className="controls">
              <button
                className="icon-btn"
                onClick={commands.firstStep}
                disabled={!steps.length}
                aria-label="Go to first step"
                title={withShortcut('First step', 'firstStep')}
              >
                <SkipBackIcon />
              </button>
              <button
                className="icon-btn"
                onClick={commands.prevStep}
                disabled={!steps.length}
                aria-label="Previous step"
                title={withShortcut('Previous step', 'prevStep')}
              >
                <StepBackIcon />
              </button>
              <button
                className="icon-btn play-btn"
                onClick={commands.playPause}
                disabled={steps.length < 2}
                aria-label={playing ? 'Pause' : 'Play'}
                title={withShortcut(playing ? 'Pause' : 'Play', 'playPause')}
              >
                {playing ? <PauseIcon /> : <PlayIcon />}
              </button>
              <button
                className="icon-btn"
                onClick={commands.nextStep}
                disabled={!steps.length}
                aria-label="Next step"
                title={withShortcut('Next step', 'nextStep')}
              >
                <StepForwardIcon />
              </button>
              <button
                className="icon-btn"
                onClick={commands.lastStep}
                disabled={!steps.length}
                aria-label="Go to last step"
                title={withShortcut('Last step', 'lastStep')}
              >
                <SkipForwardIcon />
              </button>
              <input
                className="scrubber"
                type="range"
                aria-label="Step"
                min={0}
                max={Math.max(0, steps.length - 1)}
                value={shownStep}
                style={{ '--pct': `${steps.length > 1 ? (shownStep / (steps.length - 1)) * 100 : 0}%` } as CSSProperties}
                onChange={(e) => {
                  setPlaying(false)
                  setStepIndex(Number(e.target.value))
                }}
              />
              <span className="step-count">
                {steps.length ? `${shownStep + 1} / ${steps.length}` : ''}
              </span>
            </div>
            {trace?.truncated && <p className="muted">Stopped early: too many steps.</p>}
            {error && (
              <div className="error">
                {error.line ? `Line ${error.line}: ` : ''}
                {error.message}
                {error.kind === 'syntax' && trace ? ' (showing the last version that ran)' : ''}
              </div>
            )}
            {covered ? (
              <div className="predict-cover">
                <p>Guess what this prints first, in the box under the problem.</p>
                <p className="muted">Then step through it here to see why.</p>
              </div>
            ) : step ? (
              <Visualizer
                step={step}
                prevStep={prevStep}
                pointers={trace!.pointers}
                plans={trace!}
                tick={stepIndex}
                language={trace!.language}
              />
            ) : (
              <p className="muted">{status === 'loading' && language === 'python' ? 'Starting Python in your browser…' : 'Write some code.'}</p>
            )}
            </div>
            {trace && !covered && <div {...layout.consoleDivider} />}
            {trace && !covered && (
              <div className={`console-dock${layout.consoleCollapsed ? ' collapsed' : ''}`} style={layout.consoleStyle}>
              <ConsolePanel
                entries={trace.console}
                error={error}
                code={trace.code}
                language={language}
                current={shownStep}
                isLast={shownStep === steps.length - 1}
                onJump={(i) => {
                  setPlaying(false)
                  setStepIndex(Math.min(i, steps.length - 1))
                }}
              />
              </div>
            )}
          </section>
          <div {...layout.columnDivider(1)} />
          <section className={`pane syntax-pane${layout.paneClass(2)}`}>
            <div className="side-tabs">
              <button className={sidePanel === 'chat' ? 'tab active' : 'tab'} onClick={() => setSidePanel('chat')}>
                Ask Claude
              </button>
              <button className={sidePanel === 'history' ? 'tab active' : 'tab'} onClick={() => setSidePanel('history')}>
                History
              </button>
              <button className={sidePanel === 'cards' ? 'tab active' : 'tab'} onClick={() => setSidePanel('cards')}>
                Glossary
              </button>
            </div>
            {/* Keep the chat mounted so switching tabs doesn't lose the conversation. */}
            <div hidden={sidePanel !== 'chat'} className="side-body">
              <Chat code={code} language={language} problem={problem?.title ?? null} onInsert={insert} inputRef={chatInputRef} />
            </div>
            {sidePanel === 'history' && (
              <div className="side-body">
              <HistoryPanel
                entries={history}
                current={shownStep}
                code={trace?.code ?? ''}
                onJump={(i) => {
                  setPlaying(false)
                  setStepIndex(i)
                }}
              />
              </div>
            )}
            {sidePanel === 'cards' && (
              <SyntaxHelper
                language={language}
                onInsert={insert}
                focus={glossaryFocus}
                onFocus={setGlossaryFocus}
                onOpenProblem={openProblem}
              />
            )}
          </section>
        </main>
      </div>
      <ShortcutsDialog dialogRef={shortcutsRef} />
      <TapTip />
    </div>
  )
}
