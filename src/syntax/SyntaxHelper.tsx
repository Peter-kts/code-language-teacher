import { useState } from 'react'
import { groupCards, searchCards, type GroupBy } from './cards'

const GROUP_BYS: { id: GroupBy; label: string }[] = [
  { id: 'topic', label: 'Topic' },
  { id: 'level', label: 'Learning path' },
  { id: 'question', label: 'Question' },
]

const STORAGE_KEY = 'glossary-group-by'

function savedGroupBy(): GroupBy {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (GROUP_BYS.some((g) => g.id === saved)) return saved as GroupBy
  } catch {
    // storage blocked: fall back to the default
  }
  return 'topic'
}

export function SyntaxHelper({ onInsert }: { onInsert: (code: string) => void }) {
  const [query, setQuery] = useState('')
  const [groupBy, setGroupBy] = useState<GroupBy>(savedGroupBy)
  const searching = query.trim() !== ''
  const groups = groupCards(searchCards(query), groupBy)

  const pick = (by: GroupBy) => {
    setGroupBy(by)
    try {
      localStorage.setItem(STORAGE_KEY, by)
    } catch {
      // not remembered, which is fine
    }
  }

  return (
    <div className="syntax">
      <input
        className="syntax-input"
        placeholder="Search the glossary, e.g. how do I do a for loop?"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="glossary-groupby">
        <span className="muted">Group by</span>
        {GROUP_BYS.map((g) => (
          <button key={g.id} className={groupBy === g.id ? 'chip active' : 'chip'} onClick={() => pick(g.id)}>
            {g.label}
          </button>
        ))}
      </div>
      <div className="cards">
        {groups.length === 0 && <p className="muted">No entry for that yet.</p>}
        {groups.map((group, i) => (
          // Keyed on the grouping and search state so each switch resets which groups start open.
          <details key={`${groupBy}-${searching}-${group.id}`} className="card-group" open={searching || i === 0}>
            <summary>
              {group.label} <span className="muted">{group.cards.length}</span>
            </summary>
            {group.cards.map((card) => (
              <div key={card.id} className="card">
                <div className="card-head">
                  <strong>{card.title}</strong>
                  <button onClick={() => onInsert(card.code)}>Insert</button>
                </div>
                <p>{card.explanation}</p>
                <pre>{card.code}</pre>
              </div>
            ))}
          </details>
        ))}
      </div>
    </div>
  )
}
