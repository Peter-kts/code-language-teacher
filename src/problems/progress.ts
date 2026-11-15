// How many problems are solved in the current language: the progress meter in the focus theme.
// Predict problems are left out, because they are answered with a guess, not saved as code.

import type { Subject } from '../types'
import type { Solutions } from './solutions'

export interface Progress {
  solved: number
  total: number
}

export function progressFor(solutions: Solutions, subject: Subject, problems: readonly { id: string; kind?: string }[]): Progress {
  const counted = problems.filter((p) => p.kind !== 'predict')
  const saved = solutions[subject] ?? {}
  return { solved: counted.filter((p) => saved[p.id]).length, total: counted.length }
}
