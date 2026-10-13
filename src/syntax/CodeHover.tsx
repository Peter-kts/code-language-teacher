import { useEffect, useRef, useState } from 'react'
import type * as monaco from 'monaco-editor/editor/editor.api'
import type { Language, Step } from '../types'
import { formatValue, typeLabel } from '../viz/format'
import { cardFor } from './cards'
import { builtinAt, nameAt, type Builtin } from './builtins'
import { jsBuiltinAt } from './jsBuiltins'

// A small pop-up for what's under the mouse in the editor: what a built-in like enumerate does,
// or a variable's value at the step being shown.
// Monaco's own hover feature would cost 76 KB gzip, so this listens to the editor's mouse events instead.
// Touch screens have no hover, so there a tap on a name opens the same pop-up, and a tap anywhere else closes it.

const SHOW_MS = 350
const HIDE_MS = 250
// With a pop-up already open, switching to another name waits a little, so passing over one on the way into the pop-up doesn't swap it.
const SWITCH_MS = 150
const WIDTH = 340
const MAX_VALUE = 400
// A finger moving further than this between touching and lifting was scrolling, not tapping.
const TAP_SLOP_PX = 10

type Target = { kind: 'builtin'; builtin: Builtin } | { kind: 'var'; name: string }

interface Shown {
  target: Target
  /** Which name is hovered, so moving within it doesn't restart the timer. */
  key: string
  left: number
  /** Distance from the top of the editor (below the line) or from its bottom (above the line). */
  top?: number
  bottom?: number
  /** Opened by a tap, so it gets a close button and stays until the next tap. */
  touch: boolean
}

