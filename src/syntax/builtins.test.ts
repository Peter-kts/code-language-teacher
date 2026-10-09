import { describe, expect, it } from 'vitest'
import { BUILTIN_FUNCTIONS, BUILTIN_METHODS, builtinAt } from './builtins'
import { PYTHON_CARDS } from './cards'

const nameAt = (line: string, word: string) => builtinAt(line, line.indexOf(word) + 1)?.builtin.name ?? null

describe('built-in hover', () => {
  it('links only to glossary entries that exist', () => {
    const ids = new Set(PYTHON_CARDS.map((c) => c.id))
    for (const b of [...BUILTIN_FUNCTIONS, ...BUILTIN_METHODS]) if (b.card) expect(ids).toContain(b.card)
  })

  it('finds a called built-in function under the mouse', () => {
    const line = 'for i, n in enumerate(nums):'
    expect(nameAt(line, 'enumerate')).toBe('enumerate')
    expect(builtinAt(line, line.indexOf('enumerate'))?.start).toBe(line.indexOf('enumerate'))
    expect(nameAt(line, 'nums')).toBeNull()
    expect(nameAt('total = sum (nums)', 'sum')).toBe('sum')
  })

  it('finds methods after a dot', () => {
    expect(nameAt('seen.add(n)', 'add')).toBe('add')
    expect(nameAt('words = ", ".join(parts)', 'join')).toBe('join')
    expect(nameAt('for k, v in d.items():', 'items')).toBe('items')
    // A method name on its own is just a name.
    expect(nameAt('add(1, 2)', 'add')).toBeNull()
  })

  it("leaves the learner's own names alone", () => {
    expect(nameAt('max = 0', 'max')).toBeNull()
    expect(nameAt('if n > max:', 'max')).toBeNull()
    expect(nameAt('def sum(a, b):', 'sum')).toBeNull()
    expect(nameAt('obj.enumerate()', 'enumerate')).toBeNull()
  })

  it('ignores strings and comments', () => {
    expect(nameAt('print("len(x)")', 'len')).toBeNull()
    expect(nameAt("s = 'it\\'s len(x)'", 'len')).toBeNull()
    expect(nameAt('x = 1  # use len(x)', 'len')).toBeNull()
    expect(nameAt('print("#", len(x))', 'len')).toBe('len')
    expect(nameAt('print("a") or len(x)', 'len')).toBe('len')
  })
})
