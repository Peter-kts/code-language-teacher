import { useState } from 'react'
import type { Subject } from '../types'
import { PROBLEMS } from '../problems/problems'
import { CONCEPTS } from '../problems/concepts'
import { OOP_PROBLEMS } from '../problems/oop'
import { SQL_PROBLEMS } from '../sql/problems'
import { SQL_CARDS, SQL_LEVELS, SQL_QUESTIONS, SQL_TOPICS } from '../sql/cards'
import { CARDS, CODE_GROUPS, groupCards, searchCards, type GroupBy, type GroupLists, type SyntaxCard } from './cards'

const SQL_GROUPS: GroupLists = { topics: SQL_TOPICS, levels: SQL_LEVELS, questions: SQL_QUESTIONS }

/** The problems that practice a glossary entry, as id and title. Each concept track only exists in its own language. */
function practiceFor(language: Subject, id: string): { id: string; title: string }[] {
  if (language === 'sql') return SQL_PROBLEMS.filter((p) => p.concepts.includes(id))
  return [...PROBLEMS, ...CONCEPTS[language], ...OOP_PROBLEMS].filter((p) => p.concepts[language].includes(id))
}

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

function CardView({
  card,
  language,
  onInsert,
  onOpenProblem,
}: {
  card: SyntaxCard
  language: Subject
  onInsert: (code: string) => void
  onOpenProblem: (id: string) => void
}) {
  const practice = practiceFor(language, card.id)
  return (
    <div className="card">
      <div className="card-head">
        <strong>{card.title}</strong>
        <button onClick={() => onInsert(card.code)}>Insert</button>
      </div>
      <p>{card.explanation}</p>
      <pre>{card.code}</pre>
      {practice.length > 0 && (
        <div className="card-practice">
          <span className="muted">Practice it in</span>
          {practice.map((p) => (
            <button key={p.id} className="chip" onClick={() => onOpenProblem(p.id)}>
              {p.title}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function SyntaxHelper({
  language,
  onInsert,
  focus,
  onFocus,
  onOpenProblem,
}: {
  language: Subject
  onInsert: (code: string) => void
  /** Id of an entry to show on its own (opened from a problem's concept chip), or null for the full list. */
  focus: string | null
  onFocus: (id: string | null) => void
  onOpenProblem: (id: string) => void
}) {
  const [query, setQuery] = useState('')
  const [groupBy, setGroupBy] = useState<GroupBy>(savedGroupBy)
  const searching = query.trim() !== ''
  const cards = language === 'sql' ? SQL_CARDS : CARDS[language]
  const groups = groupCards(searchCards(query, cards), groupBy, language === 'sql' ? SQL_GROUPS : CODE_GROUPS)

  const pick = (by: GroupBy) => {
    setGroupBy(by)
    try {
      localStorage.setItem(STORAGE_KEY, by)
    } catch {
      // not remembered, which is fine
    }
  }

  const focused = cards.find((c) => c.id === focus)
  if (focused) {
    return (
      <div className="syntax">
        <button className="chip glossary-back" onClick={() => onFocus(null)}>
          ← All glossary entries
        </button>
        <div className="cards">
          <CardView card={focused} language={language} onInsert={onInsert} onOpenProblem={onOpenProblem} />
        </div>
      </div>
    )
  }

  return (
    <div className="syntax">
      <input
        className="syntax-input"
        placeholder={`Search the glossary, e.g. ${language === 'sql' ? 'how do I join two tables?' : 'how do I do a for loop?'}`}
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
              <CardView key={card.id} card={card} language={language} onInsert={onInsert} onOpenProblem={onOpenProblem} />
            ))}
          </details>
        ))}
      </div>
    </div>
  )
}
