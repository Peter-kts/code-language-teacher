import type { References } from './types'

// Worked answers for the first set of problems (problems.ts). See types.ts.

export const FIRST: References = {
  fizzbuzz: {
    python: `def fizzBuzz(n):
    out = []
    for i in range(1, n + 1):
        if i % 15 == 0:
            out.append("FizzBuzz")
        elif i % 3 == 0:
            out.append("Fizz")
        elif i % 5 == 0:
            out.append("Buzz")
        else:
            out.append(str(i))
    return out
`,
    javascript: `function fizzBuzz(n) {
  const out = []
  for (let i = 1; i <= n; i++) {
    if (i % 15 === 0) out.push("FizzBuzz")
    else if (i % 3 === 0) out.push("Fizz")
    else if (i % 5 === 0) out.push("Buzz")
    else out.push(String(i))
  }
  return out
}`,
  },
  'find-max': {
    python: `def findMax(nums):
    best = nums[0]
    for n in nums:
        if n > best:
            best = n
    return best
`,
    javascript: `function findMax(nums) {
  let best = nums[0]
  for (const n of nums) if (n > best) best = n
  return best
}`,
  },
  'running-sum': {
    python: `def runningSum(nums):
    total = 0
    out = []
    for n in nums:
        total += n
        out.append(total)
    return out
`,
    javascript: `function runningSum(nums) {
  let total = 0
  const out = []
  for (const n of nums) {
    total += n
    out.push(total)
  }
  return out
}`,
  },
  'reverse-list': {
    python: `def reverseList(nums):
    l, r = 0, len(nums) - 1
    while l < r:
        nums[l], nums[r] = nums[r], nums[l]
        l += 1
        r -= 1
    return nums
`,
    javascript: `function reverseList(nums) {
  let l = 0
  let r = nums.length - 1
  while (l < r) {
    ;[nums[l], nums[r]] = [nums[r], nums[l]]
    l++
    r--
  }
  return nums
}`,
  },
  'two-sum': {
    python: `def twoSum(nums, target):
    seen = {}
    for i, num in enumerate(nums):
        need = target - num
        if need in seen:
            return [seen[need], i]
        seen[num] = i
`,
    javascript: `function twoSum(nums, target) {
  const seen = new Map()
  for (const [i, num] of nums.entries()) {
    if (seen.has(target - num)) return [seen.get(target - num), i]
    seen.set(num, i)
  }
}`,
    slow: {
      python: `def twoSum(nums, target):
    for i in range(len(nums)):
        for j in range(i + 1, len(nums)):
            if nums[i] + nums[j] == target:
                return [i, j]
`,
      javascript: `function twoSum(nums, target) {
  for (let i = 0; i < nums.length; i++) {
    for (let j = i + 1; j < nums.length; j++) {
      if (nums[i] + nums[j] === target) return [i, j]
    }
  }
}`,
    },
  },
  'valid-anagram': {
    python: `def isAnagram(s, t):
    if len(s) != len(t):
        return False
    counts = {}
    for ch in s:
        counts[ch] = counts.get(ch, 0) + 1
    for ch in t:
        if counts.get(ch, 0) == 0:
            return False
        counts[ch] -= 1
    return True
`,
    javascript: `function isAnagram(s, t) {
  if (s.length !== t.length) return false
  const counts = new Map()
  for (const ch of s) counts.set(ch, (counts.get(ch) ?? 0) + 1)
  for (const ch of t) {
    if (!counts.get(ch)) return false
    counts.set(ch, counts.get(ch) - 1)
  }
  return true
}`,
  },
  'valid-parentheses': {
    python: `def isValid(s):
    pairs = {")": "(", "]": "[", "}": "{"}
    stack = []
    for ch in s:
        if ch in pairs:
            if not stack or stack.pop() != pairs[ch]:
                return False
        else:
            stack.append(ch)
    return not stack
`,
    javascript: `function isValid(s) {
  const pairs = { ")": "(", "]": "[", "}": "{" }
  const stack = []
  for (const ch of s) {
    if (ch in pairs) {
      if (stack.pop() !== pairs[ch]) return false
    } else stack.push(ch)
  }
  return stack.length === 0
}`,
  },
  'best-time-stock': {
    python: `def maxProfit(prices):
    lowest = prices[0]
    profit = 0
    for p in prices:
        lowest = min(lowest, p)
        profit = max(profit, p - lowest)
    return profit
`,
    javascript: `function maxProfit(prices) {
  let lowest = prices[0]
  let profit = 0
  for (const p of prices) {
    lowest = Math.min(lowest, p)
    profit = Math.max(profit, p - lowest)
  }
  return profit
}`,
    slow: {
      python: `def maxProfit(prices):
    best = 0
    for buy in range(len(prices)):
        for sell in range(buy + 1, len(prices)):
            best = max(best, prices[sell] - prices[buy])
    return best
`,
      javascript: `function maxProfit(prices) {
  let best = 0
  for (let buy = 0; buy < prices.length; buy++) {
    for (let sell = buy + 1; sell < prices.length; sell++) {
      best = Math.max(best, prices[sell] - prices[buy])
    }
  }
  return best
}`,
    },
  },
  'move-zeroes': {
    python: `def moveZeroes(nums):
    slow = 0
    for fast in range(len(nums)):
        if nums[fast] != 0:
            nums[slow], nums[fast] = nums[fast], nums[slow]
            slow += 1
    return nums
`,
    javascript: `function moveZeroes(nums) {
  let slow = 0
  for (let fast = 0; fast < nums.length; fast++) {
    if (nums[fast] !== 0) {
      ;[nums[slow], nums[fast]] = [nums[fast], nums[slow]]
      slow++
    }
  }
  return nums
}`,
    slow: {
      python: `def moveZeroes(nums):
    end = len(nums)
    i = 0
    while i < end:
        if nums[i] == 0:
            for j in range(i, len(nums) - 1):
                nums[j] = nums[j + 1]
            nums[-1] = 0
            end -= 1
        else:
            i += 1
    return nums
`,
      javascript: `function moveZeroes(nums) {
  let end = nums.length
  let i = 0
  while (i < end) {
    if (nums[i] === 0) {
      for (let j = i; j < nums.length - 1; j++) nums[j] = nums[j + 1]
      nums[nums.length - 1] = 0
      end--
    } else i++
  }
  return nums
}`,
    },
  },
  'binary-search': {
    python: `def search(nums, target):
    lo, hi = 0, len(nums) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if nums[mid] == target:
            return mid
        if nums[mid] < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return -1
`,
    javascript: `function search(nums, target) {
  let lo = 0
  let hi = nums.length - 1
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2)
    if (nums[mid] === target) return mid
    if (nums[mid] < target) lo = mid + 1
    else hi = mid - 1
  }
  return -1
}`,
    slow: {
      python: `def search(nums, target):
    for i in range(len(nums)):
        if nums[i] == target:
            return i
    return -1
`,
      javascript: `function search(nums, target) {
  for (let i = 0; i < nums.length; i++) {
    if (nums[i] === target) return i
  }
  return -1
}`,
    },
  },
  'merge-sorted': {
    python: `def merge(a, b):
    i, j = 0, 0
    out = []
    while i < len(a) and j < len(b):
        if a[i] <= b[j]:
            out.append(a[i])
            i += 1
        else:
            out.append(b[j])
            j += 1
    return out + a[i:] + b[j:]
`,
    javascript: `function merge(a, b) {
  let i = 0
  let j = 0
  const out = []
  while (i < a.length && j < b.length) {
    if (a[i] <= b[j]) out.push(a[i++])
    else out.push(b[j++])
  }
  return [...out, ...a.slice(i), ...b.slice(j)]
}`,
  },
  'climbing-stairs': {
    python: `def climbStairs(n):
    ways = [1, 1]
    for i in range(2, n + 1):
        ways.append(ways[i - 1] + ways[i - 2])
    return ways[n]
`,
    javascript: `function climbStairs(n) {
  const ways = [1, 1]
  for (let i = 2; i <= n; i++) ways.push(ways[i - 1] + ways[i - 2])
  return ways[n]
}`,
    slow: {
      python: `def climbStairs(n):
    if n <= 1:
        return 1
    return climbStairs(n - 1) + climbStairs(n - 2)
`,
      javascript: `function climbStairs(n) {
  if (n <= 1) return 1
  return climbStairs(n - 1) + climbStairs(n - 2)
}`,
    },
  },
  'max-subarray': {
    python: `def maxSubArray(nums):
    current = nums[0]
    best = nums[0]
    for n in nums[1:]:
        current = max(n, current + n)
        best = max(best, current)
    return best
`,
    javascript: `function maxSubArray(nums) {
  let current = nums[0]
  let best = nums[0]
  for (const n of nums.slice(1)) {
    current = Math.max(n, current + n)
    best = Math.max(best, current)
  }
  return best
}`,
    slow: {
      python: `def maxSubArray(nums):
    best = nums[0]
    for start in range(len(nums)):
        total = 0
        for end in range(start, len(nums)):
            total += nums[end]
            best = max(best, total)
    return best
`,
      javascript: `function maxSubArray(nums) {
  let best = nums[0]
  for (let start = 0; start < nums.length; start++) {
    let total = 0
    for (let end = start; end < nums.length; end++) {
      total += nums[end]
      best = Math.max(best, total)
    }
  }
  return best
}`,
    },
  },
  'longest-substring': {
    python: `def lengthOfLongestSubstring(s):
    last = {}
    left = 0
    best = 0
    for right, ch in enumerate(s):
        if last.get(ch, -1) >= left:
            left = last[ch] + 1
        last[ch] = right
        best = max(best, right - left + 1)
    return best
`,
    javascript: `function lengthOfLongestSubstring(s) {
  const last = new Map()
  let left = 0
  let best = 0
  for (let right = 0; right < s.length; right++) {
    const ch = s[right]
    if (last.has(ch) && last.get(ch) >= left) left = last.get(ch) + 1
    last.set(ch, right)
    best = Math.max(best, right - left + 1)
  }
  return best
}`,
    slow: {
      python: `def lengthOfLongestSubstring(s):
    best = 0
    for start in range(len(s)):
        seen = set()
        for ch in s[start:]:
            if ch in seen:
                break
            seen.add(ch)
        best = max(best, len(seen))
    return best
`,
      javascript: `function lengthOfLongestSubstring(s) {
  let best = 0
  for (let start = 0; start < s.length; start++) {
    const seen = new Set()
    for (let end = start; end < s.length; end++) {
      if (seen.has(s[end])) break
      seen.add(s[end])
    }
    best = Math.max(best, seen.size)
  }
  return best
}`,
    },
  },
  'group-anagrams': {
    python: `def groupAnagrams(strs):
    groups = {}
    for word in strs:
        key = "".join(sorted(word))
        groups.setdefault(key, []).append(word)
    return list(groups.values())
`,
    javascript: `function groupAnagrams(strs) {
  const groups = new Map()
  for (const word of strs) {
    const key = [...word].sort().join("")
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(word)
  }
  return [...groups.values()]
}`,
    slow: {
      python: `def groupAnagrams(strs):
    groups = []
    for word in strs:
        for group in groups:
            if sorted(group[0]) == sorted(word):
                group.append(word)
                break
        else:
            groups.append([word])
    return groups
`,
      javascript: `function groupAnagrams(strs) {
  const groups = []
  const key = (w) => [...w].sort().join("")
  for (const word of strs) {
    const group = groups.find((g) => key(g[0]) === key(word))
    if (group) group.push(word)
    else groups.push([word])
  }
  return groups
}`,
    },
  },
}
