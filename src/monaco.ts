// Bundle Monaco locally (no CDN) with the core editor and Python highlighting.
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
import EditorWorker from 'monaco-editor/editor/editor.worker?worker'
import { loader } from '@monaco-editor/react'

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
