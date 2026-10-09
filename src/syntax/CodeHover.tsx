import { useEffect, useRef, useState } from 'react'
import type * as monaco from 'monaco-editor/editor/editor.api'
import type { Step } from '../types'
import { formatValue, typeLabel } from '../viz/format'
import { PYTHON_CARDS } from './cards'
import { builtinAt, nameAt, type Builtin } from './builtins'

// A small pop-up for what's under the mouse in the editor: what a built-in like enumerate does,
// or a variable's value at the step being shown.
// Monaco's own hover feature would cost 76 KB gzip, so this listens to the editor's mouse events instead.

const SHOW_MS = 350
const HIDE_MS = 250
// With a pop-up already open, switching to another name waits a little, so passing over one on the way into the pop-up doesn't swap it.
const SWITCH_MS = 150
const WIDTH = 340
const MAX_VALUE = 400

type Target = { kind: 'builtin'; builtin: Builtin } | { kind: 'var'; name: string }

interface Shown {
  target: Target
  /** Which name is hovered, so moving within it doesn't restart the timer. */
  key: string
  left: number
  /** Distance from the top of the editor (below the line) or from its bottom (above the line). */
  top?: number
  bottom?: number
}

export function CodeHover({
  editor,
  monacoApi,
  step,
  stepNumber,
  variables,
  onOpenConcept,
}: {
  editor: monaco.editor.IStandaloneCodeEditor | null
  monacoApi: typeof monaco | null
  /** The step the visualizer is showing, if the code has run. */
  step: Step | undefined
  /** 1-based, for display. */
  stepNumber: number
  /** Every variable name the run ever had, so a name without a value yet can say so. */
  variables: Set<string>
  onOpenConcept: (id: string) => void
}) {
  const [shown, setShown] = useState<Shown | null>(null)
  const shownKey = useRef<string | null>(null)
  const showTimer = useRef<number>(undefined)
  const hideTimer = useRef<number>(undefined)
  // Monaco reports leaving the editor a moment late, after the mouse is already over the pop-up.
  const overPopup = useRef(false)
  // The mouse listener is set up once; this keeps the variables it checks current.
  const variablesRef = useRef(variables)
  variablesRef.current = variables

  const cancelHide = () => window.clearTimeout(hideTimer.current)
  const hideSoon = () => {
    window.clearTimeout(showTimer.current)
    cancelHide()
    hideTimer.current = window.setTimeout(() => {
      if (overPopup.current) return
      shownKey.current = null
      setShown(null)
    }, HIDE_MS)
  }

  useEffect(() => {
    if (!editor || !monacoApi) return
    const hideNow = () => {
      overPopup.current = false
      window.clearTimeout(showTimer.current)
      cancelHide()
      shownKey.current = null
      setShown(null)
    }
    const targetAt = (line: string, column: number): { target: Target; start: number } | null => {
      const builtin = builtinAt(line, column)
      if (builtin) return { target: { kind: 'builtin', builtin: builtin.builtin }, start: builtin.start }
      const name = nameAt(line, column)
      if (name && !name.afterDot && variablesRef.current.has(name.name)) {
        return { target: { kind: 'var', name: name.name }, start: name.start }
      }
      return null
    }
    const subs = [
      editor.onMouseMove((e) => {
        const pos = e.target.position
        const model = editor.getModel()
        if (e.target.type !== monacoApi.editor.MouseTargetType.CONTENT_TEXT || !pos || !model) return hideSoon()
        const hit = targetAt(model.getLineContent(pos.lineNumber), pos.column - 1)
        if (!hit) return hideSoon()
        const key = `${pos.lineNumber}:${hit.start}`
        if (key === shownKey.current) return cancelHide()
        window.clearTimeout(showTimer.current)
        showTimer.current = window.setTimeout(() => {
          const at = editor.getScrolledVisiblePosition({ lineNumber: pos.lineNumber, column: hit.start + 1 })
          if (!at) return
          const { width, height } = editor.getLayoutInfo()
          const left = Math.max(8, Math.min(at.left, width - WIDTH - 8))
          // Touching the line, so the mouse reaches it without crossing the next line.
          // Near the bottom of the editor it opens above the line so it isn't cut off.
          const place = at.top > height * 0.55 ? { bottom: height - at.top } : { top: at.top + at.height }
          cancelHide()
          shownKey.current = key
          setShown({ target: hit.target, key, left, ...place })
        }, shownKey.current ? SWITCH_MS : SHOW_MS)
      }),
      editor.onMouseLeave(hideSoon),
      editor.onMouseDown(hideNow),
      editor.onDidScrollChange(hideNow),
      editor.onDidChangeModelContent(hideNow),
      editor.onDidChangeModel(hideNow),
      editor.onKeyDown((e) => {
        if (e.keyCode === monacoApi.KeyCode.Escape) hideNow()
      }),
    ]
    return () => {
      subs.forEach((s) => s.dispose())
      hideNow()
    }
  }, [editor, monacoApi])

  if (!shown) return null
  const { target } = shown
  return (
    <div
      className="code-hover"
      role="tooltip"
      style={{ left: shown.left, top: shown.top, bottom: shown.bottom, maxWidth: WIDTH }}
      onMouseEnter={() => {
        overPopup.current = true
        // A name passed over on the way in shouldn't replace this pop-up.
        window.clearTimeout(showTimer.current)
        cancelHide()
      }}
      onMouseLeave={() => {
        overPopup.current = false
        hideSoon()
      }}
    >
      {target.kind === 'builtin' ? (
        <BuiltinView
          builtin={target.builtin}
          onOpenConcept={(id) => {
            overPopup.current = false
            shownKey.current = null
            setShown(null)
            onOpenConcept(id)
          }}
        />
      ) : (
        <VariableView name={target.name} step={step} stepNumber={stepNumber} />
      )}
    </div>
  )
}

function BuiltinView({ builtin, onOpenConcept }: { builtin: Builtin; onOpenConcept: (id: string) => void }) {
  const card = builtin.card ? PYTHON_CARDS.find((c) => c.id === builtin.card) : undefined
  return (
    <>
      <code className="code-hover-head">{builtin.signature}</code>
      <p>{builtin.summary}</p>
      <pre>{builtin.example}</pre>
      {card && (
        <button className="code-hover-more" onClick={() => onOpenConcept(card.id)}>
          Glossary: {card.title}
        </button>
      )}
    </>
  )
}

function VariableView({ name, step, stepNumber }: { name: string; step: Step | undefined; stepNumber: number }) {
  const value = step?.vars[name]
  const where = step ? `at step ${stepNumber}, line ${step.line}` : ''
  if (!value) {
    return (
      <>
        <code className="code-hover-head">{name}</code>
        <p>No value yet{where && ` ${where}`}. It gets one at a later step, or it belongs to another function call.</p>
      </>
    )
  }
  const text = formatValue(value)
  return (
    <>
      <div className="code-hover-title">
        <code className="code-hover-head">{name}</code>
        <span className="code-hover-type">{typeLabel(value)}</span>
      </div>
      <pre>{text.length > MAX_VALUE ? text.slice(0, MAX_VALUE - 1) + '…' : text}</pre>
      <p className="code-hover-when">{where}</p>
    </>
  )
}
