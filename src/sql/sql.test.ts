import { beforeAll, describe, expect, it } from 'vitest'
import initSqlJs, { type SqlJsStatic } from 'sql.js'
import { compareResults, createDb, referenceResult, runAll, runOne, runScript, type CheckSpec } from './engine'
import { caseTables, SQL_PLAYGROUND, SQL_PLAYGROUND_TABLES, SQL_PROBLEMS, type SqlProblem } from './problems'
import { SQL_CARDS, SQL_LEVELS, SQL_QUESTIONS, SQL_TOPICS } from './cards'
import { SQL_HOVERS, sqlKeywordAt } from './keywords'
import { buildStages, findJoin } from './stages'
import { groupCards } from '../syntax/cards'

let SQL: SqlJsStatic
beforeAll(async () => {
  SQL = await initSqlJs()
})

const specFor = (p: SqlProblem): CheckSpec => ({
  cases: p.cases.map((c, i) => ({ name: c.name, tables: caseTables(p, i) })),
  reference: p.answer,
  ordered: p.ordered,
  checkTable: p.checkTable,
})

describe('SQL problems', () => {
  it('have unique ids and at least three named cases each', () => {
    const ids = SQL_PROBLEMS.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const p of SQL_PROBLEMS) {
      expect(p.cases.length, p.id).toBeGreaterThanOrEqual(3)
      expect(new Set(p.cases.map((c) => c.name)).size, p.id).toBe(p.cases.length)
      for (const c of p.cases) for (const name of Object.keys(c.rows ?? {})) expect(p.tables.map((t) => t.name), `${p.id}: ${c.name}`).toContain(name)
    }
  })

  it.each(SQL_PROBLEMS.map((p) => [p.id, p] as const))('%s: the worked answer passes every case', (_, p) => {
    const out = runAll(SQL, p.answer, caseTables(p, 0), specFor(p))
    expect(out.error, p.id).toBe(null)
    expect(out.cases!.filter((c) => !c.passed), p.id).toEqual([])
    expect(out.comparison?.passed, p.id).toBe(true)
  })

  it.each(SQL_PROBLEMS.map((p) => [p.id, p] as const))('%s: each edge case gives a different answer from the example', (_, p) => {
    // An edge case with the example's answer would pass a query that only fits the example.
    const results = p.cases.map((_, i) => JSON.stringify(referenceResult(SQL, specFor(p), caseTables(p, i))))
    for (let i = 1; i < results.length; i++) expect(results[i], `${p.id}: ${p.cases[i].name}`).not.toBe(results[0])
  })

  it.each(SQL_PROBLEMS.filter((p) => !p.checkTable).map((p) => [p.id, p] as const))('%s: shows its stages, ending on the result', (_, p) => {
    const out = runAll(SQL, p.answer, caseTables(p, 0))
    // None of the stage queries failed and got dropped.
    expect(out.stages.map((s) => s.label), p.id).toEqual(buildStages(p.answer.replace(/;\s*$/, '')).map((s) => s.label))
    expect(out.stages.at(-1)!.result, p.id).toEqual(out.result)
  })

  // The trap each problem's edge cases are there to catch.
  const WRONG: [string, string][] = [
    ['sql-null-trap', 'SELECT name FROM customers WHERE referred_by <> 2'],
    ['sql-not-exists', 'SELECT name FROM products WHERE id NOT IN (SELECT product_id FROM sales)'],
    ['sql-left-join-count', 'SELECT c.name, COUNT(*) AS orders FROM customers c LEFT JOIN orders o ON o.customer_id = c.id GROUP BY c.id ORDER BY c.name'],
    ['sql-left-join-count', 'SELECT c.name, COUNT(o.id) AS orders FROM customers c LEFT JOIN orders o ON o.customer_id = c.id GROUP BY c.name ORDER BY c.name'],
    ['sql-second-highest', 'SELECT DISTINCT salary AS second_highest FROM employees ORDER BY salary DESC LIMIT 1 OFFSET 1'],
    ['sql-second-highest', 'SELECT (SELECT salary FROM employees ORDER BY salary DESC LIMIT 1 OFFSET 1) AS second_highest'],
    ['sql-where', "SELECT name, price FROM products WHERE category = 'Books' AND price <= 20"],
    ['sql-in-between-like', "SELECT id, name FROM users WHERE email LIKE '%@mail.com%' AND city IN ('Paris', 'Rome') AND joined BETWEEN 2020 AND 2022 ORDER BY id"],
    ['sql-lag', 'WITH w AS (SELECT day, temp, LAG(temp) OVER (ORDER BY day) AS p FROM weather) SELECT day FROM w WHERE temp > p ORDER BY day'],
    ['sql-row-number', 'WITH r AS (SELECT department_id, name, salary, RANK() OVER (PARTITION BY department_id ORDER BY salary DESC) AS rn FROM employees) SELECT department_id, name, salary FROM r WHERE rn <= 2 ORDER BY department_id, salary DESC, name'],
    ['sql-share', 'SELECT category, SUM(amount) AS sales, ROUND(100 * SUM(amount) / SUM(SUM(amount)) OVER (), 1) AS pct FROM sales GROUP BY category ORDER BY sales DESC'],
    ['sql-case', "SELECT name, CASE WHEN score >= 90 THEN 'A' WHEN score >= 80 THEN 'B' WHEN score >= 70 THEN 'C' ELSE 'F' END AS grade FROM students ORDER BY name"],
    ['sql-bought-everything', 'SELECT customer_id FROM purchases GROUP BY customer_id HAVING COUNT(product_id) = (SELECT COUNT(*) FROM products) ORDER BY customer_id'],
    ['sql-union', 'SELECT email FROM customers UNION ALL SELECT email FROM subscribers ORDER BY email'],
    ['sql-consecutive', 'WITH w AS (SELECT num, LEAD(num) OVER (ORDER BY id) AS a, LEAD(num, 2) OVER (ORDER BY id) AS b FROM logs) SELECT num FROM w WHERE num = a AND num = b'],
    ['sql-max-per-group', 'SELECT d.name AS department, e.name AS employee, MAX(e.salary) AS salary FROM employees e JOIN departments d ON d.id = e.department_id GROUP BY d.id ORDER BY department, employee'],
    ['sql-inner-join', 'SELECT e.name AS employee, d.name AS department FROM employees e LEFT JOIN departments d ON e.department_id = d.id ORDER BY employee'],
    ['sql-self-join', 'SELECT e.name FROM employees e JOIN employees m ON e.manager_id = m.id WHERE e.salary >= m.salary'],
    ['sql-delete-duplicates', 'DELETE FROM person WHERE id NOT IN (SELECT MAX(id) FROM person GROUP BY email)'],
  ]
  it.each(WRONG)('%s: catches the trap %s', (id, wrong) => {
    const p = SQL_PROBLEMS.find((x) => x.id === id)!
    const out = runAll(SQL, wrong, caseTables(p, 0), specFor(p))
    expect(out.cases!.some((c) => !c.passed)).toBe(true)
  })

  it('starter code fails the tests', () => {
    for (const p of SQL_PROBLEMS) {
      const out = runAll(SQL, p.starter ?? 'SELECT 1 AS nothing;', caseTables(p, 0), specFor(p))
      expect(out.cases!.every((c) => c.passed), p.id).toBe(false)
    }
  })
})

