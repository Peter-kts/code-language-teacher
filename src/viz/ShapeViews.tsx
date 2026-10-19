import type { CSSProperties } from 'react'
import type { NodeData, Value } from '../types'
import { formatValue, nodeText } from './format'
import type { PlacedPointer } from './pointers'
import type { GraphData } from './shapes'

// Drawings for lists and dicts whose meaning is a shape: a heap's hidden tree, a graph's
// dots and lines, and intervals as bars on a number line. Green is what the line that just
// ran changed and amber what it read, as everywhere else in the visualizer.

const short = (text: string, max = 7) => (text.length > max ? `${text.slice(0, max - 1)}…` : text)

const itemText = (v: Value, nodes?: Record<string, NodeData>) => (v.type === 'ref' ? nodeText(v, nodes) : formatValue(v))

// ---- heap ----

const HEAP = { r: 17, h: 54, min: 44, top: 22 }
const MAX_HEAP = 31

/**
 * A list kept as a heap, drawn as the tree it stands for: the item at i has its children at
 * 2i + 1 and 2i + 2, so the top (index 0) is always the smallest, or the largest for a max heap.
 */
export function HeapView({
  items,
  pointers,
  colorOf,
  changed,
  read,
  nodes,
}: {
  items: Value[]
  pointers: PlacedPointer[]
  colorOf: (label: string) => string
  changed: (i: number) => boolean
  read: (i: number) => boolean
  nodes?: Record<string, NodeData>
}) {
  const shown = items.slice(0, MAX_HEAP)
  if (!shown.length) return <div className="muted heap-empty">empty heap</div>
  const levels = Math.floor(Math.log2(shown.length)) + 1
  const width = Math.max(1, 2 ** (levels - 1)) * HEAP.min
  const height = HEAP.top + levels * HEAP.h
  const at = (i: number) => {
    const depth = Math.floor(Math.log2(i + 1))
    const k = i - (2 ** depth - 1)
    const span = width / 2 ** depth
    return { x: span * (k + 0.5), y: HEAP.top + depth * HEAP.h + HEAP.r }
  }
  return (
    <div className="heap">
      <div className="nodes-scroll">
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Heap drawn as a tree">
          {shown.map((_, i) => {
            if (i === 0) return null
            const a = at(Math.floor((i - 1) / 2))
            const b = at(i)
            return <line key={`e${i}`} className="node-edge" x1={a.x} y1={a.y + HEAP.r} x2={b.x} y2={b.y - HEAP.r} />
          })}
          {shown.map((item, i) => {
            const p = at(i)
            const here = pointers.filter((q) => q.index === i)
            const cls = ['node', changed(i) && 'changed', !changed(i) && read(i) && 'source', i === 0 && 'heap-top'].filter(Boolean).join(' ')
            return (
              <g key={i} className={cls}>
                <title>{`index ${i}: ${itemText(item, nodes)}${i ? ` · parent is index ${Math.floor((i - 1) / 2)}` : ' · the top'}`}</title>
                <circle cx={p.x} cy={p.y} r={HEAP.r} style={here.length && !changed(i) && !read(i) ? { stroke: colorOf(here[0].label) } : undefined} />
                <text className="node-val" x={p.x} y={p.y + 4} textAnchor="middle">
                  {short(itemText(item, nodes), 6)}
                </text>
                <text className="heap-index" x={p.x + HEAP.r - 2} y={p.y - HEAP.r - 2}>
                  {i}
                </text>
                {here.map((q, k) => (
                  <text key={q.label} className="node-name" x={p.x - HEAP.r} y={p.y - HEAP.r - 3 - k * 12} textAnchor="end" fill={colorOf(q.label)}>
                    {q.label}
                  </text>
                ))}
              </g>
            )
          })}
        </svg>
      </div>
      <div className="muted heap-note">
        Each item's children sit at 2i + 1 and 2i + 2, so the top (index 0) is always first out.
        {items.length > MAX_HEAP && ` Showing the first ${MAX_HEAP}.`}
      </div>
    </div>
  )
}

// ---- graph ----

/** What the other variables say about a graph's nodes. */
export interface GraphMarks {
  /** Nodes in a visited set (or dict, or list), e.g. `seen`. */
  visited: Set<string>
  visitedName: string | null
  /** Nodes waiting in a queue or stack, e.g. `queue`. */
  waiting: Set<string>
  waitingName: string | null
  /** Variables holding a node right now, by node, e.g. `node` on 2. */
  names: Record<string, string[]>
}

