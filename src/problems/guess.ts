/** How a predict problem's guess compares with what the code printed. */
export interface GuessCheck {
  right: number
  total: number
  /** The first line that differs (1-based), or null when every line matches. */
  wrong: { line: number; guess: string; actual: string } | null
}

/** A printed line as people type it: trimmed, single spaces, and ' and " treated alike. */
const tidy = (line: string) => line.trim().replace(/\s+/g, ' ').replace(/\s*,\s*/g, ', ').replace(/'/g, '"')

const linesOf = (text: string) => text.split('\n').map(tidy).filter(Boolean)

/** Compare a guess with the program's output, line by line. */
export function checkGuess(guess: string, output: string): GuessCheck {
  const said = linesOf(guess)
  const actual = linesOf(output)
  const total = Math.max(said.length, actual.length)
  let right = 0
  let wrong: GuessCheck['wrong'] = null
  for (let i = 0; i < total; i++) {
    if (said[i] === actual[i]) right++
    else wrong ??= { line: i + 1, guess: said[i] ?? '', actual: actual[i] ?? '' }
  }
  return { right, total, wrong }
}
