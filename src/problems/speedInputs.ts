import { randomInts, randomString } from './big'
import type { SpeedTest } from './problems'

// Speed tests for the first set of problems. Each input is big enough that a loop inside a
// loop runs far past `maxSteps`, while the target answer uses well under half of it.
// reference.test.ts checks both, in both languages.

const N = 5000

/** The answer pair is the last two numbers, so trying every pair has to try them all. */
const twoSumNums = [...Array.from({ length: N - 2 }, (_, i) => 4 * i), 1, 2]

const prices = randomInts(N, 0, 10_000, 2)
const bits = randomInts(N, 0, 1, 7)
const subarray = randomInts(N, -10_000, 10_000, 3)
const letters = randomString(N, 'abcdefghijklmnopqrstuvwxyz', 4)
const words = Array.from({ length: 3000 }, (_, i) => randomString(4, 'abcdefgh', 100 + i))

function bestProfit(ps: number[]) {
  let lowest = ps[0]
  let best = 0
  for (const p of ps) {
    lowest = Math.min(lowest, p)
    best = Math.max(best, p - lowest)
  }
  return best
}

function kadane(nums: number[]) {
  let current = nums[0]
  let best = nums[0]
  for (const n of nums.slice(1)) {
    current = Math.max(n, current + n)
    best = Math.max(best, current)
  }
  return best
}

function longestRun(s: string) {
  const last = new Map<string, number>()
  let left = 0
  let best = 0
  for (let right = 0; right < s.length; right++) {
    if ((last.get(s[right]) ?? -1) >= left) left = last.get(s[right])! + 1
    last.set(s[right], right)
    best = Math.max(best, right - left + 1)
  }
  return best
}

function groups(ws: string[]) {
  const out = new Map<string, string[]>()
  for (const w of ws) {
    const key = [...w].sort().join('')
    if (!out.has(key)) out.set(key, [])
    out.get(key)!.push(w)
  }
  return [...out.values()]
}

const numbers = (n: number) => ({ python: `nums has ${n.toLocaleString('en-US')} numbers`, javascript: `nums has ${n.toLocaleString('en-US')} numbers` })

export const SPEED: Record<string, SpeedTest> = {
  twoSum: { args: [twoSumNums, 3], expected: [N - 2, N - 1], unordered: true, maxSteps: 12 * N, size: numbers(N) },
  maxProfit: { args: [prices], expected: bestProfit(prices), maxSteps: 12 * N, size: `prices has ${N.toLocaleString('en-US')} days` },
  moveZeroes: {
    args: [bits],
    expected: [...bits.filter((b) => b !== 0), ...bits.filter((b) => b === 0)],
    maxSteps: 12 * N,
    size: `${numbers(N).python}, about half of them 0`,
  },
  search: {
    args: [Array.from({ length: 10_000 }, (_, i) => 2 * i), 19_990],
    expected: 9995,
    maxSteps: 300,
    size: 'nums has 10,000 numbers',
  },
  climbStairs: { args: [35], expected: 14_930_352, maxSteps: 1000, size: 'n is 35' },
  maxSubArray: { args: [subarray], expected: kadane(subarray), maxSteps: 12 * N, size: numbers(N) },
  lengthOfLongestSubstring: { args: [letters], expected: longestRun(letters), maxSteps: 12 * N, size: `s has ${N.toLocaleString('en-US')} letters` },
  groupAnagrams: {
    args: [words],
    expected: groups(words),
    unordered: true,
    maxSteps: 36_000,
    size: 'strs has 3,000 words of 4 letters',
  },
}
