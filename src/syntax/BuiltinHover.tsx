import { useEffect, useRef, useState } from 'react'
import type * as monaco from 'monaco-editor/editor/editor.api'
import { PYTHON_CARDS } from './cards'
import { builtinAt, type Builtin } from './builtins'

// A small pop-up explaining the built-in under the mouse, like enumerate or .append.
// Monaco's own hover feature would cost 76 KB gzip, so this listens to the editor's mouse events instead.

const SHOW_MS = 350
const HIDE_MS = 250
const WIDTH = 340

interface Shown {
  builtin: Builtin
  /** Which name is hovered, so moving within it doesn't restart the timer. */
  key: string
  left: number
  /** Distance from the top of the editor (below the line) or from its bottom (above the line). */
  top?: number
  bottom?: number
}

export function BuiltinHover({
  editor,
  monacoApi,
  onOpenConcept,
}: {
  editor: monaco.editor.IStandaloneCodeEditor | null
  monacoApi: typeof monaco | null
  onOpenConcept: (id: string) => void
}) {
  const [shown, setShown] = useState<Shown | null>(null)
  const shownKey = useRef<string | null>(null)
  const showTimer = useRef<number>(undefined)
  const hideTimer = useRef<number>(undefined)
  // Monaco reports leaving the editor a moment late, after the mouse is already over the pop-up.
  const overPopup = useRef(false)

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
    const subs = [
      editor.onMouseMove((e) => {
        const pos = e.target.position
        const model = editor.getModel()
        if (e.target.type !== monacoApi.editor.MouseTargetType.CONTENT_TEXT || !pos || !model) return hideSoon()
        const hit = builtinAt(model.getLineContent(pos.lineNumber), pos.column - 1)
        if (!hit) return hideSoon()
        const key = `${pos.lineNumber}:${hit.start}`
        if (key === shownKey.current) return cancelHide()
        window.clearTimeout(showTimer.current)
        showTimer.current = window.setTimeout(() => {
          const at = editor.getScrolledVisiblePosition({ lineNumber: pos.lineNumber, column: hit.start + 1 })
          if (!at) return
          const { width, height } = editor.getLayoutInfo()
          const left = Math.max(8, Math.min(at.left, width - WIDTH - 8))
          // Near the bottom of the editor, open above the line so the pop-up isn't cut off.
          const place = at.top > height * 0.55 ? { bottom: height - at.top + 4 } : { top: at.top + at.height + 4 }
          cancelHide()
          shownKey.current = key
          setShown({ builtin: hit.builtin, key, left, ...place })
        }, shownKey.current ? 0 : SHOW_MS)
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
  const { builtin } = shown
  const card = builtin.card ? PYTHON_CARDS.find((c) => c.id === builtin.card) : undefined
  return (
    <div
      className="builtin-hover"
      role="tooltip"
      style={{ left: shown.left, top: shown.top, bottom: shown.bottom, maxWidth: WIDTH }}
      onMouseEnter={() => {
        overPopup.current = true
        cancelHide()
      }}
      onMouseLeave={() => {
        overPopup.current = false
        hideSoon()
      }}
    >
      <code className="builtin-sig">{builtin.signature}</code>
      <p>{builtin.summary}</p>
      <pre>{builtin.example}</pre>
      {card && (
        <button
          className="builtin-more"
          onClick={() => {
            overPopup.current = false
            shownKey.current = null
            setShown(null)
            onOpenConcept(card.id)
          }}
        >
          Glossary: {card.title}
        </button>
      )}
    </div>
  )
}
