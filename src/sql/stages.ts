import { meaningful, tokenize, type Token } from './tokens'

// "Step through the query": SQL is written SELECT ... FROM ... WHERE, but it runs in a different order:
// WITH, then FROM and JOIN, WHERE, GROUP BY, HAVING, SELECT, ORDER BY and LIMIT.
// This file cuts a query at its top-level clauses and builds one smaller query per stage, so running
// them one after another shows the rows as they are at each point. It only reads the query's shape;
// sql.worker.ts runs the stage queries, and a stage whose query fails is simply left out.

export type StageId = 'with' | 'from' | 'where' | 'group' | 'having' | 'select' | 'order' | 'limit' | 'part' | 'combine'

export interface Stage {
  id: StageId
  /** Short name on the stage button, like "WHERE" or "WITH totals". */
  label: string
  /** One or two plain sentences on what this stage does. */
  explain: string
  /** The query that shows the rows at this point. */
  sql: string
  /**
   * How to draw the rows: plain rows; 'groups' has a hidden first column (the group number) for color bands;
   * 'having' ends with a kept/dropped column.
   */
  view: 'rows' | 'groups' | 'having'
}

export interface Clauses {
  /** Everything before the main SELECT (WITH a AS (...), b AS (...)), or ''. */
  withPrefix: string
  ctes: string[]
  /** The main query, without the WITH part. */
  main: string
  distinct: boolean
  select?: string
  from?: string
  where?: string
  group?: string
  having?: string
  window?: string
  order?: string
  limit?: string
  /** For UNION / INTERSECT / EXCEPT: each SELECT, and the words joining them. */
  parts?: { sql: string; op: string }[]
}

const CLAUSE_WORDS = ['SELECT', 'FROM', 'WHERE', 'GROUP', 'HAVING', 'WINDOW', 'ORDER', 'LIMIT'] as const
type ClauseWord = (typeof CLAUSE_WORDS)[number]

