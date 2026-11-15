export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  /** What this answer changed on screen, in plain words (an answer can change code or tables). */
  edits?: string[]
  /** Names this answer's changes, so its Undo button finds what to put back. */
  editId?: number
  /** The learner pressed Undo on these changes. */
  undone?: boolean
}

export const HISTORY_KEY = 'clt.chat.v1'
/** Older messages are dropped past this; the server only ever sees the last 20. */
export const MAX_SAVED = 200

/** The saved conversation, or [] when there is none or storage is blocked. */
export function loadHistory(storage?: Pick<Storage, 'getItem'>): ChatMessage[] {
  try {
    // Read localStorage inside the try: with storage blocked, merely touching it throws.
    const saved = JSON.parse((storage ?? globalThis.localStorage)?.getItem(HISTORY_KEY) ?? 'null') as unknown
    if (!Array.isArray(saved)) return []
    return saved.filter(
      (m): m is ChatMessage =>
        !!m &&
        (m.role === 'user' || m.role === 'assistant') &&
        typeof m.content === 'string' &&
        (m.content !== '' || (Array.isArray(m.edits) && m.edits.length > 0)),
    )
  } catch {
    return []
  }
}

export function saveHistory(messages: ChatMessage[], storage?: Pick<Storage, 'setItem' | 'removeItem'>) {
  try {
    storage ??= globalThis.localStorage
    if (messages.length === 0) storage?.removeItem(HISTORY_KEY)
    else storage?.setItem(HISTORY_KEY, JSON.stringify(messages.slice(-MAX_SAVED)))
  } catch {
    // Storage blocked or full: the chat still works, it just won't survive a reload.
  }
}
