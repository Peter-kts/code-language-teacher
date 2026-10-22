import { randomInts } from '../big'
import type { Problem, SpeedTest } from '../problems'

// The algorithms set: the classic sorts written by hand, binary search for a boundary, and
// more dynamic programming. Interviews rarely ask for a textbook sort from memory, but they
// show why O(n²) and O(n log n) feel so different, and the ideas (swapping, splitting in
// half, merging) come back in many other problems.

// ---- speed inputs (the same on every run, answers worked out here) ----

const count = (n: number) => n.toLocaleString('en-US')
const ascending = (nums: number[]) => [...nums].sort((a, b) => a - b)

/** Big enough that comparing every pair (about 2 million pairs) runs out of steps. */
const SORT_N = 2000
const unsorted = randomInts(SORT_N, -100_000, 100_000, 31)

const COLORS_N = 5000
const colors = randomInts(COLORS_N, 0, 2, 32)

/** 0, 2, 4, ... 19,998; 9,999 is not there and belongs near the end. */
const evens = Array.from({ length: 10_000 }, (_, i) => 2 * i)

/** 3,000 numbers below 3,000, then 4,000 copies of 3,000, then 3,000 above: a long run to find the ends of. */
const RUN = 4000
const withRun = [...Array.from({ length: 3000 }, (_, i) => i), ...Array(RUN).fill(3000), ...Array.from({ length: 3000 }, (_, i) => 3001 + i)]

/** 1, 3, 5, ... 9,999 turned so it starts at 7,001; the smallest sits deep in the second half. */
const turned = Array.from({ length: 5000 }, (_, i) => 2 * ((i + 3500) % 5000) + 1)

const piles = randomInts(200, 1, 1_000_000, 33)
const hours = 300

function slowestSpeed(ps: number[], h: number) {
  let lo = 1
  let hi = Math.max(...ps)
  while (lo < hi) {
    const k = Math.floor((lo + hi) / 2)
    const needed = ps.reduce((t, p) => t + Math.ceil(p / k), 0)
    if (needed <= h) hi = k
    else lo = k + 1
  }
  return lo
}

const stairCost = randomInts(30, 0, 999, 34)

function cheapestClimb(cost: number[]) {
  let a = 0
  let b = 0
  for (let i = 2; i <= cost.length; i++) [a, b] = [b, Math.min(b + cost[i - 1], a + cost[i - 2])]
  return b
}

const sequence = randomInts(80, 0, 10_000, 35)

function longestRise(nums: number[]) {
  const best = nums.map(() => 1)
  for (let i = 0; i < nums.length; i++) for (let j = 0; j < i; j++) if (nums[j] < nums[i]) best[i] = Math.max(best[i], best[j] + 1)
  return Math.max(...best)
}

/** Every split of the a's works until the b, so trying them all without remembering takes forever. */
const aaab = 'a'.repeat(40) + 'b'
const aWords = ['a', 'aa', 'aaa', 'aaaa', 'aaaaa']

/** Multiples of 3 plus one 100: the total is even, but half of it (392) can't be reached, so every pick has to be ruled out. */
const parts = [...randomInts(24, 1, 20, 20).map((x) => 3 * x), 100]

function splits(nums: number[]) {
  const total = nums.reduce((a, b) => a + b, 0)
  if (total % 2) return false
  const can = [true, ...Array(total / 2).fill(false)]
  for (const n of nums) for (let s = total / 2; s >= n; s--) if (can[s - n]) can[s] = true
  return can[total / 2]
}

const SPEED: Record<string, SpeedTest> = {
  mergeSort: { args: [unsorted], expected: ascending(unsorted), maxSteps: 300_000, size: `nums has ${count(SORT_N)} numbers in random order` },
  quickSort: { args: [unsorted], expected: ascending(unsorted), maxSteps: 300_000, size: `nums has ${count(SORT_N)} numbers in random order` },
  sortColors: { args: [colors], expected: ascending(colors), maxSteps: 12 * COLORS_N, size: `nums has ${count(COLORS_N)} colors` },
  searchInsert: { args: [evens, 19_999], expected: 10_000, maxSteps: 300, size: 'nums has 10,000 numbers' },
  searchRange: {
    args: [withRun, 3000],
    expected: [3000, 3000 + RUN - 1],
    maxSteps: 400,
    size: `nums has 10,000 numbers, ${count(RUN)} of them equal to target`,
  },
  findMin: { args: [turned], expected: 1, maxSteps: 300, size: 'nums has 5,000 numbers' },
  minEatingSpeed: {
    args: [piles, hours],
    expected: slowestSpeed(piles, hours),
    maxSteps: 40_000,
    size: `piles has 200 piles of up to ${count(1_000_000)} bananas, and h is ${hours}`,
  },
  minCostClimbingStairs: { args: [stairCost], expected: cheapestClimb(stairCost), maxSteps: 1000, size: 'cost has 30 steps' },
  lengthOfLIS: { args: [sequence], expected: longestRise(sequence), maxSteps: 30_000, size: 'nums has 80 numbers' },
  wordBreak: {
    args: [aaab, aWords],
    expected: false,
    maxSteps: 12_000,
    size: 's is 40 a\'s and then a b, and wordDict is ["a", "aa", "aaa", "aaaa", "aaaaa"]',
  },
  canPartition: { args: [parts], expected: splits(parts), maxSteps: 60_000, size: `nums has ${parts.length} numbers adding up to ${parts.reduce((a, b) => a + b, 0)}` },
}