/** Reads the WITH list and the top-level clauses of one query. Null when it isn't a SELECT. */
export function parseClauses(sql: string): Clauses | null {
  const all = tokenize(sql)
  const toks = meaningful(all)
  if (!toks.length) return null
  let at = 0
  const ctes: string[] = []
  if (toks[0].upper === 'WITH') {
    at = 1
    if (toks[at]?.upper === 'RECURSIVE') at++
    // name [(columns)] AS [NOT] [MATERIALIZED] ( body ), ...
    for (;;) {
      const name = toks[at]
      if (!name) return null
      ctes.push(unquote(name.text))
      at++
      if (toks[at]?.text === '(') at = closeOf(toks, at) + 1
      if (toks[at]?.upper !== 'AS') return null
      at++
      if (toks[at]?.upper === 'NOT') at++
      if (toks[at]?.upper === 'MATERIALIZED') at++
      if (toks[at]?.text !== '(') return null
      at = closeOf(toks, at) + 1
      if (toks[at]?.text === ',') {
        at++
        continue
      }
      break
    }
  }
  const mainTok = toks[at]
  if (!mainTok || (mainTok.upper !== 'SELECT' && mainTok.upper !== 'VALUES')) return null
  // Comments before the query are left out, so the prefix can be extended with more CTEs.
  const withPrefix = ctes.length ? sql.slice(toks[0].start, mainTok.start) : ''
  const main = sql.slice(mainTok.start).trim()
  const out: Clauses = { withPrefix, ctes, main, distinct: false }
  const mainToks = toks.slice(at)

  // UNION / INTERSECT / EXCEPT at the top level: the query is several SELECTs stacked.
  const ops = mainToks.filter((t) => t.depth === 0 && ['UNION', 'INTERSECT', 'EXCEPT'].includes(t.upper))
  if (ops.length) {
    const parts: { sql: string; op: string }[] = []
    let from = mainTok.start
    let op = ''
    for (const t of ops) {
      parts.push({ sql: sql.slice(from, t.start).trim(), op })
      const next = mainToks[mainToks.indexOf(t) + 1]
      const all = next && (next.upper === 'ALL' || next.upper === 'DISTINCT')
      op = all ? `${t.upper} ${next.upper}` : t.upper
      from = all ? next.end : t.end
    }
    // A trailing ORDER BY or LIMIT belongs to the whole stack, not to the last SELECT.
    let last = sql.slice(from).trim()
    const tail = meaningful(tokenize(last)).find((t) => t.depth === 0 && (t.upper === 'ORDER' || t.upper === 'LIMIT'))
    if (tail) last = last.slice(0, tail.start).trim()
    parts.push({ sql: last, op })
    out.parts = parts
    return out
  }

  // Where each top-level clause keyword starts.
  const marks: { word: ClauseWord; start: number; bodyStart: number }[] = []
  mainToks.forEach((t, i) => {
    if (t.depth !== 0 || !(CLAUSE_WORDS as readonly string[]).includes(t.upper)) return
    const word = t.upper as ClauseWord
    let body = t
    if (word === 'GROUP' || word === 'ORDER') {
      if (mainToks[i + 1]?.upper !== 'BY') return
      body = mainToks[i + 1]
    }
    if (word === 'SELECT') {
      const next = mainToks[i + 1]
      if (next?.upper === 'DISTINCT' || next?.upper === 'ALL') {
        out.distinct = next.upper === 'DISTINCT'
        body = next
      }
    }
    marks.push({ word, start: t.start, bodyStart: body.end })
  })
  const key: Record<ClauseWord, keyof Clauses> = {
    SELECT: 'select',
    FROM: 'from',
    WHERE: 'where',
    GROUP: 'group',
    HAVING: 'having',
    WINDOW: 'window',
    ORDER: 'order',
    LIMIT: 'limit',
  }
  marks.forEach((m, i) => {
    const end = i + 1 < marks.length ? marks[i + 1].start : sql.length
    ;(out as unknown as Record<string, string>)[key[m.word]] = sql.slice(m.bodyStart, end).trim()
  })
  return out
}

/** The index of the ')' matching the '(' at index i. */
function closeOf(toks: Token[], i: number): number {
  const depth = toks[i].depth
  for (let j = i + 1; j < toks.length; j++) if (toks[j].text === ')' && toks[j].depth === depth) return j
  return toks.length
}

