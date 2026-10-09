import { describe, expect, it } from 'vitest'
import { dragConsole, dragDivider, toggleDivider } from './split'

describe('dragDivider', () => {
  it('moves size between the two neighbours only', () => {
    expect(dragDivider([1, 1, 1], 0, 0.25, 0.2)).toEqual([1.25, 0.75, 1])
  })
  it('snaps a pane shut below the minimum, and open again past it', () => {
    expect(dragDivider([1, 1, 1], 1, 0.9, 0.2)).toEqual([1, 2, 0])
    expect(dragDivider([1, 1, 1], 0, -0.85, 0.2)).toEqual([0, 2, 1])
    expect(dragDivider([0, 2, 1], 0, 0.1, 0.2)).toEqual([0, 2, 1])
    expect(dragDivider([0, 2, 1], 0, 0.5, 0.2)).toEqual([0.5, 1.5, 1])
  })
})

describe('toggleDivider', () => {
  it('reopens a collapsed pane at its remembered size', () => {
    expect(toggleDivider([1, 2, 0], 1, [1, 1, 0.6], 0.2)).toEqual([1, 1.4, 0.6])
  })
  it('resets an open pair to the default ratio', () => {
    const [a, b] = toggleDivider([2, 0.3, 1], 0, [2, 0.3, 1], 0.2)
    expect(a + b).toBeCloseTo(2.3)
    expect(a / b).toBeCloseTo(1.1 / 1.2)
  })
})

describe('dragConsole', () => {
  it('grows when dragged up and collapses below the minimum', () => {
    expect(dragConsole(200, -50, 72, 500)).toBe(250)
    expect(dragConsole(200, 150, 72, 500)).toBe(0)
    expect(dragConsole(200, -900, 72, 500)).toBe(500)
  })
})
