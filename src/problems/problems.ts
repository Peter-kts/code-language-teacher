import type { Language } from '../types'

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

export interface Problem {
  id: string
  title: string
  difficulty: Difficulty
  /** Paragraphs of the problem statement. */
  statement: Text[]
  /** Revealed one at a time, so the learner can ask for just a nudge. */
  hints: Text[]
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

// Listed in the order they're meant to be tried; the picker groups them by difficulty.
export const PROBLEMS: Problem[] = [
  {
    id: 'fizzbuzz',
    title: 'FizzBuzz',
    difficulty: 'Warm-up',
    statement: [
      {
        python:
          'Return a list of strings for the numbers 1 to n. Use "Fizz" for multiples of 3, "Buzz" for multiples of 5, "FizzBuzz" for multiples of both, and the number itself (as a string) otherwise.',
        javascript:
          'Return an array of strings for the numbers 1 to n. Use "Fizz" for multiples of 3, "Buzz" for multiples of 5, "FizzBuzz" for multiples of both, and the number itself (as a string) otherwise.',
      },
    ],
    hints: [
      { python: 'n % 3 == 0 is True when n is a multiple of 3.', javascript: 'i % 3 === 0 is true when i is a multiple of 3.' },
      {
        python: 'Check "multiple of both" first: a number divisible by 15 is also divisible by 3, so the order of your if/elif matters.',
        javascript: 'Check "multiple of both" first: a number divisible by 15 is also divisible by 3, so the order of your if/else if matters. String(i) turns the number into text.',
      },
    ],
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
    statement: [
      {
        python: 'Given a non-empty list of integers nums, return the largest one. Try it without using max(), so you can watch the best value change.',
        javascript:
          'Given a non-empty array of integers nums, return the largest one. Try it without using Math.max(), so you can watch the best value change.',
      },
    ],
    hints: [
      'Start with best = nums[0], then look at every number.',
      'Only replace best when the number you are looking at is bigger.',
    ],
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
    statement: [
      {
        python: 'Given a list nums, return a new list where each item is the sum of nums up to and including that position.',
        javascript: 'Given an array nums, return a new array where each item is the sum of nums up to and including that position.',
      },
      'For [1, 2, 3, 4] the answer is [1, 3, 6, 10].',
    ],
    hints: [
      {
        python: 'Keep a total that grows by each number, and append the total after each step.',
        javascript: 'Keep a total that grows by each number, and push the total after each step.',
      },
    ],
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
    statement: [
      {
        python: 'Reverse the list nums without making a new list, then return it. Try it without nums.reverse() or slicing.',
        javascript: 'Reverse the array nums without making a new array, then return it. Try it without nums.reverse().',
      },
    ],
    hints: [
      {
        python: 'Put one pointer at the start and one at the end, and swap what they point at: a, b = b, a.',
        javascript: 'Put one pointer at the start and one at the end, and swap what they point at: [a, b] = [b, a].',
      },
      'Move them toward each other and stop when they meet.',
    ],
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
    statement: [
      {
        python: 'Given a list of integers nums and an integer target, return the indexes of the two numbers that add up to target.',
        javascript: 'Given an array of integers nums and an integer target, return the indexes of the two numbers that add up to target, as an array.',
      },
      'Each input has exactly one solution, and you may not use the same element twice. Return the two indexes in any order.',
    ],
    hints: [
      'For each number, the partner you need is target - num.',
      {
        python: 'A dict that remembers numbers you have already seen (number → index) can find the partner in one pass.',
        javascript: 'A Map that remembers numbers you have already seen (number → index) can find the partner in one pass: seen.has(need), then seen.get(need).',
      },
    ],
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
    statement: [
      {
        python: 'Return True if the string t uses exactly the same letters as s, the same number of times each, and False otherwise.',
        javascript: 'Return true if the string t uses exactly the same letters as s, the same number of times each, and false otherwise.',
      },
    ],
    hints: [
      { python: 'Count the letters of s in a dict.', javascript: 'Count the letters of s in a Map: counts.set(ch, (counts.get(ch) ?? 0) + 1).' },
      {
        python: 'Then go through t and count each letter back down. Any letter that goes below zero, or is missing, means False.',
        javascript: 'Then go through t and count each letter back down. Any letter that goes below zero, or is missing, means false.',
      },
    ],
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
    statement: [
      {
        python: 'Given a string s of the characters ( ) [ ] { }, return True if every bracket is closed by the same kind of bracket in the right order.',
        javascript: 'Given a string s of the characters ( ) [ ] { }, return true if every bracket is closed by the same kind of bracket in the right order.',
      },
    ],
    hints: [
      {
        python: 'Push each opening bracket onto a stack (a list you append to).',
        javascript: 'Push each opening bracket onto a stack (an array you push to and pop from).',
      },
      'When you see a closing bracket, the top of the stack must be its partner. At the end the stack must be empty.',
    ],
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
    statement: [
      'prices[i] is the price of a stock on day i. Buy on one day and sell on a later day. Return the most profit you can make, or 0 if no trade makes money.',
    ],
    hints: [
      'As you walk through the days, remember the lowest price so far.',
      'Each day, selling today would earn price - lowest. Keep the best of those.',
    ],
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
    statement: [
      'Move every 0 in nums to the end, keeping the other numbers in their original order. Change nums in place and return it.',
    ],
    hints: [
      'Use a slow pointer for "where the next non-zero goes" and a fast pointer that reads every item.',
      'When fast finds a non-zero, swap it with slow and move slow forward.',
    ],
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
    statement: [
      'nums is sorted from smallest to largest. Return the index of target, or -1 if it is not there. Look at as few items as you can.',
    ],
    hints: [
      {
        python: 'Keep lo and hi as the range that could still hold target, and look at mid = (lo + hi) // 2.',
        javascript: 'Keep lo and hi as the range that could still hold target, and look at mid = Math.floor((lo + hi) / 2).',
      },
      'If nums[mid] is too small, the answer is to the right: lo = mid + 1. Too big: hi = mid - 1.',
    ],
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
    title: 'Merge Two Sorted Lists',
    difficulty: 'Easy',
    statement: [
      {
        python: 'a and b are each sorted from smallest to largest. Return one sorted list with every number from both, without calling sorted().',
        javascript: 'a and b are each sorted from smallest to largest. Return one sorted array with every number from both, without calling sort().',
      },
    ],
    hints: [
      'Keep an index i into a and j into b. Take whichever of a[i] and b[j] is smaller.',
      {
        python: 'When one list runs out, add the rest of the other.',
        javascript: 'When one array runs out, add the rest of the other: out.push(...a.slice(i)).',
      },
    ],
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
    statement: [
      'You climb a staircase of n steps, taking 1 or 2 steps at a time. Return how many different ways you can reach the top.',
    ],
    hints: [
      'To land on step i you came from step i - 1 or step i - 2, so ways(i) = ways(i - 1) + ways(i - 2).',
      {
        python: 'A recursive version shows the calls piling up; filling a list from the bottom is much faster.',
        javascript: 'A recursive version shows the calls piling up; filling an array from the bottom is much faster.',
      },
    ],
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
    statement: [
      'Return the largest sum of any run of one or more neighboring numbers in nums.',
      'For [-2, 1, -3, 4, -1, 2, 1, -5, 4] the best run is [4, -1, 2, 1], which sums to 6.',
    ],
    hints: [
      'Keep current, the best sum of a run that ends right here.',
      {
        python: 'At each number, either extend the run or start fresh: current = max(n, current + n). Track the best current you ever see.',
        javascript: 'At each number, either extend the run or start fresh: current = Math.max(n, current + n). Track the best current you ever see.',
      },
    ],
    concepts: { python: ['running-best', 'min-max-sum'], javascript: ['running-best', 'min-max-sum'] },
    functionName: 'maxSubArray',
    starters: {
      python: `def maxSubArray(nums):
    current = nums[0]
    best = nums[0]
    for n in nums[1:]:
        # extend the run or start over?
        pass
    return best
`,
      javascript: `function maxSubArray(nums) {
  let current = nums[0]
  let best = nums[0]
  for (const n of nums.slice(1)) {
    // extend the run or start over?
  }
  return best
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
    statement: [
      'Return the length of the longest stretch of s where no character appears twice.',
    ],
    hints: [
      'Use a window from left to right. Grow it by moving right one character at a time.',
      'Remember where you last saw each character. If it is inside the window, move left just past it.',
    ],
    concepts: { python: ['sliding-window', 'dicts', 'running-best'], javascript: ['sliding-window', 'dicts', 'running-best'] },
    functionName: 'lengthOfLongestSubstring',
    starters: {
      python: `def lengthOfLongestSubstring(s):
    last = {}
    left = 0
    best = 0
    for right, ch in enumerate(s):
        # move left if ch is already in the window
        pass
    return best
`,
      javascript: `function lengthOfLongestSubstring(s) {
  const last = new Map()
  let left = 0
  let best = 0
  for (let right = 0; right < s.length; right++) {
    const ch = s[right]
    // move left if ch is already in the window
  }
  return best
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
    statement: [
      'Group the words in strs that are anagrams of each other. Keep the words in each group in the order they appear in strs; the groups themselves can come in any order.',
    ],
    hints: [
      {
        python: 'Two words are anagrams when their sorted letters match: "".join(sorted(word)).',
        javascript: 'Two words are anagrams when their sorted letters match: [...word].sort().join("").',
      },
      {
        python: 'Use that as a dict key and append each word to its list.',
        javascript: 'Use that as a Map key and push each word onto its array, making the array the first time a key shows up.',
      },
    ],
    concepts: { python: ['dicts', 'sorting', 'string-methods', 'defaultdict'], javascript: ['dicts', 'sorting', 'string-methods', 'group-by'] },
    functionName: 'groupAnagrams',
    starters: {
      python: `def groupAnagrams(strs):
    groups = {}
    for word in strs:
        key = "".join(sorted(word))
        # add word to its group
        pass
    return list(groups.values())
`,
      javascript: `function groupAnagrams(strs) {
  const groups = new Map()
  for (const word of strs) {
    const key = [...word].sort().join("")
    // add word to its group
  }
  return [...groups.values()]
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
