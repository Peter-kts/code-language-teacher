import type { Value } from '../types'

/** One part of a variable that is the very same object as part of another variable. */
export interface SharedNote {
  /** The part, from the variable's own name: `copy.tags`, or just `b`. */
  path: string
  /** Where else that object is reachable: `user.tags`. */
  others: string[]
  /** `array`, `object`, `Map`... for the label. */
  kind: string
  /** The same number for every note about one object, to color them alike. */
  group: number
}

/**
 * Which variables share objects. Values carry an `id` per object (see runtime.ts and
 * tracer.py), so `b = a` (one array, two names) can be told apart from `c = [...a]`
 * (two arrays that look alike). Returns, per variable, the parts it shares.
 */
export function sharedObjects(vars: Record<string, Value>): Record<string, SharedNote[]> {
  const paths = new Map<number, { path: string; root: string; kind: string }[]>()
  const visit = (v: Value, path: string, root: string) => {
    if ((v.type !== 'list' && v.type !== 'tuple' && v.type !== 'dict') || v.id === undefined) return
    const seen = paths.get(v.id)
    const kind = kindOf(v)
    if (seen) {
      // Reached again: note it, but its insides are already listed under the first path.
      seen.push({ path, root, kind })
      return
    }
    paths.set(v.id, [{ path, root, kind }])
    if (v.type === 'dict') {
      for (const [k, item] of v.entries) visit(item, `${path}${keyPath(k, v.t === 'Map', v.t === undefined)}`, root)
    } else v.items.forEach((item, i) => visit(item, `${path}[${i}]`, root))
  }
  for (const [name, value] of Object.entries(vars)) visit(value, name, name)

  const out: Record<string, SharedNote[]> = {}
  let group = 0
  for (const found of paths.values()) {
    const roots = new Set(found.map((f) => f.root))
    if (roots.size < 2) continue
    for (const f of found) {
      // One note per variable, about its shortest way to the object.
      if (found.find((g) => g.root === f.root) !== f) continue
      const others = found.filter((g) => g.root !== f.root && found.find((h) => h.root === g.root) === g).map((g) => g.path)
      ;(out[f.root] ??= []).push({ path: f.path, others, kind: f.kind, group })
    }
    group++
  }
  return out
}

/** `.tags`, `["two words"]` or `.get("a")`, as code would reach it; always `['tags']` in Python. */
function keyPath(k: Value, map: boolean, python: boolean): string {
  const text = k.type === 'prim' ? k.repr : '?'
  if (map) return `.get(${text})`
  if (python) return `[${text}]`
  if (k.type === 'prim' && typeof k.value === 'string' && /^[A-Za-z_$][\w$]*$/.test(k.value)) return `.${k.value}`
  return `[${text}]`
}

/** `array`, `object`, `Map` in JavaScript; `list`, `dict`, `set` in Python (no `t`). */
function kindOf(v: Extract<Value, { type: 'list' | 'tuple' | 'dict' }>): string {
  if (v.t === undefined) return v.type === 'dict' ? 'dict' : v.type === 'list' && v.set ? 'set' : v.type
  return v.t === 'Array' ? 'array' : v.t === 'Object' ? 'object' : v.t
}
