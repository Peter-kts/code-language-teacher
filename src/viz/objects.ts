import type { NodeData, Step, Value } from '../types'
import { keyPath } from './sharing'
import { formatValue } from './format'

// Object-oriented code (a Ship holding Containers, a Port holding Ships) drawn as cards: one card
// per object, with its class name on top and its fields inside. Objects a field holds are drawn
// inside it, so "a ship has a manifest of containers" reads as boxes inside boxes (composition).
// An object or list reached from two places is drawn once, where it is first met, and marked
// with where else it is reachable, so a list every Ship shares can't be mistaken for two lists.
// Pure layout, so it can be tested without a browser; ObjectView.tsx draws it.

export type CardValue =
  | { kind: 'plain'; text: string }
  | { kind: 'list'; items: CardValue[]; open: string; close: string; truncated: boolean; sharedWith: string[] }
  | { kind: 'dict'; entries: [string, CardValue][]; open: string; close: string; truncated: boolean; sharedWith: string[] }
  | { kind: 'object'; card: ObjectCard }
  /** An object drawn somewhere else (where it was first met): a chip naming it and where to look. */
  | { kind: 'seen'; cls: string; label: string; tag: number | null; at: string }

export interface CardField {
  /** As code reaches it: `manifest`, or `static manifest` for a JavaScript static field. */
  name: string
  value: CardValue
  /** New on this step, or its value is different from the step before. */
  changed: boolean
}

export interface ObjectCard {
  id: string
  cls: string
  /** Its name-like field (`name`, `id`...), to tell objects of one class apart in a chip. */
  label: string
  /** Where it is drawn (the first way to reach it), like `port.ships[0]`. */
  path: string
  /** Other ways to reach this same object. */
  alsoAt: string[]
  /** A number, when it is reachable from more than one place, matching its chips elsewhere. */
  tag: number | null
  fields: CardField[]
  /** Fields that live on the class, shared by every object of it (NodeData.fromClass). */
  classFields: CardField[]
  /** It didn't exist on the step before. */
  isNew: boolean
}

export interface ObjectScene {
  /** One entry per variable that holds objects, in variable order. */
  roots: { name: string; value: CardValue }[]
  /** Objects it has no fields for (the tracers stop listing after a while). */
  missing: boolean
}

/** Fields that make a node part of a linked list, tree or graph, which have drawings of their own. */
const STRUCTURE_FIELDS = new Set(['next', 'prev', 'left', 'right', 'neighbors', 'children'])

/** True when the step's objects are plain objects (a model of ships, accounts...), not list or tree nodes. */
export function isObjectModel(step: Step, skip?: Set<string>): boolean {
  const nodes = Object.entries(step.nodes ?? {}).filter(([id]) => !skip?.has(id))
  return nodes.length > 0 && nodes.every(([, n]) => n && !n.fields.some(([k]) => STRUCTURE_FIELDS.has(k)))
}

/** True when a value is or holds an object (so the object drawing shows it, not the list boxes). */
export function holdsObjects(v: Value): boolean {
  if (v.type === 'ref') return true
  if (v.type === 'list' || v.type === 'tuple') return v.items.some(holdsObjects)
  if (v.type === 'dict') return v.entries.some(([k, val]) => holdsObjects(k) || holdsObjects(val))
  return false
}

const NAME_FIELDS = ['name', 'title', 'id', 'cid', 'code', 'label', 'number', 'key']

/** An object's name-like field as text: its `name`, else its first short plain field. */
function labelOf(data: NodeData | undefined): string {
  if (!data) return ''
  const plain = data.fields.filter(([k, v]) => v.type === 'prim' && !data.fromClass?.includes(k))
  const named = NAME_FIELDS.map((n) => plain.find(([k]) => k === n)).find(Boolean) ?? plain[0]
  if (!named) return ''
  const text = formatValue(named[1])
  return text.length > 14 ? `${text.slice(0, 13)}…` : text
}

/** A field's path: `.manifest` in both languages, `Ship.count` for a JavaScript static. */
function fieldPath(path: string, field: string, cls: string): string {
  return field.startsWith('static ') ? `${cls}.${field.slice(7)}` : `${path}.${field}`
}

const isDictLike = (v: Value): v is Extract<Value, { type: 'dict' }> => v.type === 'dict'

