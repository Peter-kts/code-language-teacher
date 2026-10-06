// Keyboard shortcuts. commandFor decides what a key does outside the editor; inside it,
// App registers the same commands as editor actions, so they work while typing and show
// up in F1. The tables below feed the button tooltips and the ? cheat sheet.

export type Command =
  | 'playPause'
  | 'nextStep'
  | 'prevStep'
  | 'firstStep'
  | 'lastStep'
  | 'askClaude'
  | 'focusEditor'
  | 'showShortcuts'
  | 'save'

/** Where a key was pressed, which decides whether a plain key is ours or the page's. */
export type FocusKind = 'editor' | 'text' | 'sideText' | 'range' | 'button' | 'other'

export type KeyPress = Pick<KeyboardEvent, 'key' | 'code' | 'ctrlKey' | 'metaKey' | 'altKey' | 'shiftKey'>

export type Platform = 'mac' | 'linux' | 'win'

// The same test Monaco uses, so the labels match the keys the editor actually binds.
const ua = typeof navigator === 'undefined' ? '' : navigator.userAgent
export const PLATFORM: Platform = ua.includes('Macintosh') ? 'mac' : ua.includes('Linux') ? 'linux' : 'win'

export function focusKind(el: Element | null): FocusKind {
  if (!el) return 'other'
  if (el.closest('.monaco-editor')) return 'editor'
  const typing =
    (el instanceof HTMLInputElement && !NOT_TYPED.has(el.type)) ||
    el instanceof HTMLTextAreaElement ||
    el instanceof HTMLSelectElement ||
    (el instanceof HTMLElement && el.isContentEditable)
  if (typing) return el.closest('.syntax-pane') ? 'sideText' : 'text'
  if (el instanceof HTMLInputElement && el.type === 'range') return 'range'
  // Space already presses whatever button has focus.
  if (el instanceof HTMLButtonElement || el instanceof HTMLInputElement) return 'button'
  return 'other'
}

const NOT_TYPED = new Set(['range', 'button', 'submit', 'reset', 'checkbox', 'radio', 'color', 'file', 'image'])

/** The command a key press runs outside the editor, or null to leave the key alone. */
export function commandFor(e: KeyPress, where: FocusKind, platform: Platform = PLATFORM): Command | null {
  const mac = platform === 'mac'
  const mod = mac ? e.metaKey : e.ctrlKey
  if (mac ? e.ctrlKey : e.metaKey) return null
  const typing = where === 'text' || where === 'sideText'

  if (mod) {
    if (e.altKey || e.shiftKey) return null
    // The code already runs as you type; this keeps the browser's Save Page dialog away.
    if (isLetter(e, 's')) return 'save'
    if (where === 'editor') return null
    if (isLetter(e, 'i')) return 'askClaude'
    if (e.key === 'Enter' && !typing) return 'playPause'
    return null
  }
  if (where === 'editor') return null
  if (e.altKey) {
    if (typing) return null
    if (e.code === 'Period') return e.shiftKey ? 'lastStep' : 'nextStep'
    if (e.code === 'Comma') return e.shiftKey ? 'firstStep' : 'prevStep'
    return null
  }
  if (e.key === 'Escape') return where === 'sideText' ? 'focusEditor' : null
  if (typing) return null
  if (e.key === '?') return 'showShortcuts'
  if (e.shiftKey) return null
  // A focused slider already steps with the arrows, Home and End.
  const slider = where === 'range'
  switch (e.key) {
    case ' ':
      return where === 'button' ? null : 'playPause'
    case 'ArrowRight':
      return slider ? null : 'nextStep'
    case 'ArrowLeft':
      return slider ? null : 'prevStep'
    case 'Home':
      return slider ? null : 'firstStep'
    case 'End':
      return slider ? null : 'lastStep'
  }
  return null
}

// By the letter typed, so Ctrl+I follows the layout like the editor does; by the
// physical key when the layout doesn't type Latin letters.
function isLetter(e: KeyPress, letter: string) {
  return /^[a-z]$/i.test(e.key) ? e.key.toLowerCase() === letter : e.code === `Key${letter.toUpperCase()}`
}

/** A key combo like 'Mod+Shift+K'. Mod is Ctrl, or ⌘ on a Mac. */
type Combo = string
type Keys = Combo[] | Partial<Record<Platform | 'pc', Combo[]>>

export interface ShortcutRow {
  label: string
  /** Alternatives, or with `pair` the keys for each half of an "x / y" label. */
  keys: Keys
  pair?: boolean
  command?: Command
}

