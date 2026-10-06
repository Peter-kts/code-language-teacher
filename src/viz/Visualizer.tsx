import type { CSSProperties, ReactNode } from 'react'
import type { PointerSpec, Step, Value } from '../types'
import { containerChanges, scalarChanges, type DeltaPart } from './changes'
import { formatValue } from './format'
import { placePointers, type PlacedPointer } from './pointers'

// Bright enough to read on the dark galaxy panels, and distinct from each other.
const POINTER_COLORS = ['#c8b4ff', '#f0a7cf', '#8fb4ff', '#7ee0b8', '#ffc978', '#6fd8e8']

export function Visualizer({
  step,
  prevStep,
  pointers,
  code,
  tick,
}: {
  step: Step
  /** The step before, used to highlight what just changed. */
  prevStep?: Step
  pointers: PointerSpec[]
  /** Source that produced this trace, to say where an added amount came from. */
  code?: string
  /** Changes on every step, so change animations replay. */
  tick?: number
}) {
  const placed = placePointers(step, pointers)
  const labels = [...new Set(pointers.map((p) => p.label))]
  const colorOf = (label: string) => POINTER_COLORS[labels.indexOf(label) % POINTER_COLORS.length]
  // Only color variables that are drawn as an arrow right now.
  const shown = new Set(Object.values(placed).flatMap((ps) => ps.map((p) => p.label)))
  const entries = Object.entries(step.vars)
  const lists = entries.filter(([, v]) => v.type === 'list' || v.type === 'tuple')
  const dicts = entries.filter(([, v]) => v.type === 'dict')
  const others = entries.filter(([, v]) => v.type !== 'list' && v.type !== 'tuple' && v.type !== 'dict')
  const ranLine = prevStep && code ? code.split('\n')[prevStep.line - 1] : undefined
  const changes = scalarChanges(step, prevStep, ranLine)
  const boxes = containerChanges(step, prevStep, ranLine)
  const sources = new Set(
    [
      ...Object.values(changes).flatMap((c) => c.deltas),
      ...Object.values(boxes).flatMap((c) => [...c.summary, ...Object.values(c.parts).flat()]),
    ].flatMap((d) => (d.from ? [d.from] : [])),
  )
  // Keyed by step, so badges remount (and pop in) on every step but hold while paused.
  const badges = (parts: DeltaPart[] | undefined, className?: string) => (
    <DeltaStack key={`d${tick}`} parts={parts} className={className} />
  )

  return (
    <div className="viz">
      {step.func !== '<module>' && <div className="viz-frame">inside {step.func}()</div>}
      {lists.map(([name, value]) => (
        <ListView
          key={name}
          name={name}
          value={value}
          pointers={placed[name] ?? []}
          colorOf={colorOf}
          summary={badges(boxes[name]?.summary, 'inline')}
          itemBadges={(i) => badges(boxes[name]?.parts[i], 'on-box')}
          changed={(i) => !!boxes[name]?.parts[i]}
        />
      ))}
      {dicts.map(([name, value]) => (
        <DictView
          key={name}
          name={name}
          value={value}
          summary={badges(boxes[name]?.summary, 'inline')}
          rowBadges={(key) => badges(boxes[name]?.parts[key], 'inline')}
          changed={(key) => !!boxes[name]?.parts[key]}
        />
      ))}
      {others.length > 0 && (
        <div className="var-cards">
          {others.map(([name, value]) => {
            const change = changes[name]
            const color = shown.has(name) ? colorOf(name) : undefined
            const cls = ['var-card', change && 'changed', sources.has(name) && 'source'].filter(Boolean).join(' ')
            return (
              <div key={name} className={cls} style={color ? ({ '--var-color': color } as CSSProperties) : undefined}>
                {sources.has(name) && <span key={`p${tick}`} className="var-pulse" aria-hidden />}
                <div className="var-name">{name}</div>
                <div className="var-value">
                  {change && (
                    <span key={`old${tick}`} className="var-old" aria-hidden>
                      {change.before}
                    </span>
                  )}
                  <span key={change ? `new${tick}` : 'same'} className={change ? 'var-new' : undefined}>
                    {formatValue(value)}
                  </span>
                </div>
                {badges(change?.deltas)}
              </div>
            )
          })}
        </div>
      )}
      {entries.length === 0 && <p className="muted">No variables yet.</p>}
    </div>
  )
}

