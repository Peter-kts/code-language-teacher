import { describe, expect, it } from 'vitest'
import { containerChanges, findNames, previousInFrame, scalarChanges, stepRoles, type Plans } from './changes'
import type { AssignPlan, Brief, ExprPlan, LoopPlan, Step, TargetPlan, Value } from '../types'

const int = (x: number): Value => ({ type: 'prim', repr: String(x), value: x })
const str = (x: string): Value => ({ type: 'prim', repr: `'${x}'`, value: x })
const list = (...xs: (number | string)[]): Value => ({
  type: 'list',
  items: xs.map((x) => (typeof x === 'number' ? int(x) : str(x))),
  truncated: false,
})
const dict = (...entries: [string, number][]): Value => ({
  type: 'dict',
  entries: entries.map(([k, v]) => [str(k), int(v)]),
  truncated: false,
})
const step = (vars: Step['vars'], line = 1, func = '<module>', ran?: Step['ran']): Step => ({
  line,
  func,
  vars,
  hidden: {},
  stdout: '',
  ...(ran && { ran }),
})

// Plans as the tracer writes them, for one-line programs (columns are made up but unique).
let nextId = 0
const part = (text: string, rest: object): ExprPlan => ({ id: ++nextId, text, line: 1, start: nextId, end: nextId + 1, ...rest }) as ExprPlan
const name = (n: string) => part(n, { kind: 'name', name: n })
const sub = (n: string, key: ExprPlan, text = `${n}[${key.text}]`) => part(text, { kind: 'sub', name: n, of: null, key })
const bin = (left: ExprPlan, op: string, right: ExprPlan) => part(`${left.text} ${op} ${right.text}`, { kind: 'bin', op, left, right })
const call = (text: string, ...parts: ExprPlan[]) => part(text, { kind: 'other', parts })
const seq = (...items: ExprPlan[]) => part(items.map((i) => i.text).join(', '), { kind: 'seq', items })
const lit = (x: number | string): ExprPlan => ({
  kind: 'const',
  text: typeof x === 'number' ? String(x) : `"${x}"`,
  value: typeof x === 'number' ? [String(x), x] : [`'${x}'`, null],
})
const to = (n: string): TargetPlan => ({ kind: 'name', name: n })
const toItem = (n: string, key: ExprPlan): TargetPlan => ({ kind: 'item', name: n, key, text: `${n}[${key.text}]` })
const assign = (targets: TargetPlan[], value: ExprPlan, op: string | null = null, line = 1): AssignPlan => ({ line, op, targets, value })
const plans = (assigns: AssignPlan[], loops: LoopPlan[] = [], pointers: Plans['pointers'] = []): Plans => ({ plans: assigns, loops, pointers })
/** What the tracer records while the line runs: each part's value, by id. */
const ran = (...values: [ExprPlan, string | number][]): Record<string, Brief> =>
  Object.fromEntries(values.map(([p, v]) => [String(p.id), typeof v === 'number' ? [String(v), v] : [v, null]]))

