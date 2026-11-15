import { describe, expect, it } from 'vitest'
import { applyTool, changedLines, columnNames, describeTables, playgroundTools, readPlayground, type PlaygroundState } from '../../server/playground.mjs'
import { chatMarks } from './marks'
import { takeEdits } from './stream'

const sql: PlaygroundState = {
  code: 'SELECT *\nFROM employees;\n',
  tables: [
    { name: 'employees', columns: 'id INTEGER PRIMARY KEY, name TEXT, salary REAL', rows: [[1, 'Ana', 5000], [2, 'Ben', 6000]] },
    { name: 'depts', columns: 'id INTEGER, name TEXT', rows: [] },
  ],
}

describe('applyTool: code', () => {
  it('replaces text that appears once', () => {
    const { state, summary } = applyTool(sql, 'edit_code', { edits: [{ old_text: 'SELECT *', new_text: 'SELECT name' }] })
    expect(state.code).toBe('SELECT name\nFROM employees;\n')
    expect(summary).toBe('Changed line 1')
    expect(sql.code).toBe('SELECT *\nFROM employees;\n')
  })
  it('refuses text that is missing or appears twice, with a message for Claude', () => {
    expect(() => applyTool(sql, 'edit_code', { edits: [{ old_text: '  2  FROM', new_text: '' }] })).toThrow(/not found/)
    expect(() => applyTool({ code: 'a\na\n' }, 'edit_code', { edits: [{ old_text: 'a', new_text: 'b' }] })).toThrow(/appears 2 times/)
  })
  it('applies several edits in order', () => {
    const { state } = applyTool({ code: 'x = 1\ny = 2\n' }, 'edit_code', {
      edits: [
        { old_text: 'x = 1', new_text: 'x = 10' },
        { old_text: 'x = 10\ny', new_text: 'x = 10\nz' },
      ],
    })
    expect(state.code).toBe('x = 10\nz = 2\n')
  })
  it('writes whole code', () => {
    expect(applyTool({ code: '' }, 'write_code', { code: 'print(1)\n' })).toEqual({ state: { code: 'print(1)\n' }, summary: 'Wrote new code' })
  })
  it('has no table tools outside SQL', () => {
    expect(playgroundTools('python').map((t) => t.name)).toEqual(['edit_code', 'write_code'])
    expect(playgroundTools('sql').map((t) => t.name)).toEqual(['edit_code', 'write_code', 'set_table', 'edit_rows', 'drop_table'])
    expect(() => applyTool({ code: '' }, 'set_table', { name: 't', columns: 'a', rows: [] })).toThrow(/only the code/)
  })
})

