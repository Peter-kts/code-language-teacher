import { describe, expect, it } from 'vitest'
import {
  FONT_SIZE_KEY,
  FONT_STEPS,
  applyFontScale,
  editorFont,
  isLargest,
  isSmallest,
  loadFontScale,
  saveFontScale,
  stepFontScale,
} from './fontSize'

describe('text size', () => {
  it('steps up and down and stops at the ends', () => {
    expect(stepFontScale(1, 1)).toBe(1.1)
    expect(stepFontScale(1, -1)).toBe(0.9)
    expect(stepFontScale(FONT_STEPS[0], -1)).toBe(FONT_STEPS[0])
    expect(stepFontScale(FONT_STEPS.at(-1)!, 1)).toBe(FONT_STEPS.at(-1))
    expect(isSmallest(FONT_STEPS[0])).toBe(true)
    expect(isLargest(FONT_STEPS.at(-1)!)).toBe(true)
    expect(isSmallest(1) || isLargest(1)).toBe(false)
  })

  it('snaps an odd value to the nearest step before moving', () => {
    expect(stepFontScale(1.06, 1)).toBe(1.25)
    expect(stepFontScale(5, -1)).toBe(1.4)
  })

  it('scales the editor font with the rest', () => {
    expect(editorFont(1)).toEqual({ fontSize: 15, lineHeight: 24 })
    expect(editorFont(1.25)).toEqual({ fontSize: 19, lineHeight: 30 })
  })

  it('starts at normal, and remembers a choice', () => {
    expect(loadFontScale({ getItem: () => null })).toBe(1)
    expect(loadFontScale({ getItem: () => 'huge' })).toBe(1)
    expect(loadFontScale({ getItem: () => '3' })).toBe(1)
    const store = new Map<string, string>()
    const storage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) }
    saveFontScale(1.25, storage)
    expect(store.get(FONT_SIZE_KEY)).toBe('1.25')
    expect(loadFontScale(storage)).toBe(1.25)
  })

  it('keeps working when storage is blocked', () => {
    const blocked = () => {
      throw new Error('blocked')
    }
    expect(loadFontScale({ getItem: blocked })).toBe(1)
    expect(() => saveFontScale(1.1, { setItem: blocked })).not.toThrow()
  })

  it('sets the root font size, and clears it at normal', () => {
    const vars = new Map<string, string>()
    const root = {
      style: {
        fontSize: '',
        setProperty: (k: string, v: string) => void vars.set(k, v),
        removeProperty: (k: string) => void vars.delete(k),
      },
    }
    applyFontScale(1.1, root)
    expect(root.style.fontSize).toBe('110%')
    expect(vars.get('--font-scale')).toBe('1.1')
    applyFontScale(1, root)
    expect(root.style.fontSize).toBe('')
    expect(vars.has('--font-scale')).toBe(false)
  })
})