/**
 * Change badges. They stay for the whole step (also while paused) and the next
 * step replaces them. Several parts stack, the first one nearest the value.
 */
function DeltaStack({ parts, className }: { parts?: DeltaPart[]; className?: string }) {
  if (!parts?.length) return null
  return (
    <span className={className ? `var-deltas ${className}` : 'var-deltas'}>
      {parts.map((part, i) => (
        <span key={i} className={`var-delta ${tone(part.text)}`} style={{ '--i': i } as CSSProperties}>
          {part.text}
          {part.from && <span className="var-from"> from {part.from}</span>}
        </span>
      ))}
    </span>
  )
}

function tone(text: string) {
  if (text === 'new') return 'new'
  if (/^-\d/.test(text)) return 'down'
  if (/^\+\d/.test(text)) return 'up'
  return 'set'
}

function ListView({
  name,
  value,
  pointers,
  colorOf,
  summary,
  itemBadges,
  changed,
}: {
  name: string
  value: Value
  pointers: PlacedPointer[]
  colorOf: (label: string) => string
  summary: ReactNode
  itemBadges: (index: number) => ReactNode
  changed: (index: number) => boolean
}) {
  if (value.type !== 'list' && value.type !== 'tuple') return null
  // One extra slot so a pointer one past the end (e.g. `i == len(a)`) has somewhere to sit.
  const slots = value.items.length + (pointers.some((p) => p.index === value.items.length) ? 1 : 0)
  return (
    <div className="list">
      <div className="list-name">
        {name}
        {summary}
      </div>
      <div className="list-grid" style={{ gridTemplateColumns: `repeat(${slots}, 3.25rem)` }}>
        {value.items.map((item, i) => {
          const here = pointers.filter((p) => p.index === i)
          return (
            <div
              key={i}
              className={changed(i) ? 'box changed' : 'box'}
              style={here.length ? { borderColor: colorOf(here[0].label), borderWidth: 3 } : undefined}
            >
              <span className="box-value">{formatValue(item)}</span>
              {itemBadges(i)}
            </div>
          )
        })}
        {slots > value.items.length && <div className="box box-ghost" />}
        {Array.from({ length: slots }, (_, i) => (
          <div key={`i${i}`} className="index">
            {i}
          </div>
        ))}
        {Array.from({ length: slots }, (_, i) => (
          <div key={`p${i}`} className="pointers">
            {pointers
              .filter((p) => p.index === i)
              .map((p) => (
                <div key={p.label} className="pointer" style={{ color: colorOf(p.label) }}>
                  <span className="arrow">▲</span>
                  {p.label}
                </div>
              ))}
          </div>
        ))}
      </div>
      {value.truncated && <div className="muted">(showing the first {value.items.length} items)</div>}
    </div>
  )
}

function DictView({
  name,
  value,
  summary,
  rowBadges,
  changed,
}: {
  name: string
  value: Value
  summary: ReactNode
  rowBadges: (key: string) => ReactNode
  changed: (key: string) => boolean
}) {
  if (value.type !== 'dict') return null
  return (
    <div className="dict">
      <div className="list-name">
        {name} <span className="muted">(dict)</span>
        {summary}
      </div>
      {value.entries.length === 0 ? (
        <div className="muted">empty {'{}'}</div>
      ) : (
        <table className="dict-table">
          <thead>
            <tr>
              <th>key</th>
              <th>value</th>
              <th aria-hidden />
            </tr>
          </thead>
          <tbody>
            {value.entries.map(([k, v]) => {
              const key = formatValue(k)
              return (
                <tr key={key} className={changed(key) ? 'changed' : undefined}>
                  <td>{key}</td>
                  <td>{formatValue(v)}</td>
                  <td className="badge-cell">{rowBadges(key)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
      {value.truncated && <div className="muted">(showing the first {value.entries.length} entries)</div>}
    </div>
  )
}
