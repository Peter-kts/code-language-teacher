// Bundle Monaco locally (no CDN) with only the core editor and Python highlighting.
import * as monaco from 'monaco-editor/editor/editor.api'
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
    'scrollbarSlider.background': '#c8b4ff1f',
    'scrollbarSlider.hoverBackground': '#c8b4ff33',
    'scrollbarSlider.activeBackground': '#c8b4ff4d',
  },
})

// Monaco measures glyphs once; re-measure after JetBrains Mono arrives so the cursor lines up.
document.fonts?.ready.then(() => monaco.editor.remeasureFonts())
