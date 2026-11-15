import { beforeAll, describe, expect, it } from 'vitest'
import initSqlJs, { type SqlJsStatic } from 'sql.js'
import { runAll } from './engine'
import { changeShape, sourcesOf } from './effects'
import { dropReason, pickedStage, stepsReached } from './SqlViews'
import { caseTables, SQL_PLAYGROUND, SQL_PLAYGROUND_TABLES, SQL_PROBLEMS } from './problems'

let SQL: SqlJsStatic
beforeAll(async () => {
  SQL = await initSqlJs()
})

const run = (code: string) => runAll(SQL, code, SQL_PLAYGROUND_TABLES)
const table = (code: string, name: string) => run(code).effects?.tables.find((t) => t.table === name)

describe('what a query touches', () => {
  it('reads the FROM tables and their aliases', () => {
    expect(sourcesOf('employees e LEFT JOIN departments AS d ON d.id = e.department_id')).toEqual([
      { table: 'employees', alias: 'e' },
      { table: 'departments', alias: 'd' },
    ])
    expect(sourcesOf('orders, customers c')).toEqual([
      { table: 'orders', alias: 'orders' },
      { table: 'customers', alias: 'c' },
    ])
    expect(sourcesOf('(SELECT 1) x JOIN employees ON 1')).toEqual([{ table: 'employees', alias: 'employees' }])
  })

  it('follows the rows WHERE keeps, and splits shown columns from used ones', () => {
    const e = table('SELECT name FROM employees WHERE salary > 7000', 'employees')!
    expect(e.role).toBe('from')
    expect(e.shown).toEqual(['name'])
    expect(e.used).toEqual(['salary'])
    expect(e.keep?.join).toEqual([1, 2, 3, 4, 5, 6, 7])
    expect(e.keep?.where).toEqual([1, 3, 5, 7])
  })

  it('SELECT * shows every column; COUNT(*) shows none', () => {
    expect(table('SELECT * FROM departments', 'departments')!.shown).toEqual(['id', 'name'])
    expect(table('SELECT COUNT(*) AS n FROM departments', 'departments')!.shown).toEqual([])
  })

  it('leaves out tables the query never names', () => {
    expect(run('SELECT name FROM employees').effects?.tables.map((t) => t.table)).toEqual(['employees'])
  })

  it('an inner join drops rows with no partner; a left join keeps the left side', () => {
    const inner = run('SELECT d.name, e.name FROM departments d JOIN employees e ON e.department_id = d.id').effects!
    expect(inner.tables.find((t) => t.table === 'departments')!.keep?.join).toEqual([1, 2, 3])
    expect(inner.tables.find((t) => t.table === 'employees')!.used).toEqual(['department_id'])
    expect(inner.tables.find((t) => t.table === 'departments')!.used).toEqual(['id'])
    const left = run(SQL_PLAYGROUND).effects!
    expect(left.tables.find((t) => t.table === 'departments')!.keep?.join).toEqual([1, 2, 3, 4])
  })

  it('HAVING drops whole groups, even when it uses a SELECT alias', () => {
    const e = table('SELECT department_id, COUNT(*) AS n FROM employees GROUP BY department_id HAVING n >= 3', 'employees')!
    // Departments 1 and 2 have three people each; Support (3) has one.
    expect(e.keep?.having).toEqual([1, 2, 3, 4, 5, 7])
    expect(e.used).toEqual(['department_id'])
  })

  it('LIMIT keeps only the rows that make the cut', () => {
    expect(table('SELECT name FROM employees ORDER BY salary DESC LIMIT 2', 'employees')!.keep?.limit).toEqual([1, 5])
    expect(table('SELECT department_id, SUM(salary) AS s FROM employees GROUP BY 1 ORDER BY s DESC LIMIT 1', 'employees')!.keep?.limit).toEqual([1, 2, 5])
  })

  it('a self join merges both sides into one table entry', () => {
    const effects = run('SELECT e.name FROM employees e JOIN employees m ON e.manager_id = m.id WHERE e.salary < m.salary').effects!
    expect(effects.tables).toHaveLength(1)
    expect(effects.tables[0].aliases).toEqual(['e', 'm'])
    // Ben, Cara, Dev, Eli and Fay earn less than their manager; Ava and Cara are those managers.
    expect(effects.tables[0].keep?.where).toEqual([1, 2, 3, 4, 5, 6])
  })

  it('a table read only in a subquery is marked as read', () => {
    const effects = run('SELECT name FROM customers WHERE id IN (SELECT customer_id FROM orders WHERE amount > 100)').effects!
    expect(effects.tables.find((t) => t.table === 'orders')).toMatchObject({ role: 'read' })
    expect(effects.tables.find((t) => t.table === 'orders')!.used).toEqual(expect.arrayContaining(['customer_id', 'amount']))
    expect(effects.tables.find((t) => t.table === 'customers')!.keep?.where).toEqual([1, 4])
  })

  it('reads through a WITH to the tables inside it', () => {
    const effects = run('WITH big AS (SELECT * FROM orders WHERE amount > 80) SELECT * FROM big').effects!
    expect(effects.tables.map((t) => [t.table, t.role])).toEqual([['orders', 'read']])
  })
})

