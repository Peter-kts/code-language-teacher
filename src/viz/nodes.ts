import type { NodeData, Step, Value } from '../types'
import { formatValue } from './format'

// Turns the class instances a step's variables reach (Step.nodes, see the tracers) into a
// drawing: linked lists as rows of boxes with arrows, trees as trees, anything else in layers.
// Pure layout, so it can be tested without a browser; NodeView.tsx draws it.

export interface PlacedNode {
  id: string
  cls: string
  /** The node's `val` (or its first plain field), as text. */
  label: string
  /** Its other plain fields, like `count = 2`. */
  extra: string[]
  /** Column and row in layout units (one unit is one node). */
  x: number
  y: number
  /** New since the step before, or its value changed. */
  changed: boolean
}

export interface NodeEdge {
  from: string
  /** The node it points at; null for a `next` that is None / null (drawn as a stub). */
  to: string | null
  field: string
  /** It pointed somewhere else on the step before. */
  changed: boolean
}

export interface NodeGraph {
  shape: 'list' | 'tree' | 'graph'
  nodes: PlacedNode[]
  edges: NodeEdge[]
  /** Which variables point at each node, by node id, in variable order. */
  names: Record<string, string[]>
  /** Nodes it has fields for (the tracers stop listing after 60). */
  missing: boolean
  width: number
  height: number
}

const TREE_FIELDS = new Set(['left', 'right'])

/** The ids of nodes a value points at, directly or inside a list or dict. */
function refsIn(v: Value, out: string[] = []): string[] {
  if (v.type === 'ref') out.push(String(v.id))
  else if (v.type === 'list' || v.type === 'tuple') v.items.forEach((i) => refsIn(i, out))
  else if (v.type === 'dict') v.entries.forEach(([k, val]) => (refsIn(k, out), refsIn(val, out)))
  return out
}

const LINK_FIELDS = new Set(['next', 'prev', 'left', 'right'])

/**
 * A node's fields that point at nodes: a node, a list of nodes (a graph's neighbors), or a
 * `next` / `left` / `right` that is None or null for now (drawn as a stub).
 */
function pointerFields(data: NodeData): [string, string | null][] {
  return data.fields.flatMap(([k, v]): [string, string | null][] => {
    if (v.type === 'ref') return [[k, String(v.id)]]
    if ((v.type === 'list' || v.type === 'tuple') && v.items.length && v.items.every((i) => i.type === 'ref')) {
      return v.items.map((i) => [k, String((i as { id: number }).id)])
    }
    if (v.type === 'prim' && (v.value === null || v.repr === 'undefined') && LINK_FIELDS.has(k)) return [[k, null]]
    return []
  })
}

/** `skip`: nodes drawn some other way (a heap object), left out along with what only they reach. */
export function buildNodeGraph(step: Step, prev?: Step, skip?: Set<string>): NodeGraph | null {
  const all = step.nodes
  if (!all) return null
  const names: Record<string, string[]> = {}
  const roots: string[] = []
  for (const [name, value] of Object.entries(step.vars)) {
    if (value.type === 'ref') (names[String(value.id)] ??= []).push(name)
    for (const id of refsIn(value)) if (!roots.includes(id)) roots.push(id)
  }
  // What outer calls hold comes after, so this call's own nodes lead the layout of lists.
  for (const id of step.outer ?? []) if (!roots.includes(id)) roots.push(id)
  // Every node reachable from the variables, in the order they're met.
  const order: string[] = []
  const seen = new Set<string>()
  let missing = false
  const visit = (id: string) => {
    if (seen.has(id)) return
    seen.add(id)
    if (skip?.has(id)) return
    const data = all[id]
    if (!data) {
      missing = true
      return
    }
    order.push(id)
    for (const [, to] of pointerFields(data)) if (to) visit(to)
  }
  roots.forEach(visit)
  if (!order.length) return null

  const edges: NodeEdge[] = []
  for (const id of order) {
    for (const [field, to] of pointerFields(all[id])) {
      if (to && !all[to]) continue
      const before = prev?.nodes?.[id]
      // Where this field pointed on the step before: changed if that was somewhere else.
      const beforeTos = before ? pointerFields(before).filter(([k]) => k === field).map(([, t]) => t) : null
      edges.push({ from: id, to, field, changed: beforeTos !== null && !beforeTos.includes(to) })
    }
  }
  const isTree = order.some((id) => all[id].fields.some(([k]) => TREE_FIELDS.has(k)))
  const isList = !isTree && order.every((id) => pointerFields(all[id]).every(([k]) => k === 'next'))
  const shape: NodeGraph['shape'] = isTree ? 'tree' : isList ? 'list' : 'graph'
  const spot = shape === 'tree' ? layoutTree(order, edges) : shape === 'list' ? layoutList(order, edges, roots) : layoutLayers(order, edges, roots)

  const nodes = order.map((id): PlacedNode => {
    const data = all[id]
    const links = new Set(pointerFields(data).map(([k]) => k))
    const plain = data.fields.filter(([k]) => !links.has(k))
    const valField = plain.find(([k]) => k === 'val') ?? plain[0]
    const was = prev?.nodes?.[id]
    return {
      id,
      cls: data.cls,
      label: valField ? short(formatValue(valField[1])) : '',
      extra: plain.filter((f) => f !== valField).map(([k, v]) => `${k} = ${short(formatValue(v))}`),
      x: spot[id].x,
      y: spot[id].y,
      // New on this step, or its value changed. (On a call's first step nothing is new: it was passed in.)
      changed: prev !== undefined && (!was || plainText(was) !== plainText(data)),
    }
  })
  return {
    shape,
    nodes,
    edges,
    names,
    missing,
    width: Math.max(...nodes.map((n) => n.x)) + 1,
    height: Math.max(...nodes.map((n) => n.y)) + 1,
  }
}

