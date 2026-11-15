import type { Database, SqlJsStatic } from 'sql.js'
import { queryEffects, watchChange, type Effects } from './effects'
import { buildStages, findJoin, joinQueries, quoteName, type JoinShape, type Stage } from './stages'
import { isQuery, lineOf, splitStatements } from './tokens'

// Running SQL: build a fresh SQLite database from a problem's tables, run the learner's script on it,
// and collect everything the screen shows (results, stages, the join picture, test results).
// It takes the sql.js module as an argument, so the worker (browser) and the tests (Node) share it.

export type Cell = string | number | null

export interface SqlTable {
  name: string
  /** Column definitions as in CREATE TABLE, like "id INTEGER, name TEXT". */
  columns: string
  rows: Cell[][]
}

export interface ResultSet {
  columns: string[]
  rows: Cell[][]
}

export interface NamedResult extends ResultSet {
  name: string
  /** Each row's rowid (SQLite's hidden row number), so what a query touched can be found again. */
  rowids?: number[]
}

export interface SqlError {
  message: string
  line: number | null
}

export interface StageResult extends Stage {
  result: ResultSet
}

export interface JoinPicture {
  shape: JoinShape
  left: ResultSet
  right: ResultSet
  /** [left row index, right row index], 0-based, null for the side with no match. */
  pairs: [number | null, number | null][]
}

export interface CaseResult {
  name: string
  passed: boolean
  /** Why it failed, in plain words. */
  reason?: string
}

export interface CheckSpec {
  cases: { name: string; tables: SqlTable[] }[]
  reference: string
  ordered: boolean
  /** For problems that change data (DELETE, UPDATE): compare this table afterwards instead of a query's result. */
  checkTable?: string
}

export interface RunOutput {
  /** The last result the script produced (or the checked table after it ran). */
  result: ResultSet | null
  /** How many statements ran and what each gave, for the playground. */
  statements: { line: number; result: ResultSet | null; changes: number }[]
  error: SqlError | null
  stages: StageResult[]
  join: JoinPicture | null
  /** Every table in the database after the script ran. */
  tables: NamedResult[]
  /** Every table before the script ran (only when checking a problem). */
  before: NamedResult[] | null
  /** What the last statement touched: tables, columns and rows, for the tables pane to color. */
  effects: Effects | null
  /** The reference answer's result on the same data, when checking a problem. */
  expected: ResultSet | null
  comparison: Comparison | null
  cases: CaseResult[] | null
}

const MAX_ROWS = 1000
const STAGE_ROWS = 200

export function createDb(SQL: SqlJsStatic, tables: SqlTable[]): Database {
  const db = new SQL.Database()
  for (const t of tables) {
    db.run(`CREATE TABLE ${quoteName(t.name)} (${t.columns})`)
    if (!t.rows.length) continue
    const marks = t.rows[0].map(() => '?').join(', ')
    const insert = db.prepare(`INSERT INTO ${quoteName(t.name)} VALUES (${marks})`)
    for (const row of t.rows) insert.run(row)
    insert.free()
  }
  return db
}

const cell = (v: unknown): Cell => (v === null || typeof v === 'number' || typeof v === 'string' ? v : v instanceof Uint8Array ? `<${v.length} bytes>` : String(v))

/** Runs one statement; returns its rows when it has columns. */
export function runOne(db: Database, sql: string, maxRows = MAX_ROWS): ResultSet | null {
  const stmt = db.prepare(sql)
  try {
    const columns = stmt.getColumnNames()
    if (!columns.length) {
      stmt.step()
      return null
    }
    const rows: Cell[][] = []
    while (stmt.step()) {
      if (rows.length >= maxRows) break
      rows.push(stmt.get().map(cell))
    }
    return { columns, rows }
  } finally {
    stmt.free()
  }
}

/** Runs a whole script, statement by statement, stopping at the first error. */
export function runScript(db: Database, code: string, withEffects = false) {
  const statements: RunOutput['statements'] = []
  let last: { text: string; result: ResultSet } | null = null
  let effects: Effects | null = null
  const all = splitStatements(code)
  for (const [n, s] of all.entries()) {
    try {
      // For the last statement, note what it is about to change (UPDATE and DELETE rows vanish or alter).
      const watch = withEffects && n === all.length - 1 && !isQuery(s.text) ? safely(() => watchChange(db, s.text)) : null
      const result = runOne(db, s.text)
      if (watch) effects = safely(watch)
      else if (withEffects && n === all.length - 1 && result) effects = safely(() => queryEffects(db, s.text))
      statements.push({ line: lineOf(code, s.start), result, changes: result ? 0 : db.getRowsModified() })
      if (result) last = { text: s.text, result }
    } catch (err) {
      return { statements, last, effects: null, error: errorAt(code, s.start, s.text, err) }
    }
  }
  return { statements, last, effects, error: null as SqlError | null }
}

