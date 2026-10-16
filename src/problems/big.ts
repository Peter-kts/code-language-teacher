// Inputs for speed tests: big, but the same on every run (and in both languages), so a
// step count can be compared from one run to the next.

/** A repeatable stream of numbers in [0, 1) from a seed (mulberry32). */
export function seeded(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** `count` whole numbers from lo to hi (both included). */
export function randomInts(count: number, lo: number, hi: number, seed = 1): number[] {
  const next = seeded(seed)
  return Array.from({ length: count }, () => lo + Math.floor(next() * (hi - lo + 1)))
}

/** A string of `length` characters picked from `alphabet`. */
export function randomString(length: number, alphabet: string, seed = 1): string {
  const next = seeded(seed)
  return Array.from({ length }, () => alphabet[Math.floor(next() * alphabet.length)]).join('')
}