describe('scalarChanges', () => {
  it('shows what `total += n + ages["test"]` added: +16 = 4 (n) + 12 (ages["test"])', () => {
    const n = name('n')
    const ages = sub('ages', lit('test'))
    const sum = bin(n, '+', ages)
    const why = plans([assign([to('total')], sum, '+')])
    const prev = step({ total: int(0), n: int(4), ages: dict(['test', 12]) })
    const next = step({ total: int(16), n: int(4), ages: dict(['test', 12]) }, 2, '<module>', ran([n, 4], [ages, 12], [sum, 16]))
    expect(scalarChanges(next, prev, why)).toEqual({
      total: {
        before: '0',
        deltas: [
          {
            text: '+16',
            from: null,
            sum: [
              { sign: 1, value: '4', label: 'n' },
              { sign: 1, value: '12', label: 'ages["test"]' },
            ],
          },
        ],
      },
    })
    const roles = stepRoles(next, prev, why)
    expect(roles.targets).toEqual(['total'])
    expect(roles.sources).toEqual(['n'])
    expect(roles.reads).toEqual([
      { name: 'n', gave: [{ value: '4', to: 'total' }], start: n.start, end: n.end },
      { name: 'ages', item: "'test'", gave: [{ value: '12', to: 'total' }], start: ages.start, end: ages.end },
    ])
  })

  it('names a single source, as in `total += n` and `total = total + n`', () => {
    const n = name('n')
    const prev = step({ total: int(4), n: int(8) })
    const next = (p: ExprPlan, v: number) => step({ total: int(12), n: int(8) }, 2, '<module>', ran([n, 8], [p, v]))
    const plus = plans([assign([to('total')], n, '+')])
    expect(scalarChanges(next(n, 8), prev, plus).total.deltas).toEqual([{ text: '+8', from: 'n' }])
    const total = name('total')
    const longhand = bin(total, '+', n)
    const spelled = plans([assign([to('total')], longhand)])
    const after = step({ total: int(12), n: int(8) }, 2, '<module>', ran([total, 4], [n, 8], [longhand, 12]))
    expect(scalarChanges(after, prev, spelled).total.deltas).toEqual([{ text: '+8', from: 'n' }])
  })

  it('signs each part of `total -= a + b`', () => {
    const a = name('a')
    const b = name('b')
    const ab = bin(a, '+', b)
    const prev = step({ total: int(1), a: int(3), b: int(5) })
    const next = step({ total: int(-7), a: int(3), b: int(5) }, 2, '<module>', ran([a, 3], [b, 5], [ab, 8]))
    const why = plans([assign([to('total')], ab, '-')])
    expect(scalarChanges(next, prev, why).total.deltas).toEqual([
      {
        text: '-8',
        from: null,
        sum: [
          { sign: -1, value: '3', label: 'a' },
          { sign: -1, value: '5', label: 'b' },
        ],
      },
    ])
    expect(stepRoles(next, prev, why).reads.map((r) => r.gave)).toEqual([[{ value: '-3', to: 'total' }], [{ value: '-5', to: 'total' }]])
  })

  it('pairs up `a, b = b, a + b` and uses the values from before the line', () => {
    const b1 = name('b')
    const a2 = name('a')
    const b2 = name('b')
    const ab = bin(a2, '+', b2)
    const why = plans([assign([{ kind: 'seq', items: [to('a'), to('b')] }], seq(b1, ab))])
    const prev = step({ a: int(3), b: int(5) })
    const next = step({ a: int(5), b: int(8) }, 2, '<module>', ran([b1, 5], [a2, 3], [b2, 5], [ab, 8]))
    expect(scalarChanges(next, prev, why)).toEqual({
      a: { before: '3', deltas: [{ text: '=', from: 'b' }] },
      b: { before: '5', deltas: [{ text: '+3', from: 'a' }] },
    })
    // Both changed, so neither is a source; what each gave still shows.
    const roles = stepRoles(next, prev, why)
    expect(roles.sources).toEqual([])
    expect(roles.reads.map((r) => [r.name, r.gave])).toEqual([
      ['b', [{ value: '5', to: 'a' }]],
      ['a', [{ value: '3', to: 'b' }]],
      ['b', []],
    ])
  })

  it('says nothing more for `x = 5`, and what other operators did', () => {
    const prev = step({ x: int(3), k: int(4) })
    expect(scalarChanges(step({ x: int(5), k: int(4) }), prev, plans([assign([to('x')], lit(5))])).x.deltas).toEqual([])
    const k = name('k')
    const times = plans([assign([to('x')], k, '*')])
    expect(scalarChanges(step({ x: int(12), k: int(4) }, 2, '<module>', ran([k, 4])), prev, times).x.deltas).toEqual([
      { text: '×4', from: 'k' },
    ])
  })

  it('shortens long code: `best = max(best, count[c])` reads `= max(…)`', () => {
    const best = name('best')
    const c = name('c')
    const count = sub('count', c)
    const max = call('max(best, count[c])', best, count)
    const why = plans([assign([to('best')], max)])
    const prev = step({ best: int(1), c: str('a'), count: dict(['a', 9]) })
    const next = step({ best: int(9), c: str('a'), count: dict(['a', 9]) }, 2, '<module>', ran([best, 1], [count, 9], [c, "'a'"], [max, 9]))
    expect(scalarChanges(next, prev, why).best.deltas).toEqual([{ text: '=', from: 'max(…)' }])
    const roles = stepRoles(next, prev, why)
    expect(roles.sources).toEqual(['c'])
    expect(roles.reads.map((r) => [r.name, r.item])).toEqual([
      ['best', undefined],
      ['count', "'a'"],
      ['c', undefined],
    ])
  })

  it('falls back to the plain difference without recorded values', () => {
    const n = name('n')
    const why = plans([assign([to('total')], bin(n, '+', name('m')), '+')])
    const prev = step({ total: int(1), n: int(2), m: int(3) })
    expect(scalarChanges(step({ total: int(6), n: int(2), m: int(3) }), prev, why).total.deltas).toEqual([
      { text: '+5', from: null },
    ])
  })

  it('says which item a loop variable now holds', () => {
    const loop: LoopPlan = { line: 1, item: 'n', over: 'nums', index: null, start: 10, end: 14 }
    const why = plans([], [loop], [{ label: 'n', var: '_ct_idx_1_0', target: 'nums' }])
    const prev = step({ nums: list(4, 8), n: int(4) })
    const next = { ...step({ nums: list(4, 8), n: int(8) }, 2), hidden: { _ct_idx_1_0: 1 } }
    expect(scalarChanges(next, prev, why).n.deltas).toEqual([{ text: '=', from: 'nums[1]' }])
    expect(stepRoles(next, prev, why).reads).toEqual([{ name: 'nums', item: '1', gave: [], start: 10, end: 14 }])
    // A dict hands out keys, not `count[1]`.
    const keys = plans([], [{ ...loop, over: 'count' }], [{ label: 'n', var: '_ct_idx_1_0', target: 'count' }])
    const before = step({ count: dict(['a', 1], ['b', 2]), n: str('a') })
    const after = { ...step({ count: dict(['a', 1], ['b', 2]), n: str('b') }, 2), hidden: { _ct_idx_1_0: 1 } }
    expect(scalarChanges(after, before, keys).n.deltas).toEqual([])
  })

  it('handles floats and non-numbers', () => {
    const prev = step({ f: { type: 'prim', repr: '0.1', value: 0.1 }, s: str('a') })
    const next = step({ f: { type: 'prim', repr: '0.3', value: 0.30000000000000004 }, s: str('ab') })
    expect(scalarChanges(next, prev)).toEqual({
      f: { before: '0.1', deltas: [{ text: '+0.2', from: null }] },
      s: { before: "'a'", deltas: [] },
    })
  })

  it('ignores new variables and frame switches', () => {
    expect(scalarChanges(step({ a: int(1) }), step({}))).toEqual({})
    expect(scalarChanges(step({ a: int(2) }, 1, 'f'), step({ a: int(1) }))).toEqual({})
  })
})

