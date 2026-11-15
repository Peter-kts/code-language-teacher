// Color theme: the galaxy look (the default), the green-screen terminal, the black and white
// terminal, or focus (calm colors, no moving background, small rewards for real progress). Every color in styles.css comes from a CSS variable ("token") such as --text or
// --accent, so a theme is just another set of values for those variables. Putting
// data-theme="terminal" (or "mono") on the <html> element turns on that set (styles.css, "Retro
// terminal theme"), and the whole app recolors at once, with no component needing to know which
// theme is on. The two terminals also share a look (scanlines, square buttons, pinstriped title
// bar), switched on by data-retro, so that part is written once. The editor is the one
// exception: Monaco paints its own colors, so App also hands it the matching editor theme
// (src/monaco.ts). The choice is remembered like the text size.

export type Theme = 'galaxy' | 'terminal' | 'mono' | 'focus'

/** The order the theme button and the T key step through. */
export const THEMES: readonly Theme[] = ['galaxy', 'terminal', 'mono', 'focus']

export const THEME_NAMES: Record<Theme, string> = {
  galaxy: 'galaxy',
  terminal: 'green terminal',
  mono: 'black and white terminal',
  focus: 'focus',
}

export const THEME_KEY = 'clt.theme.v1'
export const DEFAULT_THEME: Theme = 'galaxy'

/** The theme after this one, going round: galaxy, green, black and white, focus, galaxy again. */
export function nextTheme(theme: Theme): Theme {
  return THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length]
}

export function loadTheme(storage?: Pick<Storage, 'getItem'>): Theme {
  try {
    // Read localStorage inside the try: with storage blocked, merely touching it throws.
    const saved = (storage ?? globalThis.localStorage)?.getItem(THEME_KEY)
    // Anything that isn't one of ours (missing, garbage, an old value) means the default.
    return (THEMES as readonly (string | null | undefined)[]).includes(saved) ? (saved as Theme) : DEFAULT_THEME
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
export const THEME_BAR_COLOR: Record<Theme, string> = { galaxy: '#05040a', terminal: '#010702', mono: '#000000', focus: '#0b1220' }

type Root = { dataset: Record<string, string | undefined> }

/** Switches the stylesheet's colors by setting or clearing data-theme (and data-retro) on <html>. */
export function applyTheme(theme: Theme, root: Root = document.documentElement) {
  if (theme === DEFAULT_THEME) {
    delete root.dataset.theme
    delete root.dataset.retro
  } else {
    root.dataset.theme = theme
    // Only the two terminals share the retro look.
    if (theme === 'terminal' || theme === 'mono') root.dataset.retro = ''
    else delete root.dataset.retro
  }
  const meta = typeof document !== 'undefined' ? document.querySelector('meta[name="theme-color"]') : null
  meta?.setAttribute('content', THEME_BAR_COLOR[theme])
}
