import { describe, expect, it } from 'vitest'
import { BUILTIN_FUNCTIONS, BUILTIN_METHODS, builtinAt, nameAt } from './builtins'
import { PYTHON_CARDS } from './cards'

const builtinNamed = (line: string, word: string) => builtinAt(line, line.indexOf(word) + 1)?.builtin.name ?? null

describe('built-in hover', () => {
  it('links only to glossary entries that exist', () => {
    const ids = new Set(PYTHON_CARDS.map((c) => c.id))
    for (const b of [...BUILTIN_FUNCTIONS, ...BUILTIN_METHODS]) if (b.card) expect(ids).toContain(b.card)
  })

  it('finds a called built-in function under the mouse', () => {
    const line = 'for i, n in enumerate(nums):'
    expect(builtinNamed(line, 'enumerate')).toBe('enumerate')
    expect(builtinAt(line, line.indexOf('enumerate'))?.start).toBe(line.indexOf('enumerate'))
    expect(builtinNamed(line, 'nums')).toBeNull()
    expect(builtinNamed('total = sum (nums)', 'sum')).toBe('sum')
  })

  it('finds methods after a dot', () => {
    expect(builtinNamed('seen.add(n)', 'add')).toBe('add')
    expect(builtinNamed('words = ", ".join(parts)', 'join')).toBe('join')
    expect(builtinNamed('for k, v in d.items():', 'items')).toBe('items')
    // A method name on its own is just a name.
    expect(builtinNamed('add(1, 2)', 'add')).toBeNull()
  })

  it("leaves the learner's own names alone", () => {
    expect(builtinNamed('max = 0', 'max')).toBeNull()
    expect(builtinNamed('if n > max:', 'max')).toBeNull()
    expect(builtinNamed('def sum(a, b):', 'sum')).toBeNull()
    expect(builtinNamed('obj.enumerate()', 'enumerate')).toBeNull()
  })

  it('ignores strings and comments', () => {
    expect(builtinNamed('print("len(x)")', 'len')).toBeNull()
    expect(builtinNamed("s = 'it\\'s len(x)'", 'len')).toBeNull()
    expect(builtinNamed('x = 1  # use len(x)', 'len')).toBeNull()
    expect(builtinNamed('print("#", len(x))', 'len')).toBe('len')
    expect(builtinNamed('print("a") or len(x)', 'len')).toBe('len')
    // Inside an f-string, the {...} parts are code.
    expect(builtinNamed('print(f"size {len(xs)}")', 'len')).toBe('len')
    expect(builtinNamed("print(rf'{max(a, b)} wins')", 'max')).toBe('max')
    expect(builtinNamed('print(f"{{len(xs)}}")', 'len')).toBeNull()
    expect(builtinNamed('print(f"{n} is len(x)")', 'len')).toBeNull()
    expect(builtinNamed('print(elf"len(x)")', 'len')).toBeNull()
  })

  it('finds the name under the mouse for variable values', () => {
    const line = 'total += nums[i]  # i is the index'
    expect(nameAt(line, 1)).toEqual({ name: 'total', start: 0, end: 5, afterDot: false })
    expect(nameAt(line, line.indexOf('i]'))?.name).toBe('i')
    expect(nameAt(line, line.indexOf('index'))).toBeNull()
    expect(nameAt('seen.add(n)', 6)?.afterDot).toBe(true)
    expect(nameAt('x = 1', 2)).toBeNull()
  })
})
