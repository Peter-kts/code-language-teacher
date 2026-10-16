import { randomInts, randomString } from '../big'
import type { Problem, SpeedTest } from '../problems'

// Arrays and hashing, two pointers, sliding window, stack, binary search, intervals and
// 1D dynamic programming: the classic patterns, one or two problems each.

// ---- speed inputs (the same on every run, answers worked out here) ----

const N = 5000
const count = (n: number) => n.toLocaleString('en-US')
const numbers = (name: string, n: number) => `${name} has ${count(n)} numbers`

/** All different, so the answer is only known after every pair has been compared. */
const distinct = Array.from({ length: N }, (_, i) => (i * 7919) % 100_003)

/** 1 and -1, with a 2 every 500 numbers, so the products stay small; no zeros. */
const signs = randomInts(N, 0, 1, 11).map((r, i) => (i % 500 === 7 ? 2 : r === 0 ? -1 : 1))

function exceptSelf(nums: number[]) {
  const out = nums.map(() => 1)
  let left = 1
  for (let i = 0; i < nums.length; i++) {
    out[i] = left
    left *= nums[i]
  }
  let right = 1
  for (let i = nums.length - 1; i >= 0; i--) {
    out[i] *= right
    right *= nums[i]
  }
  return out.map((v) => v + 0)
}

const heights = randomInts(N, 0, 10_000, 12)

function mostWater(h: number[]) {
  let best = 0
  let l = 0
  let r = h.length - 1
  while (l < r) {
    best = Math.max(best, (r - l) * Math.min(h[l], h[r]))
    if (h[l] < h[r]) l++
    else r--
  }
  return best
}

const THREE = 300
const triples = randomInts(THREE, -100_000, 100_000, 13)

function zeroTriples(nums: number[]) {
  const s = [...nums].sort((a, b) => a - b)
  const out: number[][] = []
  for (let i = 0; i < s.length; i++) {
    if (i > 0 && s[i] === s[i - 1]) continue
    let l = i + 1
    let r = s.length - 1
    while (l < r) {
      const sum = s[i] + s[l] + s[r]
      if (sum < 0) l++
      else if (sum > 0) r--
      else {
        out.push([s[i], s[l], s[r]])
        l++
        while (l < r && s[l] === s[l - 1]) l++
      }
    }
  }
  return out
}

const positives = randomInts(N, 1, 100, 14)
const windowTarget = 50_000

function shortestWindow(target: number, nums: number[]) {
  let best = Infinity
  let total = 0
  let left = 0
  for (let right = 0; right < nums.length; right++) {
    total += nums[right]
    while (total >= target) {
      best = Math.min(best, right - left + 1)
      total -= nums[left++]
    }
  }
  return best === Infinity ? 0 : best
}

const ab = randomString(N, 'AB', 15)
const replacements = 500

function longestRepeat(s: string, k: number) {
  const counts = new Map<string, number>()
  let left = 0
  let most = 0
  let best = 0
  for (let right = 0; right < s.length; right++) {
    counts.set(s[right], (counts.get(s[right]) ?? 0) + 1)
    most = Math.max(most, counts.get(s[right])!)
    while (right - left + 1 - most > k) {
      counts.set(s[left], counts.get(s[left])! - 1)
      left++
    }
    best = Math.max(best, right - left + 1)
  }
  return best
}

/** Never warmer until the very last day, so looking ahead from each day reads to the end. */
const cooling = [...randomInts(N - 1, 30, 99, 16).sort((a, b) => b - a), 100]

function waits(t: number[]) {
  const out = t.map(() => 0)
  const stack: number[] = []
  t.forEach((temp, i) => {
    while (stack.length && t[stack[stack.length - 1]] < temp) {
      const j = stack.pop()!
      out[j] = i - j
    }
    stack.push(i)
  })
  return out
}

/** 0, 2, 4, ... 9,998 turned so it starts at 3,000; the target, the largest, sits just before the turn. */
const rotated = Array.from({ length: 5000 }, (_, i) => 2 * ((i + 1500) % 5000))

const houses = randomInts(100, 0, 400, 17)

function robbed(nums: number[]) {
  let skip = 0
  let take = 0
  for (const n of nums) [skip, take] = [Math.max(skip, take), skip + n]
  return Math.max(skip, take)
}

