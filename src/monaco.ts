// Bundle Monaco locally (no CDN) with the core editor and Python, JavaScript and SQL highlighting.
import * as monaco from 'monaco-editor/editor/editor.api'
// The API above is the bare editor: without these, VS Code's standard shortcuts do nothing.
import 'monaco-editor/features/codicon/register'
import 'monaco-editor/features/comment/register' // Ctrl+/, Shift+Alt+A
import 'monaco-editor/features/find/register' // Ctrl+F, Ctrl+H, F3
import 'monaco-editor/features/multicursor/register' // Ctrl+D, Ctrl+Shift+L, Ctrl+Alt+Up/Down
import 'monaco-editor/features/linesOperations/register' // Alt+Up/Down, Shift+Alt+Up/Down, Ctrl+Shift+K, Ctrl+]/[
import 'monaco-editor/features/wordOperations/register' // Ctrl+Left/Right, Ctrl+Backspace
import 'monaco-editor/features/wordPartOperations/register'
import 'monaco-editor/features/lineSelection/register' // Ctrl+L
import 'monaco-editor/features/cursorUndo/register' // Ctrl+U
import 'monaco-editor/features/bracketMatching/register' // Ctrl+Shift+\
import 'monaco-editor/features/folding/register' // Ctrl+Shift+[ / ]
import 'monaco-editor/features/smartSelect/register' // Shift+Alt+Left/Right
import 'monaco-editor/editor/contrib/suggest/browser/suggestController' // Ctrl+Space
import 'monaco-editor/features/quickCommand/register' // F1
import 'monaco-editor/features/gotoLine/register' // Ctrl+G
import 'monaco-editor/features/quickHelp/register'
import 'monaco-editor/features/toggleTabFocusMode/register' // Ctrl+M: Tab moves focus out
import 'monaco-editor/languages/definitions/python/register'
import 'monaco-editor/languages/definitions/javascript/register'
import 'monaco-editor/languages/definitions/sql/register'
import EditorWorker from 'monaco-editor/editor/editor.worker?worker'
import { loader } from '@monaco-editor/react'
import type { Look } from './layout/design'

self.MonacoEnvironment = { getWorker: () => new EditorWorker() }
loader.config({ monaco })

// Galaxy theme: transparent background so the pane's tinted glass shows through.
export const EDITOR_THEME = 'galaxy'
monaco.editor.defineTheme(EDITOR_THEME, {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: 'comment', foreground: '6f6888', fontStyle: 'italic' },
    { token: 'keyword', foreground: 'c8b4ff' },
    { token: 'string', foreground: 'f0a7cf' },
    { token: 'number', foreground: '8fb4ff' },
    { token: 'type', foreground: '7ee0b8' },
    { token: 'delimiter', foreground: 'aaa3bd' },
  ],
  colors: {
    'editor.background': '#00000000',
    'editor.foreground': '#f2eefa',
    'editorGutter.background': '#00000000',
    'editorLineNumber.foreground': '#4a445e',
    'editorLineNumber.activeForeground': '#c8b4ff',
    'editorCursor.foreground': '#c8b4ff',
    'editor.selectionBackground': '#c8b4ff38',
    'editor.inactiveSelectionBackground': '#c8b4ff1f',
    'editor.lineHighlightBackground': '#ffffff07',
    'editor.lineHighlightBorder': '#00000000',
    'editorIndentGuide.background1': '#ffffff10',
    'editorIndentGuide.activeBackground1': '#c8b4ff40',
    'editorError.foreground': '#ff6f91',
    'editorBracketHighlight.foreground1': '#c8b4ff',
    'editorBracketHighlight.foreground2': '#f0a7cf',
    'editorBracketHighlight.foreground3': '#8fb4ff',
    'editorBracketMatch.background': '#c8b4ff1f',
    'editorBracketMatch.border': '#c8b4ff66',
    'editorWidget.background': '#0d0a1a',
    'editorWidget.border': '#3a3350',
    'editorSuggestWidget.background': '#0d0a1a',
    'editorSuggestWidget.border': '#3a3350',
    'editorSuggestWidget.selectedBackground': '#c8b4ff26',
    'editorHoverWidget.background': '#0d0a1a',
    'editorHoverWidget.border': '#3a3350',
    'editorOverviewRuler.border': '#00000000',
    // Find (Ctrl+F) and the F1 list. Find matches are pink so they don't read as the amber "read" highlight.
    'editor.findMatchBackground': '#f0a7cf59',
    'editor.findMatchHighlightBackground': '#f0a7cf26',
    'editorOverviewRuler.findMatchForeground': '#f0a7cf99',
    'editor.selectionHighlightBackground': '#c8b4ff1f',
    'focusBorder': '#c8b4ff80',
    'input.background': '#05040a',
    'input.border': '#3a3350',
    'input.placeholderForeground': '#625b78',
    'inputOption.activeBorder': '#c8b4ff',
    'inputOption.activeBackground': '#c8b4ff33',
    'quickInput.background': '#0d0a1a',
    'quickInputList.focusBackground': '#c8b4ff26',
    'list.hoverBackground': '#ffffff0a',
    'list.highlightForeground': '#c8b4ff',
    'keybindingLabel.background': '#ffffff0d',
    'keybindingLabel.border': '#3a3350',
    'keybindingLabel.bottomBorder': '#3a3350',
    'keybindingLabel.foreground': '#f2eefa',
    'widget.shadow': '#00000099',
    'scrollbarSlider.background': '#c8b4ff1f',
    'scrollbarSlider.hoverBackground': '#c8b4ff33',
    'scrollbarSlider.activeBackground': '#c8b4ff4d',
  },
})

