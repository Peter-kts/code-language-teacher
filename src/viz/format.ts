import type { Value } from '../types'

/**
 * Text for a traced value as its language writes it: Python style (`[1, 2]`,
 * `{'a': 1}`), or JavaScript style for values from the JavaScript tracer, which
 * carry `t` (`[1, 2]`, `{ a: 1 }`, `Map { "a" => 1 }`).
 */
export function formatValue(v: Value): string {
  if (v.t !== undefined) return formatJs(v)
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

function formatJs(v: Value): string {
  switch (v.type) {
    case 'prim':
    case 'other':
      return v.repr
    case 'list':
    case 'tuple': {
      const inner = `${v.items.map(formatValue).join(', ')}${v.truncated ? ', …' : ''}`
      return v.t === 'Set' ? `Set {${inner}}` : `[${inner}]`
    }
    case 'dict': {
      const map = v.t === 'Map'
      const inner = v.entries.map(([k, val]) => (map ? `${formatValue(k)} => ` : `${keyText(k)}: `) + formatValue(val)).join(', ')
      const more = v.truncated ? ', …' : ''
      const prefix = v.t && v.t !== 'Object' ? `${v.t} ` : ''
      return inner ? `${prefix}{ ${inner}${more} }` : `${prefix}{}`
    }
  }
}

/** An object key as code: `a`, or `"two words"` when it isn't a plain name. */
const keyText = (k: Value) =>
  k.type === 'prim' && typeof k.value === 'string' && /^[A-Za-z_$][\w$]*$/.test(k.value) ? k.value : formatValue(k)

/**
 * The type of a traced value, with its size for collections: Python's name
 * (`int`, `list · 3 items`) or JavaScript's (`number`, `Array · 3 items`).
 */
export function typeLabel(v: Value): string {
  const size = (n: number, more: boolean) => `${more ? 'over ' : ''}${n} item${n === 1 && !more ? '' : 's'}`
  if (v.t !== undefined) {
    if (v.type === 'list' || v.type === 'tuple') return `${v.t} · ${size(v.items.length, v.truncated)}`
    if (v.type === 'dict') return `${v.t} · ${size(v.entries.length, v.truncated)}`
    return v.t
  }
  switch (v.type) {
    case 'prim':
      if (v.value === null) return 'None'
      // inf and nan come without a value, since JSON can't hold them.
      if (v.value === undefined) return 'float'
      if (typeof v.value === 'boolean') return 'bool'
      if (typeof v.value === 'string') return 'str'
      return Number.isInteger(v.value) && !/[.e]/i.test(v.repr) ? 'int' : 'float'
    case 'list':
      return `list · ${size(v.items.length, v.truncated)}`
    case 'tuple':
      return `tuple · ${size(v.items.length, v.truncated)}`
    case 'dict':
      return `dict · ${size(v.entries.length, v.truncated)}`
    case 'other':
      if (/^<function /.test(v.repr)) return 'function'
      return /^(\{|set\()/.test(v.repr) ? 'set' : 'object'
  }
}
