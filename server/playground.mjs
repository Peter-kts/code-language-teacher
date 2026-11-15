// What the chat can see and change on the learner's screen: the code in the editor (the SQL query, in
// the SQL workspace) and, in SQL, the tables the query runs on.
//
// Claude changes things by calling tools (edit_code, set_table, ...). The server applies each call to its
// own copy of the screen, so it can tell Claude right away when a call doesn't fit ("no row 9") and so
// later calls in the same answer see earlier ones. It then streams the accepted call to the browser, which
// runs this very same function on its copy. Same start + same calls in the same order = same result.
//
// Plain JavaScript (with JSDoc types) so both Node (server/chat.mjs) and the browser bundle can import it;
// playground.d.mts gives the TypeScript side its types.

/** @typedef {string | number | null} Cell */
/** @typedef {{ name: string, columns: string, rows: Cell[][] }} SqlTable */
/** @typedef {{ code: string, tables?: SqlTable[] }} PlaygroundState */

export const MAX_ROWS = 200
const MAX_CODE = 20000
const NAME = /^[A-Za-z_][A-Za-z0-9_]*$/

/** Marks a tool call that doesn't fit what's on screen; its message goes back to Claude. */
export class PlaygroundEditError extends Error {}

const fail = (message) => {
  throw new PlaygroundEditError(message)
}

/**
 * The tools Claude gets. In SQL the "code" is the query, and the table tools are added.
 * @param {'python' | 'javascript' | 'sql'} subject
 */
export function playgroundTools(subject) {
  const what = subject === 'sql' ? "the learner's SQL query (the editor)" : `the learner's ${subject === 'python' ? 'Python' : 'JavaScript'} code (the editor)`
  const code = [
    {
      name: 'edit_code',
      description: `Change part of ${what}. Each edit replaces old_text, which must appear exactly once in the editor, with new_text. Copy old_text exactly as it appears, without the line numbers shown in the <editor> block, and include enough lines to make it unique. Prefer this over write_code for small changes.`,
      input_schema: {
        type: 'object',
        properties: {
          edits: {
            type: 'array',
            minItems: 1,
            items: {
              type: 'object',
              properties: { old_text: { type: 'string' }, new_text: { type: 'string' } },
              required: ['old_text', 'new_text'],
              additionalProperties: false,
            },
          },
        },
        required: ['edits'],
        additionalProperties: false,
      },
    },
    {
      name: 'write_code',
      description: `Replace all of ${what} with new code. Use it for a rewrite or when the editor is nearly empty; for small changes use edit_code.`,
      input_schema: {
        type: 'object',
        properties: { code: { type: 'string' } },
        required: ['code'],
        additionalProperties: false,
      },
    },
  ]
  if (subject !== 'sql') return code
  const cell = { type: ['string', 'number', 'null'] }
  const row = { type: 'array', items: cell }
  return [
    ...code,
    {
      name: 'set_table',
      description:
        'Create a table, or replace one that exists with the same name, in the data the query runs on. columns is a CREATE TABLE column list like "id INTEGER PRIMARY KEY, name TEXT, salary REAL"; each row lists one value per column in that order (null for NULL).',
      input_schema: {
        type: 'object',
        properties: { name: { type: 'string' }, columns: { type: 'string' }, rows: { type: 'array', items: row } },
        required: ['name', 'columns', 'rows'],
        additionalProperties: false,
      },
    },
    {
      name: 'edit_rows',
      description:
        'Change rows of one table in the data the query runs on. Row numbers are the ones shown in the <editor> block, counted from 1, and all refer to the table as it was before this call. update sets the named columns of a row; remove deletes rows; add appends rows (one value per column, in column order).',
      input_schema: {
        type: 'object',
        properties: {
          table: { type: 'string' },
          update: {
            type: 'array',
            items: {
              type: 'object',
              properties: { row: { type: 'integer' }, values: { type: 'object', additionalProperties: cell } },
              required: ['row', 'values'],
              additionalProperties: false,
            },
          },
          remove: { type: 'array', items: { type: 'integer' } },
          add: { type: 'array', items: row },
        },
        required: ['table'],
        additionalProperties: false,
      },
    },
    {
      name: 'drop_table',
      description: 'Delete a whole table from the data the query runs on.',
      input_schema: {
        type: 'object',
        properties: { name: { type: 'string' } },
        required: ['name'],
        additionalProperties: false,
      },
    },
  ]
}

