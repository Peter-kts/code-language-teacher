import type { Database } from 'sql.js'
import { parseClauses, quoteName, splitList } from './stages'
import { meaningful, tokenize, type Token } from './tokens'

// "What does my query touch?": for the last statement of a script, which tables it reads or changes,
// which of their columns it shows or uses, and which of their rows survive each step that can drop rows.
// The tables pane colors the original tables with this, live, as the query is edited.
//
// Rows are followed by their rowid, SQLite's hidden row number that every ordinary table has. For a
// SELECT, small extra queries ask "which rowids are still here after the JOIN, after WHERE, after HAVING,
// after LIMIT?". For UPDATE and DELETE, the WHERE is run as a SELECT just before the statement itself, to
// find the rows it is about to hit. Anything this can't work out is left out, never guessed.

export type Cell = string | number | null

/** The steps of a SELECT that can drop rows, in the order they run. */
export type DropStep = 'join' | 'where' | 'having' | 'limit'
export const DROP_STEPS: DropStep[] = ['join', 'where', 'having', 'limit']

export interface TableEffect {
  /** The table's name as the database has it. */
  table: string
  /** 'from': the query reads its rows (FROM or JOIN). 'read': only mentioned (a subquery or WITH). 'target': the table an INSERT, UPDATE or DELETE changes. */
  role: 'from' | 'read' | 'target'
  /** Names it goes by in the statement (an alias, or the table's own name). */
  aliases: string[]
  /** Columns that end up in the result (the SELECT list), or that an UPDATE sets / an INSERT fills. */
  shown: string[]
  /** Columns read to join, filter, group or sort. */
  used: string[]
  /** For a 'from' table: the rowids still in play after each step. A step left out drops nothing or couldn't be worked out. */
  keep?: Partial<Record<DropStep, number[]>>
  /** UPDATE: the changed rows' values before it ran, rowid first, so the screen can say "7500 → 8000". */
  old?: Cell[][]
  /** UPDATE: rowids it changed. DELETE: rowids it deleted (they exist only in the table before). */
  hit?: number[]
  /** DELETE: the deleted rows' values, rowid first, to show them crossed out in the table after. */
  removed?: Cell[][]
  /** INSERT: rowids of the new rows. */
  added?: number[]
}

export interface Effects {
  kind: 'query' | 'update' | 'delete' | 'insert'
  tables: TableEffect[]
}

const lower = (s: string) => s.toLowerCase()
const unquote = (name: string) => (/^["`[]/.test(name) ? name.slice(1, -1) : name)
const isName = (t: Token | undefined): t is Token => !!t && (t.kind === 'word' || t.kind === 'name')

function rows(db: Database, sql: string): Cell[][] {
  const stmt = db.prepare(sql)
  try {
    const out: Cell[][] = []
    while (stmt.step()) out.push(stmt.get() as Cell[])
    return out
  } finally {
    stmt.free()
  }
}

/** The tables in the database and their columns, by lower-cased name. */
export function schemaOf(db: Database): Map<string, { name: string; columns: string[] }> {
  const out = new Map<string, { name: string; columns: string[] }>()
  for (const [name] of rows(db, "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'")) {
    const stmt = db.prepare(`SELECT * FROM ${quoteName(String(name))} LIMIT 0`)
    try {
      out.set(lower(String(name)), { name: String(name), columns: stmt.getColumnNames() })
    } finally {
      stmt.free()
    }
  }
  return out
}

const SOURCE_END = new Set(['NATURAL', 'LEFT', 'RIGHT', 'FULL', 'OUTER', 'INNER', 'CROSS', 'JOIN', 'ON', 'USING', 'WHERE', 'GROUP', 'ORDER', 'LIMIT', 'SET', 'INDEXED', 'NOT'])

/** The plain tables (or WITH names) a FROM clause reads, with their aliases. Subqueries in FROM are skipped. */
export function sourcesOf(from: string): { table: string; alias: string }[] {
  const toks = meaningful(tokenize(from))
  const out: { table: string; alias: string }[] = []
  let expect = true
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i]
    if (t.depth !== 0) continue
    if (t.upper === 'JOIN' || t.text === ',') {
      expect = true
      continue
    }
    if (!expect) continue
    expect = false
    if (!isName(t) || SOURCE_END.has(t.upper)) continue
    let table = unquote(t.text)
    // schema.table: keep the table part.
    if (toks[i + 1]?.text === '.' && isName(toks[i + 2])) {
      i += 2
      table = unquote(toks[i].text)
    }
    let alias = table
    let j = i + 1
    if (toks[j]?.upper === 'AS') j++
    const a = toks[j]
    if (isName(a) && a.depth === 0 && !SOURCE_END.has(a.upper)) {
      alias = unquote(a.text)
      i = j
    }
    out.push({ table, alias })
  }
  return out
}

