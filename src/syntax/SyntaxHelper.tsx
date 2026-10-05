import { useState } from 'react'
import { searchCards } from './cards'

export function SyntaxHelper({ onInsert }: { onInsert: (code: string) => void }) {
  const [query, setQuery] = useState('')
  const cards = searchCards(query)
  return (
    <div className="syntax">
      <input
        className="syntax-input"
        placeholder="Ask about syntax, e.g. how do I do a for loop?"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="cards">
        {cards.length === 0 && <p className="muted">No card for that yet.</p>}
        {cards.map((card) => (
          <div key={card.title} className="card">
            <div className="card-head">
              <strong>{card.title}</strong>
              <button onClick={() => onInsert(card.code)}>Insert</button>
            </div>
            <p>{card.explanation}</p>
            <pre>{card.code}</pre>
          </div>
        ))}
      </div>
    </div>
  )
}
