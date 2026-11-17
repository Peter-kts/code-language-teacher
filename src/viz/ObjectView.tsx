import type { CSSProperties, ReactNode } from 'react'
import type { Language } from '../types'
import type { CardField, CardValue, ObjectCard, ObjectScene } from './objects'

// Draws an ObjectScene (objects.ts): each object a card with its class on top and its fields
// inside; objects a field holds sit inside it. Fields the line just changed are green, new
// objects glow, and data that lives on the class (shared by every object of it) has its own
// amber section, which is where the classic `manifest = []` bug shows itself.

const TAG_COLORS = ['var(--cyan)', 'var(--pink)', 'var(--source)', 'var(--accent)', 'var(--pass)', 'var(--blue)']
const tagColor = (tag: number) => ({ '--share-color': TAG_COLORS[(tag - 1) % TAG_COLORS.length] }) as CSSProperties

export function ObjectView({ scene, language, notes }: { scene: ObjectScene; language: Language; notes?: (name: string) => ReactNode }) {
  return (
    <div className="objects" data-target="objects">
      <div className="list-name">
        Objects <span className="muted">(one card per object; what it holds is inside it)</span>
      </div>
      {scene.roots.map(({ name, value }) => (
        <div key={name} className="obj-root" data-target={`var:${name}`}>
          <div className="obj-var">
            {name}
            {notes?.(name)}
          </div>
          <Shown value={value} language={language} />
        </div>
      ))}
      {scene.missing && <div className="muted obj-more">More objects than can be drawn; only the first ones are shown.</div>}
    </div>
  )
}

function Shown({ value, language }: { value: CardValue; language: Language }) {
  switch (value.kind) {
    case 'plain':
      return <span className="obj-plain">{value.text}</span>
    case 'object':
      return <Card card={value.card} language={language} />
    case 'seen':
      return (
        <span
          className="shared-chip obj-seen"
          style={value.tag ? tagColor(value.tag) : undefined}
          title={`The same ${value.cls} object as ${value.at}, not a copy: it's drawn there.`}
        >
          {value.tag ? `#${value.tag} ` : ''}
          {value.cls}
          {value.label ? ` ${value.label}` : ''} (same as {value.at})
        </span>
      )
    case 'list':
    case 'dict': {
      const empty = value.kind === 'list' ? !value.items.length : !value.entries.length
      const objects = value.kind === 'list' ? value.items.some((i) => i.kind === 'object') : value.entries.some(([, v]) => v.kind === 'object')
      const share = value.sharedWith.length > 0 && (
        <span className="shared-chip" title="Not a copy: these are one and the same object, so a change through either name shows up in both.">
          🔗 same {value.kind === 'list' ? (language === 'python' ? 'list' : 'array') : language === 'python' ? 'dict' : 'object'} as {value.sharedWith.join(', ')}
        </span>
      )
      if (empty) {
        return (
          <span className="obj-plain">
            {value.open}
            {value.close}
            {share}
          </span>
        )
      }
      return (
        <span className={objects ? 'obj-coll stacked' : 'obj-coll'}>
          <span className="obj-bracket">{value.open}</span>
          {value.kind === 'list'
            ? value.items.map((item, i) => (
                <span key={i} className="obj-item">
                  <Shown value={item} language={language} />
                  {!objects && i < value.items.length - 1 && <span className="obj-bracket">,</span>}
                </span>
              ))
            : value.entries.map(([k, item], i) => (
                <span key={i} className="obj-item obj-entry">
                  <span className="obj-key">{k}:</span> <Shown value={item} language={language} />
                  {!objects && i < value.entries.length - 1 && <span className="obj-bracket">,</span>}
                </span>
              ))}
          {value.truncated && <span className="obj-item muted">…</span>}
          <span className="obj-bracket">{value.close}</span>
          {share}
        </span>
      )
    }
  }
}

function Card({ card, language }: { card: ObjectCard; language: Language }) {
  const rows = (fields: CardField[]) =>
    fields.map((f) => (
      <div key={f.name} className={f.changed ? 'obj-row changed' : 'obj-row'}>
        <span className="obj-field">{f.name}</span>
        <span className="obj-value">
          <Shown value={f.value} language={language} />
        </span>
      </div>
    ))
  return (
    <div className={card.isNew ? 'obj-card new' : 'obj-card'} style={card.tag ? tagColor(card.tag) : undefined}>
      <div className="obj-head">
        <span className="obj-cls">{card.cls}</span>
        {card.tag && <span className="obj-tag">#{card.tag}</span>}
        {card.alsoAt.length > 0 && (
          <span className="obj-also" title="The same object is reachable from these places too: not a copy.">
            also {card.alsoAt.join(', ')}
          </span>
        )}
      </div>
      {card.fields.length === 0 && card.classFields.length === 0 && <div className="obj-row muted">no fields yet</div>}
      {rows(card.fields)}
      {card.classFields.length > 0 && (
        <div
          className="obj-class"
          title={
            language === 'python'
              ? 'Set in the class body, not in __init__: one value that every object of the class shares.'
              : 'Kept on the class (static) or its prototype, not on this object: one value every object of the class shares.'
          }
        >
          <div className="obj-class-label">on class {card.cls}: shared by every {card.cls}</div>
          {rows(card.classFields)}
        </div>
      )}
    </div>
  )
}
