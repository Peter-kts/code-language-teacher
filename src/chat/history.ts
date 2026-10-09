export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export const HISTORY_KEY = 'clt.chat.v1'
/** Older messages are dropped past this; the server only ever sees the last 20. */
export const MAX_SAVED = 200

/** The saved conversation, or [] when there is none or storage is blocked. */
export function loadHistory(storage: Pick<Storage, 'getItem'> | undefined = globalThis.localStorage): ChatMessage[] {
  try {
    const saved = JSON.parse(storage?.getItem(HISTORY_KEY) ?? 'null') as unknown
    if (!Array.isArray(saved)) return []
    return saved.filter(
      (m): m is ChatMessage =>
        !!m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content !== '',
    )
  } catch {
    return []
  }
}

export function saveHistory(messages: ChatMessage[], storage: Pick<Storage, 'setItem' | 'removeItem'> | undefined = globalThis.localStorage) {
  try {
    if (messages.length === 0) storage?.removeItem(HISTORY_KEY)
    else storage?.setItem(HISTORY_KEY, JSON.stringify(messages.slice(-MAX_SAVED)))
  } catch {
    // Storage blocked or full: the chat still works, it just won't survive a reload.
  }
}