const coinSet = [3, 7, 11, 25]
const amount = 600

function fewestCoins(coins: number[], a: number) {
  const best = [0, ...Array(a).fill(Infinity)]
  for (let x = 1; x <= a; x++) for (const c of coins) if (c <= x) best[x] = Math.min(best[x], best[x - c] + 1)
  return best[a] === Infinity ? -1 : best[a]
}

const SPEED: Record<string, SpeedTest> = {
  containsDuplicate: { args: [distinct], expected: false, maxSteps: 12 * N, size: `${numbers('nums', N)}, all different` },
  productExceptSelf: { args: [signs], expected: exceptSelf(signs), maxSteps: 16 * N, size: numbers('nums', N) },
  maxArea: { args: [heights], expected: mostWater(heights), maxSteps: 12 * N, size: `height has ${count(N)} lines` },
  threeSum: {
    args: [triples],
    expected: zeroTriples(triples),
    unordered: true,
    maxSteps: 600_000,
    size: numbers('nums', THREE),
  },
  minSubArrayLen: {
    args: [windowTarget, positives],
    expected: shortestWindow(windowTarget, positives),
    maxSteps: 16 * N,
    size: `${numbers('nums', N)} from 1 to 100, and target is ${count(windowTarget)}`,
  },
  characterReplacement: {
    args: [ab, replacements],
    expected: longestRepeat(ab, replacements),
    maxSteps: 20 * N,
    size: `s has ${count(N)} letters (A and B), and k is ${replacements}`,
  },
  dailyTemperatures: {
    args: [cooling],
    expected: waits(cooling),
    maxSteps: 14 * N,
    size: `temperatures has ${count(N)} days, never warmer until the last one`,
  },
  searchRotated: { args: [rotated, 9998], expected: 3499, maxSteps: 300, size: numbers('nums', 5000) },
  rob: { args: [houses], expected: robbed(houses), maxSteps: 1500, size: 'nums has 100 houses' },
  coinChange: {
    args: [coinSet, amount],
    expected: fewestCoins(coinSet, amount),
    maxSteps: 20_000,
    size: `coins is [${coinSet.join(', ')}] and amount is ${amount}`,
  },
}

// ---- the problems ----