// ---- the problems ----

export const ALGORITHMS: Problem[] = [
  {
    id: 'bubble-sort',
    title: 'Bubble Sort',
    difficulty: 'Easy',
    topic: 'sorting',
    statement: [
      {
        python: 'Sort nums from smallest to largest with bubble sort, and return it. Do not call sorted() or .sort(): the point is to see how sorting works inside.',
        javascript: 'Sort nums from smallest to largest with bubble sort, and return it. Do not call sort(): the point is to see how sorting works inside.',
      },
      'Bubble sort walks along the numbers comparing each pair of neighbors, and swaps them when the bigger one comes first. After one pass the biggest number has bubbled to the end. Repeat until nothing moves.',
    ],
    constraints: ['nums has 1 to 1,000 numbers', '-10⁵ ≤ nums[i] ≤ 10⁵'],
    hints: [
      {
        python: 'Inside the loops, compare nums[i] and nums[i + 1]. If nums[i] is bigger, swap them in one line: nums[i], nums[i + 1] = nums[i + 1], nums[i].',
        javascript: 'Inside the loops, compare nums[i] and nums[i + 1]. If nums[i] is bigger, swap them in one line: [nums[i], nums[i + 1]] = [nums[i + 1], nums[i]].',
      },
      'Each pass puts the biggest number left into its place at the end, so the next pass can stop one sooner. That is why the inner loop only goes up to end.',
      'Extra: keep a flag that says whether this pass swapped anything. If a whole pass swaps nothing, the numbers are sorted and you can stop early.',
    ],
    complexity: {
      time: 'O(n²)',
      space: 'O(1)',
      why: 'There are up to n passes and each compares up to n pairs: about n²/2 comparisons. The swaps happen inside nums itself, so only a few counters are kept.',
    },
    concepts: { python: ['simple-sorts', 'nested-loops', 'tuples', 'range'], javascript: ['simple-sorts', 'nested-loops', 'destructuring', 'for-count'] },
    functionName: 'bubbleSort',
    starters: {
      python: `def bubbleSort(nums):
    for end in range(len(nums) - 1, 0, -1):
        for i in range(end):
            pass  # swap nums[i] and nums[i + 1] if they are in the wrong order
    return nums
`,
      javascript: `function bubbleSort(nums) {
  for (let end = nums.length - 1; end > 0; end--) {
    for (let i = 0; i < end; i++) {
      // swap nums[i] and nums[i + 1] if they are in the wrong order
    }
  }
  return nums
}
`,
    },
    tests: [
      { args: [[5, 1, 4, 2, 8]], expected: [1, 2, 4, 5, 8] },
      { args: [[3, 2, 1]], expected: [1, 2, 3] },
      { args: [[1, 2, 3, 4]], expected: [1, 2, 3, 4] },
      { args: [[7]], expected: [7] },
      { args: [[2, -1, 2, 0, -1]], expected: [-1, -1, 0, 2, 2] },
    ],
  },
  {
    id: 'selection-sort',
    title: 'Selection Sort',
    difficulty: 'Easy',
    topic: 'sorting',
    statement: [
      {
        python: 'Sort nums from smallest to largest with selection sort, and return it. Do not call sorted() or .sort().',
        javascript: 'Sort nums from smallest to largest with selection sort, and return it. Do not call sort().',
      },
      'Selection sort fills the places from the left. For place i, find the smallest number from i to the end, and swap it into place i. Everything to the left of i is then sorted and never moves again.',
    ],
    constraints: ['nums has 1 to 1,000 numbers', '-10⁵ ≤ nums[i] ≤ 10⁵'],
    hints: [
      'smallest holds the index of the smallest number seen so far. Loop j from i + 1 to the end, and when nums[j] is smaller than nums[smallest], set smallest = j.',
      {
        python: 'After that loop, swap the smallest into place: nums[i], nums[smallest] = nums[smallest], nums[i].',
        javascript: 'After that loop, swap the smallest into place: [nums[i], nums[smallest]] = [nums[smallest], nums[i]].',
      },
      'Compare it with bubble sort: selection sort does about the same number of comparisons, but at most one swap per place.',
    ],
    complexity: {
      time: 'O(n²)',
      space: 'O(1)',
      why: 'For each of the n places it looks through everything still unsorted: n + (n - 1) + ... + 1, about n²/2 looks. It even does all of them when nums is already sorted.',
    },
    concepts: { python: ['simple-sorts', 'nested-loops', 'running-best', 'tuples'], javascript: ['simple-sorts', 'nested-loops', 'running-best', 'destructuring'] },
    functionName: 'selectionSort',
    starters: {
      python: `def selectionSort(nums):
    for i in range(len(nums)):
        smallest = i  # index of the smallest number from i onward
        # look through the rest for something smaller,
        # then swap it into place i
    return nums
`,
      javascript: `function selectionSort(nums) {
  for (let i = 0; i < nums.length; i++) {
    let smallest = i // index of the smallest number from i onward
    // look through the rest for something smaller,
    // then swap it into place i
  }
  return nums
}
`,
    },
    tests: [
      { args: [[64, 25, 12, 22, 11]], expected: [11, 12, 22, 25, 64] },
      { args: [[3, 2, 1]], expected: [1, 2, 3] },
      { args: [[1, 2, 3]], expected: [1, 2, 3] },
      { args: [[4]], expected: [4] },
      { args: [[0, -5, 3, -5]], expected: [-5, -5, 0, 3] },
    ],
  },
  {
    id: 'insertion-sort',
    title: 'Insertion Sort',
    difficulty: 'Easy',
    topic: 'sorting',
    statement: [
      {
        python: 'Sort nums from smallest to largest with insertion sort, and return it. Do not call sorted() or .sort().',
        javascript: 'Sort nums from smallest to largest with insertion sort, and return it. Do not call sort().',
      },
      'Insertion sort works like sorting cards in your hand. The left part is already sorted. Take the next number and slide it left, past every bigger number, until it sits in its place.',
    ],
    constraints: ['nums has 1 to 1,000 numbers', '-10⁵ ≤ nums[i] ≤ 10⁵'],
    hints: [
      'j starts at the new number. While j > 0 and the number before it is bigger, swap the two and move j one to the left.',
      {
        python: 'The swap: nums[j - 1], nums[j] = nums[j], nums[j - 1], then j -= 1.',
        javascript: 'The swap: [nums[j - 1], nums[j]] = [nums[j], nums[j - 1]], then j--.',
      },
      'Try it on numbers that are already sorted, and watch the steps: each number stops at once. That is why insertion sort is the quick one for almost-sorted data.',
    ],
    complexity: {
      time: 'O(n²)',
      space: 'O(1)',
      why: 'In the worst case (numbers in reverse order) each new number slides all the way to the front: about n²/2 swaps. When nums is already sorted it is only n steps. Bubble sort with the early stop manages that too, but selection sort never does.',
    },
    concepts: { python: ['simple-sorts', 'while', 'tuples', 'off-by-one'], javascript: ['simple-sorts', 'while', 'destructuring', 'off-by-one'] },
    functionName: 'insertionSort',
    starters: {
      python: `def insertionSort(nums):
    for i in range(1, len(nums)):
        j = i
        # while the number before j is bigger, swap them and move j left
    return nums
`,
      javascript: `function insertionSort(nums) {
  for (let i = 1; i < nums.length; i++) {
    let j = i
    // while the number before j is bigger, swap them and move j left
  }
  return nums
}
`,
    },
    tests: [
      { args: [[12, 11, 13, 5, 6]], expected: [5, 6, 11, 12, 13] },
      { args: [[1, 2, 3, 5, 4]], expected: [1, 2, 3, 4, 5] },
      { args: [[5, 4, 3, 2, 1]], expected: [1, 2, 3, 4, 5] },
      { args: [[9]], expected: [9] },
      { args: [[3, -2, 3, 0]], expected: [-2, 0, 3, 3] },
    ],
  },
  {
    id: 'merge-sort',
    title: 'Merge Sort',
    difficulty: 'Medium',
    topic: 'sorting',
    statement: [
      {
        python: 'Return the numbers of nums sorted from smallest to largest, using merge sort. Do not call sorted() or .sort().',
        javascript: 'Return the numbers of nums sorted from smallest to largest, using merge sort. Do not call sort().',
      },
      'Merge sort splits the numbers in half, sorts each half with merge sort itself, and then merges the two sorted halves into one, the way Merge Two Sorted Arrays does.',
    ],
    constraints: ['nums has 1 to 5 × 10⁴ numbers', '-10⁵ ≤ nums[i] ≤ 10⁵'],
    hints: [
      'Simplest: one of the simple sorts (bubble, selection or insertion). They compare pairs again and again, which is O(n²): far too slow for 2,000 numbers.',
      {
        python: 'Faster: a list of 0 or 1 numbers is already sorted, so return it. Otherwise split at mid = len(nums) // 2 and call mergeSort on nums[:mid] and on nums[mid:].',
        javascript: 'Faster: an array of 0 or 1 numbers is already sorted, so return it. Otherwise split at mid = Math.floor(nums.length / 2) and call mergeSort on nums.slice(0, mid) and on nums.slice(mid).',
      },
      'Then merge the two sorted halves with two pointers, i and j: take the smaller of left[i] and right[j] each time, and add whatever is left over at the end.',
    ],
    complexity: {
      time: 'O(n log n)',
      space: 'O(n)',
      why: {
        python: 'Halving n numbers down to single numbers takes log n levels, and the merges on each level touch all n numbers once: n · log n. The halves and the merged lists need room for n numbers.',
        javascript: 'Halving n numbers down to single numbers takes log n levels, and the merges on each level touch all n numbers once: n · log n. The halves and the merged arrays need room for n numbers.',
      },
    },
    speed: SPEED.mergeSort,
    concepts: { python: ['divide-and-conquer', 'recursion', 'two-pointers', 'slicing'], javascript: ['divide-and-conquer', 'recursion', 'two-pointers', 'slicing'] },
    functionName: 'mergeSort',
    starters: {
      python: `def mergeSort(nums):
    pass
`,
      javascript: `function mergeSort(nums) {

}
`,
    },
    tests: [
      { args: [[38, 27, 43, 3, 9, 82, 10]], expected: [3, 9, 10, 27, 38, 43, 82] },
      { args: [[5, 2, 3, 1]], expected: [1, 2, 3, 5] },
      { args: [[5, 1, 1, 2, 0, 0]], expected: [0, 0, 1, 1, 2, 5] },
      { args: [[1]], expected: [1] },
      { args: [[2, 1]], expected: [1, 2] },
    ],
  },
  {
    id: 'quick-sort',
    title: 'Quicksort',
    difficulty: 'Medium',
    topic: 'sorting',
    statement: [
      {
        python: 'Return the numbers of nums sorted from smallest to largest, using quicksort. Do not call sorted() or .sort().',
        javascript: 'Return the numbers of nums sorted from smallest to largest, using quicksort. Do not call sort().',
      },
      'Quicksort picks one number, the pivot, and splits the rest into the numbers smaller than it and the numbers bigger than it. Then it sorts each side with quicksort itself, and puts smaller, pivot, bigger together.',
    ],
    constraints: ['nums has 1 to 5 × 10⁴ numbers', '-10⁵ ≤ nums[i] ≤ 10⁵'],
    hints: [
      'Simplest: one of the simple sorts (bubble, selection or insertion). They are O(n²), far too slow for 2,000 numbers.',
      {
        python: 'Faster: if nums has 0 or 1 numbers, return it. Otherwise take pivot = nums[len(nums) // 2] and build three lists: less, equal and greater than the pivot. A list comprehension makes each one a line.',
        javascript: 'Faster: if nums has 0 or 1 numbers, return it. Otherwise take pivot = nums[Math.floor(nums.length / 2)] and build three arrays: less, equal and greater than the pivot. filter makes each one a line.',
      },
      {
        python: 'Return quickSort(less) + equal + quickSort(greater). Keeping the equal ones apart matters: with many repeats, they would otherwise land on one side again and again.',
        javascript: 'Return [...quickSort(less), ...equal, ...quickSort(greater)]. Keeping the equal ones apart matters: with many repeats, they would otherwise land on one side again and again.',
      },
      'Why the middle number? On numbers that are already sorted, the first number is the smallest, so one side gets everything and quicksort slows to O(n²). The middle (or a random pick) avoids that.',
    ],
    complexity: {
      time: 'O(n log n)',
      space: 'O(n)',
      why: {
        python: 'A good pivot splits the numbers roughly in half, so there are about log n levels, and each level looks at all n numbers once. A bad pivot every time would make it O(n²). The less, equal and greater lists take O(n) room; quicksort done in place, swapping inside nums, needs only O(log n) for the calls.',
        javascript: 'A good pivot splits the numbers roughly in half, so there are about log n levels, and each level looks at all n numbers once. A bad pivot every time would make it O(n²). The less, equal and greater arrays take O(n) room; quicksort done in place, swapping inside nums, needs only O(log n) for the calls.',
      },
    },
    speed: SPEED.quickSort,
    concepts: { python: ['divide-and-conquer', 'recursion', 'list-comprehension'], javascript: ['divide-and-conquer', 'recursion', 'map-filter', 'spread'] },
    functionName: 'quickSort',
    starters: {
      python: `def quickSort(nums):
    pass
`,
      javascript: `function quickSort(nums) {

}
`,
    },
    tests: [
      { args: [[10, 7, 8, 9, 1, 5]], expected: [1, 5, 7, 8, 9, 10] },
      { args: [[3, 3, 3, 1, 3]], expected: [1, 3, 3, 3, 3] },
      { args: [[1, 2, 3, 4, 5, 6]], expected: [1, 2, 3, 4, 5, 6] },
      { args: [[4]], expected: [4] },
      { args: [[0, -4, 9, -4, 2]], expected: [-4, -4, 0, 2, 9] },
    ],
  },
  {
    id: 'sort-colors',
    title: 'Sort Colors',
    difficulty: 'Medium',
    topic: 'sorting',
    statement: [
      'nums holds only 0, 1 and 2 (red, white and blue). Sort it in place so all the 0s come first, then the 1s, then the 2s, and return nums.',
      {
        python: 'Do not call sorted() or .sort(). Aim for one pass with O(1) extra memory.',
        javascript: 'Do not call sort(). Aim for one pass with O(1) extra memory.',
      },
    ],
    constraints: ['nums has 1 to 5,000 numbers', 'nums[i] is 0, 1 or 2'],
    hints: [
      'Simplest: bubble sort or insertion sort. They work, but they are O(n²): far too slow for 5,000 numbers.',
      'Faster: there are only three values. Count the 0s, 1s and 2s in one pass, then write that many 0s, 1s and 2s back into nums. That is O(n) in two passes.',
      'One pass: keep three pointers. Everything before low is 0, everything after high is 2, and mid walks between them.',
      'At mid: a 0 swaps with low (then both move right), a 1 just moves mid right, and a 2 swaps with high (then high moves left, but mid stays, since the number that came from high has not been looked at yet).',
    ],
    complexity: {
      time: 'O(n)',
      space: 'O(1)',
      why: 'Every step either moves mid right or high left, so after n steps they meet. Only three pointers are kept, and the swaps happen inside nums.',
    },
    speed: SPEED.sortColors,
    concepts: { python: ['two-pointers', 'counting', 'tuples', 'simple-sorts'], javascript: ['two-pointers', 'counting', 'destructuring', 'simple-sorts'] },
    functionName: 'sortColors',
    starters: {
      python: `def sortColors(nums):
    pass
`,
      javascript: `function sortColors(nums) {

}
`,
    },
    tests: [
      { args: [[2, 0, 2, 1, 1, 0]], expected: [0, 0, 1, 1, 2, 2] },
      { args: [[2, 0, 1]], expected: [0, 1, 2] },
      { args: [[0]], expected: [0] },
      { args: [[2, 2, 2, 0]], expected: [0, 2, 2, 2] },
      { args: [[1, 0, 1, 2, 1, 0, 2]], expected: [0, 0, 1, 1, 1, 2, 2] },
    ],
  },
  {
    id: 'search-insert',
    title: 'Search Insert Position',
    difficulty: 'Easy',
    topic: 'binary-search',
    statement: [
      'nums is sorted from smallest to largest, with no repeats. Return the index of target if it is there. If not, return the index where it would go to keep nums sorted.',
      'For [1, 3, 5, 6] and target 2 the answer is 1: 2 goes between 1 and 3.',
    ],
    constraints: ['nums has 1 to 10⁴ numbers, sorted, with no repeats', '-10⁴ ≤ nums[i], target ≤ 10⁴'],
    hints: [
      'Simplest: walk from the left until you reach a number that is not smaller than target. That index is the answer. It is O(n), and it ignores that nums is sorted.',
      'Faster: binary search, but for a boundary: the first index whose number is not smaller than target. Start with lo = 0 and hi = the length, because the answer can be just past the end.',
      'If nums[mid] < target, the answer is to the right: lo = mid + 1. Otherwise mid could be the answer, so keep it: hi = mid. When lo and hi meet, that is the place.',
    ],
    complexity: {
      time: 'O(log n)',
      space: 'O(1)',
      why: 'Each look throws away half of what is left, like plain binary search. Only lo, hi and mid are kept.',
    },
    speed: SPEED.searchInsert,
    concepts: { python: ['binary-search-boundary', 'binary-search', 'while'], javascript: ['binary-search-boundary', 'binary-search', 'while'] },
    functionName: 'searchInsert',
    starters: {
      python: `def searchInsert(nums, target):
    lo, hi = 0, len(nums)  # the answer is somewhere from lo to hi
    while lo < hi:
        mid = (lo + hi) // 2
        # move lo up or hi down
        break
    return lo
`,
      javascript: `function searchInsert(nums, target) {
  let lo = 0
  let hi = nums.length // the answer is somewhere from lo to hi
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2)
    // move lo up or hi down
    break
  }
  return lo
}
`,
    },
    tests: [
      { args: [[1, 3, 5, 6], 5], expected: 2 },
      { args: [[1, 3, 5, 6], 2], expected: 1 },
      { args: [[1, 3, 5, 6], 7], expected: 4 },
      { args: [[1, 3, 5, 6], 0], expected: 0 },
      { args: [[4], 4], expected: 0 },
    ],
  },
  {
    id: 'search-range',
    title: 'First and Last Position in Sorted Array',
    difficulty: 'Medium',
    topic: 'binary-search',
    statement: [
      'nums is sorted from smallest to largest and can have repeats. Return [first, last]: the first and the last index where target appears, or [-1, -1] if it is not there.',
      'Aim for O(log n), even when target appears thousands of times.',
    ],
    constraints: ['nums has 0 to 10⁵ numbers, sorted', '-10⁹ ≤ nums[i], target ≤ 10⁹'],
    hints: [
      'Simplest: walk through nums and note the first and last time you see target. That is O(n). So is finding one copy with binary search and then walking out to both ends: with 4,000 copies the walk is long.',
      'Faster: run two binary searches for boundaries. The first finds the first index whose number is not smaller than target.',
      'The second finds the first index whose number is bigger than target; the last copy is just before it. If the first search lands past the end, or on a number that is not target, return [-1, -1].',
      'Writing one helper that finds "the first index where nums[i] >= x" and calling it with target and target + 1 gives both ends.',
    ],
    complexity: {
      time: 'O(log n)',
      space: 'O(1)',
      why: 'Two binary searches, each throwing away half of what is left with every look: about 2 · log n looks however many copies there are.',
    },
    speed: SPEED.searchRange,
    concepts: { python: ['binary-search-boundary', 'binary-search', 'functions'], javascript: ['binary-search-boundary', 'binary-search', 'functions'] },
    functionName: 'searchRange',
    starters: {
      python: `def searchRange(nums, target):
    pass
`,
      javascript: `function searchRange(nums, target) {

}
`,
    },
    tests: [
      { args: [[5, 7, 7, 8, 8, 10], 8], expected: [3, 4] },
      { args: [[5, 7, 7, 8, 8, 10], 6], expected: [-1, -1] },
      { args: [[], 0], expected: [-1, -1] },
      { args: [[2, 2, 2, 2], 2], expected: [0, 3] },
      { args: [[1, 4], 4], expected: [1, 1] },
      { args: [[1, 2, 3], 9], expected: [-1, -1] },
    ],
  },
  {
    id: 'find-min-rotated',
    title: 'Find Minimum in Rotated Sorted Array',
    difficulty: 'Medium',
    topic: 'binary-search',
    statement: [
      'nums was sorted from smallest to largest, with no repeats, and then turned at some point: the part after that point was moved to the front. [0, 1, 2, 4, 5, 6, 7] might become [4, 5, 6, 7, 0, 1, 2].',
      'Return the smallest number. Aim for O(log n).',
    ],
    constraints: ['nums has 1 to 5,000 numbers, all different', '-5,000 ≤ nums[i] ≤ 5,000', 'nums is a sorted run turned at some point (maybe not at all).'],
    hints: [
      'Simplest: look at every number and keep the smallest. That is O(n), and it ignores that nums is almost sorted.',
      'Faster: the smallest number is where the turn is: the one place where a number is smaller than the one before it. Binary search for that boundary.',
      'Compare nums[mid] with the last number, nums[hi]. If nums[mid] is bigger, the turn is to the right of mid: lo = mid + 1. Otherwise the smallest is at mid or to its left: hi = mid.',
      'Stop when lo and hi meet. nums[lo] is the smallest.',
    ],
    complexity: {
      time: 'O(log n)',
      space: 'O(1)',
      why: 'Each look throws away half of what is left. Only lo, hi and mid are kept.',
    },
    speed: SPEED.findMin,
    concepts: { python: ['binary-search-boundary', 'binary-search', 'min-max-sum'], javascript: ['binary-search-boundary', 'binary-search', 'min-max-sum'] },
    functionName: 'findMin',
    starters: {
      python: `def findMin(nums):
    pass
`,
      javascript: `function findMin(nums) {

}
`,
    },
    tests: [
      { args: [[3, 4, 5, 1, 2]], expected: 1 },
      { args: [[4, 5, 6, 7, 0, 1, 2]], expected: 0 },
      { args: [[11, 13, 15, 17]], expected: 11 },
      { args: [[2, 1]], expected: 1 },
      { args: [[5]], expected: 5 },
    ],
  },
  {
    id: 'koko-bananas',
    title: 'Koko Eating Bananas',
    difficulty: 'Medium',
    topic: 'binary-search',
    statement: [
      'Koko has piles of bananas: piles[i] is how many are in pile i. Each hour she picks one pile and eats k bananas from it. If the pile has fewer than k, she eats them all and waits for the next hour.',
      'Return the smallest whole number k that lets her finish every pile within h hours.',
      'For piles [3, 6, 7, 11] and h = 8 the answer is 4: the piles take 1 + 2 + 2 + 3 = 8 hours.',
    ],
    constraints: ['piles has 1 to 10⁴ piles, and piles.length ≤ h ≤ 10⁹', '1 ≤ piles[i] ≤ 10⁹'],
    hints: [
      {
        python: 'Simplest: try k = 1, 2, 3, ... and return the first k that is fast enough. A pile of p bananas takes p / k hours, rounded up: (p + k - 1) // k. With piles of a million bananas that can mean hundreds of thousands of tries.',
        javascript: 'Simplest: try k = 1, 2, 3, ... and return the first k that is fast enough. A pile of p bananas takes p / k hours, rounded up: Math.ceil(p / k). With piles of a million bananas that can mean hundreds of thousands of tries.',
      },
      'Faster: "fast enough" flips only once. Every k below the answer is too slow, and every k from the answer up works. That is a boundary, so binary search for it over the speeds themselves, not over piles.',
      'The answer is between 1 and the biggest pile (at that speed every pile takes one hour). If speed mid is fast enough, the answer is mid or lower: hi = mid. If not: lo = mid + 1.',
    ],
    complexity: {
      time: 'O(n log m)',
      space: 'O(1)',
      extra: ['O(n log m)', 'O(n · m)', 'O(m)'],
      why: 'n is the number of piles and m the biggest pile. Binary search over the speeds 1 to m takes about log m tries, and each try adds up the hours for all n piles. A billion bananas is only about 30 tries.',
    },
    speed: SPEED.minEatingSpeed,
    concepts: { python: ['binary-search-boundary', 'binary-search', 'math', 'min-max-sum'], javascript: ['binary-search-boundary', 'binary-search', 'math', 'min-max-sum'] },
    functionName: 'minEatingSpeed',
    starters: {
      python: `def minEatingSpeed(piles, h):
    pass
`,
      javascript: `function minEatingSpeed(piles, h) {

}
`,
    },
    tests: [
      { args: [[3, 6, 7, 11], 8], expected: 4 },
      { args: [[30, 11, 23, 4, 20], 5], expected: 30 },
      { args: [[30, 11, 23, 4, 20], 6], expected: 23 },
      { args: [[1], 1], expected: 1 },
      { args: [[100], 3], expected: 34 },
      { args: [[25, 9, 9], 4], expected: 13 },
    ],
  },
  {
    id: 'min-cost-stairs',
    title: 'Min Cost Climbing Stairs',
    difficulty: 'Easy',
    topic: 'dp-1d',
    statement: [
      'cost[i] is what it costs to step on stair i. Once you pay, you can climb one or two stairs. You can start on stair 0 or stair 1. Return the least it can cost to get past the last stair, to the top.',
      'For cost [10, 15, 20] the answer is 15: start on stair 1, pay 15 and climb two stairs to the top.',
    ],
    constraints: ['cost has 2 to 1,000 stairs', '0 ≤ cost[i] ≤ 999'],
    hints: [
      'Simplest: recursion. The cheapest way to reach stair i is the cheaper of (reach i - 1, then pay cost[i - 1]) and (reach i - 2, then pay cost[i - 2]). Reaching stair 0 or 1 is free. Without remembering answers it works the same stairs out again and again: about 2ⁿ calls.',
      'Faster: work from the bottom up, each stair once, so every answer you need is already there.',
      {
        python: 'best[i] = min(best[i - 1] + cost[i - 1], best[i - 2] + cost[i - 2]). The top is stair len(cost), one past the last.',
        javascript: 'best[i] = Math.min(best[i - 1] + cost[i - 1], best[i - 2] + cost[i - 2]). The top is stair cost.length, one past the last.',
      },
    ],
    complexity: {
      time: 'O(n)',
      space: 'O(n)',
      why: {
        python: 'Each stair is worked out once from the two below it. The best list holds n + 1 numbers. Keeping only the last two in variables would make the space O(1).',
        javascript: 'Each stair is worked out once from the two below it. The best array holds n + 1 numbers. Keeping only the last two in variables would make the space O(1).',
      },
    },
    speed: SPEED.minCostClimbingStairs,
    concepts: { python: ['dp-1d', 'recursion', 'memoization', 'min-max-sum'], javascript: ['dp-1d', 'recursion', 'memoization', 'min-max-sum'] },
    functionName: 'minCostClimbingStairs',
    starters: {
      python: `def minCostClimbingStairs(cost):
    best = [0, 0]  # reaching stair 0 or stair 1 is free
    for i in range(2, len(cost) + 1):
        best.append(0)  # replace 0: the least it costs to reach stair i
    return best[len(cost)]
`,
      javascript: `function minCostClimbingStairs(cost) {
  const best = [0, 0] // reaching stair 0 or stair 1 is free
  for (let i = 2; i <= cost.length; i++) {
    best.push(0) // replace 0: the least it costs to reach stair i
  }
  return best[cost.length]
}
`,
    },
    tests: [
      { args: [[10, 15, 20]], expected: 15 },
      { args: [[1, 100, 1, 1, 1, 100, 1, 1, 100, 1]], expected: 6 },
      { args: [[0, 0]], expected: 0 },
      { args: [[5, 3]], expected: 3 },
      { args: [[0, 1, 2, 2]], expected: 2 },
    ],
  },
  {
    id: 'longest-increasing-subsequence',
    title: 'Longest Increasing Subsequence',
    difficulty: 'Medium',
    topic: 'dp-1d',
    statement: [
      'Return the length of the longest run of numbers in nums that keeps going up, when you are allowed to skip numbers (but not to change their order).',
      'For [10, 9, 2, 5, 3, 7, 101, 18] the answer is 4: 2, 3, 7, 101 is one such run.',
    ],
    constraints: ['nums has 1 to 2,500 numbers', '-10⁴ ≤ nums[i] ≤ 10⁴'],
    hints: [
      'Simplest: recursion over every pick. Walking left to right, each number is either taken (if it is bigger than the last one taken) or skipped. That tries up to 2ⁿ picks.',
      'Faster: let best[i] be the length of the longest rising run that ends at nums[i]. Every number alone is a run of 1.',
      {
        python: 'For each i, look at every j before it. If nums[j] < nums[i], the run ending at j can be continued: best[i] = max(best[i], best[j] + 1). The answer is the biggest best[i].',
        javascript: 'For each i, look at every j before it. If nums[j] < nums[i], the run ending at j can be continued: best[i] = Math.max(best[i], best[j] + 1). The answer is the biggest best[i].',
      },
      'Extra, for later: keeping the smallest possible last number of a run of each length, and placing each number with binary search, makes it O(n log n).',
    ],
    complexity: {
      time: 'O(n²)',
      space: 'O(n)',
      why: {
        python: 'Each of the n numbers looks back at every number before it: about n²/2 looks. The best list holds one number per position. (The binary search version in the last hint is O(n log n).)',
        javascript: 'Each of the n numbers looks back at every number before it: about n²/2 looks. The best array holds one number per position. (The binary search version in the last hint is O(n log n).)',
      },
    },
    speed: SPEED.lengthOfLIS,
    concepts: { python: ['dp-1d', 'nested-loops', 'recursion', 'min-max-sum'], javascript: ['dp-1d', 'nested-loops', 'recursion', 'min-max-sum'] },
    functionName: 'lengthOfLIS',
    starters: {
      python: `def lengthOfLIS(nums):
    pass
`,
      javascript: `function lengthOfLIS(nums) {

}
`,
    },
    tests: [
      { args: [[10, 9, 2, 5, 3, 7, 101, 18]], expected: 4 },
      { args: [[0, 1, 0, 3, 2, 3]], expected: 4 },
      { args: [[7, 7, 7, 7]], expected: 1 },
      { args: [[5]], expected: 1 },
      { args: [[4, 10, 4, 3, 8, 9]], expected: 3 },
    ],
  },
  {
    id: 'word-break',
    title: 'Word Break',
    difficulty: 'Medium',
    topic: 'dp-1d',
    statement: [
      'Return whether s can be cut into pieces that are all words in wordDict. A word can be used more than once.',
      'For s = "applepenapple" and wordDict ["apple", "pen"], it can: "apple" + "pen" + "apple".',
    ],
    constraints: ['s has 1 to 300 letters', 'wordDict has 1 to 1,000 words of 1 to 20 letters, all different'],
    hints: [
      'Simplest: recursion. Try every word that s starts with, cut it off, and ask the same question about the rest. When many cuts work for a while (like "aaaa...ab"), the same rest is asked about again and again: exponential.',
      {
        python: 'Faster: the only thing that matters is where the next piece starts. Let ok[i] say whether the first i letters can be cut into words. ok[0] is True: no letters need no words.',
        javascript: 'Faster: the only thing that matters is where the next piece starts. Let ok[i] say whether the first i letters can be cut into words. ok[0] is true: no letters need no words.',
      },
      {
        python: 'ok[i] is True when some j < i has ok[j] True and s[j:i] is a word. Put the words in a set so each check is quick. The answer is ok[len(s)].',
        javascript: 'ok[i] is true when some j < i has ok[j] true and s.slice(j, i) is a word. Put the words in a Set so each check is quick. The answer is ok[s.length].',
      },
    ],
    complexity: {
      time: 'O(n²)',
      space: 'O(n)',
      why: {
        python: 'n is the length of s. Every pair of start j and end i is checked once: about n²/2 checks, each one slice and one set lookup. (Cutting a slice also copies its letters, so strictly it is a little more, but words are short.) The ok list and the set are the extra memory.',
        javascript: 'n is the length of s. Every pair of start j and end i is checked once: about n²/2 checks, each one slice and one Set lookup. (Cutting a slice also copies its letters, so strictly it is a little more, but words are short.) The ok array and the Set are the extra memory.',
      },
    },
    speed: SPEED.wordBreak,
    concepts: { python: ['dp-1d', 'slicing', 'sets', 'memoization'], javascript: ['dp-1d', 'slicing', 'sets', 'memoization'] },
    functionName: 'wordBreak',
    starters: {
      python: `def wordBreak(s, wordDict):
    pass
`,
      javascript: `function wordBreak(s, wordDict) {

}
`,
    },
    tests: [
      { args: ['leetcode', ['leet', 'code']], expected: true },
      { args: ['applepenapple', ['apple', 'pen']], expected: true },
      { args: ['catsandog', ['cats', 'dog', 'sand', 'and', 'cat']], expected: false },
      { args: ['a', ['b']], expected: false },
      { args: ['aaaaaaa', ['aaaa', 'aaa']], expected: true },
    ],
  },
  {
    id: 'partition-equal-subset',
    title: 'Partition Equal Subset Sum',
    difficulty: 'Medium',
    topic: 'dp-2d',
    statement: [
      'Return whether nums can be split into two groups with the same total. Every number goes into exactly one group.',
      'For [1, 5, 11, 5] it can: 1 + 5 + 5 = 11.',
    ],
    constraints: ['nums has 1 to 200 numbers', '1 ≤ nums[i] ≤ 100'],
    hints: [
      'First: if the total is odd it cannot split evenly. Otherwise the question is whether some of the numbers add up to exactly half the total.',
      'Simplest: recursion. Each number is either in the group or not, so try both. That is 2ⁿ picks, and with no good split every one of them gets tried.',
      'Faster: you only care which sums are reachable, not which numbers made them. Start with just 0 reachable. Each number makes every reachable sum s give a new reachable sum s + number.',
      {
        python: 'A list can of True and False for the sums 0 to half does it. For each number n, walk s from half down to n: if can[s - n], set can[s] = True. Going down stops one number from being used twice. (A set of reachable sums works too.)',
        javascript: 'An array can of true and false for the sums 0 to half does it. For each number n, walk s from half down to n: if can[s - n], set can[s] = true. Going down stops one number from being used twice. (A Set of reachable sums works too.)',
      },
    ],
    complexity: {
      time: 'O(n · s)',
      space: 'O(s)',
      extra: ['O(n · s)', 'O(s)'],
      why: {
        python: 'n is how many numbers there are and s is half the total. Each number walks once over the sums 0 to s. Only one row of True and False is kept. This is the 0/1 knapsack: a table of numbers by sums, squeezed into one row.',
        javascript: 'n is how many numbers there are and s is half the total. Each number walks once over the sums 0 to s. Only one row of true and false is kept. This is the 0/1 knapsack: a table of numbers by sums, squeezed into one row.',
      },
    },
    speed: SPEED.canPartition,
    concepts: { python: ['subset-sum', 'dp-table', 'recursion', 'sets'], javascript: ['subset-sum', 'dp-table', 'recursion', 'sets'] },
    functionName: 'canPartition',
    starters: {
      python: `def canPartition(nums):
    pass
`,
      javascript: `function canPartition(nums) {

}
`,
    },
    tests: [
      { args: [[1, 5, 11, 5]], expected: true },
      { args: [[1, 2, 3, 5]], expected: false },
      { args: [[2, 2]], expected: true },
      { args: [[7]], expected: false },
      { args: [[3, 3, 3, 4, 5]], expected: true },
      { args: [[1, 2, 5]], expected: false },
    ],
  },
]
