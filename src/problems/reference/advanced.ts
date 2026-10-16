import { MIN_HEAP } from '../sets/advanced'
import type { References } from './types'

// Worked answers for the advanced set (sets/advanced.ts): heaps, 2D dynamic programming and
// a few hard classics. See types.ts.

export const ADVANCED: References = {
  'last-stone-weight': {
    python: `import heapq

def lastStoneWeight(stones):
    heap = [-s for s in stones]
    heapq.heapify(heap)
    while len(heap) > 1:
        a = -heapq.heappop(heap)
        b = -heapq.heappop(heap)
        if a != b:
            heapq.heappush(heap, -(a - b))
    return -heap[0] if heap else 0
`,
    javascript: `${MIN_HEAP}
function lastStoneWeight(stones) {
  const heap = new MinHeap((a, b) => a > b)
  for (const s of stones) heap.push(s)
  while (heap.size > 1) {
    const a = heap.pop()
    const b = heap.pop()
    if (a !== b) heap.push(a - b)
  }
  return heap.size > 0 ? heap.peek() : 0
}
`,
  },
  'kth-largest': {
    python: `import heapq

def findKthLargest(nums, k):
    heap = []
    for n in nums:
        heapq.heappush(heap, n)
        if len(heap) > k:
            heapq.heappop(heap)
    return heap[0]
`,
    javascript: `${MIN_HEAP}
function findKthLargest(nums, k) {
  const heap = new MinHeap()
  for (const n of nums) {
    heap.push(n)
    if (heap.size > k) heap.pop()
  }
  return heap.peek()
}
`,
    slow: {
      python: `def findKthLargest(nums, k):
    nums = nums[:]
    for _ in range(k - 1):
        best = 0
        for i in range(len(nums)):
            if nums[i] > nums[best]:
                best = i
        nums.pop(best)
    best = nums[0]
    for n in nums:
        if n > best:
            best = n
    return best
`,
      javascript: `function findKthLargest(nums, k) {
  nums = [...nums]
  for (let pass = 0; pass < k - 1; pass++) {
    let best = 0
    for (let i = 0; i < nums.length; i++) {
      if (nums[i] > nums[best]) best = i
    }
    nums.splice(best, 1)
  }
  let best = nums[0]
  for (const n of nums) if (n > best) best = n
  return best
}
`,
    },
  },
  'top-k-frequent': {
    python: `import heapq

def topKFrequent(nums, k):
    counts = {}
    for n in nums:
        counts[n] = counts.get(n, 0) + 1
    heap = []
    for n, c in counts.items():
        heapq.heappush(heap, (c, n))
        if len(heap) > k:
            heapq.heappop(heap)
    return [n for c, n in heap]
`,
    javascript: `${MIN_HEAP}
function topKFrequent(nums, k) {
  const counts = new Map()
  for (const n of nums) counts.set(n, (counts.get(n) ?? 0) + 1)
  const heap = new MinHeap((a, b) => a[0] < b[0])
  for (const [n, c] of counts) {
    heap.push([c, n])
    if (heap.size > k) heap.pop()
  }
  return heap.items.map(([c, n]) => n)
}
`,
  },
  'unique-paths': {
    python: `def uniquePaths(m, n):
    dp = [[1] * n for _ in range(m)]
    for r in range(1, m):
        for c in range(1, n):
            dp[r][c] = dp[r - 1][c] + dp[r][c - 1]
    return dp[m - 1][n - 1]
`,
    javascript: `function uniquePaths(m, n) {
  const dp = Array.from({ length: m }, () => new Array(n).fill(1))
  for (let r = 1; r < m; r++) {
    for (let c = 1; c < n; c++) {
      dp[r][c] = dp[r - 1][c] + dp[r][c - 1]
    }
  }
  return dp[m - 1][n - 1]
}
`,
    slow: {
      python: `def uniquePaths(m, n):
    if m == 1 or n == 1:
        return 1
    return uniquePaths(m - 1, n) + uniquePaths(m, n - 1)
`,
      javascript: `function uniquePaths(m, n) {
  if (m === 1 || n === 1) return 1
  return uniquePaths(m - 1, n) + uniquePaths(m, n - 1)
}
`,
    },
  },
  'longest-common-subsequence': {
    python: `def longestCommonSubsequence(text1, text2):
    m, n = len(text1), len(text2)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if text1[i - 1] == text2[j - 1]:
                dp[i][j] = dp[i - 1][j - 1] + 1
            else:
                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])
    return dp[m][n]
`,
    javascript: `function longestCommonSubsequence(text1, text2) {
  const m = text1.length
  const n = text2.length
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (text1[i - 1] === text2[j - 1]) dp[i][j] = dp[i - 1][j - 1] + 1
      else dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
    }
  }
  return dp[m][n]
}
`,
    slow: {
      python: `def longestCommonSubsequence(text1, text2):
    def best(i, j):
        if i == len(text1) or j == len(text2):
            return 0
        if text1[i] == text2[j]:
            return 1 + best(i + 1, j + 1)
        return max(best(i + 1, j), best(i, j + 1))
    return best(0, 0)
`,
      javascript: `function longestCommonSubsequence(text1, text2) {
  function best(i, j) {
    if (i === text1.length || j === text2.length) return 0
    if (text1[i] === text2[j]) return 1 + best(i + 1, j + 1)
    return Math.max(best(i + 1, j), best(i, j + 1))
  }
  return best(0, 0)
}
`,
    },
  },
  'edit-distance': {
    python: `def minDistance(word1, word2):
    m, n = len(word1), len(word2)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(m + 1):
        dp[i][0] = i
    for j in range(n + 1):
        dp[0][j] = j
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if word1[i - 1] == word2[j - 1]:
                dp[i][j] = dp[i - 1][j - 1]
            else:
                dp[i][j] = 1 + min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    return dp[m][n]
`,
    javascript: `function minDistance(word1, word2) {
  const m = word1.length
  const n = word2.length
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (word1[i - 1] === word2[j - 1]) dp[i][j] = dp[i - 1][j - 1]
      else dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    }
  }
  return dp[m][n]
}
`,
    slow: {
      python: `def minDistance(word1, word2):
    def cost(i, j):
        if i == len(word1):
            return len(word2) - j
        if j == len(word2):
            return len(word1) - i
        if word1[i] == word2[j]:
            return cost(i + 1, j + 1)
        return 1 + min(cost(i + 1, j), cost(i, j + 1), cost(i + 1, j + 1))
    return cost(0, 0)
`,
      javascript: `function minDistance(word1, word2) {
  function cost(i, j) {
    if (i === word1.length) return word2.length - j
    if (j === word2.length) return word1.length - i
    if (word1[i] === word2[j]) return cost(i + 1, j + 1)
    return 1 + Math.min(cost(i + 1, j), cost(i, j + 1), cost(i + 1, j + 1))
  }
  return cost(0, 0)
}
`,
    },
  },
  'trapping-rain-water': {
    python: `def trap(height):
    l, r = 0, len(height) - 1
    left_max, right_max = 0, 0
    water = 0
    while l < r:
        if height[l] < height[r]:
            left_max = max(left_max, height[l])
            water += left_max - height[l]
            l += 1
        else:
            right_max = max(right_max, height[r])
            water += right_max - height[r]
            r -= 1
    return water
`,
    javascript: `function trap(height) {
  let l = 0
  let r = height.length - 1
  let leftMax = 0
  let rightMax = 0
  let water = 0
  while (l < r) {
    if (height[l] < height[r]) {
      leftMax = Math.max(leftMax, height[l])
      water += leftMax - height[l]
      l++
    } else {
      rightMax = Math.max(rightMax, height[r])
      water += rightMax - height[r]
      r--
    }
  }
  return water
}
`,
    slow: {
      python: `def trap(height):
    water = 0
    for i in range(len(height)):
        left_max = 0
        for j in range(i + 1):
            left_max = max(left_max, height[j])
        right_max = 0
        for j in range(i, len(height)):
            right_max = max(right_max, height[j])
        water += min(left_max, right_max) - height[i]
    return water
`,
      javascript: `function trap(height) {
  let water = 0
  for (let i = 0; i < height.length; i++) {
    let leftMax = 0
    for (let j = 0; j <= i; j++) leftMax = Math.max(leftMax, height[j])
    let rightMax = 0
    for (let j = i; j < height.length; j++) rightMax = Math.max(rightMax, height[j])
    water += Math.min(leftMax, rightMax) - height[i]
  }
  return water
}
`,
    },
  },
  'largest-rectangle': {
    python: `def largestRectangleArea(heights):
    stack = []  # indexes of bars, heights going up
    best = 0
    for i, h in enumerate(heights + [0]):
        start = i
        while stack and heights[stack[-1]] >= h:
            j = stack.pop()
            left = stack[-1] + 1 if stack else 0
            best = max(best, heights[j] * (i - left))
        stack.append(i)
    return best
`,
    javascript: `function largestRectangleArea(heights) {
  const stack = [] // indexes of bars, heights going up
  let best = 0
  for (let i = 0; i <= heights.length; i++) {
    const h = i < heights.length ? heights[i] : 0
    while (stack.length > 0 && heights[stack[stack.length - 1]] >= h) {
      const j = stack.pop()
      const left = stack.length > 0 ? stack[stack.length - 1] + 1 : 0
      best = Math.max(best, heights[j] * (i - left))
    }
    stack.push(i)
  }
  return best
}
`,
    slow: {
      python: `def largestRectangleArea(heights):
    best = 0
    for i in range(len(heights)):
        low = heights[i]
        for j in range(i, len(heights)):
            low = min(low, heights[j])
            best = max(best, low * (j - i + 1))
    return best
`,
      javascript: `function largestRectangleArea(heights) {
  let best = 0
  for (let i = 0; i < heights.length; i++) {
    let low = heights[i]
    for (let j = i; j < heights.length; j++) {
      low = Math.min(low, heights[j])
      best = Math.max(best, low * (j - i + 1))
    }
  }
  return best
}
`,
    },
  },
  'merge-k-sorted': {
    python: `import heapq

def mergeKLists(lists):
    heap = []
    for i, node in enumerate(lists):
        if node:
            heapq.heappush(heap, (node.val, i, node))
    dummy = ListNode()
    tail = dummy
    while heap:
        val, i, node = heapq.heappop(heap)
        tail.next = node
        tail = node
        if node.next:
            heapq.heappush(heap, (node.next.val, i, node.next))
    return dummy.next
`,
    javascript: `${MIN_HEAP}
function mergeKLists(lists) {
  const heap = new MinHeap((a, b) => a.val < b.val)
  for (const node of lists) if (node) heap.push(node)
  const dummy = new ListNode()
  let tail = dummy
  while (heap.size > 0) {
    const node = heap.pop()
    tail.next = node
    tail = node
    if (node.next) heap.push(node.next)
  }
  return dummy.next
}
`,
    slow: {
      python: `def mergeKLists(lists):
    heads = lists[:]
    dummy = ListNode()
    tail = dummy
    while True:
        best = -1
        for i in range(len(heads)):
            if heads[i] and (best == -1 or heads[i].val < heads[best].val):
                best = i
        if best == -1:
            return dummy.next
        tail.next = heads[best]
        tail = heads[best]
        heads[best] = heads[best].next
`,
      javascript: `function mergeKLists(lists) {
  const heads = [...lists]
  const dummy = new ListNode()
  let tail = dummy
  while (true) {
    let best = -1
    for (let i = 0; i < heads.length; i++) {
      if (heads[i] && (best === -1 || heads[i].val < heads[best].val)) best = i
    }
    if (best === -1) return dummy.next
    tail.next = heads[best]
    tail = heads[best]
    heads[best] = heads[best].next
  }
}
`,
    },
  },
}
