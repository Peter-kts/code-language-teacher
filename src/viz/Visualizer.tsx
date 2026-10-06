import type { CSSProperties, ReactNode } from 'react'
import type { PointerSpec, Step, Value } from '../types'
import { diffStep, type Change } from './changes'
import { formatValue } from './format'
import { placePointers, type PlacedPointer } from './pointers'

// Bright enough to read on the dark galaxy panels, and distinct from each other.
const POINTER_COLORS = ['#c8b4ff', '#f0a7cf', '#8fb4ff', '#7ee0b8', '#ffc978', '#6fd8e8']

export function Visualizer({
  step,
  stepIndex,
  prevStep,
  pointers,
  code,
}: {
  step: Step
  /** Position in the run; a new step remounts the change badges so they animate in. */
  stepIndex: number
  /** The previous step in the same function, used to show what just changed. */
  prevStep?: Step
  pointers: PointerSpec[]
  /** Source that produced this trace, to say where an added amount came from. */
  code?: string
}) {
  const ranLine = prevStep && code ? code.split('\n')[prevStep.line - 1] : undefined
  const changes = diffStep(prevStep, step, ranLine)
  const from = changes.line
  const placed = placePointers(step, pointers)
  const labels = [...new Set(pointers.map((p) => p.label))]
  const colorOf = (label: string) => POINTER_COLORS[labels.indexOf(label) % POINTER_COLORS.length]
  // Only color variables that are drawn as an arrow right now.
  const shown = new Set(Object.values(placed).flatMap((ps) => ps.map((p) => p.label)))
  const entries = Object.entries(step.vars)
  const lists = entries.filter(([, v]) => v.type === 'list' || v.type === 'tuple')
  const dicts = entries.filter(([, v]) => v.type === 'dict')
  const others = entries.filter(([, v]) => v.type !== 'list' && v.type !== 'tuple' && v.type !== 'dict')

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
          badges={<ChangeStack key={stepIndex} changes={changes.vars[name]} line={from} />}
          itemBadges={(i) => <ChangeStack key={stepIndex} changes={changes.items[name]?.[i]} line={from} className="box-changes" />}
        />
      ))}
      {dicts.map(([name, value]) => (
        <DictView
          key={name}
          name={name}
          value={value}
          prev={prevStep?.func === step.func ? prevStep.vars[name] : undefined}
          badges={<ChangeStack key={stepIndex} changes={changes.vars[name]} line={from} />}
        />
      ))}
      {others.length > 0 && (
        <table className="vars">
          <tbody>
            {others.map(([name, value]) => (
              <tr key={name} className={changes.vars[name] ? 'changed' : undefined}>
                <th style={shown.has(name) ? { color: colorOf(name) } : undefined}>{name}</th>
                <td>{formatValue(value)}</td>
                <td className="change-cell">
                  <ChangeStack key={stepIndex} changes={changes.vars[name]} line={from} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {entries.length === 0 && <p className="muted">No variables yet.</p>}
    </div>
  )
}

/**
 * Badges for what the last line changed. They stay for the whole step (also
 * while paused) and are replaced on the next one. Several changes stack, newest
 * on top.
 */
function ChangeStack({ changes, line, className }: { changes?: Change[]; line: number | null; className?: string }) {
  if (!changes?.length) return null
  return (
    <span className={className ? `change-stack ${className}` : 'change-stack'}>
      {[...changes].reverse().map((c, i) => (
        <span
          key={i}
          className={`change change-${c.tone}`}
          style={{ '--i': i } as CSSProperties}
          title={line ? `Changed by line ${line}` : undefined}
        >
          {c.text}
          {c.from && <span className="change-from"> from {c.from}</span>}
        </span>
      ))}
    </span>
  )
}

function ListView({
  name,
  value,
  pointers,
  colorOf,
  badges,
  itemBadges,
}: {
  name: string
  value: Value
  pointers: PlacedPointer[]
  colorOf: (label: string) => string
  badges: ReactNode
  itemBadges: (index: number) => ReactNode
}) {
  if (value.type !== 'list' && value.type !== 'tuple') return null
  // One extra slot so a pointer one past the end (e.g. `i == len(a)`) has somewhere to sit.
  const slots = value.items.length + (pointers.some((p) => p.index === value.items.length) ? 1 : 0)
  return (
    <div className="list">
      <div className="list-name">
        {name}
        {badges}
      </div>
      <div className="list-grid" style={{ gridTemplateColumns: `repeat(${slots}, 3.25rem)` }}>
        {value.items.map((item, i) => {
          const here = pointers.filter((p) => p.index === i)
          return (
            <div
              key={i}
              className="box"
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

function DictView({ name, value, prev, badges }: { name: string; value: Value; prev?: Value; badges: ReactNode }) {
  if (value.type !== 'dict') return null
  const before = new Map(prev?.type === 'dict' ? prev.entries.map(([k, v]) => [formatValue(k), formatValue(v)]) : [])
  return (
    <div className="dict">
      <div className="list-name">
        {name} <span className="muted">(dict)</span>
        {badges}
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
