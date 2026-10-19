import { useState, type CSSProperties, type ReactNode } from 'react'
import type { CellSpec, Language, NodeData, PointerSpec, Step, Value } from '../types'
import { CallStack } from './CallStack'
import { containerChanges, scalarChanges, stepRoles, type DeltaPart, type Plans, type Read } from './changes'
import { formatValue, nodeText } from './format'
import { buildNodeGraph } from './nodes'
import { NodeView } from './NodeView'
import { placePointers, type PlacedPointer } from './pointers'
import { GraphView, HeapView, IntervalView, type GraphMarks } from './ShapeViews'
import {
  callStack,
  decisionAt,
  graphOf,
  heapLists,
  heapNodeIds,
  isIntervals,
  loopPasses,
  SHAPE_LABELS,
  shapesFor,
  visibleSlots,
  type Decision,
  type LoopPass,
  type Shape,
  type Slot,
} from './shapes'
import { sharedObjects, type SharedNote } from './sharing'

// Bright enough to read on the dark galaxy panels, and distinct from each other.
const POINTER_COLORS = ['#c8b4ff', '#f0a7cf', '#8fb4ff', '#7ee0b8', '#ffc978', '#6fd8e8']

/** The problem function's answer, shown on the last step next to what the test expected. */
export interface Answer {
  value: Value
  /** The expected answer, written the way the language writes it. */
  expected?: string
  passed?: boolean
}

export function Visualizer({
  step,
  prevStep,
  pointers,
  plans,
  tick,
  language,
  steps,
  index,
  answer,
}: {
  step: Step
  /** The step before in the same function, used to highlight what just changed. */
  prevStep?: Step
  pointers: PointerSpec[]
  /** The tracer's plans for the code, to say what each change was made of. */
  plans?: Plans
  /** Changes on every step, so change animations replay. */
  tick?: number
  /** For words like None or null in drawings. */
  language: Language
  /** Every step and which one this is, for loop passes and the call stack. */
  steps?: Step[]
  index?: number
  /** The answer, on the last step. */
  answer?: Answer | null
}) {
  // A waiting call picked in the call stack, to look at its variables; cleared on the next step.
  const [viewing, setViewing] = useState<{ frame: number; tick?: number } | null>(null)
  // How the learner chose to draw a variable ("draw as"), by name; kept while stepping.
  const [drawAs, setDrawAs] = useState<Record<string, Shape>>({})
  const stack = steps && index !== undefined ? callStack(steps, index) : []
  const picked = viewing && viewing.tick === tick ? stack.find((e) => !e.current && e.frame === viewing.frame && e.step) : undefined
  const passes = steps && index !== undefined ? loopPasses(steps, index, plans?.blocks) : []
  const decision = picked ? null : decisionAt(step, prevStep, plans?.checks)
  const returned = !picked && step.returned && !/^(None|undefined)$/.test(step.returned.value[0]) && !/^(__init__|constructor)$/.test(step.returned.func) ? step.returned : null

  return (
    <div className="viz">
      <div className="viz-head">
        {step.func !== '<module>' && <div className="viz-frame">inside {step.func}()</div>}
        {passes.map((p) => (
          <LoopChip key={p.line} pass={p} />
        ))}
      </div>
      {stack.length > 0 && (
        <CallStack
          entries={stack}
          viewing={picked ? picked.frame : null}
          onView={(frame) => setViewing(frame === null ? null : { frame, tick })}
        />
      )}
      {picked?.step ? (
        <>
          <div className="viewing-note">
            Showing <b>{picked.func === '<module>' ? 'the top level' : `${picked.func}(${picked.args ?? ''})`}</b>, waiting at line {picked.line} for the call
            below it to finish.{' '}
            <button className="link-btn" onClick={() => setViewing(null)}>
              Back to the running call
            </button>
          </div>
          <Variables step={picked.step} pointers={pointers} plans={plans} language={language} drawAs={drawAs} setDrawAs={setDrawAs} />
        </>
      ) : (
        <>
          {(decision || returned) && (
            <div className="viz-events">
              {decision && <DecisionBanner key={`d${tick}`} decision={decision} language={language} />}
              {returned && (
                <div key={`r${tick}`} className="returned-chip" title="What the call this line made handed back to it.">
                  ↩ {returned.func}(…) gave back <b>{returned.value[0]}</b>
                </div>
              )}
            </div>
          )}
          <Variables step={step} prevStep={prevStep} pointers={pointers} plans={plans} tick={tick} language={language} drawAs={drawAs} setDrawAs={setDrawAs} />
          {answer && <AnswerCard answer={answer} />}
        </>
      )}
    </div>
  )
}

