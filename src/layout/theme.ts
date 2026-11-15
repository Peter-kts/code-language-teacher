// Color theme: the galaxy look (the default) or the retro terminal. Every color in styles.css
// comes from a CSS variable ("token") such as --text or --accent, so a theme is just a second
// set of values for those variables. Putting data-theme="terminal" on the <html> element turns
// on that second set (styles.css, "Retro terminal theme"), and the whole app recolors at once,
// with no component needing to know which theme is on. The editor is the one exception: Monaco
// paints its own colors, so App also hands it the matching editor theme (src/monaco.ts).
// The choice is remembered like the text size.

export type Theme = 'galaxy' | 'terminal'

export const THEME_KEY = 'clt.theme.v1'
export const DEFAULT_THEME: Theme = 'galaxy'

export function loadTheme(storage?: Pick<Storage, 'getItem'>): Theme {
  try {
    // Read localStorage inside the try: with storage blocked, merely touching it throws.
    return (storage ?? globalThis.localStorage)?.getItem(THEME_KEY) === 'terminal' ? 'terminal' : DEFAULT_THEME
  } catch {
    return DEFAULT_THEME
  }
}

export function saveTheme(theme: Theme, storage?: Pick<Storage, 'setItem'>) {
  try {
    ;(storage ?? globalThis.localStorage)?.setItem(THEME_KEY, theme)
  } catch {
    // Blocked storage: the theme lasts until the page reloads.
  }
}

/** The page's background color per theme, for the phone's browser bar (<meta name="theme-color">). */
export const THEME_BAR_COLOR: Record<Theme, string> = { galaxy: '#05040a', terminal: '#010702' }

type Root = { dataset: Record<string, string | undefined> }

/** Switches the stylesheet's colors by setting or clearing data-theme on <html>. */
export function applyTheme(theme: Theme, root: Root = document.documentElement) {
  if (theme === DEFAULT_THEME) delete root.dataset.theme
  else root.dataset.theme = theme
  const meta = typeof document !== 'undefined' ? document.querySelector('meta[name="theme-color"]') : null
  meta?.setAttribute('content', THEME_BAR_COLOR[theme])
}