export const SHORTCUT_SECTIONS: { title: string; note?: string; rows: ShortcutRow[] }[] = [
  {
    title: 'Step through a run',
    note: 'The second key works when you are not typing in the editor.',
    rows: [
      { command: 'playPause', label: 'Play / pause', keys: ['Mod+Enter', 'Space'] },
      { command: 'nextStep', label: 'Next step', keys: ['Alt+.', '→'] },
      { command: 'prevStep', label: 'Previous step', keys: ['Alt+,', '←'] },
      { command: 'lastStep', label: 'Last step', keys: ['Shift+Alt+.', 'End'] },
      { command: 'firstStep', label: 'First step', keys: ['Shift+Alt+,', 'Home'] },
    ],
  },
  {
    title: 'Move around',
    rows: [
      { command: 'askClaude', label: 'Ask Claude', keys: ['Mod+I'] },
      { label: 'Back to the code', keys: ['Esc'] },
      { command: 'showShortcuts', label: 'This list', keys: ['?'] },
      { label: 'All editor commands', keys: ['F1'] },
      { label: 'Tab leaves the editor (on/off)', keys: { pc: ['Ctrl+M'], mac: ['Ctrl+Shift+M'] } },
    ],
  },
  {
    title: 'Edit code (same as VS Code)',
    rows: [
      { label: 'Comment line', keys: ['Mod+/'] },
      { label: 'Find / replace', pair: true, keys: { pc: ['Ctrl+F', 'Ctrl+H'], mac: ['Mod+F', 'Mod+Alt+F'] } },
      { label: 'Select next match', keys: ['Mod+D'] },
      { label: 'Move line up / down', pair: true, keys: ['Alt+↑', 'Alt+↓'] },
      { label: 'Copy line up / down', pair: true, keys: { linux: ['Ctrl+Shift+Alt+↑', 'Ctrl+Shift+Alt+↓'], win: ['Shift+Alt+↑', 'Shift+Alt+↓'], mac: ['Shift+Alt+↑', 'Shift+Alt+↓'] } },
      { label: 'Delete line', keys: ['Mod+Shift+K'] },
      { label: 'Indent / outdent', pair: true, keys: ['Mod+]', 'Mod+['] },
      { label: 'Add cursor above / below', pair: true, keys: { linux: ['Shift+Alt+↑', 'Shift+Alt+↓'], win: ['Ctrl+Alt+↑', 'Ctrl+Alt+↓'], mac: ['Mod+Alt+↑', 'Mod+Alt+↓'] } },
      { label: 'Go to line', keys: ['Ctrl+G'] },
      { label: 'Suggestions', keys: ['Ctrl+Space'] },
      { label: 'Fold / unfold', pair: true, keys: { pc: ['Ctrl+Shift+[', 'Ctrl+Shift+]'], mac: ['Mod+Alt+[', 'Mod+Alt+]'] } },
    ],
  },
]

export function combosFor(keys: Keys, platform: Platform = PLATFORM): Combo[] {
  if (Array.isArray(keys)) return keys
  return keys[platform] ?? (platform === 'mac' ? undefined : keys.pc) ?? []
}

const MAC_SYMBOLS: Record<string, string> = { Mod: '⌘', Ctrl: '⌃', Alt: '⌥', Shift: '⇧' }
// VS Code's order: Ctrl+Shift+Alt+Key, and ⌃⇧⌥⌘ on a Mac.
const MODIFIER_ORDER = ['Ctrl', 'Mod', 'Shift', 'Alt']
const MAC_MODIFIER_ORDER = ['Ctrl', 'Shift', 'Alt', 'Mod']

/** The keys of one combo as they should be printed, e.g. ['Ctrl', 'Enter'] or ['⌘', 'Enter']. */
export function comboKeys(combo: Combo, platform: Platform = PLATFORM): string[] {
  const parts = combo.split('+')
  const key = parts.pop()!
  const order = platform === 'mac' ? MAC_MODIFIER_ORDER : MODIFIER_ORDER
  const mods = parts.sort((a, b) => order.indexOf(a) - order.indexOf(b))
  if (platform === 'mac') return [...mods.map((m) => MAC_SYMBOLS[m]), key]
  return [...mods.map((m) => (m === 'Mod' ? 'Ctrl' : m)), key]
}

export function comboText(combo: Combo, platform: Platform = PLATFORM): string {
  return comboKeys(combo, platform).join(platform === 'mac' ? '' : '+')
}

/** For a tooltip: "Next step (Alt+. or →)". */
export function withShortcut(label: string, command: Command, platform: Platform = PLATFORM): string {
  const row = SHORTCUT_SECTIONS.flatMap((s) => s.rows).find((r) => r.command === command)
  if (!row) return label
  return `${label} (${combosFor(row.keys, platform)
    .map((c) => comboText(c, platform))
    .join(' or ')})`
}
