import { describe, expect, it } from 'vitest'
import { TOP_BAR_KEY, loadTopBarHidden, saveTopBarHidden } from './topBar'

describe('top bar choice', () => {
  it('starts shown, and remembers hiding', () => {
    expect(loadTopBarHidden({ getItem: () => null })).toBe(false)
    expect(loadTopBarHidden({ getItem: (k) => (k === TOP_BAR_KEY ? 'hidden' : null) })).toBe(true)
    expect(loadTopBarHidden({ getItem: (k) => (k === TOP_BAR_KEY ? 'shown' : null) })).toBe(false)
  })

  it('round-trips through storage', () => {
    const store = new Map<string, string>()
    const storage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) }
    saveTopBarHidden(true, storage)
    expect(loadTopBarHidden(storage)).toBe(true)
    saveTopBarHidden(false, storage)
    expect(loadTopBarHidden(storage)).toBe(false)
  })

  it('keeps working when storage is blocked', () => {
    const blocked = () => {
      throw new Error('blocked')
    }
    expect(loadTopBarHidden({ getItem: blocked })).toBe(false)
    expect(() => saveTopBarHidden(true, { setItem: blocked })).not.toThrow()
  })
})