export function GraphView({
  graph,
  before,
  marks,
  colorOf,
  read,
}: {
  graph: GraphData
  before: GraphData | null
  marks: GraphMarks
  colorOf: (name: string) => string
  /** Nodes whose neighbor list the line read. */
  read: (node: string) => boolean
}) {
  const n = graph.nodes.length
  const radius = Math.max(56, n * 13)
  const pad = 34
  const size = radius * 2 + pad * 2
  const at = (i: number) => {
    const a = -Math.PI / 2 + (2 * Math.PI * i) / n
    return { x: pad + radius + radius * Math.cos(a), y: pad + radius + radius * Math.sin(a) }
  }
  const index = new Map(graph.nodes.map((k, i) => [k, i]))
  const seen = new Set<string>()
  const oldEdges = new Set(before?.edges.map(([a, b]) => `${a}\0${b}`))
  const edges = graph.edges.filter(([a, b]) => {
    if (!graph.undirected) return true
    const key = a < b ? `${a}\0${b}` : `${b}\0${a}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
  const R = 15
  return (
    <div className="graph">
      <div className="nodes-scroll">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Graph drawing">
          <defs>
            <marker id="graph-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0,0 L8,4 L0,8 z" fill="var(--muted)" />
            </marker>
          </defs>
          {edges.map(([a, b], k) => {
            const p = at(index.get(a)!)
            const q = at(index.get(b)!)
            const fresh = before !== null && !oldEdges.has(`${a}\0${b}`)
            if (a === b) {
              return <circle key={k} className={fresh ? 'node-edge changed' : 'node-edge'} cx={p.x} cy={p.y - R - 7} r={8} fill="none" />
            }
            const dx = q.x - p.x
            const dy = q.y - p.y
            const len = Math.hypot(dx, dy) || 1
            const ux = dx / len
            const uy = dy / len
            return (
              <line
                key={k}
                className={fresh ? 'node-edge changed' : 'node-edge'}
                x1={p.x + ux * R}
                y1={p.y + uy * R}
                x2={q.x - ux * (R + (graph.undirected ? 0 : 3))}
                y2={q.y - uy * (R + (graph.undirected ? 0 : 3))}
                markerEnd={graph.undirected ? undefined : 'url(#graph-arrow)'}
              />
            )
          })}
          {graph.nodes.map((key, i) => {
            const p = at(i)
            const names = marks.names[key] ?? []
            const fresh = before !== null && !before.nodes.includes(key)
            const cls = [
              'node',
              fresh && 'changed',
              read(key) && 'source',
              marks.visited.has(key) && 'visited',
              marks.waiting.has(key) && 'waiting',
            ]
              .filter(Boolean)
              .join(' ')
            return (
              <g key={key} className={cls}>
                <title>{`node ${key}${marks.visited.has(key) ? ` · in ${marks.visitedName}` : ''}${marks.waiting.has(key) ? ` · in ${marks.waitingName}` : ''}`}</title>
                <circle cx={p.x} cy={p.y} r={R} style={names.length ? ({ stroke: colorOf(names[0]), strokeWidth: 3 } as CSSProperties) : undefined} />
                <text className="node-val" x={p.x} y={p.y + 4} textAnchor="middle">
                  {short(key, 5)}
                </text>
                {names.map((name, k) => (
                  <text key={name} className="node-name" x={p.x} y={p.y - R - 5 - k * 12} textAnchor="middle" fill={colorOf(name)}>
                    {name}
                  </text>
                ))}
              </g>
            )
          })}
        </svg>
      </div>
      {(marks.visitedName || marks.waitingName) && (
        <div className="graph-legend">
          {marks.visitedName && (
            <span>
              <span className="legend-dot visited" /> in {marks.visitedName}
            </span>
          )}
          {marks.waitingName && (
            <span>
              <span className="legend-dot waiting" /> waiting in {marks.waitingName}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

// ---- intervals ----

const BAR = { h: 20, gap: 6, label: 64, width: 320 }

/** Pairs of numbers as bars on one number line, so overlaps show. Bars that overlap another are amber-edged. */
export function IntervalView({
  items,
  range,
  pointers,
  colorOf,
  changed,
  read,
}: {
  items: Value[]
  /** The smallest start and biggest end across every timeline on this step, so they line up. */
  range: [number, number]
  pointers: PlacedPointer[]
  colorOf: (label: string) => string
  changed: (i: number) => boolean
  read: (i: number) => boolean
}) {
  const pairs = items.map((p) => (p.type === 'list' || p.type === 'tuple' ? p.items.map((v) => (v.type === 'prim' ? Number(v.value) : 0)) : [0, 0]))
  const [lo, hi] = range
  const span = Math.max(1, hi - lo)
  const x = (v: number) => BAR.label + ((v - lo) / span) * BAR.width
  const overlaps = (i: number) => pairs.some((q, j) => j !== i && pairs[i][0] <= q[1] && q[0] <= pairs[i][1])
  const height = pairs.length * (BAR.h + BAR.gap) + 26
  const ticks = niceTicks(lo, hi)
  return (
    <div className="intervals">
      <div className="nodes-scroll">
        <svg width={BAR.label + BAR.width + 24} height={height} role="img" aria-label="Intervals on a number line">
          {ticks.map((t) => (
            <g key={t} className="tick">
              <line x1={x(t)} y1={0} x2={x(t)} y2={height - 18} />
              <text x={x(t)} y={height - 4} textAnchor="middle">
                {t}
              </text>
            </g>
          ))}
          {pairs.map(([a, b], i) => {
            const y = i * (BAR.h + BAR.gap)
            const here = pointers.filter((p) => p.index === i)
            const cls = ['bar', changed(i) && 'changed', !changed(i) && read(i) && 'source', overlaps(i) && 'overlap'].filter(Boolean).join(' ')
            return (
              <g key={i} className={cls}>
                <title>{`[${a}, ${b}]${overlaps(i) ? ' overlaps another interval' : ''}`}</title>
                <text className="bar-index" x={4} y={y + 14}>
                  {i}
                  {here.map((p) => (
                    <tspan key={p.label} fill={colorOf(p.label)} dx={4}>
                      ◀{p.label}
                    </tspan>
                  ))}
                </text>
                <rect x={x(a)} y={y} width={Math.max(4, x(b) - x(a))} height={BAR.h} rx={5} />
                <text className="bar-text" x={x(a) + 5} y={y + 14}>
                  {a}–{b}
                </text>
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}

/** About five round numbers between lo and hi for the axis. */
function niceTicks(lo: number, hi: number): number[] {
  const span = Math.max(1, hi - lo)
  const raw = span / 5
  const mag = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw
  const out: number[] = []
  for (let t = Math.ceil(lo / step) * step; t <= hi + 1e-9; t += step) out.push(Number(t.toPrecision(10)))
  return out
}
