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
import type { Theme } from './layout/theme'

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

/** The editor theme and cursor that go with an app theme. */
export function editorLook(theme: Theme) {
  return theme === 'terminal'
    ? { theme: TERMINAL_EDITOR_THEME, cursorStyle: 'block' as const }
    : { theme: EDITOR_THEME, cursorStyle: 'line' as const }
}
