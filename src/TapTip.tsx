import { useEffect, useState } from 'react'

// Touch screens never show `title` tooltips, because there is no hover. This shows the same
// text when a finger taps something that has one, so every explanation written as a title
// (closure and shared-object notes, "Changed by line 4" on badges) works on a phone too,
// in both languages, with no extra work per feature.
// Buttons, links and form fields are left alone: tapping those already does something.

const HIDE_MS = 4000
// A finger moving further than this between touching and lifting was scrolling, not tapping.
const TAP_SLOP_PX = 10
const INTERACTIVE = 'button, a, input, select, textarea, label, [role="separator"]'

interface Tip {
  text: string
  left: number
  /** From the top of the screen when shown below the element, from the bottom when shown above it. */
  top?: number
  bottom?: number
}

/** The element with an explanation at the tap, or null when the tap is on something that acts. */
export function tipTarget(start: Element | null): HTMLElement | null {
  const el = start?.closest<HTMLElement>('[title]')
  if (!el || !el.title.trim()) return null
  if (el.closest(INTERACTIVE)) return null
  return el
}

export function TapTip() {
  const [tip, setTip] = useState<Tip | null>(null)

  useEffect(() => {
    let timer: number | undefined
    const hide = () => {
      window.clearTimeout(timer)
      setTip(null)
    }
    let down: { x: number; y: number } | null = null
    const onDown = (e: PointerEvent) => {
      down = e.pointerType === 'mouse' ? null : { x: e.clientX, y: e.clientY }
    }
    const onTap = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' || !down) return
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y) > TAP_SLOP_PX
      down = null
      if (moved) return
      const el = tipTarget(e.target as Element)
      if (!el) return hide()
      const box = el.getBoundingClientRect()
      // Below the thing tapped, or above it near the bottom of the screen; kept on screen sideways.
      const below = box.bottom < window.innerHeight * 0.7
      setTip({
        text: el.title,
        left: Math.max(8, Math.min(box.left, window.innerWidth - 328)),
        ...(below ? { top: box.bottom + 6 } : { bottom: window.innerHeight - box.top + 6 }),
      })
      window.clearTimeout(timer)
      timer = window.setTimeout(hide, HIDE_MS)
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('pointerup', onTap)
    window.addEventListener('scroll', hide, true)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('pointerup', onTap)
      window.removeEventListener('scroll', hide, true)
      window.clearTimeout(timer)
    }
  }, [])

  if (!tip) return null
  return (
    <div className="tap-tip" role="tooltip" style={{ left: tip.left, top: tip.top, bottom: tip.bottom }}>
      {tip.text}
    </div>
  )
}
