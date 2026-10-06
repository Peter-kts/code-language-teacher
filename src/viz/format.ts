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
