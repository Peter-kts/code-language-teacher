import { describe, expect, it } from 'vitest'
import { typeLabel } from './format'

describe('typeLabel', () => {
  it('names Python types the way the tracer sends them', () => {
    expect(typeLabel({ type: 'prim', repr: '3', value: 3 })).toBe('int')
    expect(typeLabel({ type: 'prim', repr: '2.0', value: 2 })).toBe('float')
    expect(typeLabel({ type: 'prim', repr: 'inf' })).toBe('float')
    expect(typeLabel({ type: 'prim', repr: "'hi'", value: 'hi' })).toBe('str')
    expect(typeLabel({ type: 'prim', repr: 'True', value: true })).toBe('bool')
    expect(typeLabel({ type: 'prim', repr: 'None', value: null })).toBe('None')
    expect(typeLabel({ type: 'list', items: [{ type: 'prim', repr: '1', value: 1 }], truncated: false })).toBe('list · 1 item')
    expect(typeLabel({ type: 'dict', entries: [], truncated: false })).toBe('dict · 0 items')
    expect(typeLabel({ type: 'other', repr: '{1, 2}' })).toBe('set')
    expect(typeLabel({ type: 'other', repr: '<function f at 0x1>' })).toBe('function')
  })
})
