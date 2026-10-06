import { useEffect, useRef, useState } from 'react'
import Editor, { type OnMount } from '@monaco-editor/react'
import type * as monaco from 'monaco-editor/editor/editor.api'
import { EDITOR_THEME } from './monaco'
import { GalaxyBackground } from './galaxy/GalaxyBackground'
import { usePythonRunner } from './runner/usePythonRunner'
import { Visualizer } from './viz/Visualizer'
import { SyntaxHelper } from './syntax/SyntaxHelper'
import { Chat } from './chat/Chat'
import { PROBLEMS, type Problem } from './problems/problems'
import { ProblemPanel } from './problems/ProblemPanel'
import type { RunRequest } from './types'

const STARTER = `nums = [4, 8, 15, 16, 23, 42]
total = 0
for n in nums:
    total += n
print(total)
`

const PLAY_MS = 450

const PLAYGROUND = 'playground'

export default function App() {
  const [mode, setMode] = useState<string>(PLAYGROUND)
  const [codeByMode, setCodeByMode] = useState<Record<string, string>>(() => ({
    [PLAYGROUND]: STARTER,
    ...Object.fromEntries(PROBLEMS.map((p) => [p.id, p.starter])),
  }))
  const [caseIndex, setCaseIndex] = useState(0)
  const [sidePanel, setSidePanel] = useState<'chat' | 'cards'>('chat')
  const problem: Problem | undefined = PROBLEMS.find((p) => p.id === mode)
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

  const steps = trace?.steps ?? []
  const step = steps[Math.min(stepIndex, steps.length - 1)]

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
    decorations.current.set(
      step
        ? [{ range: new m.Range(step.line, 1, step.line, 1), options: { isWholeLine: true, className: 'current-line' } }]
        : [],
    )
    const model = editor.getModel()
    if (!model) return
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
  }, [step, error])

  const onMount: OnMount = (editor, m) => {
    editorRef.current = editor
    monacoRef.current = m
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
            {[{ id: PLAYGROUND, title: 'Playground' }, ...PROBLEMS].map((m) => (
              <button
                key={m.id}
                className={m.id === mode ? 'tab active' : 'tab'}
                onClick={() => {
                  setMode(m.id)
                  setCaseIndex(0)
                }}
              >
                {m.title}
              </button>
            ))}
          </nav>
          <h1 className="wordmark">Code Language Teacher</h1>
          <div className="top-right">
            <span className={`status status-${error ? 'error' : status}`}>{statusText}</span>
          </div>
        </header>
        <main className="panes">
          <section className="pane editor-pane">
            {problem && (
              <ProblemPanel
                problem={problem}
                tests={tests}
                caseIndex={caseIndex}
                onSelectCase={setCaseIndex}
                result={trace?.result ?? null}
                call={trace?.call ?? null}
                stale={error?.kind === 'syntax'}
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
                fontFamily: "'Geist Mono', ui-monospace, Consolas, monospace",
                lineHeight: 24,
                padding: { top: 14 },
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                tabSize: 4,
              }}
            />
            </div>
          </section>
          <section className="pane viz-pane">
            <div className="controls">
              <button onClick={() => setStepIndex(0)} disabled={!steps.length}>
                ⏮
              </button>
              <button onClick={() => setStepIndex((i) => Math.max(0, i - 1))} disabled={!steps.length}>
                ◀
              </button>
              <button
                onClick={() => {
                  if (stepIndex >= steps.length - 1) setStepIndex(0)
                  setPlaying((p) => !p)
                }}
                disabled={steps.length < 2}
              >
                {playing ? 'Pause' : 'Play'}
              </button>
              <button onClick={() => setStepIndex((i) => Math.min(steps.length - 1, i + 1))} disabled={!steps.length}>
                ▶
              </button>
              <input
                type="range"
                min={0}
                max={Math.max(0, steps.length - 1)}
                value={Math.min(stepIndex, Math.max(0, steps.length - 1))}
                onChange={(e) => {
                  setPlaying(false)
                  setStepIndex(Number(e.target.value))
                }}
              />
              <span className="muted">
                {steps.length ? `step ${Math.min(stepIndex, steps.length - 1) + 1} / ${steps.length}` : ''}
                {trace?.truncated ? ' (stopped early: too many steps)' : ''}
              </span>
            </div>
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
                prevStep={steps[Math.min(stepIndex, steps.length - 1) - 1]}
                pointers={trace!.pointers}
              />
            ) : (
              <p className="muted">{status === 'loading' ? 'Starting Python in your browser…' : 'Write some code.'}</p>
            )}
            <div className="output">
              <div className="output-title">Output</div>
              <pre>{step?.stdout ?? ''}</pre>
            </div>
          </section>
          <section className="pane syntax-pane">
            <div className="side-tabs">
              <button className={sidePanel === 'chat' ? 'tab active' : 'tab'} onClick={() => setSidePanel('chat')}>
                Ask Claude
              </button>
              <button className={sidePanel === 'cards' ? 'tab active' : 'tab'} onClick={() => setSidePanel('cards')}>
                Syntax cards
              </button>
            </div>
            {/* Keep the chat mounted so switching tabs doesn't lose the conversation. */}
            <div hidden={sidePanel !== 'chat'} className="side-body">
              <Chat code={code} problem={problem?.title ?? null} onInsert={insert} />
            </div>
            {sidePanel === 'cards' && <SyntaxHelper onInsert={insert} />}
          </section>
        </main>
      </div>
    </div>
  )
}