/** Effects are extra: if working them out fails, the run still shows, just without the coloring. */
function safely<T>(f: () => T | null): T | null {
  try {
    return f()
  } catch {
    return null
  }
}

/** SQLite's message, with the line it points at when it says near "x". */
export function errorAt(code: string, start: number, text: string, err: unknown): SqlError {
  const message = String((err as Error)?.message ?? err)
  const near = /near "([^"]+)"/.exec(message)
  const at = near ? text.indexOf(near[1]) : -1
  return { message: friendly(message), line: lineOf(code, start + Math.max(0, at)) }
}

/** A plain-words tip after SQLite's message, for the mistakes beginners make most. */
function friendly(message: string): string {
  if (/misuse of aggregate/i.test(message)) return `${message}. Aggregates like COUNT or SUM can't go in WHERE: filter groups with HAVING instead.`
  if (/no such column/i.test(message)) return `${message}. Check the spelling, and that an alias made in SELECT isn't used in WHERE (WHERE runs before SELECT).`
  if (/ambiguous column name/i.test(message)) return `${message}. Both tables have that column: say which one, like e.id.`
  if (/incomplete input/i.test(message)) return `${message}. Something is unfinished, like a missing ) or quote.`
  return message
}

export function allTables(db: Database): NamedResult[] {
  const names = runOne(db, "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY rowid")
  return (names?.rows ?? []).map(([name]) => {
    const table = quoteName(String(name))
    try {
      // Ordered by rowid, which is also the order SELECT * gives for an ordinary table.
      const r = runOne(db, `SELECT rowid AS __rowid, * FROM ${table} ORDER BY rowid`, STAGE_ROWS)!
      return { name: String(name), columns: r.columns.slice(1), rows: r.rows.map((row) => row.slice(1)), rowids: r.rows.map((row) => Number(row[0])) }
    } catch {
      // A WITHOUT ROWID table has no rowid.
      return { name: String(name), ...runOne(db, `SELECT * FROM ${table}`, STAGE_ROWS)! }
    }
  })
}

/** The result a check looks at: the last query's rows, or the named table after a DELETE/UPDATE problem. */
function checked(db: Database, last: { result: ResultSet } | null, checkTable?: string): ResultSet | null {
  if (checkTable) return runOne(db, `SELECT * FROM ${quoteName(checkTable)}`)
  return last?.result ?? null
}

export function stagesFor(db: Database, query: string, join: JoinPicture | null = null): StageResult[] {
  const out: StageResult[] = []
  for (const stage of buildStages(query)) {
    try {
      out.push({ ...stage, result: labelled(runOne(db, stage.sql, STAGE_ROWS)!, stage, join) })
    } catch {
      // A stage this simple splitter can't rebuild (rare syntax) is just left out.
    }
  }
  return out
}

/**
 * After a join, SELECT * has two id columns and no way to tell them apart. When the FROM has one join,
 * the columns are the left table's then the right table's, so they can be named e.id, d.id.
 */
function labelled(result: ResultSet, stage: Stage, join: JoinPicture | null): ResultSet {
  if (!join || join.shape.more || (stage.id !== 'from' && stage.id !== 'where')) return result
  const names = [...join.left.columns.map((c) => `${join.shape.left.alias}.${c}`), ...join.right.columns.map((c) => `${join.shape.right.alias}.${c}`)]
  return names.length === result.columns.length ? { ...result, columns: names } : result
}

export function joinFor(db: Database, query: string): JoinPicture | null {
  const shape = findJoin(query)
  if (!shape) return null
  try {
    const q = joinQueries(query, shape)
    const strip = (r: ResultSet): ResultSet => ({ columns: r.columns.slice(1), rows: r.rows.map((row) => row.slice(1)) })
    const left = runOne(db, q.left, STAGE_ROWS)!
    const right = runOne(db, q.right, STAGE_ROWS)!
    const pairs = runOne(db, q.pairs, 2000)!.rows.map(
      ([i, j]) => [i === null ? null : Number(i) - 1, j === null ? null : Number(j) - 1] as [number | null, number | null],
    )
    return { shape, left: strip(left), right: strip(right), pairs }
  } catch {
    return null
  }
}

