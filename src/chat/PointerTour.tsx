import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { refLabel, type Ref, type TourStop } from './refs'

/**
 * How the chat finds things on screen. App owns the editor, the step and the tabs, so it
 * implements this; the chat and the pointer only ever deal in names like `var:total`.
 */
export interface Pointing {
  /** Brings the thing into view (moving to a step or tab if needed) and returns where it now is. */
  reveal(ref: Ref): Promise<DOMRect | null>
  /** Where it is right now, without changing anything; null when it can't be seen. */
  locate(ref: Ref): DOMRect | null
}

// Where the fingertip sits in the hand drawing below, in screen pixels at HAND_SIZE.
const HAND_SIZE = 34
const TIP = { x: (8 / 24) * HAND_SIZE, y: (1.5 / 24) * HAND_SIZE }
const BUBBLE_WIDTH = 300

/** The spot to touch: the lower left of the thing, so the hand hangs below it instead of covering it. */
function touchPoint(rect: DOMRect) {
  return { x: rect.left + Math.min(rect.width * 0.3, 28), y: rect.bottom - Math.min(rect.height * 0.3, 8) }
}

/** The "Show me" tour: a hand glides from stop to stop, with a ring and a caption at each. */
export function PointerTour({
  stops,
  origin,
  pointing,
  onClose,
}: {
  stops: TourStop[]
  /** Where the hand starts: the Show me button. */
  origin: { x: number; y: number }
  pointing: Pointing
  onClose: () => void
}) {
  const [index, setIndex] = useState(0)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const [hand, setHand] = useState(origin)
  const [searching, setSearching] = useState(true)
  const stop = stops[index]
  const last = index === stops.length - 1
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  const indexRef = useRef(index)
  indexRef.current = index

  useEffect(() => {
    let live = true
    setSearching(true)
    pointing.reveal(stop.ref).then((r) => {
      if (!live) return
      setRect(r)
      setSearching(false)
      if (r) setHand(touchPoint(r))
    })
    // Scrolling or resizing moves things; keep the ring and the hand on them.
    const follow = () => {
      const r = pointing.locate(stop.ref)
      setRect(r)
      if (r) setHand(touchPoint(r))
    }
    window.addEventListener('resize', follow)
    window.addEventListener('scroll', follow, true)
    return () => {
      live = false
      window.removeEventListener('resize', follow)
      window.removeEventListener('scroll', follow, true)
    }
  }, [stop, pointing])

  // While the tour is open, the arrow keys, Enter and Escape drive it instead of the editor or the step shortcuts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const go = { ArrowRight: 1, Enter: 1, ArrowLeft: -1 }[e.key]
      if (e.key !== 'Escape' && go === undefined) return
      e.preventDefault()
      e.stopPropagation()
      const i = indexRef.current
      if (e.key === 'Escape' || (go === 1 && i === stops.length - 1)) closeRef.current()
      else setIndex(Math.max(0, Math.min(stops.length - 1, i + (go ?? 0))))
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [stops.length])

  const pad = 4
  const ring: CSSProperties | undefined = rect
    ? { left: rect.left - pad, top: rect.top - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 }
    : undefined
  const width = Math.min(BUBBLE_WIDTH, window.innerWidth - 24)
  const bubble: CSSProperties = rect
    ? {
        width,
        // Starts right of the hand, so the hand doesn't sit on the caption.
        left: Math.max(12, Math.min(window.innerWidth - width - 12, touchPoint(rect).x + 26)),
        // Below the thing when there's room, else above it.
        ...(rect.bottom + 150 < window.innerHeight
          ? { top: rect.bottom + pad + 10 }
          : { bottom: Math.max(12, window.innerHeight - rect.top + pad + 10) }),
      }
    : { width, left: (window.innerWidth - width) / 2, top: window.innerHeight / 3 }

  return (
    <div className="tour" aria-live="polite">
      {ring && <div className="tour-ring" style={ring} />}
      <svg
        className="tour-hand"
        width={HAND_SIZE}
        height={HAND_SIZE}
        viewBox="0 0 24 24"
        style={{ transform: `translate(${hand.x - TIP.x}px, ${hand.y - TIP.y}px)` }}
        aria-hidden="true"
      >
        <path d="M6 3.5a2 2 0 0 1 4 0V10a2 2 0 0 1 4 0v1a2 2 0 0 1 4 0v1a2 2 0 0 1 4 0v4a7 7 0 0 1-7 7h-2.5a6 6 0 0 1-4.6-2.2L3.2 16.6a1.8 1.8 0 0 1 2.8-2.3Z" />
        <path className="tour-hand-crease" d="M10 10v3M14 11v2.2M18 12v1.6" />
      </svg>
      <div className="tour-bubble" style={bubble} role="dialog" aria-label="Show me">
        <div className="tour-head">
          <span className="tour-count">
            {index + 1} / {stops.length} · {refLabel(stop.ref)}
          </span>
          <button className="tour-x" onClick={onClose} aria-label="End the tour" title="End (Esc)">
            ×
          </button>
        </div>
        <p>
          {stop.caption}
          {!searching && !rect && <span className="muted"> (That part is hidden right now. Open its pane to see it.)</span>}
        </p>
        <div className="tour-buttons">
          <button onClick={() => setIndex((i) => i - 1)} disabled={index === 0}>
            Back
          </button>
          <button className="tour-next" onClick={() => (last ? onClose() : setIndex((i) => i + 1))} autoFocus>
            {last ? 'Done' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  )
}

/** A clicked reference chip: a ring that lights the thing up for a moment, then fades. */
export function PointerFlash({ target, pointing, onDone }: { target: Ref; pointing: Pointing; onDone: () => void }) {
  const [rect, setRect] = useState<DOMRect | null>(null)
  useEffect(() => {
    let live = true
    pointing.reveal(target).then((r) => live && setRect(r))
    const t = window.setTimeout(onDone, 1800)
    return () => {
      live = false
      window.clearTimeout(t)
    }
  }, [target, pointing, onDone])
  if (!rect) return null
  const pad = 4
  return (
    <div
      className="tour-ring flash"
      style={{ left: rect.left - pad, top: rect.top - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 }}
    />
  )
}
