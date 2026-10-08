import { describe, expect, it } from 'vitest'
import { groupCards, LEVELS, PYTHON_CARDS, QUESTIONS, searchCards, TOPICS } from './cards'

describe('glossary', () => {
  it('gives every entry a unique id and at least one question', () => {
    const ids = PYTHON_CARDS.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const c of PYTHON_CARDS) expect(c.questions.length).toBeGreaterThan(0)
  })

  it('lists the cards in learning-path order', () => {
    const levels = PYTHON_CARDS.map((c) => c.level)
    expect(levels).toEqual([...levels].sort((a, b) => a - b))
  })

  it('puts every card in exactly one topic and one level', () => {
    for (const by of ['topic', 'level'] as const) {
      const placed = groupCards(PYTHON_CARDS, by).flatMap((g) => g.cards)
      expect(placed).toHaveLength(PYTHON_CARDS.length)
      expect(new Set(placed).size).toBe(PYTHON_CARDS.length)
    }
    expect(groupCards(PYTHON_CARDS, 'topic').map((g) => g.id)).toEqual(TOPICS.map((t) => t.id))
    expect(groupCards(PYTHON_CARDS, 'level').map((g) => g.label)).toEqual(LEVELS.map((l) => l.label))
  })

  it('shows a card under each question it answers', () => {
    const groups = groupCards(PYTHON_CARDS, 'question')
    expect(groups.map((g) => g.id)).toEqual(QUESTIONS.map((q) => q.id))
    const broke = groups.find((g) => g.id === 'broke')!.cards.map((c) => c.id)
    expect(broke).toContain('key-error')
    expect(broke).toContain('return-vs-print')
  })

  it('keeps the grouping when searching and drops empty groups', () => {
    const groups = groupCards(searchCards('keyerror'), 'topic')
    expect(groups.map((g) => g.id)).toEqual(['errors'])
    expect(groups[0].cards[0].id).toBe('key-error')
  })
})
