// The chat's reply arrives as plain text with screen changes mixed in. Each change is a JSON record
// between two \x1e characters (see EDIT_MARK in server/chat.mjs), so it can't be confused with words.
// A chunk from the network can end halfway through a record; what's left over waits for the next chunk.

export const EDIT_MARK = '\x1e'

export interface EditCall {
  name: string
  input: unknown
}

/** Splits buffered text into the words to show, the complete changes, and an unfinished record to keep. */
export function takeEdits(buffer: string): { text: string; edits: EditCall[]; rest: string } {
  let text = ''
  const edits: EditCall[] = []
  let at = 0
  for (;;) {
    const open = buffer.indexOf(EDIT_MARK, at)
    if (open < 0) {
      text += buffer.slice(at)
      return { text, edits, rest: '' }
    }
    text += buffer.slice(at, open)
    const close = buffer.indexOf(EDIT_MARK, open + 1)
    if (close < 0) return { text, edits, rest: buffer.slice(open) }
    try {
      const record = JSON.parse(buffer.slice(open + 1, close)) as Partial<EditCall>
      if (typeof record.name === 'string') edits.push({ name: record.name, input: record.input })
    } catch {
      // A garbled record is skipped rather than shown.
    }
    at = close + 1
  }
}
