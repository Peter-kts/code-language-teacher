import type { CSSProperties, ReactNode } from 'react'
import type { PointerSpec, Step, Value } from '../types'
import { containerChanges, scalarChanges, stepRoles, type DeltaPart, type Plans, type Read } from './changes'
import { formatValue } from './format'
import { placePointers, type PlacedPointer } from './pointers'

// Bright enough to read on the dark galaxy panels, and distinct from each other.
const POINTER_COLORS = ['#c8b4ff', '#f0a7cf', '#8fb4ff', '#7ee0b8', '#ffc978', '#6fd8e8']

export function Visualizer({
  step,
  prevStep,
  pointers,
  plans,
  tick,
}: {
  step: Step
  /** The step before in the same function, used to highlight what just changed. */
  prevStep?: Step
  pointers: PointerSpec[]
  /** The tracer's plans for the code, to say what each change was made of. */
  plans?: Plans
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
  const changes = scalarChanges(step, prevStep, plans)
  const boxes = containerChanges(step, prevStep, plans)
  const { sources: sourceNames, reads } = stepRoles(step, prevStep, plans)
  const sources = new Set(sourceNames)
  // A list box or dict row the line read, e.g. ages['test'] in `total += ages["test"]`.
  const readsOf = (name: string, item?: string) => reads.filter((r) => r.name === name && r.item === item)
  // Keyed by step, so badges remount (and pop in) on every step but hold while paused.
  const badges = (parts: DeltaPart[] | undefined, gave: Read[], className?: string) => (
    <DeltaStack
      key={`d${tick}`}
      parts={parts}
      gave={gave.flatMap((r) => r.gave)}
      className={className}
      line={prevStep?.line}
    />
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
          isSource={(label) => sources.has(label)}
          summary={badges(boxes[name]?.summary, [], 'inline')}
          // Boxes are narrow, so what a box gave shows on the change it fed, not on the box.
          itemBadges={(i) => badges(boxes[name]?.parts[i], [], 'on-box')}
          changed={(i) => !!boxes[name]?.parts[i]}
          read={(i) => readsOf(name, String(i)).length > 0}
        />
      ))}
      {dicts.map(([name, value]) => (
        <DictView
          key={name}
          name={name}
          value={value}
          summary={badges(boxes[name]?.summary, [], 'inline')}
          rowBadges={(key) => badges(boxes[name]?.parts[key], readsOf(name, key), 'inline')}
          changed={(key) => !!boxes[name]?.parts[key]}
          read={(key) => readsOf(name, key).length > 0}
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
                {badges(change?.deltas, readsOf(name))}
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
 * `gave` adds an amber tag per value this thing gave to a change (`12 → total`).
 */
function DeltaStack({
  parts = [],
  gave = [],
  className,
  line,
}: {
  parts?: DeltaPart[]
  gave?: Read['gave']
  className?: string
  line?: number
}) {
  if (!parts.length && !gave.length) return null
  return (
    <span className={className ? `var-deltas ${className}` : 'var-deltas'}>
      {parts.map((part, i) => (
        <span
          key={i}
          className={`var-delta ${tone(part.text)}`}
          style={{ '--i': i } as CSSProperties}
          title={line ? `Changed by line ${line}` : undefined}
        >
          {part.text}
          {part.from && (
            <span className="var-from">
              {part.text === '=' ? ' ' : ' from '}
              {part.from}
            </span>
          )}
          {part.sum && <SumParts parts={part.sum} first={part.text !== '='} />}
        </span>
      ))}
      {gave.map((g, i) => (
        <span
          key={`g${i}`}
          className="var-delta gave"
          style={{ '--i': parts.length + i } as CSSProperties}
          title={line ? `Used by line ${line}` : undefined}
        >
          {g.value} → {g.to}
        </span>
      ))}
    </span>
  )
}

/** `= 4 + 12`: a value read from a variable, box or row gets an amber chip, like its source. */
function SumParts({ parts, first }: { parts: NonNullable<DeltaPart['sum']>; first: boolean }) {
  return (
    <span className="sum">
      {first && <span className="sum-op">=</span>}
      {parts.map((p, i) => (
        <span key={i} className="sum-group">
          {(i > 0 || p.sign < 0) && <span className="sum-op">{p.sign < 0 ? '−' : '+'}</span>}
          <span className={p.label ? 'sum-part read' : 'sum-part'}>{p.value}</span>
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
  isSource,
  summary,
  itemBadges,
  changed,
  read,
}: {
  name: string
  value: Value
  pointers: PlacedPointer[]
  colorOf: (label: string) => string
  /** True for a pointer whose value the line that just ran used, e.g. `n` in `total += n`. */
  isSource: (label: string) => boolean
  summary: ReactNode
  itemBadges: (index: number) => ReactNode
  changed: (index: number) => boolean
  /** True for a box the line that just ran read, e.g. `nums[i]`. */
  read: (index: number) => boolean
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
          // A box the line wrote stays green even when it also read it (`xs[i] += 1`).
          const source = !changed(i) && (read(i) || here.some((p) => isSource(p.label)))
          const cls = ['box', changed(i) && 'changed', source && 'source'].filter(Boolean).join(' ')
          return (
            <div
              key={i}
              className={cls}
              style={here.length && !source && !changed(i) ? { borderColor: colorOf(here[0].label), borderWidth: 3 } : undefined}
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
                <div key={p.label} className="pointer" style={{ color: isSource(p.label) ? 'var(--source)' : colorOf(p.label) }}>
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
  read,
}: {
  name: string
  value: Value
  summary: ReactNode
  rowBadges: (key: string) => ReactNode
  changed: (key: string) => boolean
  /** True for a row the line that just ran read, e.g. `ages["test"]`. */
  read: (key: string) => boolean
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
                <tr key={key} className={changed(key) ? 'changed' : read(key) ? 'source' : undefined}>
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
