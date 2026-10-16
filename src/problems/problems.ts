import type { Language, NodeIo } from '../types'
import { ADVANCED } from './sets/advanced'
import { GRAPHS } from './sets/graphs'
import { LINKED } from './sets/linked'
import { PATTERNS } from './sets/patterns'
import { SPEED } from './speedInputs'

export interface TestCase {
  args: unknown[]
  expected: unknown
  /** Accept the answer in any order (e.g. a pair of indexes). */
  unordered?: boolean
  /**
   * JavaScript concept problems: code that uses the learner's function and returns
   * what to check (a function body), for answers that are functions or need several calls.
   */
  run?: string
  /** What the case checks, in words, when it isn't plain arguments. */
  name?: string
}

/** Text that reads the same in both languages, or a version for each where they differ (list or array, True or true). */
export type Text = string | Record<Language, string>

/** The text in the given language. */
export const say = (text: Text, language: Language) => (typeof text === 'string' ? text : text[language])

export type Difficulty = 'Warm-up' | 'Easy' | 'Medium' | 'Hard'

export const DIFFICULTIES: Difficulty[] = ['Warm-up', 'Easy', 'Medium', 'Hard']

/** The kind of problem, roughly the sections of an interview prep list; the picker groups by it. */
export type ProblemTopic =
  | 'basics'
  | 'hashing'
  | 'two-pointers'
  | 'sliding-window'
  | 'stack'
  | 'binary-search'
  | 'intervals'
  | 'dp-1d'
  | 'linked-lists'
  | 'trees'
  | 'graphs'
  | 'backtracking'
  | 'heaps'
  | 'dp-2d'

/** In the order they're meant to be learned. */
export const PROBLEM_TOPICS: { id: ProblemTopic; label: string }[] = [
  { id: 'basics', label: 'Warm-ups' },
  { id: 'hashing', label: 'Arrays and hashing' },
  { id: 'two-pointers', label: 'Two pointers' },
  { id: 'sliding-window', label: 'Sliding window' },
  { id: 'stack', label: 'Stack' },
  { id: 'binary-search', label: 'Binary search' },
  { id: 'intervals', label: 'Intervals' },
  { id: 'dp-1d', label: 'Greedy and 1D dynamic programming' },
  { id: 'linked-lists', label: 'Linked lists' },
  { id: 'trees', label: 'Trees' },
  { id: 'graphs', label: 'Graphs and grids' },
  { id: 'backtracking', label: 'Backtracking' },
  { id: 'heaps', label: 'Heaps' },
  { id: 'dp-2d', label: '2D dynamic programming' },
]

/** The usual answers to "how fast is it?", slowest last; a problem can offer more (`complexity.extra`). */
export const BIG_OS = ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)', 'O(n²)', 'O(2ⁿ)']

export interface Complexity {
  /** How the steps grow with the input, for the target answer. */
  time: string
  /** Extra memory, not counting the answer that is returned. */
  space: string
  /** Why, in a sentence or two; also says what n stands for when it isn't obvious. */
  why: Text
  /** Choices to offer besides BIG_OS, like `O(m·n)` or `O(n·2ⁿ)`. */
  extra?: string[]
}

/**
 * A big input the learner's code runs on without tracing, with a budget of steps (lines run).
 * An answer at the target speed fits easily; a slower one (a loop inside a loop) runs out.
 */
export interface SpeedTest {
  args: unknown[]
  expected: unknown
  unordered?: boolean
  maxSteps: number
  /** The input's size in words, e.g. `nums has 5,000 numbers`. */
  size: Text
}

export interface Problem {
  id: string
  title: string
  difficulty: Difficulty
  /** Which section of the problem list it sits in (not set on the JavaScript concept problems). */
  topic?: ProblemTopic
  /** Paragraphs of the problem statement. */
  statement: Text[]
  /** Limits on the input, as LeetCode lists them. They say how fast the answer has to be. */
  constraints?: Text[]
  /**
   * Revealed one at a time, so the learner can ask for just a nudge. Where a slow answer
   * exists, the first hint is that simple version and the next ones say how to speed it up.
   */
  hints: Text[]
  /** The target answer's time and space, asked once the tests pass. */
  complexity?: Complexity
  /** A big input that a too-slow answer can't finish within its step budget. */
  speed?: SpeedTest
  /** Arguments and answers that are linked lists or trees, written in the tests as arrays. */
  io?: NodeIo
  /** Ids of the glossary entries this problem practices, in each language's glossary (src/syntax/cards.ts, jsCards.ts). */
  concepts: Record<Language, string[]>
  /** The function the tests call; empty for a predict problem. */
  functionName: string
  /** The code the learner starts from, in each language. */
  starters: Record<Language, string>
  tests: TestCase[]
  /**
   * Set on the JavaScript concept problems (src/problems/concepts.ts). They only exist in
   * JavaScript, and their code runs as a whole (with its example lines) instead of calling
   * the function once per test case.
   */
  track?: 'js-concepts'
  /** `predict`: guess what the code prints, then step through it. `build`: write a function the tests check. */
  kind?: 'build' | 'predict'
  /** A predict problem's explanation, shown once the guess is in. */
  explain?: string[]
}

