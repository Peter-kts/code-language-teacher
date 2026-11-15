import { describe, expect, it } from 'vitest'
import { DESIGN_KEY, applyDesign, loadDesign, lookOf, otherDesign, saveDesign } from './design'
import { applyTheme } from './theme'

describe('design choice', () => {
  it('starts as classic, and remembers paper', () => {
    expect(loadDesign({ getItem: () => null })).toBe('classic')
    expect(loadDesign({ getItem: (k) => (k === DESIGN_KEY ? 'paper' : null) })).toBe('paper')
    // Anything else (an old or garbled value) falls back to the default.
    expect(loadDesign({ getItem: (k) => (k === DESIGN_KEY ? 'brutal' : null) })).toBe('classic')
  })

  it('round-trips through storage', () => {
    const store = new Map<string, string>()
    const storage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) }
    saveDesign('paper', storage)
    expect(loadDesign(storage)).toBe('paper')
    saveDesign('classic', storage)
    expect(loadDesign(storage)).toBe('classic')
  })

  it('keeps working when storage is blocked', () => {
    const blocked = () => {
      throw new Error('blocked')
    }
    expect(loadDesign({ getItem: blocked })).toBe('classic')
    expect(() => saveDesign('paper', { setItem: blocked })).not.toThrow()
  })

  it('is an on/off switch', () => {
    expect(otherDesign('classic')).toBe('paper')
    expect(otherDesign('paper')).toBe('classic')
  })

  it('sets data-design only for paper, so classic stays the plain stylesheet', () => {
    const root = { dataset: {} as Record<string, string | undefined> }
    applyDesign('paper', root)
    expect(root.dataset.design).toBe('paper')
    applyDesign('classic', root)
    expect(root.dataset.design).toBeUndefined()
  })

  it('sets the theme aside while paper is on, and brings it back after', () => {
    expect(lookOf('paper', 'terminal')).toBe('paper')
    expect(lookOf('classic', 'terminal')).toBe('terminal')
    // The way App applies them: paper shows over the plain (galaxy) stylesheet, with no theme
    // attributes left behind to mix green-screen rules into the page.
    const root = { dataset: {} as Record<string, string | undefined> }
    applyTheme('terminal', root)
    applyTheme('galaxy', root)
    applyDesign('paper', root)
    expect(root.dataset).toEqual({ design: 'paper' })
    applyTheme('terminal', root)
    applyDesign('classic', root)
    expect(root.dataset).toEqual({ theme: 'terminal', retro: '' })
  })
})