// Monaco measures glyphs once; re-measure after JetBrains Mono arrives so the cursor lines up.
document.fonts?.ready.then(() => monaco.editor.remeasureFonts())

// Retro terminal theme (src/layout/theme.ts): green phosphor on black, amber strings, cyan numbers.
// Like the galaxy theme its background is see-through, so the pane's own color shows.
export const TERMINAL_EDITOR_THEME = 'terminal'
monaco.editor.defineTheme(TERMINAL_EDITOR_THEME, {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: 'comment', foreground: '3f9e57', fontStyle: 'italic' },
    { token: 'keyword', foreground: '33ff66', fontStyle: 'bold' },
    { token: 'string', foreground: 'ffb000' },
    { token: 'number', foreground: '5ff5f5' },
    { token: 'type', foreground: '66ffcc' },
    { token: 'delimiter', foreground: '62d97e' },
    { token: 'identifier', foreground: 'b4ffc4' },
  ],
  colors: {
    'editor.background': '#00000000',
    'editor.foreground': '#b4ffc4',
    'editorGutter.background': '#00000000',
    'editorLineNumber.foreground': '#2c7a42',
    'editorLineNumber.activeForeground': '#33ff66',
    'editorCursor.foreground': '#33ff66',
    'editor.selectionBackground': '#33ff6640',
    'editor.inactiveSelectionBackground': '#33ff6624',
    'editor.lineHighlightBackground': '#33ff660d',
    'editor.lineHighlightBorder': '#00000000',
    'editorIndentGuide.background1': '#33ff6614',
    'editorIndentGuide.activeBackground1': '#33ff6645',
    'editorError.foreground': '#ff5555',
    'editorBracketHighlight.foreground1': '#33ff66',
    'editorBracketHighlight.foreground2': '#ffb000',
    'editorBracketHighlight.foreground3': '#5ff5f5',
    'editorBracketMatch.background': '#33ff6624',
    'editorBracketMatch.border': '#33ff6680',
    'editorWidget.background': '#03140a',
    'editorWidget.border': '#1f7a3a',
    'editorSuggestWidget.background': '#03140a',
    'editorSuggestWidget.border': '#1f7a3a',
    'editorSuggestWidget.selectedBackground': '#33ff6630',
    'editorHoverWidget.background': '#03140a',
    'editorHoverWidget.border': '#1f7a3a',
    'editorOverviewRuler.border': '#00000000',
    // Find matches in magenta, so they don't read as the amber "read" highlight.
    'editor.findMatchBackground': '#ff79c659',
    'editor.findMatchHighlightBackground': '#ff79c626',
    'editorOverviewRuler.findMatchForeground': '#ff79c699',
    'editor.selectionHighlightBackground': '#33ff6624',
    'focusBorder': '#33ff6680',
    'input.background': '#010702',
    'input.border': '#1f7a3a',
    'input.placeholderForeground': '#3f9e57',
    'inputOption.activeBorder': '#33ff66',
    'inputOption.activeBackground': '#33ff6633',
    'quickInput.background': '#03140a',
    'quickInputList.focusBackground': '#33ff6630',
    'list.hoverBackground': '#33ff660d',
    'list.highlightForeground': '#33ff66',
    'keybindingLabel.background': '#33ff660d',
    'keybindingLabel.border': '#1f7a3a',
    'keybindingLabel.bottomBorder': '#1f7a3a',
    'keybindingLabel.foreground': '#b4ffc4',
    'widget.shadow': '#000000aa',
    'scrollbarSlider.background': '#33ff6626',
    'scrollbarSlider.hoverBackground': '#33ff6640',
    'scrollbarSlider.activeBackground': '#33ff6659',
  },
})