/** `loop at line 3 · pass 2 of 5` */
function LoopChip({ pass }: { pass: LoopPass }) {
  const of = pass.total !== null ? ` of ${pass.total}` : ''
  return (
    <span className="loop-chip" title={`The ${pass.kind} loop on line ${pass.line}: which time round it is.`}>
      line {pass.line} loop · {pass.done ? `done after ${pass.total} pass${pass.total === 1 ? '' : 'es'}` : `pass ${pass.pass}${of}`}
    </span>
  )
}

/** `if nums[mid] < target` → `7 < 9` → True, so it runs the if block. */
function DecisionBanner({ decision, language }: { decision: Decision; language: Language }) {
  const word = decision.kind === 'elif' ? (language === 'python' ? 'elif' : 'else if') : decision.kind
  const yes = language === 'python' ? 'True' : 'true'
  const no = language === 'python' ? 'False' : 'false'
  return (
    <div className={`decision ${decision.result ? 'yes' : 'no'}`} title={`The test on line ${decision.line}, with the values it read.`}>
      <span className="decision-kind">{word}</span>
      <code>{decision.text}</code>
      {decision.filled && (
        <>
          <span className="decision-arrow">→</span>
          <code>{decision.filled}</code>
        </>
      )}
      <span className="decision-arrow">→</span>
      <b>{decision.result ? yes : no}</b>
      <span className="decision-meaning">{decision.meaning}</span>
    </div>
  )
}

function AnswerCard({ answer }: { answer: Answer }) {
  const right = answer.passed
  return (
    <div className={`answer-card${right === true ? ' pass' : right === false ? ' fail' : ''}`}>
      <div className="answer-label">Returned</div>
      <div className="answer-value">{formatValue(answer.value)}</div>
      {answer.expected !== undefined && (
        <div className="answer-expected">
          expected {answer.expected} {right === true ? '✓' : right === false ? '✗' : ''}
        </div>
      )}
    </div>
  )
}