/**
 * Applies one tool call. Returns the new state and a short summary for the learner, or throws a
 * PlaygroundEditError saying what didn't fit. Never changes `state` itself.
 * @param {PlaygroundState} state
 * @param {string} name
 * @param {any} input
 * @returns {{ state: PlaygroundState, summary: string }}
 */
export function applyTool(state, name, input) {
  if (!input || typeof input !== 'object') fail('The tool input must be an object.')
  switch (name) {
    case 'edit_code': {
      if (!Array.isArray(input.edits) || !input.edits.length) fail('edits must be a non-empty list.')
      let code = state.code
      for (const edit of input.edits) {
        const { old_text: oldText, new_text: newText } = edit ?? {}
        if (typeof oldText !== 'string' || typeof newText !== 'string') fail('Each edit needs old_text and new_text strings.')
        if (!oldText) fail('old_text is empty. Use write_code to fill an empty editor.')
        const count = code.split(oldText).length - 1
        if (count === 0) fail(`old_text was not found in the editor: ${JSON.stringify(oldText.slice(0, 120))}. Copy it exactly, without line numbers.`)
        if (count > 1) fail(`old_text appears ${count} times: ${JSON.stringify(oldText.slice(0, 120))}. Include more of the surrounding lines.`)
        const at = code.indexOf(oldText)
        code = code.slice(0, at) + newText + code.slice(at + oldText.length)
      }
      return { state: { ...state, code: checkedCode(code) }, summary: codeSummary(state.code, code) }
    }
    case 'write_code': {
      if (typeof input.code !== 'string') fail('code must be a string.')
      const code = checkedCode(input.code)
      return { state: { ...state, code }, summary: codeSummary(state.code, code) }
    }
    case 'set_table': {
      const tables = sqlTables(state)
      const tableName = String(input.name ?? '')
      if (!NAME.test(tableName)) fail(`"${tableName}" is not a usable table name: use letters, digits and _.`)
      if (typeof input.columns !== 'string' || !input.columns.trim() || input.columns.length > 1000) fail('columns must be a CREATE TABLE column list.')
      const cols = columnNames(input.columns)
      if (!cols.length || cols.some((c) => !c)) fail('columns must be a CREATE TABLE column list like "id INTEGER, name TEXT".')
      const rows = checkedRows(input.rows, cols.length, tableName)
      const table = { name: tableName, columns: input.columns.trim(), rows }
      const i = findTable(tables, tableName)
      const next = i < 0 ? [...tables, table] : tables.map((t, j) => (j === i ? table : t))
      if (next.length > 20) fail('There can be at most 20 tables.')
      const rowsWord = plural(rows.length, 'row')
      return { state: { ...state, tables: next }, summary: i < 0 ? `Created table ${tableName} (${rowsWord})` : `Replaced table ${tableName} (${rowsWord})` }
    }
    case 'edit_rows': {
      const tables = sqlTables(state)
      const i = findTable(tables, String(input.table ?? ''))
      if (i < 0) fail(`There is no table named ${JSON.stringify(input.table)}. Tables: ${tables.map((t) => t.name).join(', ') || '(none)'}.`)
      const table = tables[i]
      const cols = columnNames(table.columns)
      const count = table.rows.length
      const rowNumber = (n) => {
        if (!Number.isInteger(n) || n < 1 || n > count) fail(`${table.name} has no row ${n}; its rows are 1 to ${count}.`)
        return n - 1
      }
      const rows = table.rows.map((r) => [...r])
      const update = input.update ?? []
      const remove = input.remove ?? []
      const add = input.add ?? []
      if (!Array.isArray(update) || !Array.isArray(remove) || !Array.isArray(add)) fail('update, remove and add must be lists.')
      const changed = new Set()
      for (const u of update) {
        const r = rowNumber(u?.row)
        if (!u.values || typeof u.values !== 'object' || Array.isArray(u.values)) fail('Each update needs values, an object of column: value.')
        for (const [col, value] of Object.entries(u.values)) {
          const j = cols.findIndex((c) => c.toLowerCase() === col.toLowerCase())
          if (j < 0) fail(`${table.name} has no column ${JSON.stringify(col)}; its columns are ${cols.join(', ')}.`)
          rows[r][j] = checkedCell(value)
          changed.add(r)
        }
      }
      const gone = new Set(remove.map(rowNumber))
      const kept = rows.filter((_, r) => !gone.has(r))
      const added = checkedRows(add, cols.length, table.name)
      const next = [...kept, ...added]
      if (next.length > MAX_ROWS) fail(`A table can have at most ${MAX_ROWS} rows here.`)
      const parts = [
        added.length && `added ${plural(added.length, 'row')}`,
        [...changed].filter((r) => !gone.has(r)).length && `changed ${plural([...changed].filter((r) => !gone.has(r)).length, 'row')}`,
        gone.size && `removed ${plural(gone.size, 'row')}`,
      ].filter(Boolean)
      if (!parts.length) fail('Nothing to change: give update, remove or add.')
      const summary = `${parts.join(', ')} in ${table.name}`
      return {
        state: { ...state, tables: tables.map((t, j) => (j === i ? { ...t, rows: next } : t)) },
        summary: summary[0].toUpperCase() + summary.slice(1),
      }
    }
    case 'drop_table': {
      const tables = sqlTables(state)
      const i = findTable(tables, String(input.name ?? ''))
      if (i < 0) fail(`There is no table named ${JSON.stringify(input.name)}.`)
      return { state: { ...state, tables: tables.filter((_, j) => j !== i) }, summary: `Deleted table ${tables[i].name}` }
    }
    default:
      fail(`Unknown tool ${name}.`)
  }
}