const unquote = (name: string) => (/^["`[]/.test(name) ? name.slice(1, -1) : name)

/** Splits a list like "a, SUM(b), c" at its top-level commas. */
export function splitList(text: string): string[] {
  const out: string[] = []
  let begin = 0
  for (const t of tokenize(text)) {
    if (t.kind === 'punct' && t.text === ',' && t.depth === 0) {
      out.push(text.slice(begin, t.start).trim())
      begin = t.end
    }
  }
  out.push(text.slice(begin).trim())
  return out.filter(Boolean)
}

const NOT_ALIAS = new Set(['END', 'ASC', 'DESC', 'NULL', 'TRUE', 'FALSE', 'AND', 'OR', 'NOT', 'DISTINCT'])

/** One SELECT item split into its expression and its alias ("SUM(x) AS total" → SUM(x), total). */
export function splitAlias(item: string): { expr: string; alias: string | null } {
  const toks = meaningful(tokenize(item))
  const n = toks.length
  if (n >= 3 && toks[n - 2].upper === 'AS' && toks[n - 2].depth === 0) {
    return { expr: item.slice(0, toks[n - 2].start).trim(), alias: unquote(toks[n - 1].text) }
  }
  // A bare alias: "salary pay" or "COUNT(*) n".
  if (n >= 2) {
    const last = toks[n - 1]
    const before = toks[n - 2]
    const nameLike = (t: Token) => (t.kind === 'word' && !NOT_ALIAS.has(t.upper)) || t.kind === 'name'
    if (last.depth === 0 && nameLike(last) && (nameLike(before) || before.text === ')' || before.kind === 'string' || before.kind === 'number')) {
      if (!(before.kind === 'word' && before.text.includes('.'))) return { expr: item.slice(0, last.start).trim(), alias: unquote(last.text) }
    }
  }
  return { expr: item.trim(), alias: null }
}

const AGGREGATES = /\b(COUNT|SUM|AVG|MIN|MAX|GROUP_CONCAT|STRING_AGG|TOTAL)\s*\(/i

/** The stages to show for one query, in the order SQL runs them. Empty when it isn't a SELECT. */
export function buildStages(sql: string): Stage[] {
  const q = parseClauses(sql)
  if (!q) return []
  const w = q.withPrefix
  const stages: Stage[] = q.ctes.map((name) => ({
    id: 'with',
    label: `WITH ${name}`,
    explain: `WITH builds a temporary result named ${name}, like a table that lasts for this one query. The query below can read it.`,
    sql: `${w}SELECT * FROM ${quoteName(name)}`,
    view: 'rows',
  }))

  if (q.parts) {
    q.parts.forEach((p, i) =>
      stages.push({
        id: 'part',
        label: i === 0 ? 'First SELECT' : `${p.op} SELECT`,
        explain:
          i === 0
            ? 'Each SELECT in the stack runs on its own first.'
            : `This SELECT runs on its own too. It must give the same number of columns as the first one.`,
        sql: `${w}${p.sql}`,
        view: 'rows',
      }),
    )
    const ops = new Set(q.parts.slice(1).map((p) => p.op))
    stages.push({
      id: 'combine',
      label: [...ops].join(' / '),
      explain: [...ops]
        .map((op) =>
          op === 'UNION ALL'
            ? 'UNION ALL stacks the rows and keeps every duplicate.'
            : op.startsWith('UNION')
              ? 'UNION stacks the rows and removes duplicate rows.'
              : op.startsWith('INTERSECT')
                ? 'INTERSECT keeps only rows that appear in both results.'
                : 'EXCEPT keeps rows of the first result that are not in the second.',
        )
        .join(' '),
      sql,
      view: 'rows',
    })
    return stages
  }

  if (!q.from || !q.select) {
    stages.push({ id: 'select', label: 'SELECT', explain: 'With no FROM, SELECT just computes its values once.', sql, view: 'rows' })
    return stages
  }

  const joins = meaningful(tokenize(q.from)).filter((t) => t.depth === 0 && (t.upper === 'JOIN' || t.text === ','))
  const where = q.where ? ` WHERE ${q.where}` : ''
  stages.push({
    id: 'from',
    label: joins.length ? 'FROM + JOIN' : 'FROM',
    explain: joins.length
      ? `FROM and JOIN run first: they pair up rows of ${joins.length + 1} tables into wide rows. The join picture below shows which rows matched.`
      : `FROM runs first: it starts with every row of ${q.from}.`,
    sql: `${w}SELECT * FROM ${q.from}`,
    view: 'rows',
  })
  if (q.where) {
    stages.push({
      id: 'where',
      label: 'WHERE',
      explain: 'WHERE keeps only the rows where the condition is true. A condition that is false or NULL drops the row.',
      sql: `${w}SELECT * FROM ${q.from}${where}`,
      view: 'rows',
    })
  }

  const items = splitList(q.select).map(splitAlias)
  const aggregated = AGGREGATES.test(q.select) || !!q.group || !!q.having
  if (q.group) {
    // GROUP BY 1 means the first SELECT item; GROUP BY an alias means that alias's expression.
    const groupExprs = splitList(q.group).map((g) => {
      if (/^\d+$/.test(g)) return items[Number(g) - 1]?.expr ?? g
      const named = items.find((it) => it.alias && it.alias.toLowerCase() === unquote(g).toLowerCase())
      return named ? named.expr : g
    })
    const keys = groupExprs.join(', ')
    stages.push({
      id: 'group',
      label: 'GROUP BY',
      explain: `GROUP BY ${q.group} puts rows with the same value into one group (one color each). Each group will become one row of the result.`,
      sql: `${w}SELECT DENSE_RANK() OVER (ORDER BY ${keys}) AS __group, * FROM ${q.from}${where} ORDER BY ${keys}`,
      view: 'groups',
    })
    if (q.having) {
      stages.push({
        id: 'having',
        label: 'HAVING',
        explain:
          'HAVING filters whole groups, after grouping. That is why it can use COUNT(*) or SUM(...), which WHERE cannot see yet.',
        sql: `${w}SELECT ${groupExprs.map((e, i) => `${e} AS ${quoteName(groupLabel(q.group!, i))}`).join(', ')}, COUNT(*) AS rows_in_group, CASE WHEN (${q.having}) THEN 'kept' ELSE 'dropped' END AS "HAVING ${q.having.replace(/"/g, "'")}" FROM ${q.from}${where} GROUP BY ${keys}`,
        view: 'having',
      })
    }
  }

  const windowed = /\bOVER\b/i.test(q.select)
  const upToSelect = `${w}SELECT ${q.distinct ? 'DISTINCT ' : ''}${q.select} FROM ${q.from}${where}${q.group ? ` GROUP BY ${q.group}` : ''}${q.having ? ` HAVING ${q.having}` : ''}${q.window ? ` WINDOW ${q.window}` : ''}`
  stages.push({
    id: 'select',
    label: q.distinct ? 'SELECT DISTINCT' : 'SELECT',
    explain: [
      aggregated
        ? q.group
          ? 'SELECT computes the output columns, one row per group. Aggregates like COUNT and SUM squash each group into one value.'
          : 'SELECT computes the output. With an aggregate and no GROUP BY, the whole table is one group, so you get one row.'
        : 'SELECT computes the output columns for each row. Aliases (AS name) are born here, which is why WHERE cannot use them.',
      windowed ? 'Window functions (OVER ...) run here too: each row looks at other rows without merging them.' : '',
      q.distinct ? 'DISTINCT then removes duplicate rows.' : '',
    ]
      .filter(Boolean)
      .join(' '),
    sql: upToSelect,
    view: 'rows',
  })
  if (q.order) {
    stages.push({
      id: 'order',
      label: 'ORDER BY',
      explain: 'ORDER BY sorts the rows. It runs after SELECT, so it can use the aliases. Without it, SQL promises no order at all.',
      sql: `${upToSelect} ORDER BY ${q.order}`,
      view: 'rows',
    })
  }
  if (q.limit) {
    stages.push({
      id: 'limit',
      label: 'LIMIT',
      explain: /\bOFFSET\b|,/i.test(q.limit)
        ? 'LIMIT runs last: it skips the OFFSET rows, then keeps the next N.'
        : 'LIMIT runs last: it keeps only the first N rows.',
      sql,
      view: 'rows',
    })
  }
  // The last stage is the query exactly as written, so it always matches the result.
  stages[stages.length - 1] = { ...stages[stages.length - 1], sql }
  return stages
}

/** A readable column name for the i-th GROUP BY item. */
function groupLabel(group: string, i: number): string {
  const item = splitList(group)[i] ?? `key${i + 1}`
  return /^[A-Za-z_][\w.]*$/.test(item) ? item.split('.').pop()! : `key${i + 1}`
}

export const quoteName = (name: string) => (/^[A-Za-z_]\w*$/.test(name) ? name : `"${name.replace(/"/g, '""')}"`)

// ---------- The join picture ----------

export type JoinKind = 'inner' | 'left' | 'right' | 'full' | 'cross'

export interface JoinShape {
  kind: JoinKind
  /** The words as written, like LEFT OUTER JOIN. */
  op: string
  left: { table: string; alias: string }
  right: { table: string; alias: string }
  /** ON condition or USING (...) as written; '' for a cross join. */
  condition: string
  self: boolean
  /** More joins follow this one (the picture shows only the first). */
  more: boolean
}

const JOIN_WORDS = new Set(['NATURAL', 'LEFT', 'RIGHT', 'FULL', 'OUTER', 'INNER', 'CROSS', 'JOIN'])
const AFTER_SOURCE = new Set([...JOIN_WORDS, 'ON', 'USING', 'WHERE', 'GROUP', 'ORDER', 'LIMIT'])

/** The first join in a query's FROM clause, when both sides are plain tables (or WITH names). */
export function findJoin(sql: string): JoinShape | null {
  const q = parseClauses(sql)
  if (!q?.from) return null
  const from = q.from
  const toks = meaningful(tokenize(from))
  let i = 0
  const source = () => {
    const t = toks[i]
    if (!t || (t.kind !== 'word' && t.kind !== 'name') || t.depth !== 0 || JOIN_WORDS.has(t.upper)) return null
    i++
    let alias = unquote(t.text)
    if (toks[i]?.upper === 'AS') i++
    const a = toks[i]
    if (a && (a.kind === 'word' || a.kind === 'name') && !AFTER_SOURCE.has(a.upper)) {
      alias = unquote(a.text)
      i++
    }
    return { table: unquote(t.text), alias }
  }
  const left = source()
  if (!left) return null
  const opStart = toks[i]
  if (!opStart) return null
  let op = ''
  if (opStart.text === ',') {
    op = ','
    i++
  } else {
    const words: string[] = []
    while (toks[i] && JOIN_WORDS.has(toks[i].upper) && toks[i].depth === 0) {
      words.push(toks[i].upper)
      if (toks[i].upper === 'JOIN') {
        i++
        break
      }
      i++
    }
    if (words.at(-1) !== 'JOIN') return null
    op = words.join(' ')
  }
  const right = source()
  if (!right) return null
  let condition = ''
  const cond = toks[i]
  if (cond && (cond.upper === 'ON' || cond.upper === 'USING')) {
    const end = toks.findIndex((t, j) => j > i && t.depth === 0 && (JOIN_WORDS.has(t.upper) || t.text === ','))
    condition = from.slice(cond.start, end < 0 ? from.length : toks[end].start).trim()
    if (end >= 0) i = end
    else i = toks.length
  }
  const more = toks.slice(i).some((t) => t.depth === 0 && (t.upper === 'JOIN' || t.text === ','))
  const kind: JoinKind =
    op === ',' || op.includes('CROSS') || (!condition && !op.includes('NATURAL'))
      ? 'cross'
      : op.includes('LEFT')
        ? 'left'
        : op.includes('RIGHT')
          ? 'right'
          : op.includes('FULL')
            ? 'full'
            : 'inner'
  return { kind, op: op === ',' ? 'CROSS JOIN' : op, left, right, condition, self: left.table.toLowerCase() === right.table.toLowerCase(), more }
}

/**
 * Queries for the join picture: each side's rows, and the pairs (left row number, right row number) the
 * join makes. Row numbers count from 1 in each table's own order; a missing side is NULL.
 */
export function joinQueries(sql: string, join: JoinShape) {
  const q = parseClauses(sql)!
  const prefix = q.withPrefix.trim()
  const numbered = (side: string, col: string, table: string) => `${side} AS (SELECT ROW_NUMBER() OVER () AS ${col}, * FROM ${quoteName(table)})`
  const ctes = `${numbered('__l', '__i', join.left.table)}, ${numbered('__r', '__j', join.right.table)}`
  const withAll = prefix ? `${prefix}, ${ctes}` : `WITH ${ctes}`
  const la = quoteName(join.left.alias)
  const ra = quoteName(join.right.alias)
  return {
    left: `${withAll} SELECT * FROM __l ORDER BY __i`,
    right: `${withAll} SELECT * FROM __r ORDER BY __j`,
    pairs: `${withAll} SELECT ${la}.__i, ${ra}.__j FROM __l AS ${la} ${join.op} __r AS ${ra} ${join.condition}`,
  }
}