const short = (text: string) => (text.length > 8 ? `${text.slice(0, 7)}…` : text)
/** A node's own values, without where it points. */
const plainText = (d: NodeData) => JSON.stringify(d.fields.filter(([k]) => !pointerFields({ cls: d.cls, fields: d.fields }).some(([p]) => p === k)))

/** Rows of `next` chains, one per head (a node nothing points at), in the order variables reach them. */
function layoutList(order: string[], edges: NodeEdge[], roots: string[]) {
  const next = new Map(edges.filter((e) => e.to).map((e) => [e.from, e.to!]))
  const pointedAt = new Set(next.values())
  const spot: Record<string, { x: number; y: number }> = {}
  // Heads first in the order the variables reach them, then nodes only reachable through a cycle.
  const heads = [...roots.flatMap((r) => headOf(r, next, pointedAt)), ...order.filter((id) => !pointedAt.has(id)), ...order]
  let row = 0
  for (const head of heads) {
    if (spot[head]) continue
    let x = 0
    for (let id: string | undefined = head; id && !spot[id]; id = next.get(id)) spot[id] = { x: x++, y: row }
    row++
  }
  return spot
}

/** Walk back from a node to the start of its chain, if a head is reachable that way. */
function headOf(id: string, next: Map<string, string>, pointedAt: Set<string>): string[] {
  if (!pointedAt.has(id)) return [id]
  const back = new Map([...next].map(([a, b]) => [b, a]))
  const seen = new Set([id])
  let cur = id
  while (back.has(cur)) {
    cur = back.get(cur)!
    if (seen.has(cur)) return [id] // a cycle: start where the variable is
    seen.add(cur)
  }
  return [cur]
}

/** Trees: x by in-order position, y by depth. Several trees sit side by side. */
function layoutTree(order: string[], edges: NodeEdge[]) {
  const kids = new Map<string, { left?: string; right?: string; other: string[] }>()
  const pointedAt = new Set<string>()
  for (const e of edges) {
    if (!e.to) continue
    const k = kids.get(e.from) ?? { other: [] }
    if (e.field === 'left' && !k.left) k.left = e.to
    else if (e.field === 'right' && !k.right) k.right = e.to
    else k.other.push(e.to)
    kids.set(e.from, k)
    pointedAt.add(e.to)
  }
  const spot: Record<string, { x: number; y: number }> = {}
  let x = 0
  const place = (id: string | undefined, depth: number) => {
    if (!id || spot[id]) return
    spot[id] = { x: -1, y: depth } // claimed, so a loop back can't recurse forever
    const k = kids.get(id)
    place(k?.left, depth + 1)
    spot[id].x = x++
    place(k?.right, depth + 1)
    k?.other.forEach((o) => place(o, depth + 1))
  }
  for (const id of order) if (!pointedAt.has(id)) place(id, 0)
  for (const id of order) place(id, 0)
  return spot
}

/** Anything else: layers by distance from the nodes the variables point at. */
function layoutLayers(order: string[], edges: NodeEdge[], roots: string[]) {
  const spot: Record<string, { x: number; y: number }> = {}
  const perRow: number[] = []
  const queue: [string, number][] = roots.filter((r) => order.includes(r)).map((r) => [r, 0])
  for (const id of order) queue.push([id, 0])
  for (let q = 0; q < queue.length; q++) {
    const [id, depth] = queue[q]
    if (spot[id]) continue
    perRow[depth] = perRow[depth] ?? 0
    spot[id] = { x: perRow[depth]++, y: depth }
    for (const e of edges) if (e.from === id && e.to && !spot[e.to]) queue.splice(q + 1, 0, [e.to, depth + 1])
  }
  return spot
}