describe('the engine', () => {
  it('runs the playground', () => {
    const out = runAll(SQL, SQL_PLAYGROUND, SQL_PLAYGROUND_TABLES)
    expect(out.error).toBe(null)
    expect(out.result?.columns).toEqual(['department', 'people', 'avg_salary'])
    expect(out.stages.map((s) => s.id)).toEqual(['from', 'group', 'select', 'order'])
    expect(out.join?.shape.kind).toBe('left')
  })

  it('names the line of a syntax error', () => {
    const db = createDb(SQL, [])
    const run = runScript(db, 'SELECT 1;\n\nSELEC 2;')
    expect(run.error?.line).toBe(3)
    expect(run.error?.message).toMatch(/SELEC/)
  })

  it('keeps the columns of an empty result', () => {
    const db = createDb(SQL, SQL_PLAYGROUND_TABLES)
    expect(runOne(db, 'SELECT name FROM employees WHERE 0')).toEqual({ columns: ['name'], rows: [] })
  })

  it('explains the classic mistakes', () => {
    const out = runAll(SQL, 'SELECT department_id FROM employees WHERE COUNT(*) > 1 GROUP BY department_id', SQL_PLAYGROUND_TABLES)
    expect(out.error?.message).toMatch(/HAVING/)
  })

  it('compares results as sets unless order matters', () => {
    const a = { columns: ['x'], rows: [[1], [2]] }
    const b = { columns: ['x'], rows: [[2], [1]] }
    expect(compareResults(a, b, false).passed).toBe(true)
    expect(compareResults(a, b, true).reason).toMatch(/order/)
    expect(compareResults({ columns: ['x'], rows: [[2.0]] }, { columns: ['x'], rows: [[2]] }, true).passed).toBe(true)
    expect(compareResults({ columns: ['y'], rows: [[1]] }, { columns: ['x'], rows: [[1]] }, true).reason).toMatch(/name the columns x/)
    const miss = compareResults({ columns: ['x'], rows: [[1], [1]] }, { columns: ['x'], rows: [[1], [3]] }, false)
    expect(miss).toMatchObject({ passed: false, missing: [1], extra: [1] })
    expect(compareResults({ columns: ['x'], rows: [[null]] }, { columns: ['x'], rows: [['NULL']] }, false).passed).toBe(false)
  })
})