type Source = { table: string; alias: string; columns: string[] }

/**
 * The columns a piece of SQL names, per table: "e.salary" goes to the table called e, a bare "salary" to
 * every table in reach that has it. "*" and "e.*" mean every column.
 */
function columnsNamed(text: string, sources: Source[], out: Map<string, Set<string>>) {
  const toks = meaningful(tokenize(text))
  const add = (s: Source, col: string) => {
    const set = out.get(lower(s.table)) ?? new Set<string>()
    out.set(lower(s.table), set)
    if (col === '*') s.columns.forEach((c) => set.add(c))
    else {
      const real = s.columns.find((c) => lower(c) === lower(col))
      if (real) set.add(real)
    }
  }
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i]
    const prev = toks[i - 1]
    const next = toks[i + 1]
    if (isName(t) && next?.text === '.' && (isName(toks[i + 2]) || toks[i + 2]?.text === '*')) {
      const owner = lower(unquote(t.text))
      const col = toks[i + 2].text === '*' ? '*' : unquote(toks[i + 2].text)
      for (const s of sources) if (lower(s.alias) === owner || lower(s.table) === owner) add(s, col)
      i += 2
      continue
    }
    if (t.text === '*' && (!prev || prev.text === ',' || ['SELECT', 'DISTINCT', 'ALL'].includes(prev.upper)) && (!next || next.text === ',')) {
      // SELECT * (not COUNT(*) or a * b).
      if (t.depth === 0) sources.forEach((s) => add(s, '*'))
      continue
    }
    if (!isName(t) || prev?.text === '.') continue
    // A function name, like COUNT( or ROUND(, isn't a column.
    if (next?.text === '(') continue
    const col = unquote(t.text)
    for (const s of sources) add(s, col)
  }
}

const setsToLists = (m: Map<string, Set<string>>, key: string) => [...(m.get(key) ?? [])]

/** Base tables (not WITH names) the statement names anywhere, with every name used for them. */
function mentioned(statement: string, schema: ReturnType<typeof schemaOf>, ctes: Set<string>): Source[] {
  const toks = meaningful(tokenize(statement))
  const out: Source[] = []
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i]
    if (!isName(t) || toks[i - 1]?.text === '.' || toks[i + 1]?.text === '.') continue
    const name = lower(unquote(t.text))
    const table = schema.get(name)
    if (!table || ctes.has(name)) continue
    let alias = table.name
    let j = i + 1
    if (toks[j]?.upper === 'AS') j++
    if (isName(toks[j]) && !SOURCE_END.has(toks[j].upper) && toks[j].kind !== 'name' && !/^(SELECT|FROM|HAVING|WINDOW|UNION|EXCEPT|INTERSECT|RETURNING|VALUES|DEFAULT)$/.test(toks[j].upper)) {
      alias = unquote(toks[j].text)
    }
    if (!out.some((s) => lower(s.table) === lower(table.name) && s.alias === alias)) out.push({ table: table.name, alias, columns: table.columns })
  }
  return out
}

/** Merges the entries for a table that appears under several aliases (a self join). */
function merge(list: TableEffect[]): TableEffect[] {
  const out: TableEffect[] = []
  for (const e of list) {
    const same = out.find((o) => lower(o.table) === lower(e.table))
    if (!same) {
      out.push(e)
      continue
    }
    same.aliases = [...new Set([...same.aliases, ...e.aliases])]
    same.shown = [...new Set([...same.shown, ...e.shown])]
    same.used = [...new Set([...same.used, ...e.used])]
    if (e.role === 'from' && same.role !== 'target') same.role = 'from'
    if (e.keep || same.keep) {
      const keep: TableEffect['keep'] = {}
      for (const step of DROP_STEPS) {
        const a = same.keep?.[step]
        const b = e.keep?.[step]
        // A row an alias keeps is still in play; if either side couldn't be worked out, neither can the union.
        if (a && b) keep[step] = [...new Set([...a, ...b])].sort((x, y) => x - y)
      }
      same.keep = keep
    }
  }
  return out
}

/** Comma lists of rowids from GROUP_CONCAT, as sets of numbers. */
const idList = (v: Cell) => (v === null ? [] : String(v).split(',').map(Number))

