import { describe, expect, it } from 'vitest'
import { runTraced } from '../js/runtime'
import { CARDS, groupCards, LEVELS, PYTHON_CARDS, QUESTIONS, searchCards, TOPICS } from './cards'
import { JS_CARDS } from './jsCards'

describe.each(Object.entries(CARDS))('%s glossary', (_, cards) => {
  it('gives every entry a unique id and at least one question', () => {
    const ids = cards.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const c of cards) expect(c.questions.length, c.id).toBeGreaterThan(0)
  })

  it('lists the cards in learning-path order', () => {
    const levels = cards.map((c) => c.level)
    expect(levels).toEqual([...levels].sort((a, b) => a - b))
  })

  it('puts every card in exactly one topic and one level', () => {
    for (const by of ['topic', 'level'] as const) {
      const placed = groupCards(cards, by).flatMap((g) => g.cards)
      expect(placed).toHaveLength(cards.length)
      expect(new Set(placed).size).toBe(cards.length)
    }
    expect(groupCards(cards, 'topic').map((g) => g.id)).toEqual(TOPICS.map((t) => t.id))
    expect(groupCards(cards, 'level').map((g) => g.label)).toEqual(LEVELS.map((l) => l.label))
    expect(groupCards(cards, 'question').map((g) => g.id)).toEqual(QUESTIONS.map((q) => q.id))
  })
})

describe('glossary', () => {
  it('shows a card under each question it answers', () => {
    const broke = groupCards(PYTHON_CARDS, 'question').find((g) => g.id === 'broke')!.cards.map((c) => c.id)
    expect(broke).toContain('key-error')
    expect(broke).toContain('return-vs-print')
  })

  it('keeps the grouping when searching and drops empty groups', () => {
    const groups = groupCards(searchCards('keyerror'), 'topic')
    expect(groups.map((g) => g.id)).toEqual(['errors'])
    expect(groups[0].cards[0].id).toBe('key-error')
    expect(searchCards('closure', JS_CARDS)[0].id).toBe('closures')
  })

  it('has JavaScript examples that run without an error', () => {
    for (const card of JS_CARDS) {
      const run = runTraced(card.code)
      expect(run.ok ? run.error : run.error.message, card.id).toBe(null)
      expect(run.ok && run.truncated, card.id).toBe(false)
    }
  })
})
