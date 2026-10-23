import type { References } from './types'

// Worked answers for the algorithms set (sets/algorithms.ts). See types.ts.

/** The slow answer for the fast sorts: insertion sort, O(n²). */
const INSERTION = (name: string) => ({
  python: `def ${name}(nums):
    nums = nums[:]
    for i in range(1, len(nums)):
        j = i
        while j > 0 and nums[j - 1] > nums[j]:
            nums[j - 1], nums[j] = nums[j], nums[j - 1]
            j -= 1
    return nums
`,
  javascript: `function ${name}(nums) {
  nums = [...nums]
  for (let i = 1; i < nums.length; i++) {
    let j = i
    while (j > 0 && nums[j - 1] > nums[j]) {
      ;[nums[j - 1], nums[j]] = [nums[j], nums[j - 1]]
      j--
    }
  }
  return nums
}`,
})

export const ALGORITHMS: References = {
  'bubble-sort': {
    python: `def bubbleSort(nums):
    for end in range(len(nums) - 1, 0, -1):
        swapped = False
        for i in range(end):
            if nums[i] > nums[i + 1]:
                nums[i], nums[i + 1] = nums[i + 1], nums[i]
                swapped = True
        if not swapped:
            break
    return nums
`,
    javascript: `function bubbleSort(nums) {
  for (let end = nums.length - 1; end > 0; end--) {
    let swapped = false
    for (let i = 0; i < end; i++) {
      if (nums[i] > nums[i + 1]) {
        ;[nums[i], nums[i + 1]] = [nums[i + 1], nums[i]]
        swapped = true
      }
    }
    if (!swapped) break
  }
  return nums
}`,
  },
  'selection-sort': {
    python: `def selectionSort(nums):
    for i in range(len(nums)):
        smallest = i
        for j in range(i + 1, len(nums)):
            if nums[j] < nums[smallest]:
                smallest = j
        nums[i], nums[smallest] = nums[smallest], nums[i]
    return nums
`,
    javascript: `function selectionSort(nums) {
  for (let i = 0; i < nums.length; i++) {
    let smallest = i
    for (let j = i + 1; j < nums.length; j++) {
      if (nums[j] < nums[smallest]) smallest = j
    }
    ;[nums[i], nums[smallest]] = [nums[smallest], nums[i]]
  }
  return nums
}`,
  },
  'insertion-sort': {
    python: `def insertionSort(nums):
    for i in range(1, len(nums)):
        j = i
        while j > 0 and nums[j - 1] > nums[j]:
            nums[j - 1], nums[j] = nums[j], nums[j - 1]
            j -= 1
    return nums
`,
    javascript: `function insertionSort(nums) {
  for (let i = 1; i < nums.length; i++) {
    let j = i
    while (j > 0 && nums[j - 1] > nums[j]) {
      ;[nums[j - 1], nums[j]] = [nums[j], nums[j - 1]]
      j--
    }
  }
  return nums
}`,
  },
  'merge-sort': {
    python: `def mergeSort(nums):
    if len(nums) <= 1:
        return nums
    mid = len(nums) // 2
    left = mergeSort(nums[:mid])
    right = mergeSort(nums[mid:])
    out = []
    i, j = 0, 0
    while i < len(left) and j < len(right):
        if left[i] <= right[j]:
            out.append(left[i])
            i += 1
        else:
            out.append(right[j])
            j += 1
    return out + left[i:] + right[j:]
`,
    javascript: `function mergeSort(nums) {
  if (nums.length <= 1) return nums
  const mid = Math.floor(nums.length / 2)
  const left = mergeSort(nums.slice(0, mid))
  const right = mergeSort(nums.slice(mid))
  const out = []
  let i = 0
  let j = 0
  while (i < left.length && j < right.length) {
    if (left[i] <= right[j]) out.push(left[i++])
    else out.push(right[j++])
  }
  return [...out, ...left.slice(i), ...right.slice(j)]
}`,
    slow: INSERTION('mergeSort'),
  },
  'quick-sort': {
    python: `def quickSort(nums):
    if len(nums) <= 1:
        return nums
    pivot = nums[len(nums) // 2]
    less = [n for n in nums if n < pivot]
    equal = [n for n in nums if n == pivot]
    greater = [n for n in nums if n > pivot]
    return quickSort(less) + equal + quickSort(greater)
`,
    javascript: `function quickSort(nums) {
  if (nums.length <= 1) return nums
  const pivot = nums[Math.floor(nums.length / 2)]
  const less = nums.filter((n) => n < pivot)
  const equal = nums.filter((n) => n === pivot)
  const greater = nums.filter((n) => n > pivot)
  return [...quickSort(less), ...equal, ...quickSort(greater)]
}`,
    slow: INSERTION('quickSort'),
  },
  'sort-colors': {
    python: `def sortColors(nums):
    low, mid, high = 0, 0, len(nums) - 1
    while mid <= high:
        if nums[mid] == 0:
            nums[low], nums[mid] = nums[mid], nums[low]
            low += 1
            mid += 1
        elif nums[mid] == 1:
            mid += 1
        else:
            nums[mid], nums[high] = nums[high], nums[mid]
            high -= 1
    return nums
`,
    javascript: `function sortColors(nums) {
  let low = 0
  let mid = 0
  let high = nums.length - 1
  while (mid <= high) {
    if (nums[mid] === 0) {
      ;[nums[low], nums[mid]] = [nums[mid], nums[low]]
      low++
      mid++
    } else if (nums[mid] === 1) {
      mid++
    } else {
      ;[nums[mid], nums[high]] = [nums[high], nums[mid]]
      high--
    }
  }
  return nums
}`,
    slow: {
      python: `def sortColors(nums):
    for end in range(len(nums) - 1, 0, -1):
        for i in range(end):
            if nums[i] > nums[i + 1]:
                nums[i], nums[i + 1] = nums[i + 1], nums[i]
    return nums
`,
      javascript: `function sortColors(nums) {
  for (let end = nums.length - 1; end > 0; end--) {
    for (let i = 0; i < end; i++) {
      if (nums[i] > nums[i + 1]) [nums[i], nums[i + 1]] = [nums[i + 1], nums[i]]
    }
  }
  return nums
}`,
    },
  },
  'search-insert': {
    python: `def searchInsert(nums, target):
    lo, hi = 0, len(nums)
    while lo < hi:
        mid = (lo + hi) // 2
        if nums[mid] < target:
            lo = mid + 1
        else:
            hi = mid
    return lo
`,
    javascript: `function searchInsert(nums, target) {
  let lo = 0
  let hi = nums.length
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2)
    if (nums[mid] < target) lo = mid + 1
    else hi = mid
  }
  return lo
}`,
    slow: {
      python: `def searchInsert(nums, target):
    for i in range(len(nums)):
        if nums[i] >= target:
            return i
    return len(nums)
`,
      javascript: `function searchInsert(nums, target) {
  for (let i = 0; i < nums.length; i++) {
    if (nums[i] >= target) return i
  }
  return nums.length
}`,
    },
  },
  'search-range': {
    python: `def searchRange(nums, target):
    def first_at_least(x):
        lo, hi = 0, len(nums)
        while lo < hi:
            mid = (lo + hi) // 2
            if nums[mid] < x:
                lo = mid + 1
            else:
                hi = mid
        return lo

    first = first_at_least(target)
    if first == len(nums) or nums[first] != target:
        return [-1, -1]
    return [first, first_at_least(target + 1) - 1]
`,
    javascript: `function searchRange(nums, target) {
  const firstAtLeast = (x) => {
    let lo = 0
    let hi = nums.length
    while (lo < hi) {
      const mid = Math.floor((lo + hi) / 2)
      if (nums[mid] < x) lo = mid + 1
      else hi = mid
    }
    return lo
  }
  const first = firstAtLeast(target)
  if (first === nums.length || nums[first] !== target) return [-1, -1]
  return [first, firstAtLeast(target + 1) - 1]
}`,
    slow: {
      python: `def searchRange(nums, target):
    first, last = -1, -1
    for i in range(len(nums)):
        if nums[i] == target:
            if first == -1:
                first = i
            last = i
    return [first, last]
`,
      javascript: `function searchRange(nums, target) {
  let first = -1
  let last = -1
  for (let i = 0; i < nums.length; i++) {
    if (nums[i] === target) {
      if (first === -1) first = i
      last = i
    }
  }
  return [first, last]
}`,
    },
  },
  'find-min-rotated': {
    python: `def findMin(nums):
    lo, hi = 0, len(nums) - 1
    while lo < hi:
        mid = (lo + hi) // 2
        if nums[mid] > nums[hi]:
            lo = mid + 1
        else:
            hi = mid
    return nums[lo]
`,
    javascript: `function findMin(nums) {
  let lo = 0
  let hi = nums.length - 1
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2)
    if (nums[mid] > nums[hi]) lo = mid + 1
    else hi = mid
  }
  return nums[lo]
}`,
    slow: {
      python: `def findMin(nums):
    smallest = nums[0]
    for n in nums:
        if n < smallest:
            smallest = n
    return smallest
`,
      javascript: `function findMin(nums) {
  let smallest = nums[0]
  for (const n of nums) {
    if (n < smallest) smallest = n
  }
  return smallest
}`,
    },
  },
  'koko-bananas': {
    python: `def minEatingSpeed(piles, h):
    lo, hi = 1, max(piles)
    while lo < hi:
        k = (lo + hi) // 2
        hours = 0
        for p in piles:
            hours += (p + k - 1) // k
        if hours <= h:
            hi = k
        else:
            lo = k + 1
    return lo
`,
    javascript: `function minEatingSpeed(piles, h) {
  let lo = 1
  let hi = Math.max(...piles)
  while (lo < hi) {
    const k = Math.floor((lo + hi) / 2)
    let hours = 0
    for (const p of piles) hours += Math.ceil(p / k)
    if (hours <= h) hi = k
    else lo = k + 1
  }
  return lo
}`,
    slow: {
      python: `def minEatingSpeed(piles, h):
    k = 1
    while True:
        hours = 0
        for p in piles:
            hours += (p + k - 1) // k
        if hours <= h:
            return k
        k += 1
`,
      javascript: `function minEatingSpeed(piles, h) {
  for (let k = 1; ; k++) {
    let hours = 0
    for (const p of piles) hours += Math.ceil(p / k)
    if (hours <= h) return k
  }
}`,
    },
  },
  'min-cost-stairs': {
    python: `def minCostClimbingStairs(cost):
    best = [0, 0]
    for i in range(2, len(cost) + 1):
        best.append(min(best[i - 1] + cost[i - 1], best[i - 2] + cost[i - 2]))
    return best[len(cost)]
`,
    javascript: `function minCostClimbingStairs(cost) {
  const best = [0, 0]
  for (let i = 2; i <= cost.length; i++) {
    best.push(Math.min(best[i - 1] + cost[i - 1], best[i - 2] + cost[i - 2]))
  }
  return best[cost.length]
}`,
    slow: {
      python: `def minCostClimbingStairs(cost):
    def reach(i):
        if i <= 1:
            return 0
        return min(reach(i - 1) + cost[i - 1], reach(i - 2) + cost[i - 2])
    return reach(len(cost))
`,
      javascript: `function minCostClimbingStairs(cost) {
  const reach = (i) => {
    if (i <= 1) return 0
    return Math.min(reach(i - 1) + cost[i - 1], reach(i - 2) + cost[i - 2])
  }
  return reach(cost.length)
}`,
    },
  },
  'longest-increasing-subsequence': {
    python: `def lengthOfLIS(nums):
    best = [1] * len(nums)
    for i in range(len(nums)):
        for j in range(i):
            if nums[j] < nums[i]:
                best[i] = max(best[i], best[j] + 1)
    return max(best)
`,
    javascript: `function lengthOfLIS(nums) {
  const best = new Array(nums.length).fill(1)
  for (let i = 0; i < nums.length; i++) {
    for (let j = 0; j < i; j++) {
      if (nums[j] < nums[i]) best[i] = Math.max(best[i], best[j] + 1)
    }
  }
  return Math.max(...best)
}`,
    slow: {
      python: `def lengthOfLIS(nums):
    def longest(i, last):
        if i == len(nums):
            return 0
        skip = longest(i + 1, last)
        if nums[i] > last:
            return max(skip, 1 + longest(i + 1, nums[i]))
        return skip
    return longest(0, float("-inf"))
`,
      javascript: `function lengthOfLIS(nums) {
  const longest = (i, last) => {
    if (i === nums.length) return 0
    const skip = longest(i + 1, last)
    if (nums[i] > last) return Math.max(skip, 1 + longest(i + 1, nums[i]))
    return skip
  }
  return longest(0, -Infinity)
}`,
    },
  },
  'word-break': {
    python: `def wordBreak(s, wordDict):
    words = set(wordDict)
    ok = [True] + [False] * len(s)
    for i in range(1, len(s) + 1):
        for j in range(i):
            if ok[j] and s[j:i] in words:
                ok[i] = True
                break
    return ok[len(s)]
`,
    javascript: `function wordBreak(s, wordDict) {
  const words = new Set(wordDict)
  const ok = [true, ...new Array(s.length).fill(false)]
  for (let i = 1; i <= s.length; i++) {
    for (let j = 0; j < i; j++) {
      if (ok[j] && words.has(s.slice(j, i))) {
        ok[i] = true
        break
      }
    }
  }
  return ok[s.length]
}`,
    slow: {
      python: `def wordBreak(s, wordDict):
    if s == "":
        return True
    for w in wordDict:
        if s.startswith(w) and wordBreak(s[len(w):], wordDict):
            return True
    return False
`,
      javascript: `function wordBreak(s, wordDict) {
  if (s === '') return true
  for (const w of wordDict) {
    if (s.startsWith(w) && wordBreak(s.slice(w.length), wordDict)) return true
  }
  return false
}`,
    },
  },
  'partition-equal-subset': {
    python: `def canPartition(nums):
    total = sum(nums)
    if total % 2 == 1:
        return False
    half = total // 2
    can = [True] + [False] * half
    for n in nums:
        for s in range(half, n - 1, -1):
            if can[s - n]:
                can[s] = True
    return can[half]
`,
    javascript: `function canPartition(nums) {
  const total = nums.reduce((a, b) => a + b, 0)
  if (total % 2 === 1) return false
  const half = total / 2
  const can = [true, ...new Array(half).fill(false)]
  for (const n of nums) {
    for (let s = half; s >= n; s--) {
      if (can[s - n]) can[s] = true
    }
  }
  return can[half]
}`,
    slow: {
      python: `def canPartition(nums):
    total = sum(nums)
    if total % 2 == 1:
        return False

    def pick(i, left):
        if left == 0:
            return True
        if i == len(nums) or left < 0:
            return False
        return pick(i + 1, left - nums[i]) or pick(i + 1, left)

    return pick(0, total // 2)
`,
      javascript: `function canPartition(nums) {
  const total = nums.reduce((a, b) => a + b, 0)
  if (total % 2 === 1) return false
  const pick = (i, left) => {
    if (left === 0) return true
    if (i === nums.length || left < 0) return false
    return pick(i + 1, left - nums[i]) || pick(i + 1, left)
  }
  return pick(0, total / 2)
}`,
    },
  },
}
