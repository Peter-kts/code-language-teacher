import type { Language } from '../types'
import type { NodeGraph, PlacedNode } from './nodes'

// Draws a NodeGraph (nodes.ts): linked lists as boxes with a `next` arrow, trees as circles
// joined by lines. Variables that point at a node are written on top of it, in the same
// colors as list pointers. What the line that just ran changed is green.

const LIST = { w: 92, h: 78, box: 58, boxH: 32, top: 26 }
const TREE = { w: 50, h: 62, r: 17, top: 24 }

export function NodeView({
  graph,
  language,
  colorOf,
}: {
  graph: NodeGraph
  language: Language
  colorOf: (name: string) => string
}) {
  const none = language === 'python' ? 'None' : 'null'
  const tree = graph.shape === 'tree'
  const cell = tree ? TREE : LIST
  // Room above the top row for the names stacked on its nodes.
  const most = Math.max(1, ...graph.nodes.filter((n) => n.y === 0).map((n) => graph.names[n.id]?.length ?? 0))
  const top = cell.top + (most - 1) * 13
  const at = (n: PlacedNode) => ({ x: 14 + n.x * cell.w, y: top + n.y * cell.h })
  const byId = new Map(graph.nodes.map((n) => [n.id, n]))
  // Room on the right for a last `next → None`, and below for a curved arrow back.
  const width = 14 + graph.width * cell.w + (tree ? 10 : 40)
  const height = top + graph.height * cell.h + (tree ? 4 : 10)
  const kind = tree ? 'Tree' : graph.shape === 'list' ? 'Linked list' : 'Objects'
  return (
    <div className="nodes">
      <div className="list-name">
        {kind} <span className="muted">(names show which variables point at a node)</span>
      </div>
      <div className="nodes-scroll">
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${kind} drawing`}>
          <defs>
            <marker id="node-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0,0 L8,4 L0,8 z" fill="var(--muted)" />
            </marker>
            <marker id="node-arrow-new" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0,0 L8,4 L0,8 z" fill="var(--pass)" />
            </marker>
          </defs>
          {graph.edges.map((e, i) => {
            const from = byId.get(e.from)
            if (!from) return null
            const a = at(from)
            const cls = e.changed ? 'node-edge changed' : 'node-edge'
            const marker = `url(#${e.changed ? 'node-arrow-new' : 'node-arrow'})`
            const to = e.to ? byId.get(e.to) : undefined
            if (tree) {
              if (!to) return null
              const b = at(to)
              const dx = b.x - a.x
              const dy = b.y - a.y
              const len = Math.hypot(dx, dy) || 1
              const ux = dx / len
              const uy = dy / len
              return (
                <line
                  key={i}
                  className={cls}
                  x1={a.x + TREE.r + ux * TREE.r}
                  y1={a.y + TREE.r + uy * TREE.r}
                  x2={b.x + TREE.r - ux * (TREE.r + 2)}
                  y2={b.y + TREE.r - uy * (TREE.r + 2)}
                  markerEnd={marker}
                />
              )
            }
            // From the dot in the box's right part.
            const sx = a.x + LIST.box - 9
            const sy = a.y + LIST.boxH / 2
            if (!to) {
              return (
                <g key={i} className={cls}>
                  <line x1={sx} y1={sy} x2={a.x + LIST.box + 16} y2={sy} markerEnd={marker} />
                  <text className="node-none" x={a.x + LIST.box + 21} y={sy + 4}>
                    {none}
                  </text>
                </g>
              )
            }
            const b = at(to)
            if (b.y === a.y && b.x > a.x && to.x === from.x + 1) {
              return <line key={i} className={cls} x1={sx} y1={sy} x2={b.x - 2} y2={b.y + LIST.boxH / 2} markerEnd={marker} />
            }
            // Anywhere else (backwards, another row, skipping nodes): curve underneath.
            const ty = b.y + LIST.boxH
            const dip = Math.max(a.y, b.y) + LIST.boxH + 18
            return (
              <path
                key={i}
                className={cls}
                d={`M${sx},${sy} C${sx + 30},${dip} ${b.x + LIST.box / 2},${dip} ${b.x + LIST.box / 2},${ty + 2}`}
                fill="none"
                markerEnd={marker}
              />
            )
          })}
          {graph.nodes.map((n) => {
            const p = at(n)
            const names = graph.names[n.id] ?? []
            return (
              <g key={n.id} className={n.changed ? 'node changed' : 'node'}>
                <title>{`${n.cls}${n.label ? ` · val ${n.label}` : ''}${n.extra.length ? ` · ${n.extra.join(', ')}` : ''}`}</title>
                {tree ? (
                  <>
                    <circle cx={p.x + TREE.r} cy={p.y + TREE.r} r={TREE.r} style={names.length ? { stroke: colorOf(names[0]) } : undefined} />
                    <text className="node-val" x={p.x + TREE.r} y={p.y + TREE.r + 5} textAnchor="middle">
                      {n.label}
                    </text>
                  </>
                ) : (
                  <>
                    <rect x={p.x} y={p.y} width={LIST.box} height={LIST.boxH} rx={6} style={names.length ? { stroke: colorOf(names[0]) } : undefined} />
                    <line className="node-split" x1={p.x + LIST.box - 18} y1={p.y} x2={p.x + LIST.box - 18} y2={p.y + LIST.boxH} />
                    <circle className="node-dot" cx={p.x + LIST.box - 9} cy={p.y + LIST.boxH / 2} r={3} />
                    <text className="node-val" x={p.x + (LIST.box - 18) / 2} y={p.y + LIST.boxH / 2 + 5} textAnchor="middle">
                      {n.label}
                    </text>
                  </>
                )}
                {names.map((name, i) => (
                  <text
                    key={name}
                    className="node-name"
                    x={p.x + (tree ? TREE.r : (LIST.box - 18) / 2)}
                    y={p.y - 6 - i * 13}
                    textAnchor="middle"
                    fill={colorOf(name)}
                  >
                    {name}
                  </text>
                ))}
                {n.extra.length > 0 && !tree && (
                  <text className="node-extra" x={p.x} y={p.y + LIST.boxH + 13}>
                    {n.extra.join(' ')}
                  </text>
                )}
              </g>
            )
          })}
        </svg>
      </div>
      {graph.missing && <div className="muted">(only the first 60 nodes are drawn)</div>}
    </div>
  )
}