describe('what a change touches', () => {
  it('reads INSERT, UPDATE and DELETE', () => {
    expect(changeShape("UPDATE employees SET salary = salary + 1 WHERE name = 'Ava'")).toMatchObject({ kind: 'update', table: 'employees', where: "name = 'Ava'" })
    expect(changeShape('DELETE FROM person AS p WHERE p.id > 2 RETURNING *')).toMatchObject({ kind: 'delete', table: 'person', alias: 'p', where: 'p.id > 2' })
    expect(changeShape('INSERT INTO departments (id, name) VALUES (9, "x")')).toMatchObject({ kind: 'insert', table: 'departments', columns: 'id, name' })
    expect(changeShape('SELECT 1')).toBe(null)
  })

  it('UPDATE: the rows it changed and the columns it set', () => {
    const t = table('UPDATE employees SET salary = salary * 2 WHERE department_id = 2', 'employees')!
    expect(t).toMatchObject({ role: 'target', hit: [3, 4, 7], shown: ['salary'] })
    expect(t.old!.map((r) => r[3])).toEqual([7500, 6000, 7500])
    expect(t.used).toEqual(expect.arrayContaining(['salary', 'department_id']))
  })

  it('DELETE: the rows it removed, with their values', () => {
    const t = table('DELETE FROM departments WHERE id > 2', 'departments')!
    expect(t.hit).toEqual([3, 4])
    expect(t.removed).toEqual([
      [3, 3, 'Support'],
      [4, 4, 'Legal'],
    ])
  })

  it('INSERT: the new rows', () => {
    expect(table("INSERT INTO departments (name) VALUES ('Ops'), ('HR')", 'departments')!).toMatchObject({ added: [5, 6], shown: ['name'] })
  })

  it('only the last statement counts, against the data as it is then', () => {
    const out = run("DELETE FROM employees WHERE id = 1;\nSELECT name FROM employees WHERE salary > 7000")
    expect(out.effects!.tables[0].keep?.where).toEqual([3, 5, 7])
    expect(out.tables.find((t) => t.name === 'employees')!.rowids).toEqual([2, 3, 4, 5, 6, 7])
  })

  it('a problem run carries the tables before it, with rowids', () => {
    const p = SQL_PROBLEMS.find((x) => x.checkTable)!
    const out = runAll(SQL, p.answer, caseTables(p, 0), { cases: [], reference: p.answer, ordered: false, checkTable: p.checkTable })
    const before = out.before!.find((t) => t.name === p.checkTable)!
    expect(before.rowids!.length).toBe(before.rows.length)
    expect(out.effects!.tables[0].hit!.length).toBeGreaterThan(0)
  })

  it('a broken query has no effects, and never throws', () => {
    expect(run('SELECT nope FROM employees').effects).toBe(null)
  })

  it('every problem answer works out its effects', () => {
    for (const p of SQL_PROBLEMS) {
      const out = runAll(SQL, p.answer, caseTables(p, 0))
      expect(out.effects?.tables.length, p.id).toBeGreaterThan(0)
    }
  })
})

describe('the tables pane', () => {
  it('drops rows only once the stage that drops them is on screen', () => {
    const keep = { join: [1, 2, 3, 4], where: [1, 2], limit: [1] }
    expect(stepsReached('from')).toEqual(['join'])
    expect(dropReason(3, keep, stepsReached('from'))).toBe(null)
    expect(dropReason(3, keep, stepsReached('where'))).toBe('where')
    expect(dropReason(2, keep, stepsReached('order'))).toBe(null)
    expect(dropReason(2, keep, stepsReached('limit'))).toBe('limit')
    expect(dropReason(5, keep, stepsReached(null))).toBe('join')
  })

  it('keeps your stage after an edit: by name, else the same place, clamped if the query got shorter', () => {
    const labels = ['FROM', 'WHERE', 'SELECT', 'ORDER BY']
    expect(pickedStage(null, labels)).toBe(3)
    expect(pickedStage({ label: 'WHERE', index: 1 }, ['FROM', 'WHERE', 'GROUP BY', 'SELECT'])).toBe(1)
    // Typed a WHERE in front of the stage you were on: still on SELECT.
    expect(pickedStage({ label: 'SELECT', index: 1 }, labels)).toBe(2)
    // Deleted the WHERE you were on: stay at position 1.
    expect(pickedStage({ label: 'WHERE', index: 1 }, ['FROM', 'SELECT', 'ORDER BY'])).toBe(1)
    // Fewer stages than where you were: the new last one.
    expect(pickedStage({ label: 'LIMIT', index: 4 }, ['FROM', 'SELECT'])).toBe(1)
    // Two parts with the same name: the one at your place.
    expect(pickedStage({ label: 'UNION SELECT', index: 2 }, ['First SELECT', 'UNION SELECT', 'UNION SELECT', 'UNION'])).toBe(2)
  })
})
