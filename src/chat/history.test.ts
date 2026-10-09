import { describe, expect, it } from 'vitest'
import { HISTORY_KEY, MAX_SAVED, loadHistory, saveHistory } from './history'

function memoryStorage() {
  const data = new Map<string, string>()
  return {
    data,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  }
}

describe('chat history', () => {
  it('round-trips a conversation', () => {
    const s = memoryStorage()
    const msgs = [
      { role: 'user' as const, content: 'hi' },
      { role: 'assistant' as const, content: 'hello' },
    ]
    saveHistory(msgs, s)
    expect(loadHistory(s)).toEqual(msgs)
  })

  it('keeps only the newest messages', () => {
    const s = memoryStorage()
    const msgs = Array.from({ length: MAX_SAVED + 5 }, (_, i) => ({ role: 'user' as const, content: String(i) }))
    saveHistory(msgs, s)
    const loaded = loadHistory(s)
    expect(loaded).toHaveLength(MAX_SAVED)
    expect(loaded[0].content).toBe('5')
  })

  it('clears storage for an empty chat', () => {
    const s = memoryStorage()
    saveHistory([{ role: 'user', content: 'hi' }], s)
    saveHistory([], s)
    expect(s.data.has(HISTORY_KEY)).toBe(false)
  })

  it('ignores corrupt or malformed data', () => {
    const s = memoryStorage()
    s.setItem(HISTORY_KEY, '{nope')
    expect(loadHistory(s)).toEqual([])
    s.setItem(HISTORY_KEY, JSON.stringify([{ role: 'system', content: 'x' }, { role: 'user', content: 'ok' }, null]))
    expect(loadHistory(s)).toEqual([{ role: 'user', content: 'ok' }])
  })

  it('survives blocked storage', () => {
    const blocked = {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      },
      removeItem: () => {
        throw new Error('blocked')
      },
    }
    expect(loadHistory(blocked)).toEqual([])
    expect(() => saveHistory([{ role: 'user', content: 'x' }], blocked)).not.toThrow()
  })
})