/** @param {PlaygroundState} state */
function sqlTables(state) {
  if (!Array.isArray(state.tables)) fail('There are no tables to change here: only the code can be edited.')
  return state.tables
}

const findTable = (tables, name) => tables.findIndex((t) => t.name.toLowerCase() === name.toLowerCase())
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`

function checkedCode(code) {
  if (code.length > MAX_CODE) fail(`The code would be over ${MAX_CODE} characters.`)
  return code
}

function checkedCell(v) {
  if (v === null || typeof v === 'string' || (typeof v === 'number' && Number.isFinite(v))) return v
  if (typeof v === 'boolean') return v ? 1 : 0
  return fail(`${JSON.stringify(v)} can't go in a cell: use a number, text or null.`)
}

function checkedRows(rows, width, table) {
  if (!Array.isArray(rows)) fail('rows must be a list of rows.')
  if (rows.length > MAX_ROWS) fail(`A table can have at most ${MAX_ROWS} rows here.`)
  return rows.map((row, i) => {
    if (!Array.isArray(row)) fail(`Row ${i + 1} for ${table} must be a list of values.`)
    if (row.length !== width) fail(`Row ${i + 1} for ${table} has ${row.length} values, but the table has ${width} columns.`)
    return row.map(checkedCell)
  })
}

function codeSummary(before, after) {
  if (before === after) return 'Left the code as it was'
  const lines = changedLines(before, after)
  if (!before.trim()) return 'Wrote new code'
  if (!lines.length) return 'Removed some lines'
  const first = lines[0]
  const last = lines[lines.length - 1]
  return first === last ? `Changed line ${first}` : `Changed lines ${first}-${last}`
}

/**
 * Column names from a CREATE TABLE column list, like "id INTEGER PRIMARY KEY, price DECIMAL(10, 2)".
 * Commas inside brackets don't split, and table constraints (PRIMARY KEY (...), FOREIGN KEY ...) aren't columns.
 * @param {string} columns
 */