export function CodeHover({
  editor,
  monacoApi,
  step,
  stepNumber,
  variables,
  language,
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
  /** Which language's built-ins and glossary to explain. */
  language: Language
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
  const languageRef = useRef(language)
  languageRef.current = language
  // Whether the last pointer to touch the editor was a finger or pen rather than a mouse.
  const touching = useRef(false)
  const popupRef = useRef<HTMLDivElement>(null)

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
      const language = languageRef.current
      const builtin = language === 'python' ? builtinAt(line, column) : jsBuiltinAt(line, column)
      if (builtin) return { target: { kind: 'builtin', builtin: builtin.builtin }, start: builtin.start }
      const name = nameAt(line, column, language)
      if (name && !name.afterDot && variablesRef.current.has(name.name)) {
        return { target: { kind: 'var', name: name.name }, start: name.start }
      }
      return null
    }
    /** The name under an editor mouse target, with a key for which name it is. */
    const hitAt = (target: monaco.editor.IMouseTarget) => {
      const pos = target.position
      const model = editor.getModel()
      if (target.type !== monacoApi.editor.MouseTargetType.CONTENT_TEXT || !pos || !model) return null
      const line = model.getLineContent(pos.lineNumber)
      // Monaco rounds to the nearest gap between characters, so over the right half of a name's
      // last letter the position is just past it: look one character back too.
      const hit = targetAt(line, pos.column - 1) ?? (pos.column > 1 ? targetAt(line, pos.column - 2) : null)
      return hit && { ...hit, line: pos.lineNumber, key: `${pos.lineNumber}:${hit.start}` }
    }
    const open = (hit: NonNullable<ReturnType<typeof hitAt>>, touch: boolean) => {
      const at = editor.getScrolledVisiblePosition({ lineNumber: hit.line, column: hit.start + 1 })
      if (!at) return
      const { width, height } = editor.getLayoutInfo()
      const left = Math.max(8, Math.min(at.left, width - Math.min(WIDTH, width - 16) - 8))
      // Touching the line, so the mouse reaches it without crossing the next line.
      // Near the bottom of the editor it opens above the line so it isn't cut off.
      const place = at.top > height * 0.55 ? { bottom: height - at.top } : { top: at.top + at.height }
      cancelHide()
      shownKey.current = hit.key
      setShown({ target: hit.target, key: hit.key, left, touch, ...place })
    }

    // Taps: watched on the whole window before anything else sees them (some browsers' touch handling
    // in Monaco keeps them from listeners on the editor itself), then checked to be inside the editor.
    const node = editor.getDomNode()
    const inEditor = (e: PointerEvent) => e.target instanceof Node && !!node?.contains(e.target)
    let down: { x: number; y: number } | null = null
    const onPointerDown = (e: PointerEvent) => {
      if (!inEditor(e)) return
      touching.current = e.pointerType !== 'mouse'
      down = touching.current ? { x: e.clientX, y: e.clientY } : null
    }
    const onPointerUp = (e: PointerEvent) => {
      if (!down || e.pointerType === 'mouse' || !inEditor(e)) return
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y) > TAP_SLOP_PX
      down = null
      if (moved) return
      const target = editor.getTargetAtClientPoint(e.clientX, e.clientY)
      const hit = target && hitAt(target)
      // Tapping the name that's already open closes it, like tapping anywhere else.
      if (!hit || hit.key === shownKey.current) return hideNow()
      window.clearTimeout(showTimer.current)
      open(hit, true)
    }
    // A tap outside both the editor and the pop-up closes a pop-up a tap opened.
    const onOutside = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' || !shownKey.current) return
      const t = e.target as Node
      if (node?.contains(t) || popupRef.current?.contains(t)) return
      hideNow()
    }
    window.addEventListener('pointerdown', onPointerDown, true)
    window.addEventListener('pointerup', onPointerUp, true)
    document.addEventListener('pointerdown', onOutside, true)

    const subs = [
      editor.onMouseMove((e) => {
        // Browsers also report a finger as mouse moves; taps are handled above.
        if (touching.current) return
        const hit = hitAt(e.target)
        if (!hit) return hideSoon()
        if (hit.key === shownKey.current) return cancelHide()
        window.clearTimeout(showTimer.current)
        showTimer.current = window.setTimeout(() => open(hit, false), shownKey.current ? SWITCH_MS : SHOW_MS)
      }),
      editor.onMouseLeave(() => {
        if (!touching.current) hideSoon()
      }),
      editor.onMouseDown(() => {
        if (!touching.current) hideNow()
      }),
      editor.onDidScrollChange(hideNow),
      editor.onDidChangeModelContent(hideNow),
      editor.onDidChangeModel(hideNow),
      editor.onKeyDown((e) => {
        if (e.keyCode === monacoApi.KeyCode.Escape) hideNow()
      }),
    ]
    return () => {
      subs.forEach((s) => s.dispose())
      window.removeEventListener('pointerdown', onPointerDown, true)
      window.removeEventListener('pointerup', onPointerUp, true)
      document.removeEventListener('pointerdown', onOutside, true)
      hideNow()
    }
  }, [editor, monacoApi])

  if (!shown) return null
  const { target } = shown
  const close = () => {
    overPopup.current = false
    shownKey.current = null
    setShown(null)
  }
  return (
    <div
      ref={popupRef}
      className="code-hover"
      role="tooltip"
      style={{ left: shown.left, top: shown.top, bottom: shown.bottom, maxWidth: `min(${WIDTH}px, calc(100% - 16px))` }}
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
      {shown.touch && (
        <button className="code-hover-close" onClick={close} aria-label="Close">
          ×
        </button>
      )}
      {target.kind === 'builtin' ? (
        <BuiltinView
          builtin={target.builtin}
          language={language}
          onOpenConcept={(id) => {
            close()
            onOpenConcept(id)
          }}
        />
      ) : (
        <VariableView name={target.name} step={step} stepNumber={stepNumber} />
      )}
    </div>
  )
}

function BuiltinView({
  builtin,
  language,
  onOpenConcept,
}: {
  builtin: Builtin
  language: Language
  onOpenConcept: (id: string) => void
}) {
  const card = builtin.card ? cardFor(language, builtin.card) : undefined
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