/** What a SELECT touches. */
export function queryEffects(db: Database, statement: string, schema = schemaOf(db)): Effects | null {
  const q = parseClauses(statement)
  if (!q) return null
  const ctes = new Set(q.ctes.map(lower))
  const w = q.withPrefix
  const effects: TableEffect[] = []
  const all = mentioned(statement, schema, ctes)

  if (q.from && q.select && !q.parts) {
    const sources: Source[] = sourcesOf(q.from).flatMap((s) => {
      const t = schema.get(lower(s.table))
      return t && !ctes.has(lower(s.table)) ? [{ table: t.name, alias: s.alias, columns: t.columns }] : []
    })
    const shown = new Map<string, Set<string>>()
    const used = new Map<string, Set<string>>()
    columnsNamed(q.select, sources, shown)
    for (const part of [q.from, q.where, q.group, q.having, q.order]) if (part) columnsNamed(part, sources, used)
    // Names in the FROM clause itself are tables and aliases, not columns.
    const keeps = rowsKept(db, q, w, sources)
    sources.forEach((s, i) => {
      const key = lower(s.table)
      effects.push({
        table: s.table,
        role: 'from',
        aliases: [s.alias],
        shown: setsToLists(shown, key),
        used: setsToLists(used, key),
        ...(keeps && { keep: keeps[i] }),
      })
    })
  }

  // Tables only read inside a subquery, a WITH or a UNION part.
  const fromNames = new Set(effects.map((e) => lower(e.table)))
  const others = all.filter((s) => !fromNames.has(lower(s.table)))
  if (others.length) {
    const used = new Map<string, Set<string>>()
    // In a UNION or a WITH there is no way to tell shown from used here, so these are all "used".
    columnsNamed(statement, others, used)
    for (const s of others) effects.push({ table: s.table, role: 'read', aliases: [s.alias], shown: [], used: setsToLists(used, lower(s.table)) })
  }
  return { kind: 'query', tables: merge(effects) }
}

