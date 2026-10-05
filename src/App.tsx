import { useEffect, useRef, useState } from 'react'
import Editor, { type OnMount } from '@monaco-editor/react'
import type * as monaco from 'monaco-editor/editor/editor.api'
import './monaco'
import { usePythonRunner } from './runner/usePythonRunner'
import { Visualizer } from './viz/Visualizer'
import { SyntaxHelper } from './syntax/SyntaxHelper'

const STARTER = `nums = [4, 8, 15, 16, 23, 42]
total = 0
for n in nums:
    total += n
print(total)
`

const PLAY_MS = 450

export default function App() {
  const [code, setCode] = useState(STARTER)
  const { status, trace, error } = usePythonRunner(code)
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
      <header className="top">
        <h1>Code Language Teacher</h1>
        <span className={`status status-${error ? 'error' : status}`}>{statusText}</span>
      </header>
      <main className="panes">
        <section className="pane editor-pane">
          <Editor
            height="100%"
            defaultLanguage="python"
            value={code}
            onChange={(v) => setCode(v ?? '')}
            onMount={onMount}
            options={{ fontSize: 15, minimap: { enabled: false }, scrollBeyondLastLine: false, tabSize: 4 }}
          />
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
            <Visualizer step={step} pointers={trace!.pointers} />
          ) : (
            <p className="muted">{status === 'loading' ? 'Starting Python in your browser…' : 'Write some code.'}</p>
          )}
          <div className="output">
            <div className="output-title">Output</div>
            <pre>{step?.stdout ?? ''}</pre>
          </div>
        </section>
        <section className="pane syntax-pane">
          <h2>Syntax helper</h2>
          <SyntaxHelper onInsert={insert} />
        </section>
      </main>
    </div>
  )
}