// The first set; the picker groups every problem by topic, easiest first.
const FIRST: Problem[] = [
  {
    id: 'fizzbuzz',
    title: 'FizzBuzz',
    difficulty: 'Warm-up',
    topic: 'basics',
    statement: [
      {
        python:
          'Return a list of strings for the numbers 1 to n. Use "Fizz" for multiples of 3, "Buzz" for multiples of 5, "FizzBuzz" for multiples of both, and the number itself (as a string) otherwise.',
        javascript:
          'Return an array of strings for the numbers 1 to n. Use "Fizz" for multiples of 3, "Buzz" for multiples of 5, "FizzBuzz" for multiples of both, and the number itself (as a string) otherwise.',
      },
    ],
    constraints: ['1 ≤ n ≤ 10⁴'],
    hints: [
      { python: 'n % 3 == 0 is True when n is a multiple of 3.', javascript: 'i % 3 === 0 is true when i is a multiple of 3.' },
      {
        python: 'Check "multiple of both" first: a number divisible by 15 is also divisible by 3, so the order of your if/elif matters.',
        javascript: 'Check "multiple of both" first: a number divisible by 15 is also divisible by 3, so the order of your if/else if matters. String(i) turns the number into text.',
      },
    ],
    complexity: {
      time: 'O(n)',
      space: 'O(1)',
      why: {
        python: 'One pass from 1 to n, with the same small amount of work for each number. The list you return is the answer, so it does not count as extra space.',
        javascript: 'One pass from 1 to n, with the same small amount of work for each number. The array you return is the answer, so it does not count as extra space.',
      },
    },
    concepts: { python: ['range', 'math', 'if-elif-else', 'lists'], javascript: ['for-count', 'math', 'if-else', 'lists'] },
    functionName: 'fizzBuzz',
    starters: {
      python: `def fizzBuzz(n):
    out = []
    for i in range(1, n + 1):
        # decide what to append for i
        pass
    return out
`,
      javascript: `function fizzBuzz(n) {
  const out = []
  for (let i = 1; i <= n; i++) {
    // decide what to push for i
  }
  return out
}
`,
    },
    tests: [
      { args: [3], expected: ['1', '2', 'Fizz'] },
      { args: [5], expected: ['1', '2', 'Fizz', '4', 'Buzz'] },
      {
        args: [15],
        expected: ['1', '2', 'Fizz', '4', 'Buzz', 'Fizz', '7', '8', 'Fizz', 'Buzz', '11', 'Fizz', '13', '14', 'FizzBuzz'],
      },
    ],
  },
  {
    id: 'find-max',
    title: 'Find the Max',
    difficulty: 'Warm-up',
    topic: 'basics',
    statement: [
      {
        python: 'Given a non-empty list of integers nums, return the largest one. Try it without using max(), so you can watch the best value change.',
        javascript:
          'Given a non-empty array of integers nums, return the largest one. Try it without using Math.max(), so you can watch the best value change.',
      },
    ],
    constraints: [{ python: 'nums has 1 to 10⁵ numbers', javascript: 'nums has 1 to 10⁵ numbers' }, '-10⁴ ≤ nums[i] ≤ 10⁴'],
    hints: [
      'Start with best = nums[0], then look at every number.',
      'Only replace best when the number you are looking at is bigger.',
    ],
    complexity: { time: 'O(n)', space: 'O(1)', why: 'Every number is looked at once, and best is a single variable however long nums is.' },
    concepts: { python: ['for-list', 'comparisons', 'running-best'], javascript: ['for-list', 'comparisons', 'running-best'] },
    functionName: 'findMax',
    starters: {
      python: `def findMax(nums):
    best = nums[0]
    for n in nums:
        # is n better than best?
        pass
    return best
`,
      javascript: `function findMax(nums) {
  let best = nums[0]
  for (const n of nums) {
    // is n better than best?
  }
  return best
}
`,
    },
    tests: [
      { args: [[3, 9, 2, 7]], expected: 9 },
      { args: [[-5, -2, -8]], expected: -2 },
      { args: [[4]], expected: 4 },
      { args: [[1, 5, 5, 3]], expected: 5 },
    ],
  },
  {
    id: 'running-sum',
    title: 'Running Sum',
    difficulty: 'Easy',
    topic: 'hashing',
    statement: [
      {
        python: 'Given a list nums, return a new list where each item is the sum of nums up to and including that position.',
        javascript: 'Given an array nums, return a new array where each item is the sum of nums up to and including that position.',
      },
      'For [1, 2, 3, 4] the answer is [1, 3, 6, 10].',
    ],
    constraints: ['nums has 1 to 1,000 numbers', '-10⁶ ≤ nums[i] ≤ 10⁶'],
    hints: [
      'Simplest: for each position, add up everything up to it with a second loop. That works, but it adds the same numbers again and again: O(n²).',
      {
        python: 'Faster: keep a total that grows by each number, and append the total after each step. Each number is added once.',
        javascript: 'Faster: keep a total that grows by each number, and push the total after each step. Each number is added once.',
      },
    ],
    complexity: { time: 'O(n)', space: 'O(1)', why: 'One pass, adding each number to total once. total is one variable; the output does not count as extra space.' },
    concepts: { python: ['augmented', 'lists', 'prefix-sum'], javascript: ['augmented', 'lists', 'prefix-sum'] },
    functionName: 'runningSum',
    starters: {
      python: `def runningSum(nums):
    total = 0
    out = []
    for n in nums:
        # grow total, then remember it
        pass
    return out
`,
      javascript: `function runningSum(nums) {
  let total = 0
  const out = []
  for (const n of nums) {
    // grow total, then remember it
  }
  return out
}
`,
    },
    tests: [
      { args: [[1, 2, 3, 4]], expected: [1, 3, 6, 10] },
      { args: [[1, 1, 1, 1, 1]], expected: [1, 2, 3, 4, 5] },
      { args: [[3, 1, 2, 10, 1]], expected: [3, 4, 6, 16, 17] },
    ],
  },
  {
    id: 'reverse-list',
    title: 'Reverse a List in Place',
    difficulty: 'Easy',
    topic: 'two-pointers',
    statement: [
      {
        python: 'Reverse the list nums without making a new list, then return it. Try it without nums.reverse() or slicing.',
        javascript: 'Reverse the array nums without making a new array, then return it. Try it without nums.reverse().',
      },
    ],
    constraints: ['nums has 1 to 10⁵ numbers'],
    hints: [
      {
        python: 'Put one pointer at the start and one at the end, and swap what they point at: a, b = b, a.',
        javascript: 'Put one pointer at the start and one at the end, and swap what they point at: [a, b] = [b, a].',
      },
      'Move them toward each other and stop when they meet.',
    ],
    complexity: { time: 'O(n)', space: 'O(1)', why: 'The two pointers meet in the middle after n / 2 swaps, which still grows like n. Only l and r are kept, so no extra memory grows with the input.' },
    concepts: { python: ['two-pointers', 'tuples', 'while'], javascript: ['two-pointers', 'destructuring', 'while'] },
    functionName: 'reverseList',
    starters: {
      python: `def reverseList(nums):
    l, r = 0, len(nums) - 1
    while l < r:
        # swap, then move both pointers
        break
    return nums
`,
      javascript: `function reverseList(nums) {
  let l = 0
  let r = nums.length - 1
  while (l < r) {
    // swap, then move both pointers
    break
  }
  return nums
}
`,
    },
    tests: [
      { args: [[1, 2, 3, 4, 5]], expected: [5, 4, 3, 2, 1] },
      { args: [[1, 2]], expected: [2, 1] },
      { args: [[7]], expected: [7] },
      { args: [[4, 8, 15, 16]], expected: [16, 15, 8, 4] },
    ],
  },
  {
    id: 'two-sum',
    title: 'Two Sum',
    difficulty: 'Easy',
    topic: 'hashing',
    statement: [
      {
        python: 'Given a list of integers nums and an integer target, return the indexes of the two numbers that add up to target.',
        javascript: 'Given an array of integers nums and an integer target, return the indexes of the two numbers that add up to target, as an array.',
      },
      'Each input has exactly one solution, and you may not use the same element twice. Return the two indexes in any order.',
    ],
    constraints: [{ python: 'nums has 2 to 10⁴ numbers', javascript: 'nums has 2 to 10⁴ numbers' }, '-10⁹ ≤ nums[i], target ≤ 10⁹', 'Exactly one answer exists.'],
    hints: [
      'Simplest: try every pair with a loop inside a loop. It works, but it is O(n²): with 10⁴ numbers that is about 50 million pairs.',
      'Faster: for each number, the partner you need is target - num. The question is how to find it without searching.',
      {
        python: 'A dict that remembers numbers you have already seen (number → index) can find the partner in one pass.',
        javascript: 'A Map that remembers numbers you have already seen (number → index) can find the partner in one pass: seen.has(need), then seen.get(need).',
      },
    ],
    complexity: {
      time: 'O(n)',
      space: 'O(n)',
      why: {
        python: 'One pass, and each dict lookup takes the same time however big the dict is. The dict can end up holding nearly every number: O(n) space.',
        javascript: 'One pass, and each Map lookup takes the same time however big the Map is. The Map can end up holding nearly every number: O(n) space.',
      },
    },
    speed: SPEED.twoSum,
    concepts: { python: ['dicts', 'for-index', 'hash-map-lookup'], javascript: ['dicts', 'for-index', 'hash-map-lookup'] },
    functionName: 'twoSum',
    starters: {
      python: `def twoSum(nums, target):
    seen = {}
    for i, num in enumerate(nums):
        # what number would pair with num?
        pass
`,
      javascript: `function twoSum(nums, target) {
  const seen = new Map()
  for (const [i, num] of nums.entries()) {
    // what number would pair with num?
  }
}
`,
    },
    tests: [
      { args: [[2, 7, 11, 15], 9], expected: [0, 1], unordered: true },
      { args: [[3, 2, 4], 6], expected: [1, 2], unordered: true },
      { args: [[3, 3], 6], expected: [0, 1], unordered: true },
      { args: [[1, 5, 8, 3, 9, 2], 14], expected: [1, 4], unordered: true },
    ],
  },
  {
    id: 'valid-anagram',
    title: 'Valid Anagram',
    difficulty: 'Easy',
    topic: 'hashing',
    statement: [
      {
        python: 'Return True if the string t uses exactly the same letters as s, the same number of times each, and False otherwise.',
        javascript: 'Return true if the string t uses exactly the same letters as s, the same number of times each, and false otherwise.',
      },
    ],
    constraints: ['s and t have 1 to 5 × 10⁴ letters', 'Only lowercase letters a to z.'],
    hints: [
      'Simplest: sort the letters of both and compare. That is O(n log n), which is fine here; counting is O(n).',
      { python: 'To count: count the letters of s in a dict.', javascript: 'To count: count the letters of s in a Map: counts.set(ch, (counts.get(ch) ?? 0) + 1).' },
      {
        python: 'Then go through t and count each letter back down. Any letter that goes below zero, or is missing, means False.',
        javascript: 'Then go through t and count each letter back down. Any letter that goes below zero, or is missing, means false.',
      },
    ],
    complexity: {
      time: 'O(n)',
      space: 'O(1)',
      why: {
        python: 'One pass over each string. The dict never holds more than 26 letters however long the strings are, so its size does not grow with n: O(1).',
        javascript: 'One pass over each string. The Map never holds more than 26 letters however long the strings are, so its size does not grow with n: O(1).',
      },
    },
    concepts: { python: ['dicts', 'strings', 'counting'], javascript: ['dicts', 'strings', 'counting'] },
    functionName: 'isAnagram',
    starters: {
      python: `def isAnagram(s, t):
    if len(s) != len(t):
        return False
    counts = {}
    for ch in s:
        # count ch
        pass
    return True
`,
      javascript: `function isAnagram(s, t) {
  if (s.length !== t.length) {
    return false
  }
  const counts = new Map()
  for (const ch of s) {
    // count ch
  }
  return true
}
`,
    },
    tests: [
      { args: ['anagram', 'nagaram'], expected: true },
      { args: ['rat', 'car'], expected: false },
      { args: ['listen', 'silent'], expected: true },
      { args: ['aab', 'abb'], expected: false },
    ],
  },
  {
    id: 'valid-parentheses',
    title: 'Valid Parentheses',
    difficulty: 'Easy',
    topic: 'stack',
    statement: [
      {
        python: 'Given a string s of the characters ( ) [ ] { }, return True if every bracket is closed by the same kind of bracket in the right order.',
        javascript: 'Given a string s of the characters ( ) [ ] { }, return true if every bracket is closed by the same kind of bracket in the right order.',
      },
    ],
    constraints: ['s has 1 to 10⁴ characters', 'Only the characters ( ) [ ] { }.'],
    hints: [
      'Simplest: keep deleting "()", "[]" and "{}" pairs until none are left; s is valid if nothing remains. Each pass is O(n) and there can be n / 2 passes: O(n²).',
      {
        python: 'Faster: put each opening bracket on a stack (a list you append to).',
        javascript: 'Faster: push each opening bracket onto a stack (an array you push to and pop from).',
      },
      'When you see a closing bracket, the top of the stack must be its partner. At the end the stack must be empty.',
    ],
    complexity: { time: 'O(n)', space: 'O(n)', why: 'One pass over s. In the worst case (all opening brackets) the stack holds every character: O(n).' },
    concepts: { python: ['stack', 'dicts', 'truthiness'], javascript: ['stack', 'objects', 'truthiness'] },
    functionName: 'isValid',
    starters: {
      python: `def isValid(s):
    pairs = {")": "(", "]": "[", "}": "{"}
    stack = []
    for ch in s:
        # opening: push it. closing: check the top
        pass
    return not stack
`,
      javascript: `function isValid(s) {
  const pairs = { ")": "(", "]": "[", "}": "{" }
  const stack = []
  for (const ch of s) {
    // opening: push it. closing: check the top
  }
  return stack.length === 0
}
`,
    },
    tests: [
      { args: ['()'], expected: true },
      { args: ['()[]{}'], expected: true },
      { args: ['(]'], expected: false },
      { args: ['([)]'], expected: false },
      { args: ['{[]}'], expected: true },
      { args: ['(('], expected: false },
    ],
  },
  {
    id: 'best-time-stock',
    title: 'Best Time to Buy and Sell Stock',
    difficulty: 'Easy',
    topic: 'sliding-window',
    statement: [
      'prices[i] is the price of a stock on day i. Buy on one day and sell on a later day. Return the most profit you can make, or 0 if no trade makes money.',
    ],
    constraints: ['prices has 1 to 10⁵ days', '0 ≤ prices[i] ≤ 10⁴'],
    hints: [
      'Simplest: try every buy day with every later sell day, two loops: O(n²). With 10⁵ days that is about 5 billion pairs.',
      'Faster: as you walk through the days, remember the lowest price so far.',
      'Each day, selling today would earn price - lowest. Keep the best of those.',
    ],
    complexity: { time: 'O(n)', space: 'O(1)', why: 'One pass, and only two numbers (lowest and profit) are kept, whatever the number of days.' },
    speed: SPEED.maxProfit,
    concepts: { python: ['running-best', 'min-max-sum'], javascript: ['running-best', 'min-max-sum'] },
    functionName: 'maxProfit',
    starters: {
      python: `def maxProfit(prices):
    lowest = prices[0]
    profit = 0
    for p in prices:
        # update lowest and profit
        pass
    return profit
`,
      javascript: `function maxProfit(prices) {
  let lowest = prices[0]
  let profit = 0
  for (const p of prices) {
    // update lowest and profit
  }
  return profit
}
`,
    },
    tests: [
      { args: [[7, 1, 5, 3, 6, 4]], expected: 5 },
      { args: [[7, 6, 4, 3, 1]], expected: 0 },
      { args: [[2, 4, 1, 7]], expected: 6 },
    ],
  },
  {
    id: 'move-zeroes',
    title: 'Move Zeroes',
    difficulty: 'Easy',
    topic: 'two-pointers',
    statement: [
      'Move every 0 in nums to the end, keeping the other numbers in their original order. Change nums in place and return it.',
    ],
    constraints: ['nums has 1 to 10⁴ numbers'],
    hints: [
      'Simplest: each time you find a 0, move every number after it one place left and put the 0 at the end. Shifting is O(n) for each 0: O(n²) in all.',
      'Faster: use a slow pointer for "where the next non-zero goes" and a fast pointer that reads every item.',
      'When fast finds a non-zero, swap it with slow and move slow forward.',
    ],
    complexity: { time: 'O(n)', space: 'O(1)', why: 'fast walks nums once and every swap is one step. Only two indexes are kept, and the numbers move inside nums itself.' },
    speed: SPEED.moveZeroes,
    concepts: { python: ['slow-fast', 'tuples', 'for-index'], javascript: ['slow-fast', 'destructuring', 'for-count'] },
    functionName: 'moveZeroes',
    starters: {
      python: `def moveZeroes(nums):
    slow = 0
    for fast in range(len(nums)):
        # found a non-zero? put it at slow
        pass
    return nums
`,
      javascript: `function moveZeroes(nums) {
  let slow = 0
  for (let fast = 0; fast < nums.length; fast++) {
    // found a non-zero? put it at slow
  }
  return nums
}
`,
    },
    tests: [
      { args: [[0, 1, 0, 3, 12]], expected: [1, 3, 12, 0, 0] },
      { args: [[0]], expected: [0] },
      { args: [[4, 0, 5, 0, 0, 6]], expected: [4, 5, 6, 0, 0, 0] },
    ],
  },
  {
    id: 'binary-search',
    title: 'Binary Search',
    difficulty: 'Easy',
    topic: 'binary-search',
    statement: [
      'nums is sorted from smallest to largest. Return the index of target, or -1 if it is not there. Look at as few items as you can.',
    ],
    constraints: ['nums has 1 to 10⁴ numbers, sorted from smallest to largest, with no repeats.', '-10⁴ < nums[i], target < 10⁴'],
    hints: [
      'Simplest: check every item from the left. That is O(n), and it ignores the one thing you know: nums is sorted.',
      {
        python: 'Faster: keep lo and hi as the range that could still hold target, and look at mid = (lo + hi) // 2.',
        javascript: 'Faster: keep lo and hi as the range that could still hold target, and look at mid = Math.floor((lo + hi) / 2).',
      },
      'If nums[mid] is too small, the answer is to the right: lo = mid + 1. Too big: hi = mid - 1.',
    ],
    complexity: { time: 'O(log n)', space: 'O(1)', why: 'Each look throws away half of what is left, so 10,000 numbers take at most 14 looks. Doubling n adds just one more look: that is log n.' },
    speed: SPEED.search,
    concepts: { python: ['binary-search', 'while', 'math'], javascript: ['binary-search', 'while', 'math'] },
    functionName: 'search',
    starters: {
      python: `def search(nums, target):
    lo, hi = 0, len(nums) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        # found it? otherwise throw away half
        break
    return -1
`,
      javascript: `function search(nums, target) {
  let lo = 0
  let hi = nums.length - 1
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2)
    // found it? otherwise throw away half
    break
  }
  return -1
}
`,
    },
    tests: [
      { args: [[-1, 0, 3, 5, 9, 12], 9], expected: 4 },
      { args: [[-1, 0, 3, 5, 9, 12], 2], expected: -1 },
      { args: [[1, 3, 5, 7, 9, 11, 13, 15], 3], expected: 1 },
      { args: [[5], 5], expected: 0 },
    ],
  },
  {
    id: 'merge-sorted',
    title: 'Merge Two Sorted Arrays',
    difficulty: 'Easy',
    topic: 'two-pointers',
    statement: [
      {
        python: 'a and b are each sorted from smallest to largest. Return one sorted list with every number from both, without calling sorted().',
        javascript: 'a and b are each sorted from smallest to largest. Return one sorted array with every number from both, without calling sort().',
      },
    ],
    constraints: ['a and b each have 0 to 10⁴ numbers, sorted from smallest to largest.'],
    hints: [
      {
        python: 'Simplest: join the lists and sort them. That is O(n log n), and it wastes the fact that both are already sorted.',
        javascript: 'Simplest: join the arrays and sort them. That is O(n log n), and it wastes the fact that both are already sorted.',
      },
      'Faster: keep an index i into a and j into b. Take whichever of a[i] and b[j] is smaller.',
      {
        python: 'When one list runs out, add the rest of the other.',
        javascript: 'When one array runs out, add the rest of the other: out.push(...a.slice(i)).',
      },
    ],
    complexity: {
      time: 'O(n)',
      space: 'O(1)',
      why: 'Here n is the length of a and b together. Every number is taken once. Apart from the output, only i and j are kept.',
    },
    concepts: { python: ['two-pointers', 'lists', 'slicing'], javascript: ['two-pointers', 'lists', 'slicing', 'spread'] },
    functionName: 'merge',
    starters: {
      python: `def merge(a, b):
    i, j = 0, 0
    out = []
    while i < len(a) and j < len(b):
        # take the smaller one
        break
    return out
`,
      javascript: `function merge(a, b) {
  let i = 0
  let j = 0
  const out = []
  while (i < a.length && j < b.length) {
    // take the smaller one
    break
  }
  return out
}
`,
    },
    tests: [
      { args: [[1, 4, 7], [2, 3, 8]], expected: [1, 2, 3, 4, 7, 8] },
      { args: [[], [1, 2]], expected: [1, 2] },
      { args: [[1, 1, 5], [1, 6]], expected: [1, 1, 1, 5, 6] },
    ],
  },
  {
    id: 'climbing-stairs',
    title: 'Climbing Stairs',
    difficulty: 'Easy',
    topic: 'dp-1d',
    statement: [
      'You climb a staircase of n steps, taking 1 or 2 steps at a time. Return how many different ways you can reach the top.',
    ],
    constraints: ['1 ≤ n ≤ 45'],
    hints: [
      'Simplest: recursion. ways(n) = ways(n - 1) + ways(n - 2), and there is 1 way to stand on step 0 or step 1. Without remembering answers it works the same steps out again and again: about 2ⁿ calls.',
      'Faster: to land on step i you came from step i - 1 or step i - 2, so work the answers out from the bottom up, each one once.',
      {
        python: 'Fill a list where ways[i] = ways[i - 1] + ways[i - 2].',
        javascript: 'Fill an array where ways[i] = ways[i - 1] + ways[i - 2].',
      },
    ],
    complexity: {
      time: 'O(n)',
      space: 'O(n)',
      why: {
        python: 'Each step is worked out once from the two before it. The ways list holds n + 1 numbers. Keeping only the last two in variables would make the space O(1).',
        javascript: 'Each step is worked out once from the two before it. The ways array holds n + 1 numbers. Keeping only the last two in variables would make the space O(1).',
      },
    },
    speed: SPEED.climbStairs,
    concepts: { python: ['recursion', 'memoization', 'lists'], javascript: ['recursion', 'memoization', 'lists'] },
    functionName: 'climbStairs',
    starters: {
      python: `def climbStairs(n):
    ways = [1, 1]  # ways to stand on step 0 and step 1
    for i in range(2, n + 1):
        ways.append(0)  # replace 0: how many ways to reach step i?
    return ways[n]
`,
      javascript: `function climbStairs(n) {
  const ways = [1, 1] // ways to stand on step 0 and step 1
  for (let i = 2; i <= n; i++) {
    ways.push(0) // replace 0: how many ways to reach step i?
  }
  return ways[n]
}
`,
    },
    tests: [
      { args: [1], expected: 1 },
      { args: [2], expected: 2 },
      { args: [3], expected: 3 },
      { args: [5], expected: 8 },
    ],
  },
  {
    id: 'max-subarray',
    title: 'Maximum Subarray',
    difficulty: 'Medium',
    topic: 'dp-1d',
    statement: [
      'Return the largest sum of any run of one or more neighboring numbers in nums.',
      'For [-2, 1, -3, 4, -1, 2, 1, -5, 4] the best run is [4, -1, 2, 1], which sums to 6.',
    ],
    constraints: ['nums has 1 to 10⁵ numbers', '-10⁴ ≤ nums[i] ≤ 10⁴'],
    hints: [
      'Simplest: try every start, and from each start move the end right while keeping a running sum. O(n²).',
      'Faster: keep current, the best sum of a run that ends right here.',
      {
        python: 'At each number, either extend the run or start fresh: current = max(n, current + n). Track the best current you ever see.',
        javascript: 'At each number, either extend the run or start fresh: current = Math.max(n, current + n). Track the best current you ever see.',
      },
    ],
    complexity: { time: 'O(n)', space: 'O(1)', why: 'One pass, deciding at each number whether to extend or start over. Only current and best are kept. (This is Kadane\'s algorithm.)' },
    speed: SPEED.maxSubArray,
    concepts: { python: ['running-best', 'min-max-sum'], javascript: ['running-best', 'min-max-sum'] },
    functionName: 'maxSubArray',
    starters: {
      python: `def maxSubArray(nums):
    pass
`,
      javascript: `function maxSubArray(nums) {

}
`,
    },
    tests: [
      { args: [[-2, 1, -3, 4, -1, 2, 1, -5, 4]], expected: 6 },
      { args: [[1]], expected: 1 },
      { args: [[5, 4, -1, 7, 8]], expected: 23 },
      { args: [[-3, -1, -2]], expected: -1 },
    ],
  },
  {
    id: 'longest-substring',
    title: 'Longest Substring Without Repeats',
    difficulty: 'Medium',
    topic: 'sliding-window',
    statement: [
      'Return the length of the longest stretch of s where no character appears twice.',
    ],
    constraints: ['s has 0 to 5 × 10⁴ characters', 'Letters, digits, symbols and spaces.'],
    hints: [
      {
        python: 'Simplest: from every start, extend right until a character repeats, keeping a set of what the stretch holds. That is O(n · k), where k is how many different characters there are.',
        javascript: 'Simplest: from every start, extend right until a character repeats, keeping a Set of what the stretch holds. That is O(n · k), where k is how many different characters there are.',
      },
      'Faster: use a window from left to right. Grow it by moving right one character at a time.',
      'Remember where you last saw each character. If it is inside the window, move left just past it.',
    ],
    complexity: {
      time: 'O(n)',
      space: 'O(k)',
      extra: ['O(k)'],
      why: {
        python: 'right moves n times and left only ever moves forward, so each character enters and leaves the window once. The dict holds one entry per different character: k of them, at most about 100 here.',
        javascript: 'right moves n times and left only ever moves forward, so each character enters and leaves the window once. The Map holds one entry per different character: k of them, at most about 100 here.',
      },
    },
    speed: SPEED.lengthOfLongestSubstring,
    concepts: { python: ['sliding-window', 'dicts', 'running-best'], javascript: ['sliding-window', 'dicts', 'running-best'] },
    functionName: 'lengthOfLongestSubstring',
    starters: {
      python: `def lengthOfLongestSubstring(s):
    pass
`,
      javascript: `function lengthOfLongestSubstring(s) {

}
`,
    },
    tests: [
      { args: ['abcabcbb'], expected: 3 },
      { args: ['bbbbb'], expected: 1 },
      { args: ['pwwkew'], expected: 3 },
      { args: [''], expected: 0 },
      { args: ['abba'], expected: 2 },
    ],
  },
  {
    id: 'group-anagrams',
    title: 'Group Anagrams',
    difficulty: 'Medium',
    topic: 'hashing',
    statement: [
      'Group the words in strs that are anagrams of each other. Keep the words in each group in the order they appear in strs; the groups themselves can come in any order.',
    ],
    constraints: ['strs has 1 to 10⁴ words', 'Each word has 0 to 100 lowercase letters.'],
    hints: [
      'Simplest: for each word, compare it with the first word of every group so far, and add it where it matches. Comparing against every group is O(n²) comparisons.',
      {
        python: 'Faster: two words are anagrams when their sorted letters match: "".join(sorted(word)). That makes a key you can look up.',
        javascript: 'Faster: two words are anagrams when their sorted letters match: [...word].sort().join(""). That makes a key you can look up.',
      },
      {
        python: 'Use that as a dict key and append each word to its list.',
        javascript: 'Use that as a Map key and push each word onto its array, making the array the first time a key shows up.',
      },
    ],
    complexity: {
      time: 'O(n·k log k)',
      space: 'O(n·k)',
      extra: ['O(n·k log k)', 'O(n·k)'],
      why: {
        python: 'n is the number of words and k the longest word. Each word is sorted once (k log k) and looked up once. The dict ends up holding every word.',
        javascript: 'n is the number of words and k the longest word. Each word is sorted once (k log k) and looked up once. The Map ends up holding every word.',
      },
    },
    speed: SPEED.groupAnagrams,
    concepts: { python: ['dicts', 'sorting', 'string-methods', 'defaultdict'], javascript: ['dicts', 'sorting', 'string-methods', 'group-by'] },
    functionName: 'groupAnagrams',
    starters: {
      python: `def groupAnagrams(strs):
    pass
`,
      javascript: `function groupAnagrams(strs) {

}
`,
    },
    tests: [
      {
        args: [['eat', 'tea', 'tan', 'ate', 'nat', 'bat']],
        expected: [['eat', 'tea', 'ate'], ['tan', 'nat'], ['bat']],
        unordered: true,
      },
      { args: [['']], expected: [['']], unordered: true },
      { args: [['a']], expected: [['a']], unordered: true },
    ],
  },
]

export const PROBLEMS: Problem[] = [...FIRST, ...PATTERNS, ...LINKED, ...GRAPHS, ...ADVANCED]
