import type { SqlTable } from './engine'

// Tables the chat changed, saved in this browser so they survive a reload. Keyed by what they replace:
// 'playground', or a problem's test case as `problemId#caseIndex`.

export const EDITED_DATA_KEY = 'clt.sqldata.v1'

export function loadEditedData(storage?: Pick<Storage, 'getItem'>): Record<string, SqlTable[]> {
  try {
    const saved = JSON.parse((storage ?? globalThis.localStorage)?.getItem(EDITED_DATA_KEY) ?? 'null') as unknown
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return {}
    const out: Record<string, SqlTable[]> = {}
    for (const [key, tables] of Object.entries(saved)) {
      if (Array.isArray(tables) && tables.every((t) => t && typeof t.name === 'string' && typeof t.columns === 'string' && Array.isArray(t.rows))) {
        out[key] = tables
      }
    }
    return out
  } catch {
    return {}
  }
}

export function saveEditedData(data: Record<string, SqlTable[]>, storage?: Pick<Storage, 'setItem' | 'removeItem'>) {
  try {
    storage ??= globalThis.localStorage
    if (Object.keys(data).length === 0) storage?.removeItem(EDITED_DATA_KEY)
    else storage?.setItem(EDITED_DATA_KEY, JSON.stringify(data))
  } catch {
    // Storage blocked or full: the changes last until the page reloads.
  }
}