export const PATTERNS: Problem[] = [
  {
    id: 'contains-duplicate',
    title: 'Contains Duplicate',
    difficulty: 'Easy',
    topic: 'hashing',
    statement: [
      {
        python: 'Return True if any number appears at least twice in nums, and False if every number is different.',
        javascript: 'Return true if any number appears at least twice in nums, and false if every number is different.',
      },
    ],
    constraints: ['nums has 1 to 10⁵ numbers', '-10⁹ ≤ nums[i] ≤ 10⁹'],
    hints: [
      'Simplest: compare every number with every number after it, a loop inside a loop. That is O(n²): with 10⁵ numbers, about 5 billion pairs.',
      {
        python: 'Faster: keep a set of the numbers you have already seen. Checking "n in seen" takes the same time however big the set is.',
        javascript: 'Faster: keep a Set of the numbers you have already seen. seen.has(n) takes the same time however big the Set is.',
      },
      {
        python: 'For each number: if it is already in seen, you found a repeat and can return True right away. Otherwise add it.',
        javascript: 'For each number: if seen already has it, you found a repeat and can return true right away. Otherwise add it.',
      },
    ],
    complexity: {
      time: 'O(n)',
      space: 'O(n)',
      why: {
        python: 'One pass, and each set check or add takes the same time whatever the size. When every number is different, the set ends up holding all n of them.',
        javascript: 'One pass, and each Set check or add takes the same time whatever the size. When every number is different, the Set ends up holding all n of them.',
      },
    },
    speed: SPEED.containsDuplicate,
    concepts: { python: ['sets', 'membership', 'early-return'], javascript: ['sets', 'membership', 'early-return'] },
    functionName: 'containsDuplicate',
    starters: {
      python: `def containsDuplicate(nums):
    seen = set()
    for n in nums:
        # seen n before? if not, remember it
        pass
    return False
`,
      javascript: `function containsDuplicate(nums) {
  const seen = new Set()
  for (const n of nums) {
    // seen n before? if not, remember it
  }
  return false
}
`,
    },
    tests: [
      { args: [[1, 2, 3, 1]], expected: true },
      { args: [[1, 2, 3, 4]], expected: false },
      { args: [[1, 1, 1, 3, 3, 4, 3, 2, 4, 2]], expected: true },
      { args: [[7]], expected: false },
      { args: [[-2, 5, -2]], expected: true },
    ],
  },
  {
    id: 'product-except-self',
    title: 'Product of Array Except Self',
    difficulty: 'Medium',
    topic: 'hashing',
    statement: [
      {
        python: 'Return a list answer where answer[i] is the product of every number in nums except nums[i].',
        javascript: 'Return an array answer where answer[i] is the product of every number in nums except nums[i].',
      },
      'Do it without division (dividing breaks when a number is 0).',
      'For [1, 2, 3, 4] the answer is [24, 12, 8, 6].',
    ],
    constraints: [
      'nums has 2 to 10⁵ numbers',
      '-30 ≤ nums[i] ≤ 30',
      'Every product of part of nums fits in a 32-bit integer.',
    ],
    hints: [
      'Simplest: for each position, multiply every other number with a second loop. That is O(n²).',
      'Faster: answer[i] is (everything to the left of i) times (everything to the right of i).',
      'Walk left to right keeping a running product of what you have passed, and store it in answer[i] before multiplying in nums[i].',
      'Then walk right to left with a second running product, multiplying it into answer[i] the same way.',
    ],
    complexity: {
      time: 'O(n)',
      space: 'O(1)',
      why: {
        python: 'Two passes over nums. Apart from the answer list, only the two running products are kept.',
        javascript: 'Two passes over nums. Apart from the answer array, only the two running products are kept.',
      },
    },
    speed: SPEED.productExceptSelf,
    concepts: { python: ['prefix-sum', 'for-index', 'range'], javascript: ['prefix-sum', 'for-index', 'for-count'] },
    functionName: 'productExceptSelf',
    starters: {
      python: `def productExceptSelf(nums):
    pass
`,
      javascript: `function productExceptSelf(nums) {

}
`,
    },
    tests: [
      { args: [[1, 2, 3, 4]], expected: [24, 12, 8, 6] },
      { args: [[-1, 1, 0, -3, 3]], expected: [0, 0, 9, 0, 0] },
      { args: [[2, 3]], expected: [3, 2] },
      { args: [[0, 4, 0]], expected: [0, 0, 0] },
      { args: [[5, -2, 1, 3]], expected: [-6, 15, -30, -10] },
    ],
  },
  {
    id: 'container-water',
    title: 'Container With Most Water',
    difficulty: 'Medium',
    topic: 'two-pointers',
    statement: [
      'height[i] is the height of a vertical line at position i. Pick two lines: together with the ground they make a container.',
      'The water it holds is the distance between the lines times the shorter line. Return the most water any container can hold.',
      'For [1, 8, 6, 2, 5, 4, 8, 3, 7], the lines at positions 1 and 8 hold 7 × 7 = 49.',
    ],
    constraints: ['height has 2 to 10⁵ lines', '0 ≤ height[i] ≤ 10⁴'],
    hints: [
      'Simplest: try every pair of lines, a loop inside a loop. That is O(n²).',
      'Faster: start with one pointer at each end. That is the widest container there is.',
      'To find a bigger one you must give up some width, so move the pointer at the shorter line inward. Moving the taller one can never help: the shorter line still limits the water.',
    ],
    complexity: { time: 'O(n)', space: 'O(1)', why: 'Each step moves one pointer inward, so after n steps they meet. Only the two pointers and the best so far are kept.' },
    speed: SPEED.maxArea,
    concepts: { python: ['two-pointers', 'running-best', 'min-max-sum'], javascript: ['two-pointers', 'running-best', 'min-max-sum'] },
    functionName: 'maxArea',
    starters: {
      python: `def maxArea(height):
    pass
`,
      javascript: `function maxArea(height) {

}
`,
    },
    tests: [
      { args: [[1, 8, 6, 2, 5, 4, 8, 3, 7]], expected: 49 },
      { args: [[1, 1]], expected: 1 },
      { args: [[4, 3, 2, 1, 4]], expected: 16 },
      { args: [[1, 2, 1]], expected: 2 },
      { args: [[0, 5, 0]], expected: 0 },
    ],
  },
  {
    id: 'three-sum',
    title: '3Sum',
    difficulty: 'Medium',
    topic: 'two-pointers',
    statement: [
      'Find every group of three numbers in nums, at three different positions, that adds up to 0.',
      {
        python: 'Return them as a list of triplets. Write each triplet from smallest to largest, like [-1, 0, 1]. The triplets can come in any order, but the same triplet must not appear twice.',
        javascript: 'Return them as an array of triplets. Write each triplet from smallest to largest, like [-1, 0, 1]. The triplets can come in any order, but the same triplet must not appear twice.',
      },
    ],
    constraints: ['nums has 3 to 3,000 numbers', '-10⁵ ≤ nums[i] ≤ 10⁵'],
    hints: [
      {
        python: 'Simplest: try every three positions with three loops, and keep the sorted triplets in a set so repeats are dropped. That is O(n³).',
        javascript: 'Simplest: try every three positions with three loops, and drop repeats by keeping a Set of keys like "-1,0,1". That is O(n³).',
      },
      'Faster: sort nums first. Then fix the first number, and the other two must add up to minus that number.',
      'In a sorted range, find a pair with a given sum using two pointers: one at each end. Sum too small? Move the left one right. Too big? Move the right one left.',
      'To skip repeats: move past a first number that equals the one before it, and after a match move the left pointer past numbers equal to the one you just used.',
    ],
    complexity: {
      time: 'O(n²)',
      space: 'O(1)',
      why: 'Sorting is O(n log n). Then for each first number the two pointers sweep the rest once: n sweeps of about n steps. Apart from the answer, only a few pointers are kept (sorting itself may use a little memory).',
    },
    speed: SPEED.threeSum,
    concepts: { python: ['sort-first', 'two-pointers', 'nested-loops', 'while'], javascript: ['sort-first', 'two-pointers', 'nested-loops', 'while'] },
    functionName: 'threeSum',
    starters: {
      python: `def threeSum(nums):
    pass
`,
      javascript: `function threeSum(nums) {

}
`,
    },
    tests: [
      { args: [[-1, 0, 1, 2, -1, -4]], expected: [[-1, -1, 2], [-1, 0, 1]], unordered: true },
      { args: [[0, 1, 1]], expected: [], unordered: true },
      { args: [[0, 0, 0, 0]], expected: [[0, 0, 0]], unordered: true },
      { args: [[-2, 0, 1, 1, 2]], expected: [[-2, 0, 2], [-2, 1, 1]], unordered: true },
      { args: [[3, -2, 1, 0, -1, -2, 4]], expected: [[-2, -2, 4], [-2, -1, 3], [-1, 0, 1]], unordered: true },
    ],
  },
  {
    id: 'min-subarray-sum',
    title: 'Minimum Size Subarray Sum',
    difficulty: 'Medium',
    topic: 'sliding-window',
    statement: [
      'nums holds positive numbers. Return the length of the shortest run of neighboring numbers whose sum is at least target, or 0 if no run is big enough.',
      'For target 7 and nums [2, 3, 1, 2, 4, 3], the run [4, 3] sums to 7, so the answer is 2.',
    ],
    constraints: ['1 ≤ target ≤ 10⁹', 'nums has 1 to 10⁵ numbers', '1 ≤ nums[i] ≤ 10⁴'],
    hints: [
      'Simplest: from every start, add numbers to the right until the sum reaches target, and keep the shortest. That is O(n²).',
      'Faster: keep a window from left to right and its sum. Move right one step at a time, adding the new number.',
      'While the sum is at least target, the window counts: record its length, then drop nums[left] and move left forward. Every number is positive, so shrinking always lowers the sum.',
    ],
    complexity: {
      time: 'O(n)',
      space: 'O(1)',
      why: 'right moves n times and left only ever moves forward, so each number joins and leaves the window once. Only the sum, two indexes and the best length are kept.',
    },
    speed: SPEED.minSubArrayLen,
    concepts: { python: ['sliding-window', 'running-best', 'while'], javascript: ['sliding-window', 'running-best', 'while'] },
    functionName: 'minSubArrayLen',
    starters: {
      python: `def minSubArrayLen(target, nums):
    pass
`,
      javascript: `function minSubArrayLen(target, nums) {

}
`,
    },
    tests: [
      { args: [7, [2, 3, 1, 2, 4, 3]], expected: 2 },
      { args: [4, [1, 4, 4]], expected: 1 },
      { args: [11, [1, 1, 1, 1, 1, 1, 1, 1]], expected: 0 },
      { args: [15, [1, 2, 3, 4, 5]], expected: 5 },
      { args: [3, [5]], expected: 1 },
    ],
  },
  {
    id: 'char-replacement',
    title: 'Longest Repeating Character Replacement',
    difficulty: 'Medium',
    topic: 'sliding-window',
    statement: [
      's holds uppercase letters. You may change up to k letters into any other uppercase letter.',
      'Return the length of the longest stretch of one repeated letter you can make.',
      'For s = "AABABBA" and k = 1, change the "A" in "BABB" to "B" to get "BBBB": the answer is 4.',
    ],
    constraints: ['s has 1 to 10⁵ letters', 'Only uppercase letters A to Z.', '0 ≤ k ≤ length of s'],
    hints: [
      'Simplest: from every start, extend right while counting letters. A stretch works while (its length - its most common letter count) ≤ k. That is O(n²).',
      'Faster: use a sliding window. Count the letters inside it, and remember the highest count any letter has reached.',
      'Grow the window one letter at a time. When length - highest count is more than k, too many letters would need changing, so drop the leftmost letter and move left forward.',
      'The highest count never needs to go down: a window only beats the best when some letter fills more of it than before.',
    ],
    complexity: {
      time: 'O(n)',
      space: 'O(1)',
      why: {
        python: 'right moves n times and left only moves forward. The dict of counts never holds more than 26 letters, however long s is.',
        javascript: 'right moves n times and left only moves forward. The Map of counts never holds more than 26 letters, however long s is.',
      },
    },
    speed: SPEED.characterReplacement,
    concepts: { python: ['sliding-window', 'counting', 'dicts', 'running-best'], javascript: ['sliding-window', 'counting', 'dicts', 'running-best'] },
    functionName: 'characterReplacement',
    starters: {
      python: `def characterReplacement(s, k):
    pass
`,
      javascript: `function characterReplacement(s, k) {

}
`,
    },
    tests: [
      { args: ['ABAB', 2], expected: 4 },
      { args: ['AABABBA', 1], expected: 4 },
      { args: ['A', 0], expected: 1 },
      { args: ['ABCDE', 0], expected: 1 },
      { args: ['AAAB', 0], expected: 3 },
      { args: ['ABBB', 2], expected: 4 },
    ],
  },
  {
    id: 'daily-temperatures',
    title: 'Daily Temperatures',
    difficulty: 'Medium',
    topic: 'stack',
    statement: [
      {
        python: 'temperatures[i] is the temperature on day i. Return a list answer where answer[i] is how many days you wait after day i for a warmer day, or 0 if no warmer day comes.',
        javascript: 'temperatures[i] is the temperature on day i. Return an array answer where answer[i] is how many days you wait after day i for a warmer day, or 0 if no warmer day comes.',
      },
      'For [73, 74, 75, 71, 69, 72, 76, 73] the answer is [1, 1, 4, 2, 1, 1, 0, 0].',
    ],
    constraints: ['temperatures has 1 to 10⁵ days', '30 ≤ temperatures[i] ≤ 100'],
    hints: [
      'Simplest: for each day, look ahead day by day until you find a warmer one. On a long cold spell that is O(n²).',
      {
        python: 'Faster: keep a stack of the days still waiting for a warmer day. Store indexes, so you can work out the wait.',
        javascript: 'Faster: keep a stack (an array) of the days still waiting for a warmer day. Store indexes, so you can work out the wait.',
      },
      'The waiting days on the stack get cooler from bottom to top. When today is warmer than the top, that day has its answer: today minus its index. Pop it and check the next one.',
      'Then put today on the stack. Days left on the stack at the end never get warmer, so they stay 0.',
    ],
    complexity: {
      time: 'O(n)',
      space: 'O(n)',
      why: 'Each day goes on the stack once and comes off at most once, so all the popping adds up to n. On a long cold spell the stack holds almost every day.',
    },
    speed: SPEED.dailyTemperatures,
    concepts: { python: ['monotonic-stack', 'stack', 'for-index', 'while'], javascript: ['monotonic-stack', 'stack', 'for-index', 'while'] },
    functionName: 'dailyTemperatures',
    starters: {
      python: `def dailyTemperatures(temperatures):
    pass
`,
      javascript: `function dailyTemperatures(temperatures) {

}
`,
    },
    tests: [
      { args: [[73, 74, 75, 71, 69, 72, 76, 73]], expected: [1, 1, 4, 2, 1, 1, 0, 0] },
      { args: [[30, 40, 50, 60]], expected: [1, 1, 1, 0] },
      { args: [[30, 60, 90]], expected: [1, 1, 0] },
      { args: [[50]], expected: [0] },
      { args: [[70, 70, 60, 80]], expected: [3, 2, 1, 0] },
    ],
  },
  {
    id: 'search-rotated',
    title: 'Search in Rotated Sorted Array',
    difficulty: 'Medium',
    topic: 'binary-search',
    statement: [
      'nums was sorted from smallest to largest, with no repeats, and then turned at some point: the part after that point was moved to the front. [0, 1, 2, 4, 5, 6, 7] might become [4, 5, 6, 7, 0, 1, 2].',
      'Return the index of target in nums, or -1 if it is not there. Aim for O(log n).',
    ],
    constraints: ['nums has 1 to 5,000 numbers, all different', '-10⁴ ≤ nums[i], target ≤ 10⁴', 'nums is a sorted run turned at some point (maybe not at all).'],
    hints: [
      'Simplest: check every item from the left. That is O(n), and it ignores that nums is almost sorted.',
      'Faster: binary search still works. Look at mid. At least one of the two halves, lo to mid or mid to hi, is in sorted order.',
      'You can tell which: if nums[lo] ≤ nums[mid], the left half is sorted. Otherwise the right half is.',
      'If target lies between the ends of the sorted half, search there. Otherwise search the other half.',
    ],
    complexity: {
      time: 'O(log n)',
      space: 'O(1)',
      why: 'Each look throws away half of what is left, just like plain binary search. Only lo, hi and mid are kept.',
    },
    speed: SPEED.searchRotated,
    concepts: { python: ['binary-search', 'while', 'math'], javascript: ['binary-search', 'while', 'math'] },
    functionName: 'searchRotated',
    starters: {
      python: `def searchRotated(nums, target):
    pass
`,
      javascript: `function searchRotated(nums, target) {

}
`,
    },
    tests: [
      { args: [[4, 5, 6, 7, 0, 1, 2], 0], expected: 4 },
      { args: [[4, 5, 6, 7, 0, 1, 2], 3], expected: -1 },
      { args: [[1], 0], expected: -1 },
      { args: [[1, 3], 3], expected: 1 },
      { args: [[5, 1, 3], 5], expected: 0 },
      { args: [[6, 7, 8, 1, 2, 3, 4, 5], 8], expected: 2 },
    ],
  },
  {
    id: 'merge-intervals',
    title: 'Merge Intervals',
    difficulty: 'Medium',
    topic: 'intervals',
    statement: [
      'Each item of intervals is [start, end]. Merge every group of overlapping intervals into one, and return the intervals that are left, sorted by start.',
      'Intervals that only touch, like [1, 4] and [4, 5], count as overlapping.',
      'For [[1, 3], [2, 6], [8, 10], [15, 18]] the answer is [[1, 6], [8, 10], [15, 18]].',
    ],
    constraints: ['intervals has 1 to 10⁴ items', '0 ≤ start ≤ end ≤ 10⁴'],
    hints: [
      {
        python: 'Sort the intervals by start first: intervals.sort(). Then any interval that overlaps another one comes right after a run it belongs to.',
        javascript: 'Sort the intervals by start first: intervals.sort((a, b) => a[0] - b[0]). Then any interval that overlaps another one comes right after a run it belongs to.',
      },
      'Walk through them and compare each one with the last interval in your answer.',
      'If it starts at or before the end of that last one, they overlap: stretch the last one\'s end to the bigger of the two ends. Otherwise add it as a new interval.',
    ],
    complexity: {
      time: 'O(n log n)',
      space: 'O(1)',
      why: 'Sorting takes O(n log n); the walk after it is one pass. Apart from the answer, nothing grows with n (sorting itself may use some memory).',
    },
    concepts: { python: ['intervals', 'sort-first', 'sorting', 'lists'], javascript: ['intervals', 'sort-first', 'sorting', 'lists'] },
    functionName: 'mergeIntervals',
    starters: {
      python: `def mergeIntervals(intervals):
    pass
`,
      javascript: `function mergeIntervals(intervals) {

}
`,
    },
    tests: [
      { args: [[[1, 3], [2, 6], [8, 10], [15, 18]]], expected: [[1, 6], [8, 10], [15, 18]] },
      { args: [[[1, 4], [4, 5]]], expected: [[1, 5]] },
      { args: [[[4, 7], [1, 4]]], expected: [[1, 7]] },
      { args: [[[1, 10], [2, 3], [4, 5]]], expected: [[1, 10]] },
      { args: [[[5, 5]]], expected: [[5, 5]] },
      { args: [[[6, 8], [1, 2], [3, 4]]], expected: [[1, 2], [3, 4], [6, 8]] },
    ],
  },
  {
    id: 'insert-interval',
    title: 'Insert Interval',
    difficulty: 'Medium',
    topic: 'intervals',
    statement: [
      'intervals is sorted by start, and no two of its intervals overlap. Insert newInterval into it, merging wherever it overlaps, and return the result, still sorted and without overlaps.',
      'Intervals that only touch, like [1, 2] and [2, 5], count as overlapping.',
      'For intervals [[1, 3], [6, 9]] and newInterval [2, 5] the answer is [[1, 5], [6, 9]].',
    ],
    constraints: ['intervals has 0 to 10⁴ items, sorted by start, not overlapping', '0 ≤ start ≤ end ≤ 10⁵', 'newInterval is [start, end] with start ≤ end'],
    hints: [
      'Simplest: add newInterval, sort everything again, and merge overlaps as in Merge Intervals. That is O(n log n), and it wastes the fact that intervals is already sorted.',
      'Faster: one pass in three parts. First copy every interval that ends before newInterval starts.',
      'Then, while an interval starts at or before newInterval ends, they overlap: widen newInterval to cover both. Add it once that stops.',
      'Finally copy everything that is left.',
    ],
    complexity: {
      time: 'O(n)',
      space: 'O(1)',
      why: 'Each interval is looked at once. Apart from the answer, only an index and the growing newInterval are kept.',
    },
    concepts: { python: ['intervals', 'while', 'lists', 'min-max-sum'], javascript: ['intervals', 'while', 'lists', 'min-max-sum'] },
    functionName: 'insertInterval',
    starters: {
      python: `def insertInterval(intervals, newInterval):
    pass
`,
      javascript: `function insertInterval(intervals, newInterval) {

}
`,
    },
    tests: [
      { args: [[[1, 3], [6, 9]], [2, 5]], expected: [[1, 5], [6, 9]] },
      { args: [[[1, 2], [3, 5], [6, 7], [8, 10], [12, 16]], [4, 8]], expected: [[1, 2], [3, 10], [12, 16]] },
      { args: [[], [5, 7]], expected: [[5, 7]] },
      { args: [[[1, 5]], [6, 8]], expected: [[1, 5], [6, 8]] },
      { args: [[[3, 5]], [0, 1]], expected: [[0, 1], [3, 5]] },
      { args: [[[1, 5]], [2, 3]], expected: [[1, 5]] },
    ],
  },
  {
    id: 'house-robber',
    title: 'House Robber',
    difficulty: 'Medium',
    topic: 'dp-1d',
    statement: [
      'nums[i] is the money in house i along a street. You cannot take from two houses next to each other (the alarm would go off). Return the most money you can take.',
      'For [2, 7, 9, 3, 1], take houses 0, 2 and 4: 2 + 9 + 1 = 12.',
    ],
    constraints: ['nums has 1 to 100 houses', '0 ≤ nums[i] ≤ 400'],
    hints: [
      'Simplest: recursion. From house i, either skip it and go on from i + 1, or take it and go on from i + 2; return the better. Without remembering answers the same houses are worked out again and again: about 2ⁿ calls.',
      'Faster: work along the street once, keeping the best total up to each house.',
      {
        python: 'The best up to house i is max(best up to i - 1, best up to i - 2 + nums[i]). You only ever need the last two of those, so two variables are enough.',
        javascript: 'The best up to house i is Math.max(best up to i - 1, best up to i - 2 + nums[i]). You only ever need the last two of those, so two variables are enough.',
      },
    ],
    complexity: {
      time: 'O(n)',
      space: 'O(1)',
      why: {
        python: 'One pass, with the same small amount of work per house. Only the last two best totals are kept. (A list of every best total would be O(n) space.)',
        javascript: 'One pass, with the same small amount of work per house. Only the last two best totals are kept. (An array of every best total would be O(n) space.)',
      },
    },
    speed: SPEED.rob,
    concepts: { python: ['dp-1d', 'recursion', 'memoization', 'min-max-sum'], javascript: ['dp-1d', 'recursion', 'memoization', 'min-max-sum'] },
    functionName: 'rob',
    starters: {
      python: `def rob(nums):
    pass
`,
      javascript: `function rob(nums) {

}
`,
    },
    tests: [
      { args: [[1, 2, 3, 1]], expected: 4 },
      { args: [[2, 7, 9, 3, 1]], expected: 12 },
      { args: [[5]], expected: 5 },
      { args: [[2, 1, 1, 2]], expected: 4 },
      { args: [[0, 0, 0]], expected: 0 },
    ],
  },
  {
    id: 'coin-change',
    title: 'Coin Change',
    difficulty: 'Medium',
    topic: 'dp-1d',
    statement: [
      'coins holds the coin values you have, and you have as many of each as you like. Return the fewest coins that add up to exactly amount, or -1 if no mix of coins does.',
      'For coins [1, 2, 5] and amount 11, the answer is 3: 5 + 5 + 1.',
    ],
    constraints: ['coins has 1 to 12 values', '1 ≤ coins[i] ≤ 2³¹ - 1', '0 ≤ amount ≤ 10⁴'],
    hints: [
      'Simplest: recursion. The fewest coins for amount a is 1 + the fewest for a - c, tried for every coin c (and 0 for a = 0). Without remembering answers the same amounts are worked out again and again: exponential.',
      'Faster: work out the answer for every amount from 0 up to amount, each once, smallest first.',
      {
        python: 'Keep a list best where best[a] is the fewest coins for a, starting at infinity (float("inf")) except best[0] = 0. For each a and each coin c ≤ a: best[a] = min(best[a], best[a - c] + 1).',
        javascript: 'Keep an array best where best[a] is the fewest coins for a, starting at Infinity except best[0] = 0. For each a and each coin c ≤ a: best[a] = Math.min(best[a], best[a - c] + 1).',
      },
      'Greedy (always take the biggest coin) does not work: with coins [1, 3, 4] and amount 6 it picks 4 + 1 + 1, but 3 + 3 is fewer.',
    ],
    complexity: {
      time: 'O(a·k)',
      space: 'O(a)',
      extra: ['O(a·k)', 'O(a)', 'O(k)'],
      why: {
        python: 'a is amount and k is how many coins there are. Each of the a amounts tries every coin once. The best list holds a + 1 numbers.',
        javascript: 'a is amount and k is how many coins there are. Each of the a amounts tries every coin once. The best array holds a + 1 numbers.',
      },
    },
    speed: SPEED.coinChange,
    concepts: { python: ['dp-1d', 'recursion', 'memoization', 'nested-loops'], javascript: ['dp-1d', 'recursion', 'memoization', 'nested-loops'] },
    functionName: 'coinChange',
    starters: {
      python: `def coinChange(coins, amount):
    pass
`,
      javascript: `function coinChange(coins, amount) {

}
`,
    },
    tests: [
      { args: [[1, 2, 5], 11], expected: 3 },
      { args: [[2], 3], expected: -1 },
      { args: [[1], 0], expected: 0 },
      { args: [[1, 3, 4], 6], expected: 2 },
      { args: [[5, 10], 7], expected: -1 },
      { args: [[2, 5, 10, 1], 18], expected: 4 },
    ],
  },
]
