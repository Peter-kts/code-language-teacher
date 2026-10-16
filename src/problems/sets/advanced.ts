import { randomInts, randomString } from '../big'
import type { Problem, SpeedTest } from '../problems'

// The advanced set: heaps, 2D dynamic programming and a few hard classics.

/**
 * JavaScript has no built-in heap, so the JavaScript starters of heap problems (and the worked
 * answers) carry this small one. Its lines are the learner's code, so they count as steps.
 */
export const MIN_HEAP = `// Python has heapq built in. JavaScript doesn't, so here is a small heap to use.
class MinHeap {
  constructor(less = (a, b) => a < b) {
    this.items = []
    this.less = less
  }
  get size() {
    return this.items.length
  }
  peek() {
    return this.items[0]
  }
  push(x) {
    const a = this.items
    a.push(x)
    let i = a.length - 1
    while (i > 0) {
      const parent = Math.floor((i - 1) / 2)
      if (!this.less(a[i], a[parent])) break
      ;[a[i], a[parent]] = [a[parent], a[i]]
      i = parent
    }
  }
  pop() {
    const a = this.items
    const top = a[0]
    const last = a.pop()
    if (a.length > 0) {
      a[0] = last
      let i = 0
      while (true) {
        const l = 2 * i + 1
        const r = 2 * i + 2
        let smallest = i
        if (l < a.length && this.less(a[l], a[smallest])) smallest = l
        if (r < a.length && this.less(a[r], a[smallest])) smallest = r
        if (smallest === i) break
        ;[a[i], a[smallest]] = [a[smallest], a[i]]
        i = smallest
      }
    }
    return top
  }
}
`

const LIST_NODE_PY = `# class ListNode:
#     def __init__(self, val=0, next=None):
#         self.val = val
#         self.next = next
`

const LIST_NODE_JS = `// class ListNode {
//   constructor(val = 0, next = null) {
//     this.val = val
//     this.next = next
//   }
// }
`

// Speed inputs. Each is big enough that the slow answer from the first hint runs out of
// steps, while the worked answer uses under half (reference.test.ts checks both languages).

const kthNums = randomInts(2000, -10_000, 10_000, 31)
const kthK = 1000

/** The k-th largest, by sorting. */
const kthLargest = (nums: number[], k: number) => [...nums].sort((a, b) => b - a)[k - 1]

function lcs(a: string, b: string) {
  const dp = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0))
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1])
    }
  }
  return dp[a.length][b.length]
}

function editDistance(a: string, b: string) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)))
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    }
  }
  return dp[a.length][b.length]
}

const lcsA = randomString(20, 'abcdefgh', 32)
const lcsB = randomString(20, 'abcdefgh', 33)
const editA = randomString(20, 'abcdefgh', 34)
const editB = randomString(20, 'abcdefgh', 35)

const rain = randomInts(5000, 0, 10_000, 36)

function trapped(h: number[]) {
  let water = 0
  const right = new Array<number>(h.length).fill(0)
  for (let i = h.length - 2; i >= 0; i--) right[i] = Math.max(right[i + 1], h[i + 1])
  let left = 0
  for (let i = 0; i < h.length; i++) {
    water += Math.max(0, Math.min(left, right[i]) - h[i])
    left = Math.max(left, h[i])
  }
  return water
}

const bars = randomInts(5000, 0, 10_000, 37)

function largestRectangle(h: number[]) {
  const stack: number[] = []
  let best = 0
  for (let i = 0; i <= h.length; i++) {
    const height = i < h.length ? h[i] : 0
    while (stack.length && h[stack[stack.length - 1]] >= height) {
      const j = stack.pop()!
      const left = stack.length ? stack[stack.length - 1] + 1 : 0
      best = Math.max(best, h[j] * (i - left))
    }
    stack.push(i)
  }
  return best
}

const K_LISTS = 200
const kLists = Array.from({ length: K_LISTS }, (_, i) => randomInts(10, -10_000, 10_000, 1000 + i).sort((a, b) => a - b))