describe('containerChanges', () => {
  const NEW = { text: 'new', from: null }

  it('explains a list item from the boxes it read: dp[i] = dp[i - 1] + dp[i - 2]', () => {
    const i = name('i')
    const left = sub('dp', bin(name('i'), '-', lit(1)))
    const right = sub('dp', bin(name('i'), '-', lit(2)))
    const sum = bin(left, '+', right)
    const key = name('i')
    const why = plans([assign([toItem('dp', key)], sum)])
    const keyOf = (p: ExprPlan) => (p.kind === 'sub' && p.key?.kind === 'bin' ? p.key : null)!
    const prev = step({ dp: list(0, 1, 1, 0), i: int(3) })
    const next = step(
      { dp: list(0, 1, 1, 2), i: int(3) },
      2,
      '<module>',
      ran([keyOf(left), 2], [left, 1], [keyOf(right), 1], [right, 1], [sum, 2], [key, 3], [i, 3]),
    )
    expect(containerChanges(next, prev, why)).toEqual({
      dp: {
        summary: [],
        parts: {
          3: [
            {
              text: '=',
              from: null,
              sum: [
                { sign: 1, value: '1', label: 'dp[i - 1]' },
                { sign: 1, value: '1', label: 'dp[i - 2]' },
              ],
            },
          ],
        },
      },
    })
    const reads = stepRoles(next, prev, why).reads
    expect(reads.filter((r) => r.item !== undefined).map((r) => [r.item, r.gave])).toEqual([
      ['2', [{ value: '1', to: 'dp[3]' }]],
      ['1', [{ value: '1', to: 'dp[3]' }]],
    ])
  })

  it('counts with `count[c] = count.get(c, 0) + 1` as +1', () => {
    const c = name('c')
    const get = sub('count', c, 'count.get(c, 0)')
    const sum = bin(get, '+', lit(1))
    const key = name('c')
    const why = plans([assign([toItem('count', key)], sum)])
    const prev = step({ count: dict(['b', 1], ['a', 1]), c: str('a') })
    const next = step({ count: dict(['b', 1], ['a', 2]), c: str('a') }, 2, '<module>', ran([c, "'a'"], [get, 1], [sum, 2], [key, "'a'"]))
    expect(containerChanges(next, prev, why).count.parts).toEqual({ "'a'": [{ text: '+1', from: null }] })
    expect(stepRoles(next, prev, why).sources).toEqual(['c'])
  })

  it('lights up what a method call was given: stack.append(n)', () => {
    const n = name('n')
    const why = plans([assign([to('stack')], call('stack.append(n)', n), 'call')])
    const prev = step({ stack: list(1), n: int(4) })
    const next = step({ stack: list(1, 4), n: int(4) }, 2, '<module>', ran([n, 4]))
    expect(containerChanges(next, prev, why).stack.parts).toEqual({ 1: [NEW] })
    expect(stepRoles(next, prev, why).sources).toEqual(['n'])
  })

  it('marks appended and front-inserted items as new', () => {
    expect(containerChanges(step({ xs: list(1, 2, 9) }), step({ xs: list(1, 2) })).xs.parts).toEqual({ 2: [NEW] })
    expect(containerChanges(step({ xs: list(0, 1, 2) }), step({ xs: list(1, 2) })).xs.parts).toEqual({ 0: [NEW] })
  })

  it('sums up removals and reorders on the list itself', () => {
    expect(containerChanges(step({ xs: list(1, 2) }), step({ xs: list(1, 2, 3) })).xs).toEqual({
      summary: [{ text: '-1 item', from: null }],
      parts: {},
    })
    expect(containerChanges(step({ xs: list(3) }), step({ xs: list(1, 2, 3) })).xs.summary).toEqual([
      { text: '-2 items', from: null },
    ])
    expect(containerChanges(step({ xs: list(1, 2, 3) }), step({ xs: list(3, 1, 2) })).xs).toEqual({
      summary: [{ text: 'reordered', from: null }],
      parts: {},
    })
  })

  it('gives set items their old value, and changed numbers their difference', () => {
    const prev = step({ xs: list(1, 2, 'a') })
    const next = step({ xs: list(8, 2, 'z') })
    const why = plans([assign([{ kind: 'seq', items: [toItem('xs', lit(0)), toItem('xs', lit(2))] }], seq(lit(8), lit('z')))])
    expect(containerChanges(next, prev, why).xs.parts).toEqual({
      0: [{ text: 'was 1', from: null }],
      2: [{ text: "was 'a'", from: null }],
    })
    expect(containerChanges(next, prev).xs.parts[0]).toEqual([{ text: '+7', from: null }])
  })

  it('tracks dict keys: new, updated and removed', () => {
    const prev = step({ seen: dict(['a', 1], ['b', 2]), c: int(3) })
    const next = step({ seen: dict(['a', 4], ['c', 0]), c: int(3) })
    expect(containerChanges(next, prev).seen).toEqual({
      summary: [{ text: '-1 key', from: null }],
      parts: { "'a'": [{ text: '+3', from: null }], "'c'": [NEW] },
    })
  })

  it('ignores unchanged containers, scalars and frame switches', () => {
    expect(containerChanges(step({ xs: list(1), n: int(2) }), step({ xs: list(1), n: int(1) }))).toEqual({})
    expect(containerChanges(step({ xs: list(2) }, 1, 'f'), step({ xs: list(1) }))).toEqual({})
  })
})