export function columnNames(columns) {
  const parts = []
  let depth = 0
  let current = ''
  for (const ch of columns) {
    if (ch === '(') depth++
    if (ch === ')') depth--
    if (ch === ',' && depth === 0) {
      parts.push(current)
      current = ''
    } else current += ch
  }
  parts.push(current)
  return parts
    .map((p) => p.trim())
    .filter((p) => !/^(PRIMARY|FOREIGN|UNIQUE|CHECK|CONSTRAINT)\b/i.test(p))
    .map((p) => {
      const m = /^("([^"]+)"|`([^`]+)`|\[([^\]]+)\]|(\S+))/.exec(p)
      return m ? (m[2] ?? m[3] ?? m[4] ?? m[5]) : ''
    })
}

/**
 * The 1-based line numbers of `after` that are new or changed compared with `before` (a longest
 * common subsequence of lines: the classic diff idea, fine for editor-sized code).
 * @param {string} before
 * @param {string} after
 * @returns {number[]}
 */
export function changedLines(before, after) {
  const a = before.split('\n')
  const b = after.split('\n')
  // Same lines at the start and end are unchanged; only the middle needs the table.
  let start = 0
  while (start < a.length && start < b.length && a[start] === b[start]) start++
  let endA = a.length
  let endB = b.length
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
    endA--
    endB--
  }
  const mid = (x, from, to) => x.slice(from, to)
  const ma = mid(a, start, endA)
  const mb = mid(b, start, endB)
  if (ma.length * mb.length > 4_000_000) return mb.map((_, i) => start + i + 1)
  // lcs[i][j]: the longest common run of ma[i..] and mb[j..].
  const lcs = Array.from({ length: ma.length + 1 }, () => new Array(mb.length + 1).fill(0))
  for (let i = ma.length - 1; i >= 0; i--)
    for (let j = mb.length - 1; j >= 0; j--) lcs[i][j] = ma[i] === mb[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1])
  const out = []
  let i = 0
  let j = 0
  while (j < mb.length) {
    if (i < ma.length && ma[i] === mb[j]) {
      i++
      j++
    } else if (i < ma.length && lcs[i + 1][j] >= lcs[i][j + 1]) i++
    else {
      out.push(start + j + 1)
      j++
    }
  }
  return out
}

/** A cell as Claude reads it: NULL, a number, or 'text'. */
const cellText = (v) => (v === null ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`)

/**
 * The tables as compact text for Claude, with row numbers for edit_rows. Long tables are cut, to keep
 * each question cheap; Claude is told how many rows it isn't seeing.
 * @param {SqlTable[]} tables
 */
export function describeTables(tables, maxRows = 40, maxChars = 12000) {
  let out = ''
  for (const t of tables.slice(0, 20)) {
    const head = `Table ${t.name} (${t.columns}), ${plural(t.rows.length, 'row')}${t.rows.length ? ':' : ''}\n`
    if (out.length + head.length > maxChars) {
      out += `(more tables not shown)\n`
      break
    }
    out += head
    let shown = 0
    for (const row of t.rows.slice(0, maxRows)) {
      const line = `  ${shown + 1} | ${row.map(cellText).join(' | ')}\n`
      if (out.length + line.length > maxChars) break
      out += line
      shown++
    }
    if (shown < t.rows.length) out += `  (rows ${shown + 1}-${t.rows.length} not shown)\n`
  }
  return out.trimEnd()
}

/**
 * Reads the screen the browser sent, keeping only what fits the shapes above, so a bad request can't
 * break the server.
 * @returns {PlaygroundState | null}
 */
export function readPlayground(raw, code) {
  const state = { code: String(code ?? '').slice(0, MAX_CODE) }
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.tables)) return state
  const tables = []
  for (const t of raw.tables.slice(0, 20)) {
    if (!t || typeof t.name !== 'string' || typeof t.columns !== 'string' || !Array.isArray(t.rows)) continue
    const width = columnNames(t.columns).length
    const rows = t.rows
      .slice(0, MAX_ROWS)
      .filter((r) => Array.isArray(r) && r.length === width)
      .map((r) => r.map((v) => (v === null || typeof v === 'string' || typeof v === 'number' ? v : String(v))))
    tables.push({ name: t.name, columns: t.columns, rows })
  }
  return { ...state, tables }
}
