import { dataBlockText, readDataBlock } from '../../server/playground.mjs'
import type { Language } from '../types'

// The data block the chat put in the Python or JavaScript playground, saved in this browser so it is
// still there after a reload, like the SQL data the chat changes. Only the block is kept, not the rest
// of the playground's code.

export const SAVED_DATA_KEY = 'clt.playdata.v1'

export function loadSavedData(storage?: Pick<Storage, 'getItem'>): Partial<Record<Language, string>> {
  try {
    const saved = JSON.parse((storage ?? globalThis.localStorage)?.getItem(SAVED_DATA_KEY) ?? 'null') as unknown
    if (!saved || typeof saved !== 'object') return {}
    const out: Partial<Record<Language, string>> = {}
    for (const language of ['python', 'javascript'] as const) {
      const text = (saved as Record<string, unknown>)[language]
      if (typeof text === 'string' && readDataBlock(text, language).entries.length) out[language] = text
    }
    return out
  } catch {
    return {}
  }
}

/** Remembers the playground's data block for this language (or forgets it when the code has none). */
export function saveData(language: Language, code: string, storage?: Pick<Storage, 'getItem' | 'setItem'>) {
  try {
    storage ??= globalThis.localStorage
    const all = loadSavedData(storage)
    const block = dataBlockText(code, language)
    if ((all[language] ?? null) === block) return
    if (block) all[language] = block
    else delete all[language]
    storage?.setItem(SAVED_DATA_KEY, JSON.stringify(all))
  } catch {
    // Storage blocked or full: the data lasts until the page reloads.
  }
}

/** The playground's starting code with the saved data block on top, when there is one. */
export function withSavedData(code: string, language: Language, saved: Partial<Record<Language, string>>): string {
  const block = saved[language]
  if (!block || dataBlockText(code, language) !== null) return code
  return `${block}\n\n${code}`
}
