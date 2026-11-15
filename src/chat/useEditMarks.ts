import { useEffect, useRef } from 'react'
import type * as monaco from 'monaco-editor/editor/editor.api'
import type { ChatMarks } from './marks'

/**
 * Lights up the editor lines the chat just wrote, in the same green the visualizer uses for what a
 * line changed. They stay until the code changes again (your next keystroke, or an undo).
 */
export function useEditMarks(
  editor: monaco.editor.IStandaloneCodeEditor | null,
  api: typeof monaco | null,
  code: string,
  marks: ChatMarks | null,
) {
  const collection = useRef<{ editor: monaco.editor.IStandaloneCodeEditor; set: monaco.editor.IEditorDecorationsCollection } | null>(null)
  useEffect(() => {
    if (!editor || !api) return
    // A new editor (after switching workspaces) needs its own collection.
    if (collection.current?.editor !== editor) collection.current = { editor, set: editor.createDecorationsCollection() }
    const set = collection.current.set
    // On the next frame, once the editor itself has taken the new code.
    const frame = requestAnimationFrame(() => {
      const model = editor.getModel()
      const lines = marks && marks.code === code && model?.getValue() === code ? marks.lines.filter((n) => n <= model.getLineCount()) : []
      set.set(
        lines.map((n) => ({
          range: new api.Range(n, 1, n, 1),
          options: { isWholeLine: true, className: 'chat-edited-line', linesDecorationsClassName: 'chat-edited-gutter' },
        })),
      )
      if (lines.length) editor.revealLineInCenterIfOutsideViewport(lines[0])
    })
    return () => cancelAnimationFrame(frame)
  }, [editor, api, code, marks])
}
