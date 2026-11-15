import { changedLines, columnNames, type Cell, type PlaygroundState, type SqlTable } from '../../server/playground.mjs'

// What the chat changed, worked out by comparing the screen before and after its answer, so it can be
// lit up the way the visualizer shows changes: green for new, amber for changed.

export interface TableMark {
  /** The table didn't exist before. */
  created: boolean
  /** Rows (by their values, as JSON) that are new. */
  added: Set<string>
  /** Rows (by their new values, as JSON) that changed, with the column indexes that changed. */
  updated: Map<string, number[]>
  removed: number
}

export interface ChatMarks {
  /** 1-based lines of the code that are new or changed. */
  lines: number[]
  /** The code those lines belong to: once the code changes again, they no longer apply. */
  code: string
  /** By lower-cased table name. */
  tables: Map<string, TableMark>
  /** Tables that were deleted. */
  dropped: string[]
}

export const rowKey = (row: Cell[]) => JSON.stringify(row)

export function chatMarks(before: PlaygroundState, after: PlaygroundState): ChatMarks {
  const tables = new Map<string, TableMark>()
  const old = new Map((before.tables ?? []).map((t) => [t.name.toLowerCase(), t]))
  for (const t of after.tables ?? []) {
    const mark = tableMark(old.get(t.name.toLowerCase()), t)
    old.delete(t.name.toLowerCase())
    if (mark) tables.set(t.name.toLowerCase(), mark)
  }
  return {
    lines: before.code === after.code ? [] : changedLines(before.code, after.code),
    code: after.code,
    tables,
    dropped: [...old.values()].map((t) => t.name),
  }
}

function tableMark(before: SqlTable | undefined, after: SqlTable): TableMark | null {
  if (!before) return { created: true, added: new Set(after.rows.map(rowKey)), updated: new Map(), removed: 0 }
  // A different set of columns: every row counts as new.
  if (columnNames(before.columns).join() !== columnNames(after.columns).join()) {
    return { created: true, added: new Set(after.rows.map(rowKey)), updated: new Map(), removed: 0 }
  }
  // Rows found unchanged (by value) are crossed off; what's left was added, changed or removed.
  const unmatched = new Map<string, number>()
  for (const row of before.rows) unmatched.set(rowKey(row), (unmatched.get(rowKey(row)) ?? 0) + 1)
  const fresh: Cell[][] = []
  for (const row of after.rows) {
    const n = unmatched.get(rowKey(row)) ?? 0
    if (n > 0) unmatched.set(rowKey(row), n - 1)
    else fresh.push(row)
  }
  const leftover = before.rows.filter((row) => {
    const n = unmatched.get(rowKey(row)) ?? 0
    if (n > 0) {
      unmatched.set(rowKey(row), n - 1)
      return true
    }
    return false
  })
  if (!fresh.length && !leftover.length) return null
  // A new row with the same first value (usually the id) as a vanished one is that row, changed.
  const added = new Set<string>()
  const updated = new Map<string, number[]>()
  const pool = [...leftover]
  for (const row of fresh) {
    const i = pool.findIndex((old) => old[0] === row[0])
    if (i < 0) {
      added.add(rowKey(row))
      continue
    }
    const [old] = pool.splice(i, 1)
    updated.set(
      rowKey(row),
      row.flatMap((v, j) => (v === old[j] ? [] : [j])),
    )
  }
  return { created: false, added, updated, removed: pool.length }
}