// Black and white terminal: white text on black, but syntax keeps its colors (green keywords,
// amber strings, cyan numbers), like a plain terminal profile with a colorful editor in it.
export const MONO_EDITOR_THEME = 'mono'
monaco.editor.defineTheme(MONO_EDITOR_THEME, {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: 'comment', foreground: '8c8c8c', fontStyle: 'italic' },
    { token: 'keyword', foreground: 'ff79c6', fontStyle: 'bold' },
    { token: 'string', foreground: 'ffb86c' },
    { token: 'number', foreground: '8be9fd' },
    { token: 'type', foreground: '50fa7b' },
    { token: 'delimiter', foreground: 'b4b4b4' },
    { token: 'identifier', foreground: 'ececec' },
  ],
  colors: {
    'editor.background': '#00000000',
    'editor.foreground': '#ececec',
    'editorGutter.background': '#00000000',
    'editorLineNumber.foreground': '#5a5a5a',
    'editorLineNumber.activeForeground': '#ffffff',
    'editorCursor.foreground': '#ffffff',
    'editor.selectionBackground': '#ffffff38',
    'editor.inactiveSelectionBackground': '#ffffff1f',
    'editor.lineHighlightBackground': '#ffffff0a',
    'editor.lineHighlightBorder': '#00000000',
    'editorIndentGuide.background1': '#ffffff12',
    'editorIndentGuide.activeBackground1': '#ffffff40',
    'editorError.foreground': '#ff5555',
    'editorBracketHighlight.foreground1': '#ffffff',
    'editorBracketHighlight.foreground2': '#ffb86c',
    'editorBracketHighlight.foreground3': '#8be9fd',
    'editorBracketMatch.background': '#ffffff1f',
    'editorBracketMatch.border': '#ffffff80',
    'editorWidget.background': '#111111',
    'editorWidget.border': '#555555',
    'editorSuggestWidget.background': '#111111',
    'editorSuggestWidget.border': '#555555',
    'editorSuggestWidget.selectedBackground': '#ffffff26',
    'editorHoverWidget.background': '#111111',
    'editorHoverWidget.border': '#555555',
    'editorOverviewRuler.border': '#00000000',
    'editor.findMatchBackground': '#ff79c659',
    'editor.findMatchHighlightBackground': '#ff79c626',
    'editorOverviewRuler.findMatchForeground': '#ff79c699',
    'editor.selectionHighlightBackground': '#ffffff1f',
    'focusBorder': '#ffffff80',
    'input.background': '#000000',
    'input.border': '#555555',
    'input.placeholderForeground': '#8c8c8c',
    'inputOption.activeBorder': '#ffffff',
    'inputOption.activeBackground': '#ffffff33',
    'quickInput.background': '#111111',
    'quickInputList.focusBackground': '#ffffff26',
    'list.hoverBackground': '#ffffff0d',
    'list.highlightForeground': '#ffffff',
    'keybindingLabel.background': '#ffffff0d',
    'keybindingLabel.border': '#555555',
    'keybindingLabel.bottomBorder': '#555555',
    'keybindingLabel.foreground': '#ececec',
    'widget.shadow': '#000000aa',
    'scrollbarSlider.background': '#ffffff1f',
    'scrollbarSlider.hoverBackground': '#ffffff33',
    'scrollbarSlider.activeBackground': '#ffffff4d',
  },
})

