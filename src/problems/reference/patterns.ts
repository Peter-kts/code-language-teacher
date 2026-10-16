import type { References } from './types'

// Worked answers for the patterns set (sets/patterns.ts). See types.ts.

export const PATTERNS: References = {
  'contains-duplicate': {
    python: `def containsDuplicate(nums):
    seen = set()
    for n in nums:
        if n in seen:
            return True
        seen.add(n)
    return False
`,
    javascript: `function containsDuplicate(nums) {
  const seen = new Set()
  for (const n of nums) {
    if (seen.has(n)) return true
    seen.add(n)
  }
  return false
}`,
    slow: {
      python: `def containsDuplicate(nums):
    for i in range(len(nums)):
        for j in range(i + 1, len(nums)):
            if nums[i] == nums[j]:
                return True
    return False
`,
      javascript: `function containsDuplicate(nums) {
  for (let i = 0; i < nums.length; i++) {
    for (let j = i + 1; j < nums.length; j++) {
      if (nums[i] === nums[j]) return true
    }
  }
  return false
}`,
    },
  },
  'product-except-self': {
    python: `def productExceptSelf(nums):
    answer = [1] * len(nums)
    left = 1
    for i in range(len(nums)):
        answer[i] = left
        left *= nums[i]
    right = 1
    for i in range(len(nums) - 1, -1, -1):
        answer[i] *= right
        right *= nums[i]
    return answer
`,
    javascript: `function productExceptSelf(nums) {
  const answer = new Array(nums.length).fill(1)
  let left = 1
  for (let i = 0; i < nums.length; i++) {
    answer[i] = left
    left *= nums[i]
  }
  let right = 1
  for (let i = nums.length - 1; i >= 0; i--) {
    answer[i] *= right
    right *= nums[i]
  }
  return answer
}`,
    slow: {
      python: `def productExceptSelf(nums):
    answer = []
    for i in range(len(nums)):
        product = 1
        for j in range(len(nums)):
            if j != i:
                product *= nums[j]
        answer.append(product)
    return answer
`,
      javascript: `function productExceptSelf(nums) {
  const answer = []
  for (let i = 0; i < nums.length; i++) {
    let product = 1
    for (let j = 0; j < nums.length; j++) {
      if (j !== i) product *= nums[j]
    }
    answer.push(product)
  }
  return answer
}`,
    },
  },
  'container-water': {
    python: `def maxArea(height):
    left, right = 0, len(height) - 1
    best = 0
    while left < right:
        water = (right - left) * min(height[left], height[right])
        best = max(best, water)
        if height[left] < height[right]:
            left += 1
        else:
            right -= 1
    return best
`,
    javascript: `function maxArea(height) {
  let left = 0
  let right = height.length - 1
  let best = 0
  while (left < right) {
    const water = (right - left) * Math.min(height[left], height[right])
    best = Math.max(best, water)
    if (height[left] < height[right]) left++
    else right--
  }
  return best
}`,
    slow: {
      python: `def maxArea(height):
    best = 0
    for i in range(len(height)):
        for j in range(i + 1, len(height)):
            best = max(best, (j - i) * min(height[i], height[j]))
    return best
`,
      javascript: `function maxArea(height) {
  let best = 0
  for (let i = 0; i < height.length; i++) {
    for (let j = i + 1; j < height.length; j++) {
      best = Math.max(best, (j - i) * Math.min(height[i], height[j]))
    }
  }
  return best
}`,
    },
  },
  'three-sum': {
    python: `def threeSum(nums):
    nums.sort()
    out = []
    for i in range(len(nums)):
        if i > 0 and nums[i] == nums[i - 1]:
            continue
        left, right = i + 1, len(nums) - 1
        while left < right:
            total = nums[i] + nums[left] + nums[right]
            if total < 0:
                left += 1
            elif total > 0:
                right -= 1
            else:
                out.append([nums[i], nums[left], nums[right]])
                left += 1
                while left < right and nums[left] == nums[left - 1]:
                    left += 1
    return out
`,
    javascript: `function threeSum(nums) {
  nums.sort((a, b) => a - b)
  const out = []
  for (let i = 0; i < nums.length; i++) {
    if (i > 0 && nums[i] === nums[i - 1]) continue
    let left = i + 1
    let right = nums.length - 1
    while (left < right) {
      const total = nums[i] + nums[left] + nums[right]
      if (total < 0) left++
      else if (total > 0) right--
      else {
        out.push([nums[i], nums[left], nums[right]])
        left++
        while (left < right && nums[left] === nums[left - 1]) left++
      }
    }
  }
  return out
}`,
    slow: {
      python: `def threeSum(nums):
    found = set()
    n = len(nums)
    for i in range(n):
        for j in range(i + 1, n):
            for k in range(j + 1, n):
                if nums[i] + nums[j] + nums[k] == 0:
                    found.add(tuple(sorted([nums[i], nums[j], nums[k]])))
    return [list(t) for t in found]
`,
      javascript: `function threeSum(nums) {
  const found = new Map()
  const n = nums.length
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      for (let k = j + 1; k < n; k++) {
        if (nums[i] + nums[j] + nums[k] === 0) {
          const triplet = [nums[i], nums[j], nums[k]].sort((a, b) => a - b)
          found.set(triplet.join(","), triplet)
        }
      }
    }
  }
  return [...found.values()]
}`,
    },
  },
  'min-subarray-sum': {
    python: `def minSubArrayLen(target, nums):
    best = len(nums) + 1
    total = 0
    left = 0
    for right in range(len(nums)):
        total += nums[right]
        while total >= target:
            best = min(best, right - left + 1)
            total -= nums[left]
            left += 1
    return 0 if best > len(nums) else best
`,
    javascript: `function minSubArrayLen(target, nums) {
  let best = Infinity
  let total = 0
  let left = 0
  for (let right = 0; right < nums.length; right++) {
    total += nums[right]
    while (total >= target) {
      best = Math.min(best, right - left + 1)
      total -= nums[left]
      left++
    }
  }
  return best === Infinity ? 0 : best
}`,
    slow: {
      python: `def minSubArrayLen(target, nums):
    best = 0
    for start in range(len(nums)):
        total = 0
        for end in range(start, len(nums)):
            total += nums[end]
            if total >= target:
                if best == 0 or end - start + 1 < best:
                    best = end - start + 1
                break
    return best
`,
      javascript: `function minSubArrayLen(target, nums) {
  let best = 0
  for (let start = 0; start < nums.length; start++) {
    let total = 0
    for (let end = start; end < nums.length; end++) {
      total += nums[end]
      if (total >= target) {
        if (best === 0 || end - start + 1 < best) best = end - start + 1
        break
      }
    }
  }
  return best
}`,
    },
  },
  'char-replacement': {
    python: `def characterReplacement(s, k):
    counts = {}
    left = 0
    most = 0
    best = 0
    for right in range(len(s)):
        ch = s[right]
        counts[ch] = counts.get(ch, 0) + 1
        most = max(most, counts[ch])
        while right - left + 1 - most > k:
            counts[s[left]] -= 1
            left += 1
        best = max(best, right - left + 1)
    return best
`,
    javascript: `function characterReplacement(s, k) {
  const counts = new Map()
  let left = 0
  let most = 0
  let best = 0
  for (let right = 0; right < s.length; right++) {
    const ch = s[right]
    counts.set(ch, (counts.get(ch) ?? 0) + 1)
    most = Math.max(most, counts.get(ch))
    while (right - left + 1 - most > k) {
      counts.set(s[left], counts.get(s[left]) - 1)
      left++
    }
    best = Math.max(best, right - left + 1)
  }
  return best
}`,
    slow: {
      python: `def characterReplacement(s, k):
    best = 0
    for start in range(len(s)):
        counts = {}
        most = 0
        for end in range(start, len(s)):
            counts[s[end]] = counts.get(s[end], 0) + 1
            most = max(most, counts[s[end]])
            if end - start + 1 - most > k:
                break
            best = max(best, end - start + 1)
    return best
`,
      javascript: `function characterReplacement(s, k) {
  let best = 0
  for (let start = 0; start < s.length; start++) {
    const counts = new Map()
    let most = 0
    for (let end = start; end < s.length; end++) {
      counts.set(s[end], (counts.get(s[end]) ?? 0) + 1)
      most = Math.max(most, counts.get(s[end]))
      if (end - start + 1 - most > k) break
      best = Math.max(best, end - start + 1)
    }
  }
  return best
}`,
    },
  },
  'daily-temperatures': {
    python: `def dailyTemperatures(temperatures):
    answer = [0] * len(temperatures)
    stack = []
    for i, temp in enumerate(temperatures):
        while stack and temperatures[stack[-1]] < temp:
            j = stack.pop()
            answer[j] = i - j
        stack.append(i)
    return answer
`,
    javascript: `function dailyTemperatures(temperatures) {
  const answer = new Array(temperatures.length).fill(0)
  const stack = []
  for (let i = 0; i < temperatures.length; i++) {
    while (stack.length && temperatures[stack[stack.length - 1]] < temperatures[i]) {
      const j = stack.pop()
      answer[j] = i - j
    }
    stack.push(i)
  }
  return answer
}`,
    slow: {
      python: `def dailyTemperatures(temperatures):
    answer = [0] * len(temperatures)
    for i in range(len(temperatures)):
        for j in range(i + 1, len(temperatures)):
            if temperatures[j] > temperatures[i]:
                answer[i] = j - i
                break
    return answer
`,
      javascript: `function dailyTemperatures(temperatures) {
  const answer = new Array(temperatures.length).fill(0)
  for (let i = 0; i < temperatures.length; i++) {
    for (let j = i + 1; j < temperatures.length; j++) {
      if (temperatures[j] > temperatures[i]) {
        answer[i] = j - i
        break
      }
    }
  }
  return answer
}`,
    },
  },
  'search-rotated': {
    python: `def searchRotated(nums, target):
    lo, hi = 0, len(nums) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if nums[mid] == target:
            return mid
        if nums[lo] <= nums[mid]:
            if nums[lo] <= target < nums[mid]:
                hi = mid - 1
            else:
                lo = mid + 1
        else:
            if nums[mid] < target <= nums[hi]:
                lo = mid + 1
            else:
                hi = mid - 1
    return -1
`,
    javascript: `function searchRotated(nums, target) {
  let lo = 0
  let hi = nums.length - 1
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2)
    if (nums[mid] === target) return mid
    if (nums[lo] <= nums[mid]) {
      if (nums[lo] <= target && target < nums[mid]) hi = mid - 1
      else lo = mid + 1
    } else {
      if (nums[mid] < target && target <= nums[hi]) lo = mid + 1
      else hi = mid - 1
    }
  }
  return -1
}`,
    slow: {
      python: `def searchRotated(nums, target):
    for i in range(len(nums)):
        if nums[i] == target:
            return i
    return -1
`,
      javascript: `function searchRotated(nums, target) {
  for (let i = 0; i < nums.length; i++) {
    if (nums[i] === target) return i
  }
  return -1
}`,
    },
  },
  'merge-intervals': {
    python: `def mergeIntervals(intervals):
    intervals.sort()
    merged = []
    for start, end in intervals:
        if merged and start <= merged[-1][1]:
            merged[-1][1] = max(merged[-1][1], end)
        else:
            merged.append([start, end])
    return merged
`,
    javascript: `function mergeIntervals(intervals) {
  intervals.sort((a, b) => a[0] - b[0])
  const merged = []
  for (const [start, end] of intervals) {
    const last = merged[merged.length - 1]
    if (last && start <= last[1]) last[1] = Math.max(last[1], end)
    else merged.push([start, end])
  }
  return merged
}`,
  },
  'insert-interval': {
    python: `def insertInterval(intervals, newInterval):
    out = []
    start, end = newInterval
    i = 0
    while i < len(intervals) and intervals[i][1] < start:
        out.append(intervals[i])
        i += 1
    while i < len(intervals) and intervals[i][0] <= end:
        start = min(start, intervals[i][0])
        end = max(end, intervals[i][1])
        i += 1
    out.append([start, end])
    while i < len(intervals):
        out.append(intervals[i])
        i += 1
    return out
`,
    javascript: `function insertInterval(intervals, newInterval) {
  const out = []
  let [start, end] = newInterval
  let i = 0
  while (i < intervals.length && intervals[i][1] < start) {
    out.push(intervals[i])
    i++
  }
  while (i < intervals.length && intervals[i][0] <= end) {
    start = Math.min(start, intervals[i][0])
    end = Math.max(end, intervals[i][1])
    i++
  }
  out.push([start, end])
  while (i < intervals.length) {
    out.push(intervals[i])
    i++
  }
  return out
}`,
  },
  'house-robber': {
    python: `def rob(nums):
    two_back, one_back = 0, 0
    for n in nums:
        two_back, one_back = one_back, max(one_back, two_back + n)
    return one_back
`,
    javascript: `function rob(nums) {
  let twoBack = 0
  let oneBack = 0
  for (const n of nums) {
    const best = Math.max(oneBack, twoBack + n)
    twoBack = oneBack
    oneBack = best
  }
  return oneBack
}`,
    slow: {
      python: `def rob(nums):
    def best(i):
        if i >= len(nums):
            return 0
        return max(best(i + 1), nums[i] + best(i + 2))
    return best(0)
`,
      javascript: `function rob(nums) {
  function best(i) {
    if (i >= nums.length) return 0
    return Math.max(best(i + 1), nums[i] + best(i + 2))
  }
  return best(0)
}`,
    },
  },
  'coin-change': {
    python: `def coinChange(coins, amount):
    best = [0] + [float("inf")] * amount
    for a in range(1, amount + 1):
        for c in coins:
            if c <= a:
                best[a] = min(best[a], best[a - c] + 1)
    return -1 if best[amount] == float("inf") else best[amount]
`,
    javascript: `function coinChange(coins, amount) {
  const best = [0, ...new Array(amount).fill(Infinity)]
  for (let a = 1; a <= amount; a++) {
    for (const c of coins) {
      if (c <= a) best[a] = Math.min(best[a], best[a - c] + 1)
    }
  }
  return best[amount] === Infinity ? -1 : best[amount]
}`,
    slow: {
      python: `def coinChange(coins, amount):
    def fewest(a):
        if a == 0:
            return 0
        best = -1
        for c in coins:
            if c <= a:
                rest = fewest(a - c)
                if rest != -1 and (best == -1 or rest + 1 < best):
                    best = rest + 1
        return best
    return fewest(amount)
`,
      javascript: `function coinChange(coins, amount) {
  function fewest(a) {
    if (a === 0) return 0
    let best = -1
    for (const c of coins) {
      if (c <= a) {
        const rest = fewest(a - c)
        if (rest !== -1 && (best === -1 || rest + 1 < best)) best = rest + 1
      }
    }
    return best
  }
  return fewest(amount)
}`,
    },
  },
}
