import { describe, expect, it } from 'vitest'
import { BUILTIN_FUNCTIONS, BUILTIN_METHODS, builtinAt, nameAt } from './builtins'
import { PYTHON_CARDS } from './cards'
import { jsBuiltinAt, JS_FUNCTIONS, JS_METHODS, JS_STATICS } from './jsBuiltins'
import { JS_CARDS } from './jsCards'

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
    // # inside an f-string's {...} is a format spec, not a comment.
    expect(builtinNamed('print(f"{n:#x}", len(xs))', 'len')).toBe('len')
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

const jsNamed = (line: string, word: string) => jsBuiltinAt(line, line.indexOf(word) + 1)?.builtin.name ?? null

describe('JavaScript built-in hover', () => {
  it('links only to JavaScript glossary entries that exist', () => {
    const ids = new Set(JS_CARDS.map((c) => c.id))
    for (const b of [...JS_STATICS, ...JS_FUNCTIONS, ...JS_METHODS]) expect(ids, b.name).toContain(b.card)
  })

  it('explains Math.max and friends from either half of the name', () => {
    const line = 'best = Math.max(best, n)'
    expect(jsNamed(line, 'max')).toBe('Math.max')
    expect(jsNamed(line, 'Math')).toBe('Math.max')
    expect(jsBuiltinAt(line, line.indexOf('max'))).toMatchObject({ start: line.indexOf('Math'), end: line.indexOf('(') })
    expect(jsNamed('console.log(total)', 'log')).toBe('console.log')
    expect(jsNamed('for (const [k, v] of Object.entries(o)) {', 'entries')).toBe('Object.entries')
  })

  it('finds methods and properties after a dot', () => {
    expect(jsNamed('seen.add(n)', 'add')).toBe('add')
    expect(jsNamed('counts.set(ch, (counts.get(ch) ?? 0) + 1)', 'get')).toBe('get')
    expect(jsNamed('const total = nums.reduce((a, b) => a + b, 0)', 'reduce')).toBe('reduce')
    expect(jsNamed('while (i < nums.length) {', 'length')).toBe('length')
    expect(jsNamed('for (const [i, n] of nums.entries()) {', 'entries')).toBe('entries')
  })

  it('finds constructors and called functions, not plain names', () => {
    expect(jsNamed('const seen = new Map()', 'Map')).toBe('Map')
    expect(jsNamed('const n = parseInt(s, 10)', 'parseInt')).toBe('parseInt')
    expect(jsNamed('const max = 0', 'max')).toBeNull()
    expect(jsNamed('function Set(a) {', 'Set')).toBeNull()
    expect(jsNamed('push(1)', 'push')).toBeNull()
  })

  it('ignores strings and comments, but not template literal code', () => {
    expect(jsNamed('console.log("Math.max(a, b)")', 'max')).toBeNull()
    expect(jsNamed('x = 1 // nums.push(2)', 'push')).toBeNull()
    expect(jsNamed('x = 1 /* nums.push(2) */', 'push')).toBeNull()
    expect(jsNamed('const s = `max ${Math.max(a, b)}`', 'max(')).toBe('Math.max')
    expect(jsNamed('const s = `Math.max(a, b)`', 'max')).toBeNull()
  })

  it('finds names with $ for variable values', () => {
    expect(nameAt('$el.push(x)', 1, 'javascript')).toEqual({ name: '$el', start: 0, end: 3, afterDot: false })
  })
})