const SPEED: Record<string, SpeedTest> = {
  findKthLargest: {
    args: [kthNums, kthK],
    expected: kthLargest(kthNums, kthK),
    maxSteps: 400_000,
    size: 'nums has 2,000 numbers and k is 1,000',
  },
  uniquePaths: { args: [15, 15], expected: 40_116_600, maxSteps: 3000, size: 'the grid is 15 × 15' },
  longestCommonSubsequence: {
    args: [lcsA, lcsB],
    expected: lcs(lcsA, lcsB),
    maxSteps: 8000,
    size: 'text1 and text2 have 20 letters each',
  },
  minDistance: {
    args: [editA, editB],
    expected: editDistance(editA, editB),
    maxSteps: 8000,
    size: 'word1 and word2 have 20 letters each',
  },
  trap: { args: [rain], expected: trapped(rain), maxSteps: 60_000, size: 'height has 5,000 bars' },
  largestRectangleArea: { args: [bars], expected: largestRectangle(bars), maxSteps: 100_000, size: 'heights has 5,000 bars' },
  mergeKLists: {
    args: [kLists],
    expected: kLists.flat().sort((a, b) => a - b),
    maxSteps: 500_000,
    size: 'lists has 200 linked lists of 10 nodes each',
  },
}

export const ADVANCED: Problem[] = [
  {
    id: 'last-stone-weight',
    title: 'Last Stone Weight',
    difficulty: 'Easy',
    topic: 'heaps',
    statement: [
      'You have a pile of stones, and stones[i] is the weight of stone i. Each turn, take the two heaviest stones and smash them together. If they weigh the same, both are destroyed. If not, the lighter one is destroyed and the heavier one loses the lighter one\'s weight.',
      'Keep going until at most one stone is left. Return its weight, or 0 if no stones are left.',
    ],
    constraints: ['stones has 1 to 30 stones', '1 ≤ stones[i] ≤ 1000'],
    hints: [
      {
        python: 'Simplest: sort the stones every turn and take the last two. Sorting each turn costs O(n log n), so the whole game is O(n² log n).',
        javascript: 'Simplest: sort the stones every turn and take the last two. Sorting each turn costs O(n log n), so the whole game is O(n² log n).',
      },
      {
        python: 'Faster: a heap hands you the biggest item quickly. heapq is a min heap (it pops the smallest), so store each weight as a negative number.',
        javascript: 'Faster: a heap hands you the biggest item quickly. The starter\'s heap is built with (a, b) => a > b, so it pops the biggest first.',
      },
      {
        python: 'Each turn, heappop two weights. If they differ, heappush the difference back (as a negative number again).',
        javascript: 'Each turn, pop two weights. If they differ, push back the difference.',
      },
    ],
    complexity: {
      time: 'O(n log n)',
      space: 'O(n)',
      why: 'Each turn removes at least one stone, so there are at most n turns, and taking a stone out of the heap or putting one in takes about log n steps. The heap holds every stone.',
    },
    concepts: { python: ['heap', 'heapq', 'while', 'list-comprehension'], javascript: ['heap', 'classes', 'while'] },
    functionName: 'lastStoneWeight',
    starters: {
      python: `import heapq

def lastStoneWeight(stones):
    heap = [-s for s in stones]  # negative weights: heapq pops the smallest first
    heapq.heapify(heap)
    while len(heap) > 1:
        # pop the two heaviest and smash them
        break
    return -heap[0] if heap else 0
`,
      javascript: `${MIN_HEAP}
function lastStoneWeight(stones) {
  const heap = new MinHeap((a, b) => a > b) // reversed, so the heaviest comes out first
  for (const s of stones) heap.push(s)
  while (heap.size > 1) {
    // pop the two heaviest and smash them
    break
  }
  return heap.size > 0 ? heap.peek() : 0
}
`,
    },
    tests: [
      { args: [[2, 7, 4, 1, 8, 1]], expected: 1 },
      { args: [[1]], expected: 1 },
      { args: [[3, 3]], expected: 0 },
      { args: [[10, 4, 2, 10]], expected: 2 },
    ],
  },
  {
    id: 'kth-largest',
    title: 'Kth Largest Element in an Array',
    difficulty: 'Medium',
    topic: 'heaps',
    statement: [
      'Return the k-th largest number in nums. That is the k-th one when nums is in order from largest to smallest, so repeats count: in [3, 3, 1] the 2nd largest is 3.',
    ],
    constraints: ['1 ≤ k ≤ length of nums ≤ 10⁵', '-10⁴ ≤ nums[i] ≤ 10⁴'],
    hints: [
      'Simplest: find the largest number, take it out, and do that k - 1 times; then the largest one left is the answer. Each pass looks at every number: O(n·k), which is O(n²) when k is about n / 2.',
      {
        python: 'Faster: sorting works in O(n log n). A heap can do better: keep a min heap of the k largest numbers seen so far.',
        javascript: 'Faster: sorting works in O(n log n). A heap can do better: keep a min heap (the starter\'s MinHeap) of the k largest numbers seen so far.',
      },
      'Add each number to the heap. When it holds more than k, take out the smallest. At the end, the smallest in the heap is the k-th largest.',
    ],
    complexity: {
      time: 'O(n log k)',
      space: 'O(k)',
      extra: ['O(n log k)', 'O(k)'],
      why: 'Every number goes into the heap once, and the heap never holds more than k + 1 numbers, so putting one in or taking one out takes about log k steps. n is the length of nums.',
    },
    speed: SPEED.findKthLargest,
    concepts: { python: ['heap', 'heapq', 'sorting'], javascript: ['heap', 'classes', 'sorting'] },
    functionName: 'findKthLargest',
    starters: {
      python: `import heapq

def findKthLargest(nums, k):
    pass
`,
      javascript: `${MIN_HEAP}
function findKthLargest(nums, k) {

}
`,
    },
    tests: [
      { args: [[3, 2, 1, 5, 6, 4], 2], expected: 5 },
      { args: [[3, 2, 3, 1, 2, 4, 5, 5, 6], 4], expected: 4 },
      { args: [[7], 1], expected: 7 },
      { args: [[-1, -5, -3], 3], expected: -5 },
      { args: [[2, 2, 2, 1], 3], expected: 2 },
    ],
  },
  {
    id: 'top-k-frequent',
    title: 'Top K Frequent Elements',
    difficulty: 'Medium',
    topic: 'heaps',
    statement: [
      {
        python: 'Return the k numbers that appear most often in nums, as a list in any order.',
        javascript: 'Return the k numbers that appear most often in nums, as an array in any order.',
      },
      'The answer is always unique: there is never a tie for the last place.',
    ],
    constraints: ['nums has 1 to 10⁵ numbers', '-10⁴ ≤ nums[i] ≤ 10⁴', 'k is between 1 and the number of different values in nums.', 'Exactly one answer exists.'],
    hints: [
      {
        python: 'Simplest: count each number in a dict, then sort the different numbers by their count, most first, and take the first k. Sorting makes it O(n log n), which is fine here.',
        javascript: 'Simplest: count each number in a Map, then sort the different numbers by their count, most first, and take the first k. Sorting makes it O(n log n), which is fine here.',
      },
      'Faster: you only need the top k, not everything in order. Keep a min heap of at most k (count, number) pairs.',
      {
        python: 'heapq compares tuples by their first item, so heappush (count, number). When the heap holds more than k, heappop the smallest count.',
        javascript: 'Build the heap with (a, b) => a[0] < b[0] and push [count, number]. When it holds more than k, pop the smallest count.',
      },
    ],
    complexity: {
      time: 'O(n log k)',
      space: 'O(n)',
      extra: ['O(n log k)'],
      why: {
        python: 'Counting is one pass. Each different number goes through a heap of at most k items, which takes about log k steps. The counts dict can hold every number: O(n).',
        javascript: 'Counting is one pass. Each different number goes through a heap of at most k items, which takes about log k steps. The counts Map can hold every number: O(n).',
      },
    },
    concepts: { python: ['heap', 'heapq', 'counting', 'dicts', 'tuples'], javascript: ['heap', 'classes', 'counting', 'dicts'] },
    functionName: 'topKFrequent',
    starters: {
      python: `import heapq

def topKFrequent(nums, k):
    pass
`,
      javascript: `${MIN_HEAP}
function topKFrequent(nums, k) {

}
`,
    },
    tests: [
      { args: [[1, 1, 1, 2, 2, 3], 2], expected: [1, 2], unordered: true },
      { args: [[1], 1], expected: [1], unordered: true },
      { args: [[4, 4, -1, -1, -1, 7], 1], expected: [-1], unordered: true },
      { args: [[5, 3, 5, 2, 3, 5, 9, 3, 5], 2], expected: [5, 3], unordered: true },
      { args: [[6, 8, 6, 8], 2], expected: [6, 8], unordered: true },
    ],
  },
  {
    id: 'unique-paths',
    title: 'Unique Paths',
    difficulty: 'Medium',
    topic: 'dp-2d',
    statement: [
      'A robot starts in the top-left corner of a grid with m rows and n columns. It can only move right or down, one square at a time. Return how many different paths take it to the bottom-right corner.',
      'For a 3 × 2 grid there are 3 paths: right-down-down, down-right-down and down-down-right.',
    ],
    constraints: ['1 ≤ m, n ≤ 100', 'The answer is at most 2 × 10⁹.'],
    hints: [
      'Simplest: recursion. The paths to a square are the paths to the square above it plus the paths to the square on its left, and there is 1 path along the top row or left column. Without remembering answers it works the same squares out again and again: about 2^(m + n) calls.',
      {
        python: 'Faster: fill a table, a list of lists, one row at a time from the top, so each square is worked out once.',
        javascript: 'Faster: fill a table, an array of arrays, one row at a time from the top, so each square is worked out once.',
      },
      {
        python: 'Start every square at 1 with [[1] * n for _ in range(m)]. Then for every square not in the top row or left column, dp[r][c] = dp[r - 1][c] + dp[r][c - 1].',
        javascript: 'Start every square at 1 with Array.from({ length: m }, () => new Array(n).fill(1)). Then for every square not in the top row or left column, dp[r][c] = dp[r - 1][c] + dp[r][c - 1].',
      },
    ],
    complexity: {
      time: 'O(m·n)',
      space: 'O(m·n)',
      extra: ['O(m·n)'],
      why: 'Every one of the m × n squares is worked out once, from two squares already done, and the table keeps them all. Keeping just one row would make the space O(n).',
    },
    speed: SPEED.uniquePaths,
    concepts: { python: ['dp-table', 'recursion', 'memoization', 'nested-loops', 'list-comprehension'], javascript: ['dp-table', 'recursion', 'memoization', 'nested-loops'] },
    functionName: 'uniquePaths',
    starters: {
      python: `def uniquePaths(m, n):
    pass
`,
      javascript: `function uniquePaths(m, n) {

}
`,
    },
    tests: [
      { args: [3, 7], expected: 28 },
      { args: [3, 2], expected: 3 },
      { args: [1, 1], expected: 1 },
      { args: [1, 5], expected: 1 },
      { args: [4, 4], expected: 20 },
    ],
  },
  {
    id: 'longest-common-subsequence',
    title: 'Longest Common Subsequence',
    difficulty: 'Medium',
    topic: 'dp-2d',
    statement: [
      'Return the length of the longest subsequence that text1 and text2 have in common, or 0 if they share no letter.',
      'A subsequence keeps some of the letters in their order, but may skip any of them: "ace" is a subsequence of "abcde". So the answer for "abcde" and "ace" is 3.',
    ],
    constraints: ['text1 and text2 have 1 to 1,000 letters each', 'Only lowercase letters a to z.'],
    hints: [
      'Simplest: recursion on two positions i and j. If text1[i] and text2[j] match, take 1 plus the answer from i + 1, j + 1. If not, try skipping a letter of either one and keep the better. Without remembering answers that is about 2^(m + n) calls.',
      'Faster: the same (i, j) pairs come up again and again. There are only (m + 1) × (n + 1) of them, so work each out once in a table.',
      'Let dp[i][j] be the answer for the first i letters of text1 and the first j letters of text2. Row 0 and column 0 are 0. If the letters at i - 1 and j - 1 match, dp[i][j] = dp[i - 1][j - 1] + 1; otherwise it is the bigger of dp[i - 1][j] and dp[i][j - 1].',
    ],
    complexity: {
      time: 'O(m·n)',
      space: 'O(m·n)',
      extra: ['O(m·n)'],
      why: 'm and n are the lengths of text1 and text2. Each of the (m + 1) × (n + 1) squares of the table is filled once, from squares already filled.',
    },
    speed: SPEED.longestCommonSubsequence,
    concepts: { python: ['dp-table', 'recursion', 'memoization', 'strings', 'nested-loops'], javascript: ['dp-table', 'recursion', 'memoization', 'strings', 'nested-loops'] },
    functionName: 'longestCommonSubsequence',
    starters: {
      python: `def longestCommonSubsequence(text1, text2):
    pass
`,
      javascript: `function longestCommonSubsequence(text1, text2) {

}
`,
    },
    tests: [
      { args: ['abcde', 'ace'], expected: 3 },
      { args: ['abc', 'abc'], expected: 3 },
      { args: ['abc', 'def'], expected: 0 },
      { args: ['a', 'a'], expected: 1 },
      { args: ['bsbininm', 'jmjkbkjkv'], expected: 1 },
      { args: ['abcba', 'abcbcba'], expected: 5 },
    ],
  },
  {
    id: 'edit-distance',
    title: 'Edit Distance',
    difficulty: 'Medium',
    topic: 'dp-2d',
    statement: [
      'Return the fewest changes that turn word1 into word2. One change is inserting a letter, deleting a letter, or replacing one letter with another.',
      'For "horse" and "ros" the answer is 3: replace h with r (rorse), delete r (rose), delete e (ros).',
    ],
    constraints: ['word1 and word2 have 0 to 500 letters each', 'Only lowercase letters a to z.'],
    hints: [
      'Simplest: recursion on two positions i and j. If the letters match, move both on for free. If not, try all three changes (insert, delete, replace), each costing 1, and keep the cheapest. Without remembering answers that is about 3^(m + n) calls.',
      'Faster: the same (i, j) pairs come up again and again, so work each out once in a table of (m + 1) × (n + 1) squares.',
      'Let dp[i][j] be the answer for the first i letters of word1 and the first j letters of word2. dp[i][0] = i and dp[0][j] = j (delete or insert everything).',
      'If the letters at i - 1 and j - 1 match, dp[i][j] = dp[i - 1][j - 1]. Otherwise it is 1 plus the smallest of dp[i - 1][j] (delete), dp[i][j - 1] (insert) and dp[i - 1][j - 1] (replace).',
    ],
    complexity: {
      time: 'O(m·n)',
      space: 'O(m·n)',
      extra: ['O(m·n)'],
      why: 'm and n are the lengths of word1 and word2. Each square of the (m + 1) × (n + 1) table is filled once, from three squares already filled.',
    },
    speed: SPEED.minDistance,
    concepts: { python: ['dp-table', 'recursion', 'memoization', 'strings', 'nested-loops'], javascript: ['dp-table', 'recursion', 'memoization', 'strings', 'nested-loops'] },
    functionName: 'minDistance',
    starters: {
      python: `def minDistance(word1, word2):
    pass
`,
      javascript: `function minDistance(word1, word2) {

}
`,
    },
    tests: [
      { args: ['horse', 'ros'], expected: 3 },
      { args: ['intention', 'execution'], expected: 5 },
      { args: ['', 'abc'], expected: 3 },
      { args: ['same', 'same'], expected: 0 },
      { args: ['a', ''], expected: 1 },
    ],
  },
  {
    id: 'trapping-rain-water',
    title: 'Trapping Rain Water',
    difficulty: 'Hard',
    topic: 'two-pointers',
    statement: [
      'height[i] is the height of a bar of width 1. After it rains, water fills the dips between taller bars. Return how many squares of water are trapped.',
      'For [0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1] the answer is 6.',
    ],
    constraints: ['height has 1 to 2 × 10⁴ bars', '0 ≤ height[i] ≤ 10⁵'],
    hints: [
      'Simplest: the water above bar i rises to the lower of the tallest bar on its left and the tallest bar on its right (counting bar i itself), minus height[i]. Scanning both sides for every bar is O(n²).',
      'Faster: put one pointer at each end, and remember the tallest bar seen from the left and from the right.',
      'Move the pointer at the lower bar. Its water is decided by its own side\'s tallest bar, since the other side already has a bar at least as tall. Add (tallest on its side - its height), then step inward.',
    ],
    complexity: {
      time: 'O(n)',
      space: 'O(1)',
      why: 'The two pointers move toward each other one bar at a time and meet once, so every bar is looked at once. Only a handful of numbers are kept.',
    },
    speed: SPEED.trap,
    concepts: { python: ['two-pointers', 'running-best', 'while', 'min-max-sum'], javascript: ['two-pointers', 'running-best', 'while', 'min-max-sum'] },
    functionName: 'trap',
    starters: {
      python: `def trap(height):
    pass
`,
      javascript: `function trap(height) {

}
`,
    },
    tests: [
      { args: [[0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]], expected: 6 },
      { args: [[4, 2, 0, 3, 2, 5]], expected: 9 },
      { args: [[5]], expected: 0 },
      { args: [[1, 2, 3, 4]], expected: 0 },
      { args: [[3, 0, 3]], expected: 3 },
    ],
  },
  {
    id: 'largest-rectangle',
    title: 'Largest Rectangle in Histogram',
    difficulty: 'Hard',
    topic: 'stack',
    statement: [
      'heights[i] is the height of a bar of width 1, with the bars standing side by side. Return the area of the largest rectangle that fits inside the bars.',
      'For [2, 1, 5, 6, 2, 3] the answer is 10: the bars of height 5 and 6 hold a rectangle 5 tall and 2 wide.',
    ],
    constraints: ['heights has 1 to 10⁵ bars', '0 ≤ heights[i] ≤ 10⁴'],
    hints: [
      'Simplest: try every pair of a first and a last bar. Moving the last bar right, keep the lowest height so far; the area is lowest × width. That is O(n²).',
      'Faster: for each bar, the widest rectangle of its height reaches until a lower bar on each side. A stack of bar indexes, with heights going up, finds those lower bars.',
      'When a bar is lower than the top of the stack, pop. The popped bar\'s rectangle ends just before this bar and starts just after the new top of the stack (or at 0 if the stack is empty).',
      'Add a bar of height 0 at the end, so every bar left on the stack gets popped and measured.',
    ],
    complexity: {
      time: 'O(n)',
      space: 'O(n)',
      why: 'Every bar is pushed once and popped once, so the inner loop runs n times in total, not n times for each bar. The stack can hold every bar when the heights only go up.',
    },
    speed: SPEED.largestRectangleArea,
    concepts: { python: ['monotonic-stack', 'stack', 'running-best', 'while'], javascript: ['monotonic-stack', 'stack', 'running-best', 'while'] },
    functionName: 'largestRectangleArea',
    starters: {
      python: `def largestRectangleArea(heights):
    pass
`,
      javascript: `function largestRectangleArea(heights) {

}
`,
    },
    tests: [
      { args: [[2, 1, 5, 6, 2, 3]], expected: 10 },
      { args: [[2, 4]], expected: 4 },
      { args: [[7]], expected: 7 },
      { args: [[3, 3, 3]], expected: 9 },
      { args: [[0, 2, 0]], expected: 2 },
      { args: [[1, 2, 3, 4, 5]], expected: 9 },
    ],
  },
  {
    id: 'merge-k-sorted',
    title: 'Merge k Sorted Lists',
    difficulty: 'Hard',
    topic: 'heaps',
    statement: [
      {
        python: 'lists holds k linked lists, each sorted from smallest to largest. Merge them all into one sorted linked list and return its first node.',
        javascript: 'You get an array of k linked chains of nodes, each sorted from smallest to largest. Merge them all into one sorted chain and return its first node.',
      },
      {
        python: 'Any of the linked lists may be empty (None), and lists itself may be empty.',
        javascript: 'Any of the chains may be empty (null), and the array itself may be empty.',
      },
    ],
    constraints: [
      { python: 'lists has 0 to 10⁴ linked lists', javascript: 'The array has 0 to 10⁴ chains' },
      { python: 'Each linked list has 0 to 500 nodes, sorted from smallest to largest.', javascript: 'Each chain has 0 to 500 nodes, sorted from smallest to largest.' },
      'There are at most 10⁴ nodes in all.',
      '-10⁴ ≤ Node.val ≤ 10⁴',
    ],
    hints: [
      {
        python: 'Simplest: keep a pointer to the front of every linked list. Each time, look at all k fronts, take the smallest, and move that pointer on. Finding the smallest takes k looks, for every one of N nodes: O(N·k).',
        javascript: 'Simplest: keep a pointer to the front of every chain. Each time, look at all k fronts, take the smallest, and move that pointer on. Finding the smallest takes k looks, for every one of N nodes: O(N·k).',
      },
      'Faster: a min heap holding the k fronts gives you the smallest in about log k steps.',
      {
        python: 'heappush (node.val, i, node) for each front; the index i breaks ties, since heapq cannot compare two nodes. heappop the smallest, add it to the merged linked list, and heappush its next node if there is one.',
        javascript: 'Build the heap with (a, b) => a.val < b.val and push each front node. Pop the smallest, add it to the merged chain, and push its next node if there is one.',
      },
      {
        python: 'A dummy node to start the merged linked list saves special-casing the first node.',
        javascript: 'A dummy node to start the merged chain saves special-casing the first node.',
      },
    ],
    complexity: {
      time: 'O(N log k)',
      space: 'O(k)',
      extra: ['O(N log k)', 'O(k)', 'O(N·k)'],
      why: {
        python: 'N is the number of nodes in all and k the number of linked lists. Every node goes through the heap once, and the heap holds at most k nodes, so putting a node in or taking one out is about log k steps. The nodes themselves are reused, not copied.',
        javascript: 'N is the number of nodes in all and k the number of chains. Every node goes through the heap once, and the heap holds at most k nodes, so putting a node in or taking one out is about log k steps. The nodes themselves are reused, not copied.',
      },
    },
    speed: SPEED.mergeKLists,
    io: { args: ['lists'], result: 'list' },
    concepts: { python: ['heap', 'heapq', 'linked-list', 'dummy-node', 'tuples'], javascript: ['heap', 'classes', 'linked-list', 'dummy-node'] },
    functionName: 'mergeKLists',
    starters: {
      python: `import heapq

${LIST_NODE_PY}
def mergeKLists(lists):
    pass
`,
      javascript: `${MIN_HEAP}
${LIST_NODE_JS}
function mergeKLists(lists) {

}
`,
    },
    tests: [
      { args: [[[1, 4, 5], [1, 3, 4], [2, 6]]], expected: [1, 1, 2, 3, 4, 4, 5, 6] },
      { args: [[]], expected: [] },
      { args: [[[]]], expected: [] },
      { args: [[[2], [], [-1, 0]]], expected: [-1, 0, 2] },
      { args: [[[1, 2, 3]]], expected: [1, 2, 3] },
    ],
  },
]