/** Everything one edit needs: run on the shown case, the stages and join picture, and every test case. */
export function runAll(SQL: SqlJsStatic, code: string, tables: SqlTable[], check?: CheckSpec): RunOutput {
  const db = createDb(SQL, tables)
  try {
    const before = check ? allTables(db) : null
    const run = runScript(db, code, true)
    const lastStatement = splitStatements(code).at(-1)
    const showSteps = !run.error && !check?.checkTable && lastStatement && isQuery(lastStatement.text)
    const out: RunOutput = {
      result: run.error ? null : checked(db, run.last, check?.checkTable),
      statements: run.statements,
      error: run.error,
      stages: [],
      join: showSteps ? joinFor(db, lastStatement.text) : null,
      tables: allTables(db),
      before,
      effects: run.effects,
      expected: null,
      comparison: null,
      cases: null,
    }
    if (showSteps) out.stages = stagesFor(db, lastStatement.text, out.join)
    if (check) {
      out.expected = referenceResult(SQL, check, tables)
      if (out.result && out.expected) out.comparison = compareResults(out.result, out.expected, check.ordered)
      out.cases = check.cases.map((c) => checkCase(SQL, code, c, check))
    }
    return out
  } finally {
    db.close()
  }
}

export function referenceResult(SQL: SqlJsStatic, check: CheckSpec, tables: SqlTable[]): ResultSet | null {
  const db = createDb(SQL, tables)
  try {
    const run = runScript(db, check.reference)
    if (run.error) throw new Error(`reference answer failed: ${run.error.message}`)
    return checked(db, run.last, check.checkTable)
  } finally {
    db.close()
  }
}

function checkCase(SQL: SqlJsStatic, code: string, c: CheckSpec['cases'][number], check: CheckSpec): CaseResult {
  const expected = referenceResult(SQL, check, c.tables)!
  const db = createDb(SQL, c.tables)
  try {
    const run = runScript(db, code)
    if (run.error) return { name: c.name, passed: false, reason: run.error.message }
    const got = checked(db, run.last, check.checkTable)
    if (!got) return { name: c.name, passed: false, reason: 'no result: end with a SELECT' }
    const cmp = compareResults(got, expected, check.ordered)
    return { name: c.name, passed: cmp.passed, ...(cmp.reason && { reason: cmp.reason }) }
  } finally {
    db.close()
  }
}

// ---------- Comparing results ----------

export interface Comparison {
  passed: boolean
  reason?: string
  /** Rows of the expected result that yours is missing (0-based). */
  missing: number[]
  /** Rows of your result that shouldn't be there. */
  extra: number[]
}

/** A value as a comparable key: numbers to 4 decimals (so 2 and 2.0 match), NULL apart from 'NULL'. */
const key = (v: Cell) => (v === null ? '\u0000null' : typeof v === 'number' ? `n:${Math.round(v * 1e4) / 1e4}` : `s:${v}`)
const rowKey = (row: Cell[]) => row.map(key).join('\u0001')

export function compareResults(got: ResultSet, expected: ResultSet, ordered: boolean): Comparison {
  const none = { missing: [], extra: [] }
  if (got.columns.length !== expected.columns.length) {
    return {
      passed: false,
      reason: `expected ${expected.columns.length} column${expected.columns.length === 1 ? '' : 's'} (${expected.columns.join(', ')}), got ${got.columns.length}`,
      ...none,
    }
  }
  // Match leftover rows like a multiset: each expected row can be used up once.
  const pool = new Map<string, number[]>()
  expected.rows.forEach((row, i) => {
    const k = rowKey(row)
    pool.set(k, [...(pool.get(k) ?? []), i])
  })
  const extra: number[] = []
  got.rows.forEach((row, i) => {
    const left = pool.get(rowKey(row))
    if (left?.length) left.shift()
    else extra.push(i)
  })
  const missing = [...pool.values()].flat().sort((a, b) => a - b)
  const named = got.columns.every((c, i) => c.toLowerCase() === expected.columns[i].toLowerCase())
  if (missing.length || extra.length) {
    const parts = [missing.length && `${missing.length} row${missing.length === 1 ? '' : 's'} missing`, extra.length && `${extra.length} extra`]
    return { passed: false, reason: parts.filter(Boolean).join(', '), missing, extra }
  }
  if (ordered && got.rows.some((row, i) => rowKey(row) !== rowKey(expected.rows[i]))) {
    return { passed: false, reason: 'the right rows, in the wrong order (check ORDER BY)', ...none }
  }
  if (!named) {
    return { passed: false, reason: `right values; name the columns ${expected.columns.join(', ')} (yours: ${got.columns.join(', ')})`, ...none }
  }
  return { passed: true, ...none }
}
