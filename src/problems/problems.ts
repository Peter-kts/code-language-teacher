export interface TestCase {
  args: unknown[]
  expected: unknown
  /** Accept the answer in any order (e.g. a pair of indexes). */
  unordered?: boolean
}

export type Difficulty = 'Warm-up' | 'Easy' | 'Medium' | 'Hard'

export const DIFFICULTIES: Difficulty[] = ['Warm-up', 'Easy', 'Medium', 'Hard']

export interface Problem {
  id: string
  title: string
  difficulty: Difficulty
  /** Paragraphs of the problem statement. */
  statement: string[]
  /** Revealed one at a time, so the learner can ask for just a nudge. */
  hints: string[]
  /** Ids of the glossary entries (src/syntax/cards.ts) this problem practices. */
  concepts: string[]
  functionName: string
  starter: string
  tests: TestCase[]
}

// Listed in the order they're meant to be tried; the picker groups them by difficulty.
export const PROBLEMS: Problem[] = [
  {
    id: 'fizzbuzz',
    title: 'FizzBuzz',
    difficulty: 'Warm-up',
    statement: [
      'Return a list of strings for the numbers 1 to n. Use "Fizz" for multiples of 3, "Buzz" for multiples of 5, "FizzBuzz" for multiples of both, and the number itself (as a string) otherwise.',
    ],
    hints: [
      'n % 3 == 0 is True when n is a multiple of 3.',
      'Check "multiple of both" first: a number divisible by 15 is also divisible by 3, so the order of your if/elif matters.',
    ],
    concepts: ['range', 'math', 'if-elif-else', 'lists'],
    functionName: 'fizzBuzz',
    starter: `def fizzBuzz(n):
    out = []
    for i in range(1, n + 1):
        # decide what to append for i
        pass
    return out
`,
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
      'Given a non-empty list of integers nums, return the largest one. Try it without using max(), so you can watch the best value change.',
    ],
    hints: [
      'Start with best = nums[0], then look at every number.',
      'Only replace best when the number you are looking at is bigger.',
    ],
    concepts: ['for-list', 'comparisons', 'running-best'],
    functionName: 'findMax',
    starter: `def findMax(nums):
    best = nums[0]
    for n in nums:
        # is n better than best?
        pass
    return best
`,
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
      'Given a list nums, return a new list where each item is the sum of nums up to and including that position.',
      'For [1, 2, 3, 4] the answer is [1, 3, 6, 10].',
    ],
    hints: ['Keep a total that grows by each number, and append the total after each step.'],
    concepts: ['augmented', 'lists', 'prefix-sum'],
    functionName: 'runningSum',
    starter: `def runningSum(nums):
    total = 0
    out = []
    for n in nums:
        # grow total, then remember it
        pass
    return out
`,
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
      'Reverse the list nums without making a new list, then return it. Try it without nums.reverse() or slicing.',
    ],
    hints: [
      'Put one pointer at the start and one at the end, and swap what they point at.',
      'Move them toward each other and stop when they meet.',
    ],
    concepts: ['two-pointers', 'tuples', 'while'],
    functionName: 'reverseList',
    starter: `def reverseList(nums):
    l, r = 0, len(nums) - 1
    while l < r:
        # swap, then move both pointers
        break
    return nums
`,
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
      'Given a list of integers nums and an integer target, return the indexes of the two numbers that add up to target.',
      'Each input has exactly one solution, and you may not use the same element twice. Return the two indexes in any order.',
    ],
    hints: [
      'For each number, the partner you need is target - num.',
      'A dict that remembers numbers you have already seen (number → index) can find the partner in one pass.',
    ],
    concepts: ['dicts', 'for-index', 'hash-map-lookup'],
    functionName: 'twoSum',
    starter: `def twoSum(nums, target):
    seen = {}
    for i, num in enumerate(nums):
        # what number would pair with num?
        pass
`,
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
      'Return True if the string t uses exactly the same letters as s, the same number of times each, and False otherwise.',
    ],
    hints: [
      'Count the letters of s in a dict.',
      'Then go through t and count each letter back down. Any letter that goes below zero, or is missing, means False.',
    ],
    concepts: ['dicts', 'strings', 'counting'],
    functionName: 'isAnagram',
    starter: `def isAnagram(s, t):
    if len(s) != len(t):
        return False
    counts = {}
    for ch in s:
        # count ch
        pass
    return True
`,
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
      'Given a string s of the characters ( ) [ ] { }, return True if every bracket is closed by the same kind of bracket in the right order.',
    ],
    hints: [
      'Push each opening bracket onto a stack (a list you append to).',
      'When you see a closing bracket, the top of the stack must be its partner. At the end the stack must be empty.',
    ],
    concepts: ['stack', 'dicts', 'truthiness'],
    functionName: 'isValid',
    starter: `def isValid(s):
    pairs = {")": "(", "]": "[", "}": "{"}
    stack = []
    for ch in s:
        # opening: push it. closing: check the top
        pass
    return not stack
`,
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
    concepts: ['running-best', 'min-max-sum'],
    functionName: 'maxProfit',
    starter: `def maxProfit(prices):
    lowest = prices[0]
    profit = 0
    for p in prices:
        # update lowest and profit
        pass
    return profit
`,
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
    concepts: ['slow-fast', 'tuples', 'for-index'],
    functionName: 'moveZeroes',
    starter: `def moveZeroes(nums):
    slow = 0
    for fast in range(len(nums)):
        # found a non-zero? put it at slow
        pass
    return nums
`,
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
      'Keep lo and hi as the range that could still hold target, and look at mid = (lo + hi) // 2.',
      'If nums[mid] is too small, the answer is to the right: lo = mid + 1. Too big: hi = mid - 1.',
    ],
    concepts: ['binary-search', 'while', 'math'],
    functionName: 'search',
    starter: `def search(nums, target):
    lo, hi = 0, len(nums) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        # found it? otherwise throw away half
        break
    return -1
`,
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
      'a and b are each sorted from smallest to largest. Return one sorted list with every number from both, without calling sorted().',
    ],
    hints: [
      'Keep an index i into a and j into b. Take whichever of a[i] and b[j] is smaller.',
      'When one list runs out, add the rest of the other.',
    ],
    concepts: ['two-pointers', 'lists', 'slicing'],
    functionName: 'merge',
    starter: `def merge(a, b):
    i, j = 0, 0
    out = []
    while i < len(a) and j < len(b):
        # take the smaller one
        break
    return out
`,
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
      'A recursive version shows the calls piling up; filling a list from the bottom is much faster.',
    ],
    concepts: ['recursion', 'memoization', 'lists'],
    functionName: 'climbStairs',
    starter: `def climbStairs(n):
    ways = [1, 1]  # ways to stand on step 0 and step 1
    for i in range(2, n + 1):
        ways.append(0)  # replace 0: how many ways to reach step i?
    return ways[n]
`,
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
      'At each number, either extend the run or start fresh: current = max(n, current + n). Track the best current you ever see.',
    ],
    concepts: ['running-best', 'min-max-sum'],
    functionName: 'maxSubArray',
    starter: `def maxSubArray(nums):
    current = nums[0]
    best = nums[0]
    for n in nums[1:]:
        # extend the run or start over?
        pass
    return best
`,
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
    concepts: ['sliding-window', 'dicts', 'running-best'],
    functionName: 'lengthOfLongestSubstring',
    starter: `def lengthOfLongestSubstring(s):
    last = {}
    left = 0
    best = 0
    for right, ch in enumerate(s):
        # move left if ch is already in the window
        pass
    return best
`,
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
      'Two words are anagrams when their sorted letters match: "".join(sorted(word)).',
      'Use that as a dict key and append each word to its list.',
    ],
    concepts: ['dicts', 'sorting', 'string-methods', 'defaultdict'],
    functionName: 'groupAnagrams',
    starter: `def groupAnagrams(strs):
    groups = {}
    for word in strs:
        key = "".join(sorted(word))
        # add word to its group
        pass
    return list(groups.values())
`,
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
