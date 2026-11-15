// Design: the app's whole look, as opposed to a theme, which only recolors it.
//
// A theme (src/layout/theme.ts) swaps the values of the color variables and leaves everything else
// alone: the same glass panes, the same pill buttons, the same fonts. A design changes the things a
// theme can't reach: the fonts, the shapes, how the screen is divided up, and its own colors. So
// the two are separate switches rather than one long list.
//
// 'classic' is the look the app has always had, with its four themes. 'paper' is the print look
// (src/paper.css): a page of cream paper and black ink, with flat spot colors like a two-color
// printed manual. While paper is on it brings its own colors, so the theme is set aside, not lost:
// turning paper off brings back exactly the theme that was on before.
//
// Like a theme, it works by one attribute on <html> (data-design="paper"). Every rule in paper.css
// starts with that attribute, so with it off none of them apply and the classic stylesheet is
// untouched. The choice is remembered like the theme and the text size.

import type { Theme } from './theme'

export type Design = 'classic' | 'paper'

export const DESIGN_KEY = 'clt.design.v1'
export const DEFAULT_DESIGN: Design = 'classic'

/** The black of the paper design's masthead, for the phone's browser bar above it. */
export const PAPER_BAR_COLOR = '#15120e'

export function loadDesign(storage?: Pick<Storage, 'getItem'>): Design {
  try {
    // Read localStorage inside the try: with storage blocked, merely touching it throws.
    return (storage ?? globalThis.localStorage)?.getItem(DESIGN_KEY) === 'paper' ? 'paper' : DEFAULT_DESIGN
  } catch {
    return DEFAULT_DESIGN
  }
}

export function saveDesign(design: Design, storage?: Pick<Storage, 'setItem'>) {
  try {
    ;(storage ?? globalThis.localStorage)?.setItem(DESIGN_KEY, design)
  } catch {
    // Blocked storage: the design lasts until the page reloads.
  }
}

export function otherDesign(design: Design): Design {
  return design === 'paper' ? 'classic' : 'paper'
}

/** What the screen actually looks like: the paper design, or else the chosen theme. */
export type Look = Theme | 'paper'

export function lookOf(design: Design, theme: Theme): Look {
  return design === 'paper' ? 'paper' : theme
}

type Root = { dataset: Record<string, string | undefined> }

/**
 * Sets or clears data-design on <html>. Call it after applyTheme: paper also takes over the
 * phone's browser bar color, which applyTheme has just set for the theme.
 */
export function applyDesign(design: Design, root: Root = document.documentElement) {
  if (design === 'paper') root.dataset.design = 'paper'
  else delete root.dataset.design
  if (design !== 'paper' || typeof document === 'undefined') return
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', PAPER_BAR_COLOR)
}
