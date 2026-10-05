// Built-in syntax cards. A stand-in for the Claude-powered chat, which needs a backend.

export interface SyntaxCard {
  title: string
  keywords: string[]
  explanation: string
  code: string
}

export const PYTHON_CARDS: SyntaxCard[] = [
  {
    title: 'For loop over a list',
    keywords: ['for', 'loop', 'iterate', 'each', 'array', 'list'],
    explanation: 'Visits each item in order. The loop variable holds the item itself, not its index.',
    code: 'nums = [4, 8, 15]\nfor n in nums:\n    print(n)\n',
  },
  {
    title: 'For loop with an index',
    keywords: ['for', 'loop', 'index', 'range', 'len', 'enumerate', 'i'],
    explanation: 'Use range(len(...)) when you need the position, or enumerate to get both.',
    code: 'nums = [4, 8, 15]\nfor i in range(len(nums)):\n    print(i, nums[i])\n\nfor i, n in enumerate(nums):\n    print(i, n)\n',
  },
  {
    title: 'While loop',
    keywords: ['while', 'loop', 'until', 'condition'],
    explanation: 'Repeats as long as the condition is true. Remember to change something so it ends.',
    code: 'count = 3\nwhile count > 0:\n    print(count)\n    count -= 1\n',
  },
  {
    title: 'Two pointers',
    keywords: ['two', 'pointers', 'left', 'right', 'reverse', 'leetcode', 'l', 'r'],
    explanation: 'Start one index at each end and walk them toward each other.',
    code: 'a = [1, 2, 3, 4, 5]\nl, r = 0, len(a) - 1\nwhile l < r:\n    a[l], a[r] = a[r], a[l]\n    l += 1\n    r -= 1\n',
  },
  {
    title: 'If / elif / else',
    keywords: ['if', 'else', 'elif', 'condition', 'branch'],
    explanation: 'Checks conditions top to bottom and runs the first block that matches.',
    code: 'x = 7\nif x > 10:\n    size = "big"\nelif x > 5:\n    size = "medium"\nelse:\n    size = "small"\n',
  },
  {
    title: 'Lists',
    keywords: ['list', 'array', 'append', 'pop', 'slice', 'length'],
    explanation: 'Lists are ordered and mutable. Index from 0; negative indexes count from the end.',
    code: 'a = [3, 1, 2]\na.append(5)\nlast = a.pop()\nfirst = a[0]\nend = a[-1]\nmiddle = a[1:3]\nsize = len(a)\n',
  },
  {
    title: 'Dictionaries (hash maps)',
    keywords: ['dict', 'dictionary', 'map', 'hash', 'hashmap', 'key', 'value', 'count'],
    explanation: 'Key to value lookups in constant time. The workhorse of many LeetCode problems.',
    code: 'counts = {}\nfor ch in "banana":\n    counts[ch] = counts.get(ch, 0) + 1\n',
  },
  {
    title: 'Functions',
    keywords: ['function', 'def', 'return', 'method', 'arguments'],
    explanation: 'def names a block of code that takes inputs and can return a result.',
    code: 'def total(xs):\n    s = 0\n    for x in xs:\n        s += x\n    return s\n\nresult = total([1, 2, 3])\n',
  },
]

/** Rank cards by how many query words match their title or keywords. */
export function searchCards(query: string, cards = PYTHON_CARDS): SyntaxCard[] {
  const words = query.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)
  if (words.length === 0) return cards
  return cards
    .map((card) => {
      const hay = [...card.keywords, ...card.title.toLowerCase().split(/\s+/)]
      return { card, score: words.filter((w) => hay.includes(w)).length }
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.card)
}
