import { describe, expect, it } from 'vitest'
import { BACKGROUND_KEY, SCENES, coverSize, dayNumber, focusLeft, loadBackgroundMode, sceneForDate, sceneFromUrl } from './scenes'

describe('sceneForDate', () => {
  it('shows a different scene each day and comes back round after a full cycle', () => {
    const day = (d: number) => sceneForDate(new Date(2026, 6, d, 12))
    expect(day(2).id).not.toBe(day(1).id)
    expect(day(1 + SCENES.length).id).toBe(day(1).id)
    const week = new Set(Array.from({ length: SCENES.length }, (_, i) => day(1 + i).id))
    expect(week.size).toBe(SCENES.length)
  })

  it('keeps one scene all day, from just after midnight to just before the next', () => {
    expect(sceneForDate(new Date(2026, 6, 4, 0, 1)).id).toBe(sceneForDate(new Date(2026, 6, 4, 23, 59)).id)
    expect(dayNumber(new Date(2026, 6, 4, 0, 1))).toBe(dayNumber(new Date(2026, 6, 4, 23, 59)))
  })

  it('always shows Halloween on 31 October', () => {
    for (const year of [2026, 2027, 2028]) expect(sceneForDate(new Date(year, 9, 31, 20)).id).toBe('halloween')
  })
})

describe('background choice', () => {
  it('defaults to the daily scene, and remembers the galaxy', () => {
    expect(loadBackgroundMode({ getItem: () => null })).toBe('daily')
    expect(loadBackgroundMode({ getItem: (k) => (k === BACKGROUND_KEY ? 'galaxy' : null) })).toBe('galaxy')
    expect(loadBackgroundMode({ getItem: () => { throw new Error('blocked') } })).toBe('daily')
  })

  it('reads a scene to preview from the address', () => {
    expect(sceneFromUrl('?bg=beach')?.id).toBe('beach')
    expect(sceneFromUrl('?bg=nope')).toBeNull()
    expect(sceneFromUrl('')).toBeNull()
  })
})

describe('coverSize', () => {
  it('scales by a whole number of device pixels and covers the screen', () => {
    expect(coverSize(1920, 1080, 1)).toEqual({ width: 1920, height: 1080, scale: 6 })
    const laptop = coverSize(1366, 768, 1)
    expect(laptop.scale).toBe(5)
    expect(laptop.width).toBeGreaterThanOrEqual(1366)
    const phone = coverSize(390, 844, 3)
    expect(phone.height).toBeGreaterThanOrEqual(844)
    expect(Number.isInteger(phone.scale)).toBe(true)
  })

  it('keeps the focus in the middle on a tall screen without showing past the edges', () => {
    const { width } = coverSize(390, 844, 3)
    const left = focusLeft(390, width, 160)
    expect(left + width / 2).toBeCloseTo(195)
    expect(focusLeft(390, width, 0)).toBe(0)
    expect(focusLeft(390, width, 320)).toBeCloseTo(390 - width)
  })
})
