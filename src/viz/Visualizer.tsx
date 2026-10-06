import type { CSSProperties } from 'react'
import type { PointerSpec, Step, Value } from '../types'
import { scalarChanges } from './changes'
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
  const sources = new Set(Object.values(changes).flatMap((c) => c.deltas.flatMap((d) => (d.from ? [d.from] : []))))

  return (
    <div className="viz">
      {step.func !== '<module>' && <div className="viz-frame">inside {step.func}()</div>}
      {lists.map(([name, value]) => (
        <ListView key={name} name={name} value={value} pointers={placed[name] ?? []} colorOf={colorOf} />
      ))}
      {dicts.map(([name, value]) => (
        <DictView key={name} name={name} value={value} prev={prevStep?.func === step.func ? prevStep.vars[name] : undefined} />
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
                {/* Stays for the whole step (also while paused); the next step replaces it. */}
                {change && change.deltas.length > 0 && (
                  <span key={`d${tick}`} className="var-deltas">
                    {change.deltas.map((part, i) => (
                      <span
                        key={i}
                        className={part.text.startsWith('-') ? 'var-delta down' : 'var-delta'}
                        style={{ '--i': i } as CSSProperties}
                      >
                        {part.text}
                        {part.from && <span className="var-from"> from {part.from}</span>}
                      </span>
                    ))}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}
      {entries.length === 0 && <p className="muted">No variables yet.</p>}
    </div>
  )
}

function ListView({
  name,
  value,
  pointers,
  colorOf,
}: {
  name: string
  value: Value
  pointers: PlacedPointer[]
  colorOf: (label: string) => string
}) {
  if (value.type !== 'list' && value.type !== 'tuple') return null
  // One extra slot so a pointer one past the end (e.g. `i == len(a)`) has somewhere to sit.
  const slots = value.items.length + (pointers.some((p) => p.index === value.items.length) ? 1 : 0)
  return (
    <div className="list">
      <div className="list-name">{name}</div>
      <div className="list-grid" style={{ gridTemplateColumns: `repeat(${slots}, 3.25rem)` }}>
        {value.items.map((item, i) => {
          const here = pointers.filter((p) => p.index === i)
          return (
            <div
              key={i}
              className="box"
              style={here.length ? { borderColor: colorOf(here[0].label), borderWidth: 3 } : undefined}
            >
              {formatValue(item)}
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

function DictView({ name, value, prev }: { name: string; value: Value; prev?: Value }) {
  if (value.type !== 'dict') return null
  const before = new Map(prev?.type === 'dict' ? prev.entries.map(([k, v]) => [formatValue(k), formatValue(v)]) : [])
  return (
    <div className="dict">
      <div className="list-name">
        {name} <span className="muted">(dict)</span>
      </div>
      {value.entries.length === 0 ? (
        <div className="muted">empty {'{}'}</div>
      ) : (
        <table className="dict-table">
          <thead>
            <tr>
              <th>key</th>
              <th>value</th>
            </tr>
          </thead>
          <tbody>
            {value.entries.map(([k, v]) => {
              const key = formatValue(k)
              const changed = prev !== undefined && before.get(key) !== formatValue(v)
              return (
                <tr key={key} className={changed ? 'changed' : undefined}>
                  <td>{key}</td>
                  <td>{formatValue(v)}</td>
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

export function formatValue(v: Value): string {
  switch (v.type) {
    case 'prim':
    case 'other':
      return v.repr
    case 'list':
      return `[${v.items.map(formatValue).join(', ')}${v.truncated ? ', …' : ''}]`
    case 'tuple':
      return `(${v.items.map(formatValue).join(', ')}${v.items.length === 1 ? ',' : ''})`
    case 'dict':
      return `{${v.entries.map(([k, val]) => `${formatValue(k)}: ${formatValue(val)}`).join(', ')}}`
  }
}
