import type { Value } from '../types'

/** Python-style text for a traced value, e.g. `[1, 2]` or `{'a': 1}`. */
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

/** The Python type of a traced value, with its size for collections, e.g. `int` or `list · 3 items`. */
export function typeLabel(v: Value): string {
  const size = (n: number, more: boolean) => `${more ? 'over ' : ''}${n} item${n === 1 && !more ? '' : 's'}`
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