// Focus theme: soft off-white text on deep navy, with a few calm, distinct syntax colors.
export const FOCUS_EDITOR_THEME = 'focus'
monaco.editor.defineTheme(FOCUS_EDITOR_THEME, {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: 'comment', foreground: '7c8aa3', fontStyle: 'italic' },
    { token: 'keyword', foreground: '7dd3fc' },
    { token: 'string', foreground: 'f0abfc' },
    { token: 'number', foreground: 'fdba74' },
    { token: 'type', foreground: '4ade80' },
    { token: 'delimiter', foreground: 'a3b1c6' },
  ],
  colors: {
    'editor.background': '#00000000',
    'editor.foreground': '#e2e8f0',
    'editorGutter.background': '#00000000',
    'editorLineNumber.foreground': '#475569',
    'editorLineNumber.activeForeground': '#7dd3fc',
    'editorCursor.foreground': '#7dd3fc',
    'editor.selectionBackground': '#7dd3fc38',
    'editor.inactiveSelectionBackground': '#7dd3fc1f',
    'editor.lineHighlightBackground': '#ffffff08',
    'editor.lineHighlightBorder': '#00000000',
    'editorIndentGuide.background1': '#ffffff10',
    'editorIndentGuide.activeBackground1': '#7dd3fc40',
    'editorError.foreground': '#f87171',
    'editorBracketHighlight.foreground1': '#7dd3fc',
    'editorBracketHighlight.foreground2': '#f0abfc',
    'editorBracketHighlight.foreground3': '#fdba74',
    'editorBracketMatch.background': '#7dd3fc1f',
    'editorBracketMatch.border': '#7dd3fc66',
    'editorWidget.background': '#131c2e',
    'editorWidget.border': '#334155',
    'editorSuggestWidget.background': '#131c2e',
    'editorSuggestWidget.border': '#334155',
    'editorSuggestWidget.selectedBackground': '#7dd3fc26',
    'editorHoverWidget.background': '#131c2e',
    'editorHoverWidget.border': '#334155',
    'editorOverviewRuler.border': '#00000000',
    'editor.findMatchBackground': '#f0abfc59',
    'editor.findMatchHighlightBackground': '#f0abfc26',
    'editorOverviewRuler.findMatchForeground': '#f0abfc99',
    'editor.selectionHighlightBackground': '#7dd3fc1f',
    'focusBorder': '#7dd3fc80',
    'input.background': '#0b1220',
    'input.border': '#334155',
    'input.placeholderForeground': '#7c8aa3',
    'inputOption.activeBorder': '#7dd3fc',
    'inputOption.activeBackground': '#7dd3fc33',
    'quickInput.background': '#131c2e',
    'quickInputList.focusBackground': '#7dd3fc26',
    'list.hoverBackground': '#ffffff0a',
    'list.highlightForeground': '#7dd3fc',
    'keybindingLabel.background': '#ffffff0d',
    'keybindingLabel.border': '#334155',
    'keybindingLabel.bottomBorder': '#334155',
    'keybindingLabel.foreground': '#e2e8f0',
    'widget.shadow': '#00000099',
    'scrollbarSlider.background': '#7dd3fc1f',
    'scrollbarSlider.hoverBackground': '#7dd3fc33',
    'scrollbarSlider.activeBackground': '#7dd3fc4d',
  },
})