describe('previousInFrame', () => {
  it('compares against the previous step in the same function, skipping the call', () => {
    const steps = [step({}, 1), step({ x: int(1) }, 2, 'f'), step({ r: int(1) }, 3)]
    expect(previousInFrame(steps, 2)).toBe(steps[0])
    expect(previousInFrame(steps, 1)).toBeUndefined()
  })

  it('keeps recursive calls of one function apart', () => {
    const steps = [
      { ...step({ n: int(2) }, 2, 'fact'), frame: 2 },
      { ...step({ n: int(1) }, 2, 'fact'), frame: 3 },
      { ...step({ n: int(1) }, 3, 'fact'), frame: 3 },
      { ...step({ n: int(2) }, 3, 'fact'), frame: 2 },
    ]
    expect(previousInFrame(steps, 1)).toBeUndefined()
    expect(previousInFrame(steps, 3)).toBe(steps[0])
  })
})

describe('stepRoles', () => {
  it('has no roles when nothing changed', () => {
    const s = step({ total: int(1) })
    expect(stepRoles(s, s)).toEqual({ targets: [], sources: [], reads: [] })
  })
})

describe('findNames', () => {
  it('finds whole names and skips strings and comments', () => {
    expect(findNames("    total += n  # add n", ['total', 'n'])).toEqual([
      { name: 'total', start: 5, end: 10 },
      { name: 'n', start: 14, end: 15 },
    ])
    expect(findNames("print('n', nums[n])", ['n'])).toEqual([{ name: 'n', start: 17, end: 18 }])
  })
})