export function buildObjectScene(step: Step, prev: Step | undefined, skip?: Set<string>): ObjectScene | null {
  const all = step.nodes ?? {}
  let missing = false

  // First pass: every way to reach each object and each list, in reading order.
  const objectPaths = new Map<string, string[]>()
  const listPaths = new Map<number, string[]>()
  const note = <K,>(map: Map<K, string[]>, key: K, path: string) => {
    const seen = map.get(key)
    if (seen) {
      if (!seen.includes(path)) seen.push(path)
      return false
    }
    map.set(key, [path])
    return true
  }
  const walk = (v: Value, path: string) => {
    if (v.type === 'ref') {
      const id = String(v.id)
      if (skip?.has(id) || !note(objectPaths, id, path)) return
      const data = all[id]
      if (!data) return
      for (const [k, f] of data.fields) walk(f, fieldPath(path, k, data.cls))
      return
    }
    if (v.type !== 'list' && v.type !== 'tuple' && v.type !== 'dict') return
    if (v.id !== undefined && !note(listPaths, v.id, path)) return
    if (isDictLike(v)) for (const [k, item] of v.entries) walk(item, `${path}${keyPath(k, v.t === 'Map', v.t === undefined)}`)
    else v.items.forEach((item, i) => walk(item, `${path}[${i}]`))
  }
  const held = Object.entries(step.vars).filter(([, v]) => holdsObjects(v))
  for (const [name, v] of held) walk(v, name)
  if (!objectPaths.size) return null

  // Objects reachable more than one way get a number, in the order they're first met.
  const tags = new Map<string, number>()
  for (const [id, paths] of objectPaths) if (paths.length > 1) tags.set(id, tags.size + 1)

  // Second pass: draw each object in full where it is first met, and as a chip everywhere else.
  const drawn = new Set<string>()
  const inside = new Set<number>()
  const others = (paths: string[] | undefined, path: string) => (paths ?? []).filter((p) => p !== path)
  const brackets = (v: Extract<Value, { type: 'list' | 'tuple' | 'dict' }>): [string, string] => {
    if (v.type === 'dict') return v.t === 'Map' ? ['Map {', '}'] : ['{', '}']
    if (v.type === 'tuple') return ['(', ')']
    if (v.set) return v.t === 'Set' ? ['Set {', '}'] : ['{', '}']
    return ['[', ']']
  }
  const build = (v: Value, path: string): CardValue => {
    if (v.type === 'ref') {
      const id = String(v.id)
      const data = all[id]
      if (!data) {
        missing = true
        return { kind: 'plain', text: `${v.cls} …` }
      }
      if (drawn.has(id)) return { kind: 'seen', cls: data.cls, label: labelOf(data), tag: tags.get(id) ?? null, at: objectPaths.get(id)?.[0] ?? '' }
      drawn.add(id)
      const before = prev?.nodes?.[id]
      const shared = new Set(data.fromClass ?? [])
      const field = ([k, f]: [string, Value]): CardField => {
        const old = before?.fields.find(([bk]) => bk === k)?.[1]
        return { name: k, value: build(f, fieldPath(path, k, data.cls)), changed: prev !== undefined && (!old || JSON.stringify(old) !== JSON.stringify(f)) }
      }
      return {
        kind: 'object',
        card: {
          id,
          cls: data.cls,
          label: labelOf(data),
          path,
          alsoAt: others(objectPaths.get(id), path),
          tag: tags.get(id) ?? null,
          fields: data.fields.filter(([k]) => !shared.has(k)).map(field),
          classFields: data.fields.filter(([k]) => shared.has(k)).map(field),
          isNew: prev !== undefined && !before,
        },
      }
    }
    if (v.type === 'list' || v.type === 'tuple' || v.type === 'dict') {
      const [open, close] = brackets(v)
      // A list met again (one list every Ship shares) is drawn again, marked as the same list; the
      // objects in it are chips by then. Only a list inside itself stops here.
      if (v.id !== undefined && inside.has(v.id)) return { kind: 'plain', text: `${open}…${close}` }
      const sharedWith = v.id === undefined ? [] : others(listPaths.get(v.id), path)
      if (v.id !== undefined) inside.add(v.id)
      try {
        return buildColl(v, path, open, close, sharedWith)
      } finally {
        if (v.id !== undefined) inside.delete(v.id)
      }
    }
    return { kind: 'plain', text: formatValue(v) }
  }
  const buildColl = (v: Extract<Value, { type: 'list' | 'tuple' | 'dict' }>, path: string, open: string, close: string, sharedWith: string[]): CardValue => {
    if (isDictLike(v)) {
      const entries = v.entries.map(([k, item]): [string, CardValue] => [formatValue(k), build(item, `${path}${keyPath(k, v.t === 'Map', v.t === undefined)}`)])
      return { kind: 'dict', entries, open, close, truncated: !!v.truncated, sharedWith }
    }
    return { kind: 'list', items: v.items.map((item, i) => build(item, `${path}[${i}]`)), open, close, truncated: !!v.truncated, sharedWith }
  }
  const roots = held.map(([name, v]) => ({ name, value: build(v, name) }))
  return { roots, missing }
}
