import { describe, expect, it } from 'vitest'
import { THEME_KEY, applyTheme, loadTheme, nextTheme, saveTheme } from './theme'

describe('theme choice', () => {
  it('starts as the galaxy, and remembers the terminal', () => {
    expect(loadTheme({ getItem: () => null })).toBe('galaxy')
    expect(loadTheme({ getItem: (k) => (k === THEME_KEY ? 'terminal' : null) })).toBe('terminal')
    expect(loadTheme({ getItem: (k) => (k === THEME_KEY ? 'mono' : null) })).toBe('mono')
    expect(loadTheme({ getItem: (k) => (k === THEME_KEY ? 'focus' : null) })).toBe('focus')
    // Anything else (an old or garbled value) falls back to the default.
    expect(loadTheme({ getItem: (k) => (k === THEME_KEY ? 'neon' : null) })).toBe('galaxy')
  })

  it('round-trips through storage', () => {
    const store = new Map<string, string>()
    const storage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) }
    saveTheme('terminal', storage)
    expect(loadTheme(storage)).toBe('terminal')
    saveTheme('galaxy', storage)
    expect(loadTheme(storage)).toBe('galaxy')
  })

  it('keeps working when storage is blocked', () => {
    const blocked = () => {
      throw new Error('blocked')
    }
    expect(loadTheme({ getItem: blocked })).toBe('galaxy')
    expect(() => saveTheme('terminal', { setItem: blocked })).not.toThrow()
  })

  it('sets data-theme only for the terminal, so the galaxy stays the plain stylesheet', () => {
    const root = { dataset: {} as Record<string, string | undefined> }
    applyTheme('terminal', root)
    expect(root.dataset.theme).toBe('terminal')
    expect(root.dataset.retro).toBe('')
    applyTheme('mono', root)
    expect(root.dataset.theme).toBe('mono')
    expect(root.dataset.retro).toBe('')
    applyTheme('focus', root)
    expect(root.dataset.theme).toBe('focus')
    expect(root.dataset.retro).toBeUndefined()
    applyTheme('galaxy', root)
    expect(root.dataset.theme).toBeUndefined()
    expect(root.dataset.retro).toBeUndefined()
  })

  it('steps galaxy, green, black and white, focus, then back to galaxy', () => {
    expect(nextTheme('galaxy')).toBe('terminal')
    expect(nextTheme('terminal')).toBe('mono')
    expect(nextTheme('mono')).toBe('focus')
    expect(nextTheme('focus')).toBe('galaxy')
  })
})