describe('the SQL glossary', () => {
  const lists = { topics: SQL_TOPICS, levels: SQL_LEVELS, questions: SQL_QUESTIONS }
  const ids = new Set(SQL_CARDS.map((c) => c.id))

  it('has unique ids, in learning-path order, each in one topic and level', () => {
    expect(ids.size).toBe(SQL_CARDS.length)
    const levels = SQL_CARDS.map((c) => c.level)
    expect(levels).toEqual([...levels].sort((a, b) => a - b))
    for (const by of ['topic', 'level'] as const) expect(groupCards(SQL_CARDS, by, lists).flatMap((g) => g.cards)).toHaveLength(SQL_CARDS.length)
    expect(groupCards(SQL_CARDS, 'question', lists).map((g) => g.id)).toEqual(SQL_QUESTIONS.map((q) => q.id))
  })

  it('covers every concept the problems link to, and every hover links to a card', () => {
    for (const p of SQL_PROBLEMS) for (const c of p.concepts) expect(ids, `${p.id} → ${c}`).toContain(c)
    for (const h of SQL_HOVERS) expect(ids, h.name).toContain(h.card)
  })

  it.each(SQL_CARDS.map((c) => [c.id, c] as const))('%s: its example runs on the playground tables', (_, card) => {
    const out = runAll(SQL, card.code, SQL_PLAYGROUND_TABLES)
    expect(out.error, card.id).toBe(null)
    expect(out.result, card.id).not.toBe(null)
  })
})

describe('keyword hovers', () => {
  const at = (line: string, word: string) => sqlKeywordAt(line, line.indexOf(word) + 1)?.builtin.name
  it('finds keywords and functions, not columns or strings', () => {
    expect(at('SELECT COUNT(*) FROM t', 'COUNT')).toBe('COUNT')
    expect(at('select name from t', 'from')).toBe('FROM')
    expect(at('  GROUP BY dept', 'BY')).toBe('GROUP')
    expect(at("WHERE x = 'select'", 'select')).toBeUndefined()
    expect(at('SELECT o.date FROM orders o', 'date')).toBeUndefined()
    expect(at("SELECT date(d, '+1 day')", 'date')).toBe('DATE')
    expect(at('SELECT 1 -- order by', 'order')).toBeUndefined()
  })
})

describe('stages and joins', () => {
  it('splits a query into the order SQL runs it', () => {
    const stages = buildStages(
      'WITH t AS (SELECT * FROM employees) SELECT department_id AS d, COUNT(*) AS n FROM t WHERE salary > 1 GROUP BY d HAVING COUNT(*) > 1 ORDER BY n DESC LIMIT 2',
    )
    expect(stages.map((s) => s.label)).toEqual(['WITH t', 'FROM', 'WHERE', 'GROUP BY', 'HAVING', 'SELECT', 'ORDER BY', 'LIMIT'])
    // GROUP BY an alias groups by that alias's expression.
    expect(stages[3].sql).toContain('ORDER BY department_id')
  })

  it('runs every stage of a grouped query, HAVING included', () => {
    const p = SQL_PROBLEMS.find((x) => x.id === 'sql-where-and-having')!
    const out = runAll(SQL, p.answer, caseTables(p, 0))
    expect(out.stages.map((s) => s.id)).toEqual(['from', 'where', 'group', 'having', 'select', 'order'])
    expect(out.stages[3].result.rows.map((r) => r.at(-1))).toContain('dropped')
  })

  it('ignores clause words inside brackets, strings and comments', () => {
    const stages = buildStages("SELECT (SELECT MAX(x) FROM y WHERE z) AS m, 'FROM' -- WHERE\nFROM t")
    expect(stages.map((s) => s.id)).toEqual(['from', 'select'])
  })

  it('stacks the parts of a UNION', () => {
    expect(buildStages('SELECT a FROM x UNION ALL SELECT a FROM y ORDER BY a').map((s) => s.label)).toEqual(['First SELECT', 'UNION ALL SELECT', 'UNION ALL'])
  })

  it('reads the first join', () => {
    expect(findJoin('SELECT * FROM employees e LEFT OUTER JOIN departments AS d ON d.id = e.department_id JOIN x ON 1')).toMatchObject({
      kind: 'left',
      left: { table: 'employees', alias: 'e' },
      right: { table: 'departments', alias: 'd' },
      condition: 'ON d.id = e.department_id',
      more: true,
    })
    expect(findJoin('SELECT * FROM a, b')?.kind).toBe('cross')
    expect(findJoin('SELECT * FROM employees e JOIN employees m ON e.manager_id = m.id')?.self).toBe(true)
    expect(findJoin('SELECT * FROM (SELECT 1) x JOIN y ON 1')).toBe(null)
  })

  it('draws a full join with unmatched rows on both sides', () => {
    const p = SQL_PROBLEMS.find((x) => x.id === 'sql-full-join')!
    const out = runAll(SQL, p.answer, caseTables(p, 0))
    expect(out.join?.pairs).toEqual([
      [0, null],
      [1, 0],
      [2, 1],
      [null, 2],
    ])
  })
})