// Paper design (src/layout/design.ts): black ink on cream paper, so this one starts from the light
// base. Keywords in the ultramarine the design uses for "this is live", strings in magenta, numbers
// in violet. Green and amber are left out on purpose: in the code they only ever mean "changed" and
// "read". Every color is at least 4.5 times darker than the paper (the WCAG rule for readable text).
export const PAPER_EDITOR_THEME = 'paper'
monaco.editor.defineTheme(PAPER_EDITOR_THEME, {
  base: 'vs',
  inherit: true,
  rules: [
    { token: 'comment', foreground: '6d6455', fontStyle: 'italic' },
    { token: 'keyword', foreground: '1c3fdc', fontStyle: 'bold' },
    { token: 'string', foreground: 'b0186b' },
    { token: 'number', foreground: '6d2fc0' },
    { token: 'type', foreground: '00727e' },
    { token: 'delimiter', foreground: '4c453a' },
    { token: 'identifier', foreground: '15120e' },
    { token: 'operator', foreground: '15120e' },
    { token: 'predefined', foreground: 'b0186b' },
  ],
  colors: {
    'editor.background': '#00000000',
    'editor.foreground': '#15120e',
    'editorGutter.background': '#00000000',
    'editorLineNumber.foreground': '#a2988a',
    'editorLineNumber.activeForeground': '#15120e',
    'editorCursor.foreground': '#15120e',
    'editor.selectionBackground': '#1c3fdc40',
    'editor.inactiveSelectionBackground': '#1c3fdc24',
    'editor.lineHighlightBackground': '#15120e0a',
    'editor.lineHighlightBorder': '#00000000',
    'editorIndentGuide.background1': '#15120e1a',
    'editorIndentGuide.activeBackground1': '#15120e59',
    'editorError.foreground': '#c22a14',
    'editorBracketHighlight.foreground1': '#1c3fdc',
    'editorBracketHighlight.foreground2': '#b0186b',
    'editorBracketHighlight.foreground3': '#6d2fc0',
    'editorBracketMatch.background': '#1c3fdc1f',
    'editorBracketMatch.border': '#1c3fdc',
    'editorWidget.background': '#fbf7ec',
    'editorWidget.border': '#15120e',
    'editorSuggestWidget.background': '#fbf7ec',
    'editorSuggestWidget.border': '#15120e',
    'editorSuggestWidget.selectedBackground': '#1c3fdc2e',
    'editorHoverWidget.background': '#fbf7ec',
    'editorHoverWidget.border': '#15120e',
    'editorOverviewRuler.border': '#00000000',
    // Find matches in magenta, so they don't read as the amber "read" highlight.
    'editor.findMatchBackground': '#d6248366',
    'editor.findMatchHighlightBackground': '#d6248333',
    'editorOverviewRuler.findMatchForeground': '#d62483aa',
    'editor.selectionHighlightBackground': '#1c3fdc1f',
    'focusBorder': '#1c3fdc',
    'input.background': '#ffffff',
    'input.border': '#15120e',
    'input.placeholderForeground': '#6d6455',
    'inputOption.activeBorder': '#1c3fdc',
    'inputOption.activeBackground': '#1c3fdc33',
    'quickInput.background': '#fbf7ec',
    'quickInputList.focusBackground': '#1c3fdc2e',
    'list.hoverBackground': '#15120e0f',
    'list.highlightForeground': '#1c3fdc',
    'keybindingLabel.background': '#15120e0d',
    'keybindingLabel.border': '#15120e',
    'keybindingLabel.bottomBorder': '#15120e',
    'keybindingLabel.foreground': '#15120e',
    'widget.shadow': '#15120e40',
    'scrollbarSlider.background': '#15120e26',
    'scrollbarSlider.hoverBackground': '#15120e40',
    'scrollbarSlider.activeBackground': '#15120e59',
  },
})

const EDITOR_THEMES: Record<Look, string> = {
  galaxy: EDITOR_THEME,
  terminal: TERMINAL_EDITOR_THEME,
  mono: MONO_EDITOR_THEME,
  focus: FOCUS_EDITOR_THEME,
  paper: PAPER_EDITOR_THEME,
}

const CODE_FONT = "'JetBrains Mono', ui-monospace, Consolas, monospace"
// The paper design sets code in IBM Plex Mono, which reads like a typewritten listing.
const PAPER_CODE_FONT = "'IBM Plex Mono', ui-monospace, Consolas, monospace"

/** The editor theme, cursor and font that go with a look: the terminals get a block cursor. */
export function editorLook(look: Look) {
  return {
    theme: EDITOR_THEMES[look],
    cursorStyle: look === 'terminal' || look === 'mono' ? ('block' as const) : ('line' as const),
    fontFamily: look === 'paper' ? PAPER_CODE_FONT : CODE_FONT,
  }
}

/** Monaco measures letter widths once per font; call this after a new font has loaded. */
export function remeasureEditorFonts() {
  monaco.editor.remeasureFonts()
}
