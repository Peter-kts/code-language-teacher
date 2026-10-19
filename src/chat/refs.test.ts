import { describe, expect, it } from 'vitest'
import { parseRef, refExists, refLabel, splitRefs, takeTour, type RefContext } from './refs'

const ctx: RefContext = { lineCount: 5, stepCount: 20, vars: new Set(['nums', 'total', 'n']), glossary: new Set(['for-loop']) }

describe('parseRef', () => {
  it('reads each kind', () => {
    expect(parseRef('line:3')).toEqual({ kind: 'line', arg: '3' })
    expect(parseRef(' var: total ')).toEqual({ kind: 'var', arg: 'total' })
    expect(parseRef('console')).toEqual({ kind: 'console', arg: '' })
    expect(parseRef('glossary:for-loop')).toEqual({ kind: 'glossary', arg: 'for-loop' })
  })

  it('refuses anything else', () => {
    expect(parseRef('line:three')).toBeNull()
    expect(parseRef('var')).toBeNull()
    expect(parseRef('console:2')).toBeNull()
    expect(parseRef('cursor:3')).toBeNull()
    expect(parseRef('just words')).toBeNull()
  })
})

describe('refExists', () => {
  it('drops lines, steps and names that are not there', () => {
    expect(refExists({ kind: 'line', arg: '5' }, ctx)).toBe(true)
    expect(refExists({ kind: 'line', arg: '6' }, ctx)).toBe(false)
    expect(refExists({ kind: 'step', arg: '0' }, ctx)).toBe(false)
    expect(refExists({ kind: 'var', arg: 'total' }, ctx)).toBe(true)
    expect(refExists({ kind: 'var', arg: 'sum' }, ctx)).toBe(false)
    expect(refExists({ kind: 'glossary', arg: 'while-loop' }, ctx)).toBe(false)
    expect(refExists({ kind: 'console', arg: '' }, { ...ctx, stepCount: 0 })).toBe(false)
  })
})

describe('splitRefs', () => {
  it('turns references into parts and leaves other brackets alone', () => {
    expect(splitRefs('The loop on [[line:3]] adds to [[var:total]]. [[not a ref]]')).toEqual([
      { text: 'The loop on ' },
      { ref: { kind: 'line', arg: '3' }, raw: '[[line:3]]' },
      { text: ' adds to ' },
      { ref: { kind: 'var', arg: 'total' }, raw: '[[var:total]]' },
      { text: '. [[not a ref]]' },
    ])
    expect(refLabel({ kind: 'line', arg: '3' })).toBe('line 3')
  })

  it('reads Python and JavaScript names alike', () => {
    expect(splitRefs('[[var:my_list]] and [[var:$count]]').filter((p) => 'ref' in p)).toHaveLength(2)
  })
})

describe('takeTour', () => {
  const answer = 'Here is how it adds up.\n\n```tour\nline:3 | The loop starts here\n- var:nums | One box at a time\n2. [[step:12]] | total jumps to 16\nnonsense | skipped\n```'

  it('takes the stops out of the answer', () => {
    const { body, stops } = takeTour(answer)
    expect(body).toBe('Here is how it adds up.')
    expect(stops).toEqual([
      { ref: { kind: 'line', arg: '3' }, caption: 'The loop starts here' },
      { ref: { kind: 'var', arg: 'nums' }, caption: 'One box at a time' },
      { ref: { kind: 'step', arg: '12' }, caption: 'total jumps to 16' },
    ])
  })

  it('hides a tour that is still streaming, without stops yet', () => {
    expect(takeTour('Look.\n```tour\nline:3 | The lo')).toEqual({ body: 'Look.', stops: [] })
  })

  it('leaves answers without a tour alone', () => {
    expect(takeTour('```python\nx = 1\n```')).toEqual({ body: '```python\nx = 1\n```', stops: [] })
  })
})