/** Every variable of one step, each drawn the way its value suits best (or as the learner picked). */
function Variables({
  step,
  prevStep,
  pointers,
  plans,
  tick,
  language,
  drawAs,
  setDrawAs,
}: {
  step: Step
  prevStep?: Step
  pointers: PointerSpec[]
  plans?: Plans
  tick?: number
  language: Language
  drawAs: Record<string, Shape>
  setDrawAs: (f: (d: Record<string, Shape>) => Record<string, Shape>) => void
}) {
  const placed = placePointers(step, pointers)
  const labels = [...new Set(pointers.map((p) => p.label))]
  const colorOf = (label: string) => POINTER_COLORS[labels.indexOf(label) % POINTER_COLORS.length]
  // Only color variables that are drawn as an arrow right now.
  const shown = new Set(Object.values(placed).flatMap((ps) => ps.map((p) => p.label)))
  const entries = Object.entries(step.vars)
  // Heap objects (a MinHeap) are drawn as their heap, not in the node drawing.
  const heapIds = heapNodeIds(step)
  const heapOwned = heapLists(step)
  const heapNames = new Set([...(plans?.heaps ?? []), ...heapOwned.filter((h) => !h.owner).map((h) => h.name)])
  const graph = buildNodeGraph(step, prevStep, heapIds)
  const nodeNames = [...new Set(Object.values(graph?.names ?? {}).flat())]
  const nameColor = (name: string) => (labels.includes(name) ? colorOf(name) : POINTER_COLORS[Math.max(0, nodeNames.indexOf(name)) % POINTER_COLORS.length])
  const shared = sharedObjects(step.vars)
  const remembered = new Set(step.captured ?? [])
  const changes = scalarChanges(step, prevStep, plans)
  const boxes = containerChanges(step, prevStep, plans)
  const { sources: sourceNames, reads } = stepRoles(step, prevStep, plans)
  const sources = new Set(sourceNames)
  // A list box or dict row the line read, e.g. ages['test'] in `total += ages["test"]`.
  const readsOf = (name: string, item?: string) => reads.filter((r) => r.name === name && r.item === item)
  // Keyed by step, so badges remount (and pop in) on every step but hold while paused.
  const badges = (parts: DeltaPart[] | undefined, gave: Read[], className?: string) => (
    <DeltaStack key={`d${tick}`} parts={parts} gave={gave.flatMap((r) => r.gave)} className={className} line={prevStep?.line} />
  )
  // A closure's variables (count, in makeCounter's returned function) and objects two names share.
  const notes = (name: string, shapes?: Shape[]) => (
    <>
      {remembered.has(name) && (
        <span className="remembered" title="This variable belongs to the function this one was made in. This function remembers it: a closure.">
          remembered
        </span>
      )}
      {shared[name]?.map((n) => <SharedChip key={n.path} name={name} note={n} />)}
      {shapes && shapes.length > 1 && (
        <label className="draw-as" title="Draw this variable another way">
          <span>draw as</span>
          <select value={shapeOf(name, shapes)} onChange={(e) => setDrawAs((d) => ({ ...d, [name]: e.target.value as Shape }))}>
            {shapes.map((s) => (
              <option key={s} value={s}>
                {SHAPE_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
      )}
    </>
  )
  const shapeOf = (name: string, shapes: Shape[]) => (drawAs[name] && shapes.includes(drawAs[name]) ? drawAs[name] : shapes[0])

  const pointedStrings = new Set(pointers.map((p) => p.target))
  const isBoxString = (name: string, v: Value) =>
    v.type === 'prim' &&
    typeof v.value === 'string' &&
    v.value.length > 0 &&
    v.value.length <= 40 &&
    (pointedStrings.has(name) || reads.some((r) => r.name === name && r.item !== undefined))

  // What each list, tuple and dict is drawn as.
  const shapes: Record<string, Shape[]> = {}
  for (const [name, v] of entries) if (v.type === 'list' || v.type === 'tuple' || v.type === 'dict') shapes[name] = shapesFor(name, v, heapNames)
  const drawn = (name: string) => (shapes[name] ? shapeOf(name, shapes[name]) : null)
  // Timelines share one number line, so intervals in different variables line up.
  const ends = entries.filter(([n, v]) => drawn(n) === 'intervals' && isIntervals(v)).flatMap(([, v]) => flatNumbers(v))
  const range: [number, number] = ends.length ? [Math.min(...ends), Math.max(...ends)] : [0, 1]

  const cards = entries.filter(([name, v]) => (v.type === 'prim' || v.type === 'other') && !isBoxString(name, v))
  const changedAt = (name: string) => (i: number) => !!boxes[name]?.parts[i]
  const readAt = (name: string) => (i: number) => readsOf(name, String(i)).length > 0
  const big = entries.filter(([name]) => ['grid', 'graph', 'intervals'].includes(drawn(name) ?? ''))
  const rows = entries.filter(([name, v]) => ['boxes', 'heap'].includes(drawn(name) ?? '') || isBoxString(name, v))
  const tables = entries.filter(([name]) => drawn(name) === 'table')

  return (
    <>
      {graph && <NodeView graph={graph} language={language} colorOf={nameColor} />}
      {heapOwned
        .filter((h) => h.owner)
        .map((h) => (
          <div key={h.name} className="list" data-target={`var:${h.name}`}>
            <div className="list-name">
              {h.name} <span className="muted">(heap)</span>
            </div>
            <HeapView items={(h.value as Extract<Value, { items: Value[] }>).items} pointers={[]} colorOf={colorOf} changed={() => false} read={() => false} nodes={step.nodes} />
          </div>
        ))}
      {big.map(([name, value]) => {
        const shape = drawn(name)
        if (shape === 'grid') {
          return (
            <GridView
              key={name}
              name={name}
              notes={notes(name, shapes[name])}
              value={value}
              before={prevStep?.vars[name]}
              nodes={step.nodes}
              step={step}
              rowPointers={placed[name] ?? []}
              cells={(plans?.cells ?? []).filter((c) => c.target === name)}
              colorOf={colorOf}
              reads={reads.filter((r) => r.name === name)}
            />
          )
        }
        if (shape === 'graph') {
          const g = graphOf(value)
          const old = prevStep?.vars[name]
          if (!g) return null
          return (
            <div key={name} className="list" data-target={`var:${name}`}>
              <div className="list-name">
                {name} <span className="muted">({g.nodes.length} nodes, {g.undirected ? 'two-way edges' : 'arrows show direction'})</span>
                {notes(name, shapes[name])}
              </div>
              <GraphView
                graph={g}
                before={old ? graphOf(old) : null}
                marks={graphMarks(name, g, step)}
                colorOf={nameColor}
                read={(node) => readsOf(name, node).length > 0 || readsOf(name, `'${node}'`).length > 0}
              />
            </div>
          )
        }
        if (value.type !== 'list' && value.type !== 'tuple') return null
        return (
          <div key={name} className="list" data-target={`var:${name}`}>
            <div className="list-name">
              {name} <span className="muted">({value.items.length} interval{value.items.length === 1 ? '' : 's'})</span>
              {notes(name, shapes[name])}
              {badges(boxes[name]?.summary, [], 'inline')}
            </div>
            <IntervalView items={value.items} range={range} pointers={placed[name] ?? []} colorOf={colorOf} changed={changedAt(name)} read={readAt(name)} />
          </div>
        )
      })}
      {rows.map(([name, value]) => {
        const str = value.type === 'prim'
        const list = str ? charList(String(value.value)) : value
        const change = changes[name]
        return (
          <ListView
            key={name}
            name={name}
            notes={notes(name, shapes[name])}
            value={list}
            kind={str ? 'string' : list.type === 'list' && list.set ? 'set' : 'list'}
            pointers={placed[name] ?? []}
            colorOf={colorOf}
            isSource={(label) => sources.has(label)}
            summary={str ? badges(change?.deltas.length ? change.deltas : change ? [{ text: `was ${shortText(change.before)}`, from: null }] : undefined, readsOf(name), 'inline') : badges(boxes[name]?.summary, [], 'inline')}
            // Boxes are narrow, so what a box gave shows on the change it fed, not on the box.
            itemBadges={(i) => (str ? null : badges(boxes[name]?.parts[i], [], 'on-box'))}
            changed={str ? (i) => charChanged(prevStep?.vars[name], value, i) : changedAt(name)}
            read={readAt(name)}
            nodes={step.nodes}
            heap={drawn(name) === 'heap'}
          />
        )
      })}
      {tables.map(([name, value]) => (
        <DictView
          key={name}
          name={name}
          notes={notes(name, shapes[name])}
          value={value}
          summary={badges(boxes[name]?.summary, [], 'inline')}
          rowBadges={(key) => badges(boxes[name]?.parts[key], readsOf(name, key), 'inline')}
          changed={(key) => !!boxes[name]?.parts[key]}
          read={(key) => readsOf(name, key).length > 0}
          nodes={step.nodes}
        />
      ))}
      {cards.length > 0 && (
        <div className="var-cards">
          {cards.map(([name, value]) => {
            const change = changes[name]
            const color = shown.has(name) ? colorOf(name) : undefined
            const cls = ['var-card', change && 'changed', sources.has(name) && 'source'].filter(Boolean).join(' ')
            return (
              <div key={name} className={cls} data-target={`var:${name}`} style={color ? ({ '--var-color': color } as CSSProperties) : undefined}>
                {sources.has(name) && <span key={`p${tick}`} className="var-pulse" aria-hidden />}
                <div className="var-name">
                  {name}
                  {notes(name)}
                </div>
                {value.type === 'other' && value.captured ? (
                  <ClosureView value={value} changed={!!change} tick={tick} />
                ) : (
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
                )}
                {badges(change?.deltas, readsOf(name))}
              </div>
            )
          })}
        </div>
      )}
      {entries.length === 0 && <p className="muted">No variables yet.</p>}
    </>
  )
}

const shortText = (text: string) => (text.length > 14 ? `${text.slice(0, 13)}…` : text)

/** A string as one box per letter. */
function charList(s: string): Value {
  return { type: 'list', items: [...s].map((ch) => ({ type: 'prim', repr: ch === ' ' ? '␣' : ch, value: ch })), truncated: false }
}

/** A letter that differs from the string the variable held on the step before. */
function charChanged(before: Value | undefined, now: Value, i: number) {
  if (before?.type !== 'prim' || typeof before.value !== 'string' || now.type !== 'prim' || typeof now.value !== 'string') return false
  return before.value !== now.value && [...before.value][i] !== [...now.value][i]
}

function flatNumbers(v: Value): number[] {
  if (v.type !== 'list' && v.type !== 'tuple') return []
  return v.items.flatMap((p) => (p.type === 'list' || p.type === 'tuple' ? p.items.map((x) => (x.type === 'prim' ? Number(x.value) : 0)) : []))
}

const VISITED = /visit|seen|done|explored|closed/i
const WAITING = /queue|^q$|stack|frontier|todo|deque|open|bfs|dfs/i
const CURRENT = /^(node|cur|curr|current|u|v|w|start|end|src|dst|target|nei|nb|neighbou?r|nxt|course|city|vertex|top|here)$/i

/** What the other variables say about a graph: which nodes are visited, waiting, or held right now. */
function graphMarks(graphName: string, g: { nodes: string[] }, step: Step): GraphMarks {
  const keys = new Set(g.nodes)
  const marks: GraphMarks = { visited: new Set(), visitedName: null, waiting: new Set(), waitingName: null, names: {} }
  for (const [name, v] of Object.entries(step.vars)) {
    if (name === graphName) continue
    const members =
      v.type === 'list' || v.type === 'tuple' ? v.items.map(formatValue) : v.type === 'dict' ? v.entries.map(([k]) => formatValue(k)) : null
    if (members && members.length && members.every((m) => keys.has(m))) {
      if (!marks.visitedName && (VISITED.test(name) || (v.type === 'list' && v.set && !WAITING.test(name)))) {
        marks.visitedName = name
        members.forEach((m) => marks.visited.add(m))
      } else if (!marks.waitingName && WAITING.test(name)) {
        marks.waitingName = name
        members.forEach((m) => marks.waiting.add(m))
      }
    } else if (v.type === 'prim' && CURRENT.test(name) && keys.has(formatValue(v))) {
      ;(marks.names[formatValue(v)] ??= []).push(name)
    }
  }
  return marks
}

const SHARED_COLORS = ['#6fd8e8', '#f0a7cf', '#ffc978', '#c8b4ff', '#7ee0b8', '#8fb4ff']

/** `🔗 same array as b`, or `🔗 .tags: same array as user.tags` for a part of the variable. */
function SharedChip({ name, note }: { name: string; note: SharedNote }) {
  const part = note.path === name ? '' : `${note.path.slice(name.length)}: `
  return (
    <span
      className="shared-chip"
      style={{ '--share-color': SHARED_COLORS[note.group % SHARED_COLORS.length] } as CSSProperties}
      title="Not a copy: both names point at one object, so a change made through either shows up in both."
    >
      <span aria-hidden>🔗 </span>
      {part}same {note.kind} as {note.others.join(', ')}
    </span>
  )
}

/** A closure: the function, and the outer variables it remembers with their values now. */
function ClosureView({ value, changed, tick }: { value: Extract<Value, { type: 'other' }>; changed: boolean; tick?: number }) {
  const name = /^\[Function: (.*)\]$/.exec(value.repr)?.[1]
  const entries = Object.entries(value.captured ?? {})
  return (
    <div className="closure">
      <div className="var-value">ƒ {name && name !== 'anonymous' ? name : <span className="muted">(no name)</span>}</div>
      <div className="closure-label">{entries.length ? 'remembers' : 'remembers nothing yet'}</div>
      {entries.map(([k, v]) => (
        <div key={k} className="closure-row">
          <span className="closure-name">{k}</span>
          <span key={changed ? `c${tick}` : 'same'} className={changed ? 'var-new' : undefined}>
            {formatValue(v)}
          </span>
        </div>
      ))}
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
  notes,
  value,
  kind,
  pointers,
  colorOf,
  isSource,
  summary,
  itemBadges,
  changed,
  read,
  nodes,
  heap,
}: {
  name: string
  notes: ReactNode
  value: Value
  /** A string is drawn one letter per box; a set has no indexes. */
  kind: 'list' | 'set' | 'string'
  pointers: PlacedPointer[]
  colorOf: (label: string) => string
  /** True for a pointer whose value the line that just ran used, e.g. `n` in `total += n`. */
  isSource: (label: string) => boolean
  summary: ReactNode
  itemBadges: (index: number) => ReactNode
  changed: (index: number) => boolean
  /** True for a box the line that just ran read, e.g. `nums[i]`. */
  read: (index: number) => boolean
  nodes?: Record<string, NodeData>
  /** Also draw it as the tree a heap stands for. */
  heap?: boolean
}) {
  if (value.type !== 'list' && value.type !== 'tuple') return null
  // One extra slot so a pointer one past the end (e.g. `i == len(a)`) has somewhere to sit.
  const length = value.items.length + (pointers.some((p) => p.index === value.items.length) ? 1 : 0)
  // A long list shows the boxes around its pointers and what the step touched; gaps stand for the rest.
  const marks = [...pointers.map((p) => p.index), ...value.items.flatMap((_, i) => (changed(i) || read(i) ? [i] : []))]
  const slots = visibleSlots(length, marks)
  const isGap = (s: Slot): s is { gap: number } => typeof s !== 'number'
  const columns = slots.map((s) => (isGap(s) ? '2.4rem' : kind === 'string' ? '2.1rem' : '3.25rem')).join(' ')
  const label = kind === 'string' ? 'string' : kind === 'set' ? (value.t === 'Set' ? 'Set' : 'set') : null
  return (
    <div className={`list${kind === 'string' ? ' string' : ''}`} data-target={`var:${name}`}>
      <div className="list-name">
        {name}
        {label && <span className="muted"> ({label}{kind === 'string' ? `, ${value.items.length} letters` : ''})</span>}
        {notes}
        {summary}
      </div>
      {kind === 'set' && !value.items.length ? (
        <div className="muted">empty</div>
      ) : (
        <div className="list-grid" style={{ gridTemplateColumns: columns }}>
          {slots.map((s, k) => {
            if (isGap(s)) {
              return (
                <div key={`g${k}`} className="box box-gap" title={`${s.gap} more box${s.gap === 1 ? '' : 'es'} not shown`}>
                  …{s.gap}
                </div>
              )
            }
            if (s >= value.items.length) return <div key={`s${s}`} className="box box-ghost" />
            const item = value.items[s]
            const here = pointers.filter((p) => p.index === s)
            // A box the line wrote stays green even when it also read it (`xs[i] += 1`).
            const source = !changed(s) && (read(s) || here.some((p) => isSource(p.label)))
            const cls = ['box', changed(s) && 'changed', source && 'source'].filter(Boolean).join(' ')
            return (
              <div
                key={`b${s}`}
                className={cls}
                style={here.length && !source && !changed(s) ? { borderColor: colorOf(here[0].label), borderWidth: 3 } : undefined}
              >
                <span className="box-value">{text(item, nodes)}</span>
                {itemBadges(s)}
              </div>
            )
          })}
          {kind !== 'set' &&
            slots.map((s, k) => (
              <div key={`i${k}`} className="index">
                {isGap(s) ? '' : s}
              </div>
            ))}
          {kind !== 'set' &&
            slots.map((s, k) => (
              <div key={`p${k}`} className="pointers">
                {!isGap(s) &&
                  pointers
                    .filter((p) => p.index === s)
                    .map((p) => (
                      <div key={p.label} className="pointer" style={{ color: isSource(p.label) ? 'var(--source)' : colorOf(p.label) }}>
                        <span className="arrow">▲</span>
                        {p.label}
                      </div>
                    ))}
              </div>
            ))}
        </div>
      )}
      {heap && (
        <HeapView items={value.items} pointers={pointers} colorOf={colorOf} changed={changed} read={read} nodes={nodes} />
      )}
      {value.truncated && <div className="muted">(showing the first {value.items.length} items)</div>}
    </div>
  )
}

function DictView({
  name,
  notes,
  value,
  summary,
  rowBadges,
  changed,
  read,
  nodes,
}: {
  name: string
  notes: ReactNode
  value: Value
  summary: ReactNode
  rowBadges: (key: string) => ReactNode
  changed: (key: string) => boolean
  /** True for a row the line that just ran read, e.g. `ages["test"]`. */
  read: (key: string) => boolean
  nodes?: Record<string, NodeData>
}) {
  if (value.type !== 'dict') return null
  return (
    <div className="dict" data-target={`var:${name}`}>
      <div className="list-name">
        {name} <span className="muted">({value.t ?? 'dict'})</span>
        {notes}
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
                  <td>{text(v, nodes)}</td>
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

/** A value as text; in a box or row a node shows just its value, with a ● to say it is a node. */
const text = (v: Value, nodes?: Record<string, NodeData>) => {
  if (v.type !== 'ref') return formatValue(v)
  const full = nodeText(v, nodes)
  const val = /\((.*)\)$/.exec(full)?.[1]
  return val === undefined ? full : `●${val}`
}

/**
 * A grid as rows and columns with their indexes. Cells the last line changed are green and
 * cells it read amber; the cell `grid[r][c]` points at is outlined, and its row and column
 * are marked in the pointer colors.
 */
function GridView({
  name,
  notes,
  value,
  before,
  nodes,
  step,
  rowPointers,
  cells,
  colorOf,
  reads,
}: {
  name: string
  notes: ReactNode
  value: Value
  before?: Value
  nodes?: Record<string, NodeData>
  step: Step
  rowPointers: PlacedPointer[]
  cells: CellSpec[]
  colorOf: (label: string) => string
  reads: Read[]
}) {
  if (value.type !== 'list') return null
  const rows = value.items as Extract<Value, { items: Value[] }>[]
  const width = Math.max(...rows.map((r) => r.items.length))
  const old = (r: number, c: number) => {
    if (before?.type !== 'list') return undefined
    const row = before.items[r]
    return row?.type === 'list' && row.items[c] ? formatValue(row.items[c]) : undefined
  }
  const int = (name: string) => {
    const v = step.vars[name]
    return v?.type === 'prim' && typeof v.value === 'number' && Number.isInteger(v.value) ? v.value : null
  }
  // The cells `grid[r][c]` names right now, with the variables that make them.
  const cursors = cells.flatMap((c) => {
    const r = int(c.row)
    const col = int(c.col)
    return r !== null && col !== null && r >= 0 && col >= 0 && r < rows.length && col < width ? [{ r, c: col, label: `${c.row}, ${c.col}`, color: colorOf(c.row) }] : []
  })
  const colPointers = cells.flatMap((c) => {
    const col = int(c.col)
    return col !== null && col >= 0 && col < width ? [{ label: c.col, index: col }] : []
  })
  const cellRead = (r: number, c: number) => reads.some((x) => x.item === String(r) && x.col === String(c))
  const rowRead = (r: number) => reads.some((x) => x.item === String(r) && x.col === undefined) && !reads.some((x) => x.item === String(r) && x.col !== undefined)
  const unique = <T extends { label: string; index: number }>(xs: T[]) => xs.filter((x, i) => xs.findIndex((y) => y.label === x.label) === i)
  return (
    <div className="list grid" data-target={`var:${name}`}>
      <div className="list-name">
        {name} <span className="muted">({rows.length} × {width})</span>
        {notes}
        {cursors.length > 0 && (
          <span className="muted grid-at">
            {' '}
            · {name}[{cursors[0].label.replace(', ', '][')}] is row {cursors[0].r}, column {cursors[0].c}
          </span>
        )}
      </div>
      <table className="grid-table">
        <thead>
          <tr>
            <th aria-hidden />
            {Array.from({ length: width }, (_, c) => {
              const here = unique(colPointers).filter((p) => p.index === c)
              return (
                <th key={c} style={here.length ? { color: colorOf(here[0].label) } : undefined}>
                  {here.length ? `${c} ${here.map((p) => p.label).join(' ')}▼` : c}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, r) => {
            const here = unique(rowPointers).filter((p) => p.index === r)
            return (
              <tr key={r}>
                <th className={rowRead(r) ? 'source' : undefined} style={here.length ? { color: colorOf(here[0].label) } : undefined}>
                  {here.length ? `${here.map((p) => p.label).join(' ')}▶ ${r}` : r}
                </th>
                {row.items.map((cell, c) => {
                  const now = text(cell, nodes)
                  const was = old(r, c)
                  const changed = before !== undefined && (was === undefined || was !== now)
                  const cursor = cursors.find((x) => x.r === r && x.c === c)
                  const cls = [changed && 'changed', !changed && cellRead(r, c) && 'source', cursor && 'cursor'].filter(Boolean).join(' ')
                  return (
                    <td key={c} className={cls || undefined} style={cursor ? ({ '--cursor': cursor.color } as CSSProperties) : undefined}>
                      {now}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
