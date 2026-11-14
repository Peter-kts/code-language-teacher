// Text size: the A− / A+ buttons. Almost every size in styles.css is in rem, which means
// "times the page's root font size". So changing that one root size scales the panes,
// the visualizer, the console and the chat together, the same way browser zoom would,
// but without shrinking the frame. The top bar is zoomed back to normal, so its row of
// buttons doesn't grow into a jumble. Monaco sizes its text in pixels, so App passes it
// editorFont() too. The choice is remembered like the top bar.

export const FONT_SIZE_KEY = 'clt.fontsize.v1'

/** The sizes the buttons step through, as a share of normal (1 = 100%). */
export const FONT_STEPS = [0.8, 0.9, 1, 1.1, 1.25, 1.4, 1.6] as const
export const DEFAULT_FONT_SCALE = 1

/** The next size up (+1) or down (−1), staying at the ends instead of wrapping around. */
export function stepFontScale(scale: number, dir: 1 | -1): number {
  // Start from the nearest step, so an odd saved value still moves sensibly.
  let i = 0
  for (let k = 1; k < FONT_STEPS.length; k++) {
    if (Math.abs(FONT_STEPS[k] - scale) < Math.abs(FONT_STEPS[i] - scale)) i = k
  }
  const next = Math.min(FONT_STEPS.length - 1, Math.max(0, i + dir))
  return FONT_STEPS[next]
}

export const isSmallest = (scale: number) => scale <= FONT_STEPS[0]
export const isLargest = (scale: number) => scale >= FONT_STEPS[FONT_STEPS.length - 1]

/** The editor's font size and line height in pixels for a scale (normal is 15 on 24). */
export function editorFont(scale: number): { fontSize: number; lineHeight: number } {
  return { fontSize: Math.round(15 * scale), lineHeight: Math.round(24 * scale) }
}

export function loadFontScale(storage?: Pick<Storage, 'getItem'>): number {
  try {
    // Read localStorage inside the try: with storage blocked, merely touching it throws.
    const saved = Number((storage ?? globalThis.localStorage)?.getItem(FONT_SIZE_KEY))
    // Anything that isn't one of our steps (missing, garbage, an old value) means normal.
    return (FONT_STEPS as readonly number[]).includes(saved) ? saved : DEFAULT_FONT_SCALE
  } catch {
    return DEFAULT_FONT_SCALE
  }
}

export function saveFontScale(scale: number, storage?: Pick<Storage, 'setItem'>) {
  try {
    ;(storage ?? globalThis.localStorage)?.setItem(FONT_SIZE_KEY, String(scale))
  } catch {
    // Blocked storage: the size lasts until the page reloads.
  }
}

type Root = { style: { fontSize: string; setProperty(name: string, value: string): void; removeProperty(name: string): void } }

/** Sets the root font size, which every rem in the stylesheet follows. --font-scale lets
 *  the top bar undo it (styles.css), so the bar keeps its size and never overflows. */
export function applyFontScale(scale: number, root: Root = document.documentElement) {
  if (scale === 1) {
    root.style.fontSize = ''
    root.style.removeProperty('--font-scale')
  } else {
    root.style.fontSize = `${Math.round(scale * 100)}%`
    root.style.setProperty('--font-scale', String(scale))
  }
}
