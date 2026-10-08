import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { flushSync } from 'react-dom'
import Editor, { type OnMount } from '@monaco-editor/react'
import type * as monaco from 'monaco-editor/editor/editor.api'
import { EDITOR_THEME } from './monaco'
import { GalaxyBackground } from './galaxy/GalaxyBackground'
import { KeyboardIcon, PauseIcon, PlayIcon, SkipBackIcon, SkipForwardIcon, StepBackIcon, StepForwardIcon } from './icons'
import { usePythonRunner } from './runner/usePythonRunner'
import { Visualizer } from './viz/Visualizer'
import { findNames, previousInFrame, stepRoles } from './viz/changes'
import { buildHistory } from './viz/history'
import { HistoryPanel } from './viz/HistoryPanel'
import { ConsolePanel } from './console/ConsolePanel'
import { SyntaxHelper } from './syntax/SyntaxHelper'
import { Chat } from './chat/Chat'
import { DIFFICULTIES, PROBLEMS, type Problem } from './problems/problems'
import { ProblemPanel } from './problems/ProblemPanel'
import { commandFor, focusKind, withShortcut, type Command } from './shortcuts'
import { ShortcutsDialog } from './ShortcutsDialog'
import type { RunRequest } from './types'

const STARTER = `nums = [4, 8, 15, 16, 23, 42]
total = 0
for n in nums:
    total += n
print(total)
`

const PLAY_MS = 700

const PLAYGROUND = 'playground'

export default function App() {
  const [mode, setMode] = useState<string>(PLAYGROUND)
  const [codeByMode, setCodeByMode] = useState<Record<string, string>>(() => ({
    [PLAYGROUND]: STARTER,
    ...Object.fromEntries(PROBLEMS.map((p) => [p.id, p.starter])),
  }))
  const [caseIndex, setCaseIndex] = useState(0)
  const [sidePanel, setSidePanel] = useState<'chat' | 'history' | 'cards'>('chat')
  const problem: Problem | undefined = PROBLEMS.find((p) => p.id === mode)
  // The glossary entry a concept chip opened, shown on its own until the learner goes back to the list.
  const [glossaryFocus, setGlossaryFocus] = useState<string | null>(null)
  const openProblem = (id: string) => {
    setMode(id)
    setCaseIndex(0)
  }
  const code = codeByMode[mode]
  const setCode = (next: string) => setCodeByMode((c) => ({ ...c, [mode]: next }))
  const request: RunRequest = problem
    ? {
        code,
        call: { name: problem.functionName, args: problem.tests[caseIndex].args },
        tests: problem.tests,
      }
    : { code }
  const { status, trace, error, tests } = usePythonRunner(request)
  const [stepIndex, setStepIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null)
  const monacoRef = useRef<typeof monaco | null>(null)
  const decorations = useRef<monaco.editor.IEditorDecorationsCollection | null>(null)
  const chatInputRef = useRef<HTMLInputElement>(null)
  const shortcutsRef = useRef<HTMLDialogElement>(null)

  const steps = trace?.steps ?? []
  const shownStep = Math.min(stepIndex, Math.max(0, steps.length - 1))
  const step = steps[shownStep]
  const prevStep = previousInFrame(steps, shownStep)
  const history = useMemo(() => (trace ? buildHistory(trace.steps, trace) : []), [trace])

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
      'python',
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
      ...findNames(line, [...targets, ...sources.filter((s) => !spotted.has(s))]).map((r) =>
        at(r.start, r.end, targets.includes(r.name) ? 'code-target' : 'code-source'),
      ),
      ...spots.map((r) => at(r.start!, r.end!, 'code-source')),
    ]
  }

  const onMount: OnMount = (editor, m) => {
    editorRef.current = editor
    monacoRef.current = m
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
    status === 'loading' ? 'Loading Python…' : status === 'running' ? 'Running…' : error ? 'Error' : 'Up to date'

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
              className={problem ? 'problem-select active' : 'problem-select'}
              value={problem ? problem.id : ''}
              onChange={(e) => openProblem(e.target.value)}
              aria-label="Problem"
            >
              {!problem && (
                <option value="" disabled>
                  Problems ({PROBLEMS.length})
                </option>
              )}
              {DIFFICULTIES.map((d) => {
                const group = PROBLEMS.filter((p) => p.difficulty === d)
                return (
                  group.length > 0 && (
                    <optgroup key={d} label={d}>
                      {group.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.title}
                        </option>
                      ))}
                    </optgroup>
                  )
                )
              })}
            </select>
          </nav>
          <h1 className="wordmark">Code Language Teacher</h1>
          <div className="top-right">
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
        <main className="panes">
          <section className="pane editor-pane">
            {problem && (
              <ProblemPanel
                key={problem.id}
                problem={problem}
                tests={tests}
                caseIndex={caseIndex}
                onSelectCase={setCaseIndex}
                result={trace?.result ?? null}
                call={trace?.call ?? null}
                stale={error?.kind === 'syntax'}
                onOpenConcept={(id) => {
                  setGlossaryFocus(id)
                  setSidePanel('cards')
                }}
              />
            )}
            <div className="editor-wrap">
            <Editor
              height="100%"
              path={mode}
              defaultLanguage="python"
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
                tabSize: 4,
                // Word suggestions only on Ctrl+Space, so they don't pop up (and grab Enter) while typing.
                quickSuggestions: false,
              }}
            />
            </div>
          </section>
          <section className="pane viz-pane">
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
            {step ? (
              <Visualizer
                step={step}
                prevStep={prevStep}
                pointers={trace!.pointers}
                plans={trace!}
                tick={stepIndex}
              />
            ) : (
              <p className="muted">{status === 'loading' ? 'Starting Python in your browser…' : 'Write some code.'}</p>
            )}
            {trace && (
              <ConsolePanel
                entries={trace.console}
                error={error}
                code={trace.code}
                current={shownStep}
                isLast={shownStep === steps.length - 1}
                onJump={(i) => {
                  setPlaying(false)
                  setStepIndex(Math.min(i, steps.length - 1))
                }}
              />
            )}
          </section>
          <section className="pane syntax-pane">
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
              <Chat code={code} problem={problem?.title ?? null} onInsert={insert} inputRef={chatInputRef} />
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
    </div>
  )
}