describe('applyTool: tables', () => {
  it('adds, changes and removes rows by their row numbers', () => {
    const { state, summary } = applyTool(sql, 'edit_rows', {
      table: 'Employees',
      update: [{ row: 2, values: { SALARY: null } }],
      remove: [1],
      add: [[3, 'Cy', 7000]],
    })
    expect(state.tables![0].rows).toEqual([[2, 'Ben', null], [3, 'Cy', 7000]])
    expect(summary).toBe('Added 1 row, changed 1 row, removed 1 row in employees')
  })
  it('explains what does not fit', () => {
    expect(() => applyTool(sql, 'edit_rows', { table: 'employees', remove: [3] })).toThrow(/no row 3; its rows are 1 to 2/)
    expect(() => applyTool(sql, 'edit_rows', { table: 'employees', update: [{ row: 1, values: { age: 3 } }] })).toThrow(/no column "age"/)
    expect(() => applyTool(sql, 'edit_rows', { table: 'employees', add: [[4, 'Di']] })).toThrow(/has 2 values, but the table has 3 columns/)
    expect(() => applyTool(sql, 'edit_rows', { table: 'nope', add: [] })).toThrow(/no table named "nope"/)
    expect(() => applyTool(sql, 'edit_rows', { table: 'employees' })).toThrow(/Nothing to change/)
  })
  it('creates, replaces and drops tables', () => {
    const made = applyTool(sql, 'set_table', { name: 'orders', columns: 'id INTEGER, total DECIMAL(10, 2)', rows: [[1, 9.5]] })
    expect(made.summary).toBe('Created table orders (1 row)')
    expect(made.state.tables!.map((t) => t.name)).toEqual(['employees', 'depts', 'orders'])
    const replaced = applyTool(made.state, 'set_table', { name: 'DEPTS', columns: 'id INTEGER', rows: [[1], [2]] })
    expect(replaced.summary).toBe('Replaced table DEPTS (2 rows)')
    expect(replaced.state.tables!.map((t) => t.name)).toEqual(['employees', 'DEPTS', 'orders'])
    expect(applyTool(sql, 'drop_table', { name: 'depts' }).state.tables!.map((t) => t.name)).toEqual(['employees'])
    expect(() => applyTool(sql, 'set_table', { name: 'bad name', columns: 'a', rows: [] })).toThrow(/not a usable table name/)
    expect(() => applyTool(sql, 'set_table', { name: 't', columns: 'a', rows: [[{}]] })).toThrow(/can't go in a cell/)
  })
})

describe('helpers', () => {
  it('reads column names from a CREATE TABLE list', () => {
    expect(columnNames('id INTEGER PRIMARY KEY, price DECIMAL(10, 2), "full name" TEXT, PRIMARY KEY (id)')).toEqual(['id', 'price', 'full name'])
  })
  it('finds the new and changed lines', () => {
    expect(changedLines('a\nb\nc', 'a\nB\nc')).toEqual([2])
    expect(changedLines('a\nc', 'a\nb\nc\nd')).toEqual([2, 4])
    expect(changedLines('a\nb\nc', 'a\nc')).toEqual([])
  })
  it('describes tables with row numbers and cuts long ones', () => {
    const text = describeTables([{ name: 't', columns: 'a INTEGER, b TEXT', rows: [[1, "it's"], [2, null], [3, 'x']] }], 2)
    expect(text).toBe("Table t (a INTEGER, b TEXT), 3 rows:\n  1 | 1 | 'it''s'\n  2 | 2 | NULL\n  (rows 3-3 not shown)")
  })
  it('keeps only well-formed tables from a request', () => {
    const state = readPlayground({ tables: [{ name: 't', columns: 'a, b', rows: [[1, 2], [3], 'x'] }, { name: 5 }] }, 'q')
    expect(state).toEqual({ code: 'q', tables: [{ name: 't', columns: 'a, b', rows: [[1, 2]] }] })
    expect(readPlayground(undefined, 'q')).toEqual({ code: 'q' })
  })
})

describe('takeEdits', () => {
  it('splits changes out of the text, keeping a half-received one for later', () => {
    const rec = '\x1e{"name":"write_code","input":{"code":"x"}}\x1e'
    expect(takeEdits(`Sure.${rec}Done`)).toEqual({ text: 'Sure.Done', edits: [{ name: 'write_code', input: { code: 'x' } }], rest: '' })
    const cut = takeEdits(`Sure.${rec.slice(0, 10)}`)
    expect(cut).toEqual({ text: 'Sure.', edits: [], rest: rec.slice(0, 10) })
    expect(takeEdits(cut.rest + rec.slice(10)).edits).toHaveLength(1)
  })
})

describe('chatMarks', () => {
  it('tells new rows from changed ones, and counts removed rows', () => {
    const after = applyTool(sql, 'edit_rows', { table: 'employees', update: [{ row: 2, values: { salary: 6500 } }], remove: [1], add: [[3, 'Cy', 1]] }).state
    const marks = chatMarks(sql, after)
    const m = marks.tables.get('employees')!
    expect([...m.added]).toEqual([JSON.stringify([3, 'Cy', 1])])
    expect([...m.updated]).toEqual([[JSON.stringify([2, 'Ben', 6500]), [2]]])
    expect(m.removed).toBe(1)
    expect(marks.tables.has('depts')).toBe(false)
  })
  it('marks new tables, dropped tables and changed lines', () => {
    let after = applyTool(sql, 'set_table', { name: 'x', columns: 'a', rows: [[1]] }).state
    after = applyTool(after, 'drop_table', { name: 'depts' }).state
    after = applyTool(after, 'write_code', { code: 'SELECT a\nFROM x;\n' }).state
    const marks = chatMarks(sql, after)
    expect(marks.tables.get('x')!.created).toBe(true)
    expect(marks.dropped).toEqual(['depts'])
    expect(marks.lines).toEqual([1, 2])
  })
})
