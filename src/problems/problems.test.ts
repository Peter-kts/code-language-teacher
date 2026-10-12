import { describe, expect, it } from 'vitest'
import { runTests, runTraced } from '../js/runtime'
import { PYTHON_CARDS } from '../syntax/cards'
import { PROBLEMS } from './problems'

describe('problems', () => {
  it('have unique ids, hints and tests', () => {
    const ids = PROBLEMS.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const p of PROBLEMS) {
      expect(p.hints.length, p.id).toBeGreaterThan(0)
      expect(p.tests.length, p.id).toBeGreaterThan(0)
      expect(p.starters.python, p.id).toContain(`def ${p.functionName}(`)
      expect(p.starters.javascript, p.id).toContain(`function ${p.functionName}(`)
    }
  })

  it('have JavaScript starters that run without an error', () => {
    for (const p of PROBLEMS) {
      const run = runTraced(p.starters.javascript, { name: p.functionName, args: p.tests[0].args })
      expect(run.ok && run.error, p.id).toBe(null)
    }
  })

  it('can be solved in JavaScript', () => {
    for (const p of PROBLEMS) {
      const results = runTests(JS_SOLUTIONS[p.functionName], p.functionName, p.tests)
      expect(results.filter((r) => !r.passed), p.id).toEqual([])
    }
  })

  it('link only to glossary entries that exist', () => {
    const cards = new Set(PYTHON_CARDS.map((c) => c.id))
    for (const p of PROBLEMS) for (const c of p.concepts) expect(cards.has(c), `${p.id} → ${c}`).toBe(true)
  })
})

// One answer per problem, to check the JavaScript runner and the tests agree.
const JS_SOLUTIONS: Record<string, string> = {
  fizzBuzz: `function fizzBuzz(n) {
  const out = []
  for (let i = 1; i <= n; i++) {
    if (i % 15 === 0) out.push("FizzBuzz")
    else if (i % 3 === 0) out.push("Fizz")
    else if (i % 5 === 0) out.push("Buzz")
    else out.push(String(i))
  }
  return out
}`,
  findMax: `function findMax(nums) {
  let best = nums[0]
  for (const n of nums) if (n > best) best = n
  return best
}`,
  runningSum: `function runningSum(nums) {
  let total = 0
  const out = []
  for (const n of nums) {
    total += n
    out.push(total)
  }
  return out
}`,
  reverseList: `function reverseList(nums) {
  let l = 0
  let r = nums.length - 1
  while (l < r) {
    ;[nums[l], nums[r]] = [nums[r], nums[l]]
    l++
    r--
  }
  return nums
}`,
  twoSum: `function twoSum(nums, target) {
  const seen = new Map()
  for (const [i, num] of nums.entries()) {
    if (seen.has(target - num)) return [seen.get(target - num), i]
    seen.set(num, i)
  }
}`,
  isAnagram: `function isAnagram(s, t) {
  if (s.length !== t.length) return false
  const counts = new Map()
  for (const ch of s) counts.set(ch, (counts.get(ch) ?? 0) + 1)
  for (const ch of t) {
    if (!counts.get(ch)) return false
    counts.set(ch, counts.get(ch) - 1)
  }
  return true
}`,
  isValid: `function isValid(s) {
  const pairs = { ")": "(", "]": "[", "}": "{" }
  const stack = []
  for (const ch of s) {
    if (ch in pairs) {
      if (stack.pop() !== pairs[ch]) return false
    } else stack.push(ch)
  }
  return stack.length === 0
}`,
  maxProfit: `function maxProfit(prices) {
  let lowest = prices[0]
  let profit = 0
  for (const p of prices) {
    lowest = Math.min(lowest, p)
    profit = Math.max(profit, p - lowest)
  }
  return profit
}`,
  moveZeroes: `function moveZeroes(nums) {
  let slow = 0
  for (let fast = 0; fast < nums.length; fast++) {
    if (nums[fast] !== 0) {
      ;[nums[slow], nums[fast]] = [nums[fast], nums[slow]]
      slow++
    }
  }
  return nums
}`,
  search: `function search(nums, target) {
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
  merge: `function merge(a, b) {
  let i = 0
  let j = 0
  const out = []
  while (i < a.length && j < b.length) {
    if (a[i] <= b[j]) out.push(a[i++])
    else out.push(b[j++])
  }
  return [...out, ...a.slice(i), ...b.slice(j)]
}`,
  climbStairs: `function climbStairs(n) {
  const ways = [1, 1]
  for (let i = 2; i <= n; i++) ways.push(ways[i - 1] + ways[i - 2])
  return ways[n]
}`,
  maxSubArray: `function maxSubArray(nums) {
  let current = nums[0]
  let best = nums[0]
  for (const n of nums.slice(1)) {
    current = Math.max(n, current + n)
    best = Math.max(best, current)
  }
  return best
}`,
  lengthOfLongestSubstring: `function lengthOfLongestSubstring(s) {
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
  groupAnagrams: `function groupAnagrams(strs) {
  const groups = new Map()
  for (const word of strs) {
    const key = [...word].sort().join("")
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(word)
  }
  return [...groups.values()]
}`,
}
