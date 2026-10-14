import type { Language } from '../types'

export interface SavedSolution {
  code: string
  /** When it was saved, as an ISO date. */
  savedAt: string
}

/** The last passing code for each problem, per language. */
export type Solutions = Record<Language, Record<string, SavedSolution>>

export const SOLUTIONS_KEY = 'clt.solutions.v1'

const empty = (): Solutions => ({ python: {}, javascript: {} })

/** The saved solutions, or none when there are none or storage is blocked. */
export function loadSolutions(storage?: Pick<Storage, 'getItem'>): Solutions {
  const out = empty()
  try {
    // Read localStorage inside the try: with storage blocked, merely touching it throws.
    const saved = JSON.parse((storage ?? globalThis.localStorage)?.getItem(SOLUTIONS_KEY) ?? 'null') as unknown
    if (!saved || typeof saved !== 'object') return out
    for (const language of Object.keys(out) as Language[]) {
      const byProblem = (saved as Record<string, unknown>)[language]
      if (!byProblem || typeof byProblem !== 'object') continue
      for (const [id, s] of Object.entries(byProblem)) {
        if (s && typeof s.code === 'string' && typeof s.savedAt === 'string') out[language][id] = { code: s.code, savedAt: s.savedAt }
      }
    }
  } catch {
    // Corrupt or blocked: start with nothing saved.
  }
  return out
}

/** A copy of `solutions` with this one saved, also written to storage. */
export function saveSolution(
  solutions: Solutions,
  language: Language,
  problemId: string,
  code: string,
  storage?: Pick<Storage, 'setItem'>,
  now = new Date(),
): Solutions {
  const next = { ...solutions, [language]: { ...solutions[language], [problemId]: { code, savedAt: now.toISOString() } } }
  try {
    ;(storage ?? globalThis.localStorage)?.setItem(SOLUTIONS_KEY, JSON.stringify(next))
  } catch {
    // Storage blocked or full: it stays saved until the page reloads.
  }
  return next
}