const AGGREGATES = /\b(COUNT|SUM|AVG|MIN|MAX|GROUP_CONCAT|STRING_AGG|TOTAL)\s*\(/i

/** Rowids of each FROM table still in play after the JOIN, WHERE, HAVING and LIMIT. */
function rowsKept(db: Database, q: NonNullable<ReturnType<typeof parseClauses>>, w: string, sources: Source[]): TableEffect['keep'][] | null {
  const select = q.select
  if (!sources.length || !q.from || !select) return null
  const n = sources.length
  const keep: TableEffect['keep'][] = sources.map(() => ({}))
  const where = q.where ? ` WHERE ${q.where}` : ''
  const rid = (s: Source) => `${quoteName(s.alias)}.rowid`
  const plain = sources.map((s, i) => `${rid(s)} AS __r${i}`).join(', ')
  const grouped = sources.map((s, i) => `GROUP_CONCAT(${rid(s)}) AS __r${i}`).join(', ')
  // The last n columns of each row are the rowids.
  const collect = (sql: string, step: DropStep, concat: boolean) => {
    try {
      const sets = sources.map(() => new Set<number>())
      for (const row of rows(db, sql)) {
        row.slice(-n).forEach((v, i) => (concat ? idList(v) : v === null ? [] : [Number(v)]).forEach((id) => sets[i].add(id)))
      }
      sets.forEach((s, i) => (keep[i]![step] = [...s].sort((a, b) => a - b)))
      return true
    } catch {
      return false
    }
  }
  if (!collect(`${w}SELECT ${plain} FROM ${q.from}`, 'join', false)) return null
  if (q.where) collect(`${w}SELECT ${plain} FROM ${q.from}${where}`, 'where', false)
  const order = q.order ? ` ORDER BY ${q.order}` : ''
  const limit = q.limit ? ` LIMIT ${q.limit}` : ''
  if (q.group) {
    const tail = `FROM ${q.from}${where} GROUP BY ${q.group}${q.having ? ` HAVING ${q.having}` : ''}`
    // The SELECT list goes in too, so a HAVING or ORDER BY that uses its aliases still works.
    if (q.having) collect(`${w}SELECT ${select}, ${grouped} ${tail}`, 'having', true)
    if (q.limit) collect(`${w}SELECT ${select}, ${grouped} ${tail}${order}${limit}`, 'limit', true)
  } else if (q.limit && !q.distinct && !AGGREGATES.test(select)) {
    collect(`${w}SELECT ${select}, ${plain} FROM ${q.from}${where}${order}${limit}`, 'limit', false)
  }
  return keep
}

// ---------- INSERT, UPDATE, DELETE ----------

/** The parts of an INSERT, UPDATE or DELETE that say what it changes. */
export function changeShape(statement: string): { kind: 'update' | 'delete' | 'insert'; table: string; alias: string; set: string; where: string; columns: string; from: boolean } | null {
  const toks = meaningful(tokenize(statement))
  const first = toks[0]?.upper
  let i = 1
  const top = (word: string, after = 0) => toks.findIndex((t, j) => j > after && t.depth === 0 && t.upper === word)
  const tableAt = () => {
    if (!isName(toks[i])) return null
    let table = unquote(toks[i].text)
    if (toks[i + 1]?.text === '.' && isName(toks[i + 2])) {
      i += 2
      table = unquote(toks[i].text)
    }
    i++
    let alias = table
    if (toks[i]?.upper === 'AS') i++
    if (isName(toks[i]) && !SOURCE_END.has(toks[i].upper) && !['DEFAULT', 'VALUES', 'SELECT', 'RETURNING'].includes(toks[i].upper) && toks[i].text !== '(') {
      alias = unquote(toks[i].text)
      i++
    }
    return { table, alias }
  }
  const slice = (from: number, to: number) => (from < 0 ? '' : statement.slice(toks[from].end, to < 0 || to >= toks.length ? statement.length : toks[to].start).trim())
  const returning = top('RETURNING')
  if (first === 'UPDATE') {
    if (toks[i]?.upper === 'OR') i += 2
    const t = tableAt()
    const set = top('SET')
    if (!t || set < 0) return null
    const from = top('FROM', set)
    const where = top('WHERE', set)
    const setEnd = [from, where, returning].filter((x) => x > 0).sort((a, b) => a - b)[0] ?? -1
    return { kind: 'update', ...t, set: slice(set, setEnd), where: slice(where, returning), columns: '', from: from > 0 }
  }
  if (first === 'DELETE') {
    if (toks[i]?.upper !== 'FROM') return null
    i++
    const t = tableAt()
    if (!t) return null
    const where = top('WHERE')
    return { kind: 'delete', ...t, set: '', where: slice(where, returning), columns: '', from: false }
  }
  if (first === 'INSERT' || first === 'REPLACE') {
    const into = top('INTO')
    if (into < 0) return null
    i = into + 1
    const t = tableAt()
    if (!t) return null
    const columns = toks[i]?.text === '(' ? slice(i, toks.findIndex((x, j) => j > i && x.text === ')' && x.depth === toks[i].depth)) : ''
    return { kind: 'insert', ...t, set: '', where: '', columns, from: false }
  }
  return null
}

/**
 * For an INSERT, UPDATE or DELETE: call before it runs, then call the function it returns after it ran.
 * Null when the statement isn't one of those.
 */
export function watchChange(db: Database, statement: string): (() => Effects | null) | null {
  const shape = changeShape(statement)
  if (!shape) return null
  const schema = schemaOf(db)
  const t = schema.get(lower(shape.table))
  if (!t) return null
  const source: Source = { table: t.name, alias: shape.alias, columns: t.columns }
  const name = `${quoteName(t.name)}${shape.alias !== shape.table ? ` AS ${quoteName(shape.alias)}` : ''}`
  const where = shape.where ? ` WHERE ${shape.where}` : ''
  const shown = new Map<string, Set<string>>()
  const used = new Map<string, Set<string>>()
  const key = lower(t.name)
  try {
    if (shape.kind === 'update') {
      // Only the left side of each "col = value" is set; the right side and the WHERE are read.
      for (const item of splitList(shape.set)) {
        const eq = meaningful(tokenize(item)).find((x) => x.text === '=' && x.depth === 0)
        columnsNamed(eq ? item.slice(0, eq.start) : item, [source], shown)
        if (eq) columnsNamed(item.slice(eq.end), [source], used)
      }
      if (shape.where) columnsNamed(shape.where, [source], used)
      const old = shape.from ? undefined : rows(db, `SELECT rowid, * FROM ${name}${where}`)
      const hit = old?.map((r) => Number(r[0]))
      return () => ({ kind: 'update', tables: [{ table: t.name, role: 'target', aliases: [shape.alias], shown: setsToLists(shown, key), used: setsToLists(used, key), hit, old }] })
    }
    if (shape.kind === 'delete') {
      if (shape.where) columnsNamed(shape.where, [source], used)
      const removed = rows(db, `SELECT rowid, * FROM ${name}${where}`)
      return () => ({
        kind: 'delete',
        tables: [{ table: t.name, role: 'target', aliases: [shape.alias], shown: [], used: setsToLists(used, key), hit: removed.map((r) => Number(r[0])), removed }],
      })
    }
    columnsNamed(shape.columns || '*', [source], shown)
    const before = Number(rows(db, `SELECT COALESCE(MAX(rowid), 0) FROM ${quoteName(t.name)}`)[0][0])
    return () => {
      try {
        const added = rows(db, `SELECT rowid FROM ${quoteName(t.name)} WHERE rowid > ${before}`).map((r) => Number(r[0]))
        return { kind: 'insert', tables: [{ table: t.name, role: 'target', aliases: [shape.alias], shown: setsToLists(shown, key), used: [], added }] }
      } catch {
        return null
      }
    }
  } catch {
    return null
  }
}
