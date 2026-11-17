import type { Difficulty } from '../problems/problems'
import type { Cell, SqlTable } from './engine'

// The SQL problems: what interviews ask, from WHERE to window functions and the classic puzzles.
// Each problem brings its own small tables. Test cases change some table's rows to poke at an edge
// (ties, NULLs, empty tables); the expected result of every case comes from running `answer` on it,
// so expected tables can never drift from the worked answer.

export type SqlTopic = 'basics' | 'nulls' | 'joins' | 'grouping' | 'subqueries' | 'ctes' | 'windows' | 'text' | 'classics' | 'objects'

export const SQL_TOPICS: { id: SqlTopic; label: string }[] = [
  { id: 'basics', label: 'Select and filter' },
  { id: 'nulls', label: 'NULLs' },
  { id: 'joins', label: 'Joins' },
  { id: 'grouping', label: 'Grouping and aggregates' },
  { id: 'subqueries', label: 'Subqueries' },
  { id: 'ctes', label: 'CTEs (WITH)' },
  { id: 'windows', label: 'Window functions' },
  { id: 'text', label: 'CASE, text and dates' },
  { id: 'classics', label: 'Interview classics' },
  // The bonus step after the object-oriented port problems (src/problems/oop): the same port as tables.
  { id: 'objects', label: 'From objects to tables (the port)' },
]

export interface SqlCase {
  name: string
  /** Replacement rows, by table name; tables not named keep the problem's rows. */
  rows?: Record<string, Cell[][]>
}

export interface SqlProblem {
  id: string
  title: string
  topic: SqlTopic
  difficulty: Difficulty
  /** Paragraphs. Text in `backticks` shows as code. */
  statement: string[]
  tables: SqlTable[]
  /** The first case is the problem's own tables; later ones are edge cases. */
  cases: SqlCase[]
  /** True when the statement asks for an order, so rows must come back in that order. */
  ordered: boolean
  /** For problems that change data: the table checked afterwards. */
  checkTable?: string
  hints: string[]
  /** A worked answer, shown on request. */
  answer: string
  /** Why the answer works, shown with it. */
  why: string
  /** Glossary card ids (src/sql/cards.ts). */
  concepts: string[]
  starter?: string
}

const t = (name: string, columns: string, rows: Cell[][]): SqlTable => ({ name, columns, rows })

/** The tables for one case: the problem's tables with that case's replacements. */
export function caseTables(problem: SqlProblem, index: number): SqlTable[] {
  const rows = problem.cases[index]?.rows ?? {}
  return problem.tables.map((table) => (rows[table.name] ? { ...table, rows: rows[table.name] } : table))
}

export const starterFor = (p: SqlProblem) => p.starter ?? `-- ${p.title}\n-- Write one query. The tables are on the right.\nSELECT\n`

// ---------- Shared tables ----------

const EMPLOYEES = t('employees', 'id INTEGER PRIMARY KEY, name TEXT, salary INTEGER, department_id INTEGER, manager_id INTEGER', [
  [1, 'Ava', 9000, 1, null],
  [2, 'Ben', 7000, 1, 1],
  [3, 'Cara', 7500, 2, 1],
  [4, 'Dev', 6000, 2, 3],
  [5, 'Eli', 8000, 1, 1],
  [6, 'Fay', 5000, 3, 3],
  [7, 'Gus', 7500, 2, 3],
])

const DEPARTMENTS = t('departments', 'id INTEGER PRIMARY KEY, name TEXT', [
  [1, 'Engineering'],
  [2, 'Sales'],
  [3, 'Support'],
  [4, 'Legal'],
])

const CUSTOMERS = t('customers', 'id INTEGER PRIMARY KEY, name TEXT, city TEXT, referred_by INTEGER', [
  [1, 'Ana', 'Paris', null],
  [2, 'Bo', 'Rome', 1],
  [3, 'Cy', null, 2],
  [4, 'Di', 'Paris', 2],
  [5, 'Ed', 'Oslo', null],
  [6, 'Flo', 'Rome', 1],
])

const ORDERS = t('orders', 'id INTEGER PRIMARY KEY, customer_id INTEGER, order_date TEXT, amount REAL', [
  [1, 1, '2024-01-05', 120],
  [2, 2, '2024-01-20', 40],
  [3, 1, '2024-02-11', 75],
  [4, 4, '2024-02-28', 200],
  [5, 2, '2024-03-02', 90],
  [6, 1, '2024-03-15', 30],
  [7, 4, '2023-12-30', 60],
])

const PRODUCTS = t('products', 'id INTEGER PRIMARY KEY, name TEXT, category TEXT, price REAL', [
  [1, 'SQL Basics', 'Books', 15],
  [2, 'Desk Lamp', 'Home', 35],
  [3, 'Big Data', 'Books', 42],
  [4, 'Mug', 'Home', 9],
  [5, 'Notebook', 'Office', 4],
  [6, 'Short Stories', 'Books', 19.5],
  [7, 'Chair', 'Home', 120],
])

// ---------- The port from the object-oriented track, as tables ----------
// Each Ship object is a row in ships; each Container a row in containers, where ship_id says which
// ship it is on (NULL: in the yard); each ship's manifest list becomes rows in manifest.

const SHIPS = t('ships', 'id INTEGER PRIMARY KEY, name TEXT, mode TEXT', [
  [1, 'Atlas', 'unload'],
  [2, 'Borealis', 'load'],
  [3, 'Calm', 'load'],
])

const CONTAINERS = t('containers', 'code TEXT PRIMARY KEY, weight INTEGER, ship_id INTEGER REFERENCES ships(id)', [
  ['C1', 10, 1],
  ['C2', 12, 1],
  ['C3', 7, null],
  ['C4', 15, null],
  ['C5', 9, 2],
  ['C6', 11, null],
])

const MANIFEST = t('manifest', 'ship_id INTEGER REFERENCES ships(id), code TEXT REFERENCES containers(code)', [
  [1, 'C1'],
  [1, 'C2'],
  [2, 'C4'],
  [2, 'C5'],
  [2, 'C6'],
])

export const SQL_PLAYGROUND_TABLES: SqlTable[] = [EMPLOYEES, DEPARTMENTS, CUSTOMERS, ORDERS]

export const SQL_PLAYGROUND = `-- A sandbox with four tables: employees, departments, customers, orders.
-- Edit the query and watch every stage update. Try LEFT JOIN, GROUP BY, a window function...
SELECT d.name AS department, COUNT(e.id) AS people, AVG(e.salary) AS avg_salary
FROM departments d
LEFT JOIN employees e ON e.department_id = d.id
GROUP BY d.id, d.name
ORDER BY people DESC;
`

export const SQL_PROBLEMS: SqlProblem[] = [
  // ---------- Select and filter ----------
  {
    id: 'sql-where',
    title: 'Cheap books',
    topic: 'basics',
    difficulty: 'Warm-up',
    statement: [
      'Return the `name` and `price` of every product in the `Books` category that costs less than 20. Any order.',
    ],
    tables: [PRODUCTS],
    cases: [
      { name: 'the example' },
      {
        name: 'a book at exactly 20 is not less than 20',
        rows: { products: [[1, 'Twenty', 'Books', 20], [2, 'Nineteen', 'Books', 19.99], [3, 'Cheap Mug', 'Home', 3]] },
      },
      { name: 'no books at all', rows: { products: [[1, 'Mug', 'Home', 9], [2, 'Pen', 'Office', 2]] } },
      { name: 'an empty table', rows: { products: [] } },
    ],
    ordered: false,
    hints: [
      'Pick the columns after SELECT and the table after FROM.',
      'WHERE keeps rows where a condition is true. Join two conditions with AND.',
      "Text goes in single quotes: `category = 'Books'`.",
    ],
    answer: "SELECT name, price\nFROM products\nWHERE category = 'Books' AND price < 20;",
    why: 'WHERE runs before SELECT and keeps only rows where both conditions are true. Strings use single quotes; double quotes mean a column name.',
    concepts: ['select', 'where'],
  },
  {
    id: 'sql-in-between-like',
    title: 'IN, BETWEEN and LIKE',
    topic: 'basics',
    difficulty: 'Easy',
    statement: [
      'Find users with an email ending in `@mail.com`, who live in Paris or Rome, and joined between 2020 and 2022 (both included).',
      'Return `id` and `name`, ordered by `id`.',
    ],
    tables: [
      t('users', 'id INTEGER PRIMARY KEY, name TEXT, email TEXT, city TEXT, joined INTEGER', [
        [1, 'Ana', 'ana@mail.com', 'Paris', 2021],
        [2, 'Bo', 'bo@work.org', 'Rome', 2020],
        [3, 'Cy', 'cy@mail.com', 'Oslo', 2022],
        [4, 'Di', 'di@mail.com', 'Rome', 2020],
        [5, 'Ed', 'ed@mail.com', 'Paris', 2023],
        [6, 'Flo', 'flo@mail.com.au', 'Rome', 2021],
      ]),
    ],
    cases: [
      { name: 'the example' },
      {
        name: 'both ends of the year range count',
        rows: { users: [[1, 'A', 'a@mail.com', 'Rome', 2022], [2, 'B', 'b@mail.com', 'Paris', 2019], [3, 'C', 'c@mail.com', 'Paris', 2020]] },
      },
      { name: 'nobody matches', rows: { users: [[1, 'A', 'a@mail.com', 'Oslo', 2021]] } },
    ],
    ordered: true,
    hints: [
      "`city IN ('Paris', 'Rome')` is a short way to write two ORs.",
      '`joined BETWEEN 2020 AND 2022` includes both ends.',
      "In LIKE, % means any run of characters: `email LIKE '%@mail.com'`. Without the % at the end, '.com.au' won't match.",
    ],
    answer:
      "SELECT id, name\nFROM users\nWHERE email LIKE '%@mail.com'\n  AND city IN ('Paris', 'Rome')\n  AND joined BETWEEN 2020 AND 2022\nORDER BY id;",
    why: 'IN tests against a list, BETWEEN is an inclusive range, and LIKE matches a pattern where % is any text and _ is one character.',
    concepts: ['where', 'in-between-like', 'order-by'],
  },
  {
    id: 'sql-order-limit',
    title: 'Top 3 most expensive',
    topic: 'basics',
    difficulty: 'Easy',
    statement: [
      'Return the `name` and `price` of the 3 most expensive products, most expensive first. When two cost the same, put them in name order.',
    ],
    tables: [PRODUCTS],
    cases: [
      { name: 'the example' },
      {
        name: 'a tie is broken by name',
        rows: { products: [[1, 'Zed', 'X', 50], [2, 'Amy', 'X', 50], [3, 'Kit', 'X', 70], [4, 'Low', 'X', 1]] },
      },
      { name: 'fewer than 3 products', rows: { products: [[1, 'Only', 'X', 5], [2, 'Two', 'X', 6]] } },
    ],
    ordered: true,
    hints: ['ORDER BY price DESC puts the biggest first.', 'Add a second sort key after a comma: `ORDER BY price DESC, name`.', 'LIMIT 3 keeps the first three rows.'],
    answer: 'SELECT name, price\nFROM products\nORDER BY price DESC, name\nLIMIT 3;',
    why: 'ORDER BY sorts by the first key, and uses the next key only to break ties. LIMIT runs last, after sorting.',
    concepts: ['order-by', 'limit'],
  },
  {
    id: 'sql-distinct',
    title: 'Every city once',
    topic: 'basics',
    difficulty: 'Warm-up',
    statement: ['List each `city` customers live in, once each, in alphabetical order. Leave out customers with no city.'],
    tables: [CUSTOMERS],
    cases: [
      { name: 'the example' },
      { name: 'everyone in one city', rows: { customers: [[1, 'A', 'Oslo', null], [2, 'B', 'Oslo', null]] } },
      { name: 'nobody has a city', rows: { customers: [[1, 'A', null, null]] } },
    ],
    ordered: true,
    hints: ['SELECT DISTINCT removes duplicate rows from the result.', 'NULL needs IS NOT NULL, not != NULL.'],
    answer: 'SELECT DISTINCT city\nFROM customers\nWHERE city IS NOT NULL\nORDER BY city;',
    why: 'DISTINCT works on whole result rows. DISTINCT alone would keep one NULL row, so WHERE removes those first.',
    concepts: ['distinct', 'is-null', 'order-by'],
  },

  // ---------- NULLs ----------
  {
    id: 'sql-null-trap',
    title: 'Not referred by customer 2',
    topic: 'nulls',
    difficulty: 'Easy',
    statement: [
      'Return the `name` of every customer who was not referred by the customer with id 2. Customers nobody referred count too. Any order.',
    ],
    tables: [CUSTOMERS],
    cases: [
      { name: 'the example' },
      { name: 'nobody has a referrer', rows: { customers: [[1, 'A', null, null], [2, 'B', null, null]] } },
      { name: 'everyone was referred by 2', rows: { customers: [[1, 'A', null, 2], [3, 'C', null, 2]] } },
    ],
    ordered: false,
    hints: [
      'Try `WHERE referred_by <> 2` and look at which rows go missing.',
      'Comparing NULL with anything gives NULL (unknown), and WHERE drops unknown rows.',
      'Add `OR referred_by IS NULL`.',
    ],
    answer: 'SELECT name\nFROM customers\nWHERE referred_by <> 2 OR referred_by IS NULL;',
    why: 'NULL means unknown, so NULL <> 2 is unknown too, not true. SQL uses three values (true, false, unknown) and WHERE keeps only true. IS NULL is the one test that says yes to NULL.',
    concepts: ['null', 'is-null', 'where'],
  },
  {
    id: 'sql-coalesce',
    title: 'Pay with commission',
    topic: 'nulls',
    difficulty: 'Easy',
    statement: [
      'Some staff earn a commission, the rest have NULL. Return each person\'s `name` and `total_pay` (salary plus commission, counting a missing commission as 0).',
      'Order by `total_pay` from highest, then by name.',
    ],
    tables: [
      t('staff', 'id INTEGER PRIMARY KEY, name TEXT, salary INTEGER, commission INTEGER', [
        [1, 'Ava', 5000, 500],
        [2, 'Ben', 5200, null],
        [3, 'Cara', 4800, 400],
        [4, 'Dev', 5500, null],
      ]),
    ],
    cases: [
      { name: 'the example' },
      { name: 'nobody has a commission', rows: { staff: [[1, 'A', 100, null], [2, 'B', 200, null]] } },
      { name: 'a tie in total pay', rows: { staff: [[1, 'Zoe', 100, 50], [2, 'Al', 150, null], [3, 'Mo', 90, 0]] } },
    ],
    ordered: true,
    hints: ['salary + NULL is NULL: arithmetic with NULL gives NULL.', 'COALESCE(a, b) gives the first value that isn\'t NULL.'],
    answer: 'SELECT name, salary + COALESCE(commission, 0) AS total_pay\nFROM staff\nORDER BY total_pay DESC, name;',
    why: 'Any arithmetic with NULL gives NULL. COALESCE(commission, 0) swaps NULL for 0 first. MySQL also has IFNULL and SQL Server ISNULL, which do the same for two values.',
    concepts: ['coalesce', 'null', 'aliases'],
  },
  {
    id: 'sql-count-variants',
    title: 'COUNT(*) vs COUNT(column)',
    topic: 'nulls',
    difficulty: 'Easy',
    statement: [
      'A survey table has one row per person asked, and `answer` is NULL when they skipped it.',
      'Return one row with `total_rows` (everyone asked), `answered` (non-NULL answers) and `distinct_answers` (how many different answers).',
    ],
    tables: [
      t('survey', 'id INTEGER PRIMARY KEY, answer TEXT', [
        [1, 'yes'],
        [2, null],
        [3, 'no'],
        [4, 'yes'],
        [5, null],
      ]),
    ],
    cases: [
      { name: 'the example' },
      { name: 'an empty table still gives one row of zeros', rows: { survey: [] } },
      { name: 'everyone skipped', rows: { survey: [[1, null], [2, null]] } },
    ],
    ordered: false,
    hints: ['COUNT(*) counts rows. COUNT(answer) skips NULLs.', 'COUNT(DISTINCT answer) counts different non-NULL values.'],
    answer: 'SELECT COUNT(*) AS total_rows,\n       COUNT(answer) AS answered,\n       COUNT(DISTINCT answer) AS distinct_answers\nFROM survey;',
    why: 'Every aggregate except COUNT(*) skips NULLs. With no GROUP BY, the whole table is one group, so you get exactly one row even when the table is empty.',
    concepts: ['count', 'aggregates', 'null'],
  },

  // ---------- Joins ----------
  {
    id: 'sql-inner-join',
    title: 'Employees and their department',
    topic: 'joins',
    difficulty: 'Easy',
    statement: [
      'Return each employee\'s name as `employee` and their department\'s name as `department`, ordered by employee. Leave out anyone whose department doesn\'t exist.',
    ],
    tables: [EMPLOYEES, DEPARTMENTS],
    cases: [
      { name: 'the example' },
      {
        name: 'an employee with no department',
        rows: { employees: [[1, 'Ava', 9000, 1, null], [2, 'Ben', 7000, null, 1], [3, 'Cy', 7000, 9, 1]] },
      },
      { name: 'no employees', rows: { employees: [] } },
    ],
    ordered: true,
    hints: [
      'JOIN departments ON <how the rows match>. Here an employee\'s department_id matches a department\'s id.',
      'Both tables have a name column, so give them short names (aliases) and say which: e.name, d.name.',
    ],
    answer:
      'SELECT e.name AS employee, d.name AS department\nFROM employees e\nJOIN departments d ON e.department_id = d.id\nORDER BY employee;',
    why: 'An INNER JOIN (plain JOIN) keeps only pairs where ON is true. Employees with no matching department, and departments with no employees (Legal), both disappear.',
    concepts: ['inner-join', 'aliases', 'order-by'],
  },
  {
    id: 'sql-left-join-null',
    title: 'Customers who never ordered',
    topic: 'joins',
    difficulty: 'Easy',
    statement: ['Return the `name` of every customer who has no orders. Any order.'],
    tables: [CUSTOMERS, ORDERS],
    cases: [
      { name: 'the example' },
      { name: 'there are no orders yet', rows: { orders: [] } },
      {
        name: 'everyone has ordered',
        rows: { customers: [[1, 'A', null, null], [2, 'B', null, null]], orders: [[1, 1, '2024-01-01', 5], [2, 2, '2024-01-02', 5]] },
      },
    ],
    ordered: false,
    hints: [
      'A LEFT JOIN keeps every customer, and fills the order columns with NULL when there is no match.',
      'Then keep only the rows where the order side is NULL: `WHERE o.id IS NULL`.',
      'NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id) works too.',
    ],
    answer: 'SELECT c.name\nFROM customers c\nLEFT JOIN orders o ON o.customer_id = c.id\nWHERE o.id IS NULL;',
    why: 'This is the anti-join pattern. LEFT JOIN keeps unmatched customers with NULLs on the right, and WHERE ... IS NULL keeps only those. Check a column that can\'t be NULL in a real match, like the id.',
    concepts: ['left-join', 'anti-join', 'is-null'],
  },
  {
    id: 'sql-left-join-count',
    title: 'Orders per customer, zeros included',
    topic: 'joins',
    difficulty: 'Medium',
    statement: ['Return every customer\'s `name` and how many `orders` they placed (0 for none), ordered by name.'],
    tables: [CUSTOMERS, ORDERS],
    cases: [
      { name: 'the example' },
      { name: 'no orders at all', rows: { orders: [] } },
      {
        name: 'two customers with the same name',
        rows: { customers: [[1, 'Sam', null, null], [2, 'Sam', null, null]], orders: [[1, 1, '2024-01-01', 5], [2, 1, '2024-01-02', 5]] },
      },
    ],
    ordered: true,
    hints: [
      'LEFT JOIN so customers with no orders stay, then GROUP BY the customer.',
      'COUNT(*) counts the NULL-filled row as 1. COUNT(o.id) counts only real orders.',
      'Group by c.id (not just the name): two customers can share a name.',
    ],
    answer:
      'SELECT c.name, COUNT(o.id) AS orders\nFROM customers c\nLEFT JOIN orders o ON o.customer_id = c.id\nGROUP BY c.id, c.name\nORDER BY c.name;',
    why: 'An unmatched customer still gives one row (with NULL order columns), so COUNT(*) would say 1. COUNT(o.id) skips NULLs and says 0.',
    concepts: ['left-join', 'group-by', 'count'],
  },
  {
    id: 'sql-right-join',
    title: 'Headcount per department (RIGHT JOIN)',
    topic: 'joins',
    difficulty: 'Medium',
    statement: [
      'Return every department\'s name as `department` and its number of employees as `headcount`, including departments with nobody, ordered by department.',
      'Try it with `FROM employees e RIGHT JOIN departments d`. A RIGHT JOIN is a LEFT JOIN with the tables swapped.',
    ],
    tables: [EMPLOYEES, DEPARTMENTS],
    cases: [
      { name: 'the example' },
      { name: 'no employees at all', rows: { employees: [] } },
      {
        name: 'an employee in a missing department is not counted',
        rows: { employees: [[1, 'A', 1, 1, null], [2, 'B', 1, 7, null]] },
      },
    ],
    ordered: true,
    hints: ['RIGHT JOIN keeps every row of the table on the right (departments).', 'Count e.id, not *, so empty departments show 0.'],
    answer:
      'SELECT d.name AS department, COUNT(e.id) AS headcount\nFROM employees e\nRIGHT JOIN departments d ON e.department_id = d.id\nGROUP BY d.id, d.name\nORDER BY department;',
    why: 'RIGHT JOIN keeps all rows from the right table. Most people write LEFT JOINs and put the table they keep first; both give the same rows.',
    concepts: ['right-join', 'group-by', 'count'],
  },
  {
    id: 'sql-full-join',
    title: 'Reconcile two stock lists',
    topic: 'joins',
    difficulty: 'Medium',
    statement: [
      'The warehouse and the store each keep a list of SKUs and quantities. Return every SKU in either list as `sku`, with `warehouse_qty` and `store_qty` (NULL where a list doesn\'t have it), ordered by sku.',
    ],
    tables: [
      t('warehouse', 'sku TEXT PRIMARY KEY, qty INTEGER', [
        ['A1', 10],
        ['B2', 0],
        ['C3', 7],
      ]),
      t('store', 'sku TEXT PRIMARY KEY, qty INTEGER', [
        ['B2', 4],
        ['C3', 7],
        ['D4', 2],
      ]),
    ],
    cases: [
      { name: 'the example' },
      { name: 'the store list is empty', rows: { store: [] } },
      { name: 'no SKU in common', rows: { warehouse: [['X', 1]], store: [['Y', 2]] } },
    ],
    ordered: true,
    hints: [
      'FULL OUTER JOIN keeps unmatched rows from both sides.',
      'The sku is NULL on one side when it\'s missing, so take whichever exists: COALESCE(w.sku, s.sku).',
      'MySQL has no FULL JOIN: there you would UNION a LEFT JOIN and a RIGHT JOIN.',
    ],
    answer:
      'SELECT COALESCE(w.sku, s.sku) AS sku, w.qty AS warehouse_qty, s.qty AS store_qty\nFROM warehouse w\nFULL OUTER JOIN store s ON w.sku = s.sku\nORDER BY sku;',
    why: 'FULL OUTER JOIN = matched pairs, plus left rows with no match, plus right rows with no match. COALESCE picks the key from whichever side has it.',
    concepts: ['full-join', 'coalesce'],
  },
  {
    id: 'sql-self-join',
    title: 'Earns more than their manager',
    topic: 'joins',
    difficulty: 'Easy',
    statement: ['Return the `name` of every employee who earns more than their manager. Any order.'],
    tables: [
      t('employees', 'id INTEGER PRIMARY KEY, name TEXT, salary INTEGER, manager_id INTEGER', [
        [1, 'Ava', 7000, null],
        [2, 'Ben', 8000, 1],
        [3, 'Cara', 6000, 1],
        [4, 'Dev', 6500, 3],
        [5, 'Eli', 6000, 3],
      ]),
    ],
    cases: [
      { name: 'the example' },
      { name: 'the same salary is not more', rows: { employees: [[1, 'A', 100, null], [2, 'B', 100, 1]] } },
      { name: 'nobody has a manager', rows: { employees: [[1, 'A', 100, null], [2, 'B', 900, null]] } },
    ],
    ordered: false,
    hints: [
      'Join the table to itself: once as the employee (e) and once as the manager (m).',
      'Match each employee to their manager: ON e.manager_id = m.id.',
    ],
    answer: 'SELECT e.name\nFROM employees e\nJOIN employees m ON e.manager_id = m.id\nWHERE e.salary > m.salary;',
    why: 'A self join is an ordinary join where both sides are the same table under two aliases. Each employee row pairs with the row of their manager.',
    concepts: ['self-join', 'aliases'],
  },
  {
    id: 'sql-self-left-join',
    title: 'Who reports to whom',
    topic: 'joins',
    difficulty: 'Easy',
    statement: [
      'Return every employee\'s name as `employee` and their manager\'s name as `manager` (NULL for someone with no manager), ordered by employee.',
    ],
    tables: [EMPLOYEES],
    cases: [
      { name: 'the example' },
      { name: 'just one person', rows: { employees: [[1, 'Solo', 1, 1, null]] } },
      { name: 'a manager id that points nowhere', rows: { employees: [[1, 'A', 1, 1, null], [2, 'B', 1, 1, 42]] } },
    ],
    ordered: true,
    hints: ['A plain JOIN would drop the person with no manager.', 'LEFT JOIN employees m ON e.manager_id = m.id keeps everyone.'],
    answer: 'SELECT e.name AS employee, m.name AS manager\nFROM employees e\nLEFT JOIN employees m ON e.manager_id = m.id\nORDER BY employee;',
    why: 'Self join plus LEFT JOIN: every employee stays, and the manager side is NULL when there is no match.',
    concepts: ['self-join', 'left-join'],
  },
  {
    id: 'sql-cross-join',
    title: 'Every size in every color',
    topic: 'joins',
    difficulty: 'Warm-up',
    statement: ['Return every combination of `size` and `color`, ordered by size, then color.'],
    tables: [t('sizes', 'size TEXT', [['S'], ['M'], ['L']]), t('colors', 'color TEXT', [['red'], ['blue']])],
    cases: [
      { name: 'the example' },
      { name: 'no colors means no combinations', rows: { colors: [] } },
      { name: 'one of each', rows: { sizes: [['XL']], colors: [['green']] } },
    ],
    ordered: true,
    hints: ['CROSS JOIN pairs every row on the left with every row on the right.', '3 sizes × 2 colors = 6 rows.'],
    answer: 'SELECT s.size, c.color\nFROM sizes s\nCROSS JOIN colors c\nORDER BY s.size, c.color;',
    why: 'A cross join has no ON: it makes every pair, so the row count multiplies. Writing FROM sizes, colors does the same.',
    concepts: ['cross-join'],
  },
  {
    id: 'sql-not-exists',
    title: 'Products never sold',
    topic: 'joins',
    difficulty: 'Medium',
    statement: [
      'Return the `name` of every product that has no sale. Some sales were recorded without a product (NULL product_id). Any order.',
    ],
    tables: [
      t('products', 'id INTEGER PRIMARY KEY, name TEXT', [
        [1, 'Lamp'],
        [2, 'Mug'],
        [3, 'Pen'],
        [4, 'Desk'],
      ]),
      t('sales', 'id INTEGER PRIMARY KEY, product_id INTEGER, qty INTEGER', [
        [1, 1, 2],
        [2, 3, 1],
        [3, 1, 5],
      ]),
    ],
    cases: [
      { name: 'the example' },
      { name: 'a sale with no product (NULL)', rows: { sales: [[1, 1, 2], [2, null, 1]] } },
      { name: 'nothing sold yet', rows: { sales: [] } },
    ],
    ordered: false,
    hints: [
      'NOT EXISTS (SELECT 1 FROM sales s WHERE s.product_id = p.id) is true when no sale matches.',
      'Try NOT IN (SELECT product_id FROM sales) on the NULL case and see what happens.',
    ],
    answer: 'SELECT p.name\nFROM products p\nWHERE NOT EXISTS (\n  SELECT 1 FROM sales s WHERE s.product_id = p.id\n);',
    why: 'x NOT IN (1, NULL) means x <> 1 AND x <> NULL, and x <> NULL is unknown, so NOT IN returns no rows at all once the list holds a NULL. NOT EXISTS has no such trap.',
    concepts: ['anti-join', 'exists', 'null'],
  },
  {
    id: 'sql-three-tables',
    title: 'Join three tables',
    topic: 'joins',
    difficulty: 'Medium',
    statement: [
      'Each order line names a customer, a product and a quantity. Return `customer` (name), `product` (name) and `total` (quantity × price), ordered by customer, then product.',
    ],
    tables: [
      t('customers', 'id INTEGER PRIMARY KEY, name TEXT', [
        [1, 'Ana'],
        [2, 'Bo'],
      ]),
      t('products', 'id INTEGER PRIMARY KEY, name TEXT, price REAL', [
        [1, 'Mug', 8],
        [2, 'Lamp', 30],
      ]),
      t('order_lines', 'id INTEGER PRIMARY KEY, customer_id INTEGER, product_id INTEGER, qty INTEGER', [
        [1, 1, 1, 2],
        [2, 2, 2, 1],
        [3, 1, 2, 1],
      ]),
    ],
    cases: [
      { name: 'the example' },
      { name: 'no order lines', rows: { order_lines: [] } },
      { name: 'the same product twice', rows: { order_lines: [[1, 1, 1, 1], [2, 1, 1, 3]] } },
    ],
    ordered: true,
    hints: ['Start FROM order_lines, then JOIN customers and JOIN products, each with its own ON.', 'Each JOIN adds columns to the rows built so far.'],
    answer:
      'SELECT c.name AS customer, p.name AS product, ol.qty * p.price AS total\nFROM order_lines ol\nJOIN customers c ON c.id = ol.customer_id\nJOIN products p ON p.id = ol.product_id\nORDER BY customer, product;',
    why: 'Joins chain: the first join builds wide rows, and the next join adds to them. Start from the table that has one row per thing you want back.',
    concepts: ['inner-join', 'aliases'],
  },

  // ---------- Grouping and aggregates ----------
  {
    id: 'sql-group-by',
    title: 'Headcount per department',
    topic: 'grouping',
    difficulty: 'Warm-up',
    statement: ['Return each `department_id` and its `headcount`, ordered by department_id.'],
    tables: [EMPLOYEES],
    cases: [
      { name: 'the example' },
      { name: 'one big department', rows: { employees: [[1, 'A', 1, 5, null], [2, 'B', 1, 5, null]] } },
      { name: 'no employees means no rows', rows: { employees: [] } },
    ],
    ordered: true,
    hints: ['GROUP BY department_id makes one group per department.', 'COUNT(*) counts the rows in each group.'],
    answer: 'SELECT department_id, COUNT(*) AS headcount\nFROM employees\nGROUP BY department_id\nORDER BY department_id;',
    why: 'GROUP BY squashes the rows with the same value into one row. Anything else in SELECT has to be an aggregate (COUNT, SUM...) or one of the grouped columns.',
    concepts: ['group-by', 'count'],
  },
  {
    id: 'sql-having',
    title: 'Duplicate emails',
    topic: 'grouping',
    difficulty: 'Easy',
    statement: ['Return every `email` that appears more than once, once each. Any order.'],
    tables: [
      t('person', 'id INTEGER PRIMARY KEY, email TEXT', [
        [1, 'a@x.com'],
        [2, 'b@x.com'],
        [3, 'a@x.com'],
        [4, 'c@x.com'],
        [5, 'b@x.com'],
      ]),
    ],
    cases: [
      { name: 'the example' },
      { name: 'no duplicates', rows: { person: [[1, 'a@x.com'], [2, 'b@x.com']] } },
      { name: 'one email three times is listed once', rows: { person: [[1, 'z@x.com'], [2, 'z@x.com'], [3, 'z@x.com']] } },
    ],
    ordered: false,
    hints: ['Group by email and count each group.', 'WHERE can\'t see COUNT(*); HAVING filters the groups after counting.'],
    answer: 'SELECT email\nFROM person\nGROUP BY email\nHAVING COUNT(*) > 1;',
    why: 'WHERE filters rows before grouping, HAVING filters groups after. A condition on an aggregate always goes in HAVING.',
    concepts: ['having', 'group-by'],
  },
  {
    id: 'sql-aggregates',
    title: 'Price stats per category',
    topic: 'grouping',
    difficulty: 'Easy',
    statement: [
      'For each `category`, return `items` (how many products), `cheapest`, `priciest` and `avg_price` rounded to 2 decimals. Order by category.',
    ],
    tables: [PRODUCTS],
    cases: [
      { name: 'the example' },
      { name: 'an average that needs rounding', rows: { products: [[1, 'a', 'X', 1], [2, 'b', 'X', 1], [3, 'c', 'X', 2]] } },
      { name: 'one product', rows: { products: [[1, 'a', 'Solo', 3.5]] } },
    ],
    ordered: true,
    hints: ['COUNT, MIN, MAX and AVG all work per group.', 'ROUND(AVG(price), 2) rounds to 2 decimals.'],
    answer:
      'SELECT category,\n       COUNT(*) AS items,\n       MIN(price) AS cheapest,\n       MAX(price) AS priciest,\n       ROUND(AVG(price), 2) AS avg_price\nFROM products\nGROUP BY category\nORDER BY category;',
    why: 'Each aggregate squashes a group into one value. Many can sit in the same SELECT.',
    concepts: ['aggregates', 'group-by', 'round'],
  },
  {
    id: 'sql-pivot',
    title: 'Sales by quarter (pivot)',
    topic: 'grouping',
    difficulty: 'Medium',
    statement: [
      'Turn the sales into one row per `region` with columns `q1`, `q2`, `q3`, `q4`: each the total amount for that quarter, 0 when there were none. Order by region.',
    ],
    tables: [
      t('sales', 'id INTEGER PRIMARY KEY, region TEXT, quarter TEXT, amount INTEGER', [
        [1, 'North', 'Q1', 100],
        [2, 'North', 'Q2', 150],
        [3, 'South', 'Q1', 80],
        [4, 'North', 'Q1', 20],
        [5, 'South', 'Q4', 60],
      ]),
    ],
    cases: [
      { name: 'the example' },
      { name: 'a region with sales in one quarter only', rows: { sales: [[1, 'East', 'Q3', 5]] } },
      { name: 'several rows in the same quarter', rows: { sales: [[1, 'W', 'Q2', 1], [2, 'W', 'Q2', 2], [3, 'W', 'Q2', 3]] } },
    ],
    ordered: true,
    hints: [
      'This is conditional aggregation: put a CASE inside SUM.',
      "SUM(CASE WHEN quarter = 'Q1' THEN amount ELSE 0 END) AS q1",
    ],
    answer:
      "SELECT region,\n       SUM(CASE WHEN quarter = 'Q1' THEN amount ELSE 0 END) AS q1,\n       SUM(CASE WHEN quarter = 'Q2' THEN amount ELSE 0 END) AS q2,\n       SUM(CASE WHEN quarter = 'Q3' THEN amount ELSE 0 END) AS q3,\n       SUM(CASE WHEN quarter = 'Q4' THEN amount ELSE 0 END) AS q4\nFROM sales\nGROUP BY region\nORDER BY region;",
    why: 'CASE turns each row into "amount if it is this quarter, else 0", and SUM adds those up per region. Postgres can also write SUM(amount) FILTER (WHERE quarter = \'Q1\').',
    concepts: ['conditional-aggregation', 'case', 'group-by'],
  },
  {
    id: 'sql-where-and-having',
    title: 'Big spenders in 2024',
    topic: 'grouping',
    difficulty: 'Medium',
    statement: [
      'Using only orders placed in 2024, return each `customer_id` whose orders add up to more than 150, with that `total`. Order by customer_id.',
    ],
    tables: [ORDERS],
    cases: [
      { name: 'the example' },
      {
        name: '2023 orders don\'t count',
        rows: { orders: [[1, 9, '2023-12-31', 500], [2, 9, '2024-01-01', 100], [3, 8, '2024-06-01', 151]] },
      },
      { name: 'exactly 150 is not more', rows: { orders: [[1, 1, '2024-02-02', 150]] } },
    ],
    ordered: true,
    hints: [
      "Filter rows with WHERE first: dates are text like '2024-01-05', so `order_date >= '2024-01-01' AND order_date < '2025-01-01'` works.",
      'Then GROUP BY customer_id and keep groups with HAVING SUM(amount) > 150.',
    ],
    answer:
      "SELECT customer_id, SUM(amount) AS total\nFROM orders\nWHERE order_date >= '2024-01-01' AND order_date < '2025-01-01'\nGROUP BY customer_id\nHAVING SUM(amount) > 150\nORDER BY customer_id;",
    why: 'WHERE (rows) runs before GROUP BY, HAVING (groups) after. Step through the stages to watch the 2023 order leave before the sums are made.',
    concepts: ['where', 'having', 'dates'],
  },

  // ---------- Subqueries ----------
  {
    id: 'sql-second-highest',
    title: 'Second highest salary',
    topic: 'subqueries',
    difficulty: 'Medium',
    statement: [
      'Return the second highest distinct salary as `second_highest`. If there isn\'t one, return a single row with NULL.',
    ],
    tables: [EMPLOYEES],
    cases: [
      { name: 'the example' },
      { name: 'two people tie for the top', rows: { employees: [[1, 'A', 900, 1, null], [2, 'B', 900, 1, null], [3, 'C', 500, 1, null]] } },
      { name: 'only one employee gives NULL', rows: { employees: [[1, 'A', 900, 1, null]] } },
      { name: 'everyone earns the same gives NULL', rows: { employees: [[1, 'A', 5, 1, null], [2, 'B', 5, 1, null]] } },
      { name: 'an empty table gives NULL', rows: { employees: [] } },
    ],
    ordered: false,
    hints: [
      'DISTINCT salary, ORDER BY salary DESC, then LIMIT 1 OFFSET 1 skips the top one.',
      'On its own that returns no row when there is no second salary. Wrap it as a subquery in SELECT: an empty scalar subquery gives NULL.',
      'Another way: SELECT MAX(salary) FROM employees WHERE salary < (SELECT MAX(salary) FROM employees).',
    ],
    answer:
      'SELECT (\n  SELECT DISTINCT salary\n  FROM employees\n  ORDER BY salary DESC\n  LIMIT 1 OFFSET 1\n) AS second_highest;',
    why: 'A subquery in SELECT must give one value; when it gives no rows, the value is NULL. That turns "no row" into "one row with NULL". DISTINCT makes ties at the top count once.',
    concepts: ['scalar-subquery', 'limit', 'distinct'],
  },
  {
    id: 'sql-correlated',
    title: 'Paid above their department\'s average',
    topic: 'subqueries',
    difficulty: 'Medium',
    statement: [
      'Return the `name`, `department_id` and `salary` of everyone paid more than the average salary of their own department. Order by name.',
    ],
    tables: [EMPLOYEES],
    cases: [
      { name: 'the example' },
      { name: 'everyone paid the same', rows: { employees: [[1, 'A', 5, 1, null], [2, 'B', 5, 1, null]] } },
      { name: 'one person alone in a department', rows: { employees: [[1, 'A', 5, 1, null], [2, 'B', 9, 2, null], [3, 'C', 1, 2, null]] } },
    ],
    ordered: true,
    hints: [
      'For each row, compare with a subquery that averages only that row\'s department.',
      'The inner query can use the outer alias: WHERE e2.department_id = e.department_id.',
    ],
    answer:
      'SELECT e.name, e.department_id, e.salary\nFROM employees e\nWHERE e.salary > (\n  SELECT AVG(e2.salary)\n  FROM employees e2\n  WHERE e2.department_id = e.department_id\n)\nORDER BY e.name;',
    why: 'A correlated subquery reads a column from the outer row, so it runs once per outer row. A window function (AVG(salary) OVER (PARTITION BY department_id)) can do the same in one pass.',
    concepts: ['correlated-subquery', 'aggregates'],
  },
  {
    id: 'sql-scalar-subquery',
    title: 'Pricier than average',
    topic: 'subqueries',
    difficulty: 'Easy',
    statement: ['Return the `name` and `price` of products priced above the average price of all products, most expensive first.'],
    tables: [PRODUCTS],
    cases: [
      { name: 'the example' },
      { name: 'all the same price', rows: { products: [[1, 'a', 'X', 5], [2, 'b', 'X', 5]] } },
      { name: 'one very expensive product', rows: { products: [[1, 'a', 'X', 1], [2, 'b', 'X', 2], [3, 'c', 'X', 300]] } },
    ],
    ordered: true,
    hints: ['WHERE price > AVG(price) is not allowed: aggregates can\'t go in WHERE.', 'Compute the average in a subquery: (SELECT AVG(price) FROM products).'],
    answer: 'SELECT name, price\nFROM products\nWHERE price > (SELECT AVG(price) FROM products)\nORDER BY price DESC;',
    why: 'The subquery runs once and gives one number, which every row is compared with.',
    concepts: ['scalar-subquery', 'aggregates'],
  },
  {
    id: 'sql-max-per-group',
    title: 'Highest paid in each department',
    topic: 'subqueries',
    difficulty: 'Medium',
    statement: [
      'For each department, return its name as `department`, and the `employee` and `salary` of its highest paid person. If two tie, return both. Order by department, then employee.',
    ],
    tables: [EMPLOYEES, DEPARTMENTS],
    cases: [
      { name: 'the example' },
      {
        name: 'a tie for the top',
        rows: { employees: [[1, 'Zed', 900, 1, null], [2, 'Amy', 900, 1, null], [3, 'Kit', 100, 1, null]] },
      },
      { name: 'a department with no one is left out', rows: { employees: [[1, 'A', 1, 4, null]] } },
    ],
    ordered: true,
    hints: [
      'Find each department\'s top salary: SELECT department_id, MAX(salary) ... GROUP BY department_id.',
      'Then keep the employees whose (department_id, salary) is in that list: join to it, or use a correlated subquery.',
      'Window version: RANK() OVER (PARTITION BY department_id ORDER BY salary DESC) = 1.',
    ],
    answer:
      'SELECT d.name AS department, e.name AS employee, e.salary\nFROM employees e\nJOIN departments d ON d.id = e.department_id\nWHERE e.salary = (\n  SELECT MAX(salary) FROM employees x WHERE x.department_id = e.department_id\n)\nORDER BY department, employee;',
    why: 'You can\'t SELECT name next to MAX(salary) and get the right name: the name isn\'t grouped. Find the max first, then go back for the rows that have it, which keeps ties.',
    concepts: ['correlated-subquery', 'inner-join', 'rank'],
  },

  // ---------- CTEs ----------
  {
    id: 'sql-cte',
    title: 'Months above the average month',
    topic: 'ctes',
    difficulty: 'Medium',
    statement: [
      'Total the order amounts per month (`month` like `2024-01`) as `revenue`, then return only the months whose revenue is above the average month\'s revenue. Order by month.',
    ],
    tables: [ORDERS],
    cases: [
      { name: 'the example' },
      { name: 'every month the same', rows: { orders: [[1, 1, '2024-01-03', 10], [2, 1, '2024-02-03', 10]] } },
      { name: 'one month only', rows: { orders: [[1, 1, '2024-05-01', 10], [2, 2, '2024-05-20', 30]] } },
    ],
    ordered: true,
    hints: [
      "Step 1 in a CTE: WITH monthly AS (SELECT strftime('%Y-%m', order_date) AS month, SUM(amount) AS revenue FROM orders GROUP BY month)",
      'Step 2 reads monthly like a table, and can compare with (SELECT AVG(revenue) FROM monthly).',
    ],
    answer:
      "WITH monthly AS (\n  SELECT strftime('%Y-%m', order_date) AS month, SUM(amount) AS revenue\n  FROM orders\n  GROUP BY month\n)\nSELECT month, revenue\nFROM monthly\nWHERE revenue > (SELECT AVG(revenue) FROM monthly)\nORDER BY month;",
    why: 'A CTE names a step so the next step can use it, even twice, like here. It reads top to bottom, which is why interviewers like it more than nested subqueries.',
    concepts: ['cte', 'dates', 'scalar-subquery'],
  },
  {
    id: 'sql-recursive-org',
    title: 'Levels of the org chart',
    topic: 'ctes',
    difficulty: 'Hard',
    statement: [
      'The person with no manager is level 1, their reports are level 2, and so on. Return every employee\'s `name` and `level`, ordered by level, then name.',
    ],
    tables: [EMPLOYEES],
    cases: [
      { name: 'the example' },
      { name: 'a long chain', rows: { employees: [[1, 'A', 1, 1, null], [2, 'B', 1, 1, 1], [3, 'C', 1, 1, 2], [4, 'D', 1, 1, 3]] } },
      { name: 'two separate bosses', rows: { employees: [[1, 'A', 1, 1, null], [2, 'B', 1, 1, null], [3, 'C', 1, 1, 2]] } },
    ],
    ordered: true,
    hints: [
      'A recursive CTE has two parts joined by UNION ALL: a starting query, and a query that reads the CTE itself.',
      'Start: SELECT id, name, 1 AS level FROM employees WHERE manager_id IS NULL',
      'Repeat: SELECT e.id, e.name, c.level + 1 FROM employees e JOIN chain c ON e.manager_id = c.id',
    ],
    answer:
      'WITH RECURSIVE chain AS (\n  SELECT id, name, 1 AS level\n  FROM employees\n  WHERE manager_id IS NULL\n  UNION ALL\n  SELECT e.id, e.name, c.level + 1\n  FROM employees e\n  JOIN chain c ON e.manager_id = c.id\n)\nSELECT name, level\nFROM chain\nORDER BY level, name;',
    why: 'The first part gives the top. Each round, the second part finds the people reporting to the rows found last round, one level down. It stops when a round finds nobody.',
    concepts: ['recursive-cte', 'self-join'],
  },
  {
    id: 'sql-recursive-dates',
    title: 'Fill in the missing days',
    topic: 'ctes',
    difficulty: 'Hard',
    statement: [
      'The visits table skips days with no visits. Return every day from the first to the last day in the table as `day`, with its `visits` (0 for missing days). Order by day.',
    ],
    tables: [
      t('visits', 'day TEXT PRIMARY KEY, visits INTEGER', [
        ['2024-03-01', 5],
        ['2024-03-02', 3],
        ['2024-03-05', 8],
      ]),
    ],
    cases: [
      { name: 'the example' },
      { name: 'no gaps', rows: { visits: [['2024-01-01', 1], ['2024-01-02', 2]] } },
      { name: 'across a month end', rows: { visits: [['2024-02-28', 1], ['2024-03-01', 4]] } },
    ],
    ordered: true,
    hints: [
      "Build the calendar with a recursive CTE: start at MIN(day), and add date(day, '+1 day') until MAX(day).",
      'Then LEFT JOIN visits to the calendar and COALESCE the missing counts to 0.',
    ],
    answer:
      "WITH RECURSIVE days AS (\n  SELECT MIN(day) AS day FROM visits\n  UNION ALL\n  SELECT date(day, '+1 day') FROM days\n  WHERE day < (SELECT MAX(day) FROM visits)\n)\nSELECT d.day, COALESCE(v.visits, 0) AS visits\nFROM days d\nLEFT JOIN visits v ON v.day = d.day\nORDER BY d.day;",
    why: 'You can\'t join to rows that don\'t exist, so first make them: the recursive CTE generates one row per day. Postgres has generate_series for this; in MySQL it is the same recursive CTE with DATE_ADD.',
    concepts: ['recursive-cte', 'left-join', 'dates', 'coalesce'],
  },

  // ---------- Window functions ----------
  {
    id: 'sql-row-number',
    title: 'Top 2 earners per department',
    topic: 'windows',
    difficulty: 'Medium',
    statement: [
      'Return the 2 highest paid people in each department: `department_id`, `name`, `salary`. Break salary ties by name. Order by department_id, then salary from highest, then name.',
    ],
    tables: [EMPLOYEES],
    cases: [
      { name: 'the example' },
      { name: 'a tie for second place goes by name', rows: { employees: [[1, 'A', 9, 1, null], [2, 'Zed', 5, 1, null], [3, 'Bea', 5, 1, null]] } },
      { name: 'a department with one person', rows: { employees: [[1, 'Solo', 3, 7, null]] } },
    ],
    ordered: true,
    hints: [
      'ROW_NUMBER() OVER (PARTITION BY department_id ORDER BY salary DESC, name) numbers the rows 1, 2, 3... within each department.',
      'You can\'t use a window function in WHERE. Compute it in a CTE or subquery, then filter rn <= 2 outside.',
    ],
    answer:
      'WITH ranked AS (\n  SELECT department_id, name, salary,\n         ROW_NUMBER() OVER (PARTITION BY department_id ORDER BY salary DESC, name) AS rn\n  FROM employees\n)\nSELECT department_id, name, salary\nFROM ranked\nWHERE rn <= 2\nORDER BY department_id, salary DESC, name;',
    why: 'This is "top N per group", maybe the most asked SQL question. PARTITION BY restarts the numbering for each department. Window functions run in SELECT, after WHERE, so the filter has to go one level out.',
    concepts: ['row-number', 'window-functions', 'cte'],
  },
  {
    id: 'sql-rank',
    title: 'ROW_NUMBER, RANK and DENSE_RANK',
    topic: 'windows',
    difficulty: 'Medium',
    statement: [
      'For each score, from highest, return `score`, `row_num` (ROW_NUMBER, ties broken by id), `rnk` (RANK) and `dense_rnk` (DENSE_RANK). Order by score from highest, then id.',
    ],
    tables: [
      t('scores', 'id INTEGER PRIMARY KEY, score INTEGER', [
        [1, 90],
        [2, 85],
        [3, 90],
        [4, 70],
        [5, 85],
      ]),
    ],
    cases: [
      { name: 'the example' },
      { name: 'no ties', rows: { scores: [[1, 3], [2, 2], [3, 1]] } },
      { name: 'everyone tied', rows: { scores: [[1, 5], [2, 5], [3, 5]] } },
    ],
    ordered: true,
    hints: [
      'All three take OVER (ORDER BY score DESC). ROW_NUMBER also needs id to break ties.',
      'Ties: ROW_NUMBER gives 1, 2; RANK gives 1, 1 then jumps to 3; DENSE_RANK gives 1, 1 then 2.',
    ],
    answer:
      'SELECT score,\n       ROW_NUMBER() OVER (ORDER BY score DESC, id) AS row_num,\n       RANK() OVER (ORDER BY score DESC) AS rnk,\n       DENSE_RANK() OVER (ORDER BY score DESC) AS dense_rnk\nFROM scores\nORDER BY score DESC, id;',
    why: 'ROW_NUMBER is always unique. RANK gives ties the same number and leaves a gap after (like sports places). DENSE_RANK gives ties the same number with no gap: use it for "Nth highest distinct value".',
    concepts: ['rank', 'row-number', 'window-functions'],
  },
  {
    id: 'sql-lag',
    title: 'Warmer than the day before',
    topic: 'windows',
    difficulty: 'Medium',
    statement: [
      'Return each `day` that was warmer than the day before it. Only compare with the real day before: if yesterday is missing from the table, skip it. Order by day.',
    ],
    tables: [
      t('weather', 'day TEXT PRIMARY KEY, temp INTEGER', [
        ['2024-05-01', 10],
        ['2024-05-02', 12],
        ['2024-05-03', 11],
        ['2024-05-05', 15],
        ['2024-05-06', 16],
      ]),
    ],
    cases: [
      { name: 'the example' },
      { name: 'a missing day breaks the chain', rows: { weather: [['2024-01-01', 1], ['2024-01-03', 9]] } },
      { name: 'same temperature is not warmer', rows: { weather: [['2024-01-01', 5], ['2024-01-02', 5]] } },
    ],
    ordered: true,
    hints: [
      'LAG(temp) OVER (ORDER BY day) gives the previous row\'s temperature. LAG(day) gives its date.',
      "Check the previous row really is yesterday: prev_day = date(day, '-1 day').",
      'A self join works too: JOIN weather y ON y.day = date(w.day, \'-1 day\').',
    ],
    answer:
      "WITH w AS (\n  SELECT day, temp,\n         LAG(day) OVER (ORDER BY day) AS prev_day,\n         LAG(temp) OVER (ORDER BY day) AS prev_temp\n  FROM weather\n)\nSELECT day\nFROM w\nWHERE prev_day = date(day, '-1 day') AND temp > prev_temp\nORDER BY day;",
    why: 'LAG reads a value from an earlier row in the window\'s order (LEAD reads a later one). The previous row isn\'t always the previous day, which is the trap here. In MySQL the date check is DATEDIFF(day, prev_day) = 1.',
    concepts: ['lag-lead', 'dates', 'window-functions'],
  },
  {
    id: 'sql-lead',
    title: 'Days until the next order',
    topic: 'windows',
    difficulty: 'Medium',
    statement: [
      'For every order, return `customer_id`, `order_date` and `days_to_next`: how many days until that customer\'s next order (NULL for their last one). Order by customer_id, then order_date.',
    ],
    tables: [ORDERS],
    cases: [
      { name: 'the example' },
      { name: 'a customer with one order', rows: { orders: [[1, 3, '2024-01-01', 1]] } },
      { name: 'two orders on the same day', rows: { orders: [[1, 3, '2024-01-01', 1], [2, 3, '2024-01-01', 2], [3, 3, '2024-01-04', 2]] } },
    ],
    ordered: true,
    hints: [
      'LEAD(order_date) OVER (PARTITION BY customer_id ORDER BY order_date) is the next order\'s date for the same customer.',
      'julianday(a) - julianday(b) is the number of days between two dates. Wrap it in CAST(... AS INTEGER).',
    ],
    answer:
      'SELECT customer_id, order_date,\n       CAST(julianday(LEAD(order_date) OVER (PARTITION BY customer_id ORDER BY order_date)) - julianday(order_date) AS INTEGER) AS days_to_next\nFROM orders\nORDER BY customer_id, order_date;',
    why: 'PARTITION BY keeps each customer separate, so LEAD never reads another customer\'s order. In MySQL you would write DATEDIFF(next, order_date); in Postgres, next - order_date.',
    concepts: ['lag-lead', 'dates', 'window-functions'],
  },
  {
    id: 'sql-running-total',
    title: 'Running total',
    topic: 'windows',
    difficulty: 'Easy',
    statement: ['Return each `day`, its `amount`, and `running_total`: the sum of all amounts up to and including that day. Order by day.'],
    tables: [
      t('daily_sales', 'day TEXT PRIMARY KEY, amount INTEGER', [
        ['2024-04-01', 50],
        ['2024-04-02', 20],
        ['2024-04-03', 0],
        ['2024-04-04', 35],
      ]),
    ],
    cases: [
      { name: 'the example' },
      { name: 'one day', rows: { daily_sales: [['2024-01-01', 7]] } },
      { name: 'negative amounts (refunds)', rows: { daily_sales: [['2024-01-01', 10], ['2024-01-02', -4], ['2024-01-03', 1]] } },
    ],
    ordered: true,
    hints: ['SUM(amount) OVER (ORDER BY day) adds up every row up to the current one.', 'Unlike GROUP BY, a window keeps every row.'],
    answer: 'SELECT day, amount,\n       SUM(amount) OVER (ORDER BY day) AS running_total\nFROM daily_sales\nORDER BY day;',
    why: 'With ORDER BY inside OVER, the window is "from the first row to this one" by default, so SUM gives a running total.',
    concepts: ['running-total', 'window-functions'],
  },
  {
    id: 'sql-moving-average',
    title: '3-day moving average',
    topic: 'windows',
    difficulty: 'Medium',
    statement: [
      'For each `day`, return `avg_3`: the average amount of that day and the two rows before it (fewer at the start), rounded to 2 decimals. Order by day.',
    ],
    tables: [
      t('daily_sales', 'day TEXT PRIMARY KEY, amount INTEGER', [
        ['2024-04-01', 10],
        ['2024-04-02', 20],
        ['2024-04-03', 60],
        ['2024-04-04', 10],
        ['2024-04-05', 5],
      ]),
    ],
    cases: [
      { name: 'the example' },
      { name: 'two days only', rows: { daily_sales: [['2024-01-01', 1], ['2024-01-02', 2]] } },
      { name: 'an average that needs rounding', rows: { daily_sales: [['2024-01-01', 1], ['2024-01-02', 1], ['2024-01-03', 2]] } },
    ],
    ordered: true,
    hints: [
      'A frame says which rows the window covers: ROWS BETWEEN 2 PRECEDING AND CURRENT ROW.',
      'AVG(amount) OVER (ORDER BY day ROWS BETWEEN 2 PRECEDING AND CURRENT ROW)',
    ],
    answer:
      'SELECT day,\n       ROUND(AVG(amount) OVER (ORDER BY day ROWS BETWEEN 2 PRECEDING AND CURRENT ROW), 2) AS avg_3\nFROM daily_sales\nORDER BY day;',
    why: 'The frame slides with each row. ROWS counts rows; RANGE would count by value, which treats tied days as one.',
    concepts: ['window-frames', 'window-functions', 'round'],
  },
  {
    id: 'sql-share',
    title: 'Share of total sales',
    topic: 'windows',
    difficulty: 'Medium',
    statement: [
      'Return each `category`, its `sales` (sum of amounts), and `pct`: its percentage of all sales, rounded to 1 decimal. Order by sales from highest.',
    ],
    tables: [
      t('sales', 'id INTEGER PRIMARY KEY, category TEXT, amount INTEGER', [
        [1, 'Books', 30],
        [2, 'Home', 50],
        [3, 'Books', 20],
        [4, 'Toys', 20],
      ]),
    ],
    cases: [
      { name: 'the example' },
      { name: 'one category is 100%', rows: { sales: [[1, 'Only', 3]] } },
      { name: 'thirds need rounding', rows: { sales: [[1, 'A', 1], [2, 'B', 1], [3, 'C', 1]] } },
    ],
    ordered: true,
    hints: [
      'SUM(SUM(amount)) OVER () is the grand total next to each group: the inner SUM is per category, the outer one adds the groups.',
      'Integer division drops the decimals: 1 / 3 is 0. Multiply by 100.0 first.',
    ],
    answer:
      'SELECT category,\n       SUM(amount) AS sales,\n       ROUND(100.0 * SUM(amount) / SUM(SUM(amount)) OVER (), 1) AS pct\nFROM sales\nGROUP BY category\nORDER BY sales DESC;',
    why: 'OVER () with nothing inside is a window over all rows, so it gives the grand total without collapsing anything. Window functions run after GROUP BY, which is why they can wrap an aggregate.',
    concepts: ['window-functions', 'aggregates', 'integer-division'],
  },

  // ---------- CASE, text and dates ----------
  {
    id: 'sql-case',
    title: 'Letter grades',
    topic: 'text',
    difficulty: 'Easy',
    statement: [
      'Return each student\'s `name` and `grade`: A for 90 and up, B for 80 and up, C for 70 and up, F below that, and `absent` when the score is NULL. Order by name.',
    ],
    tables: [
      t('students', 'id INTEGER PRIMARY KEY, name TEXT, score INTEGER', [
        [1, 'Ana', 95],
        [2, 'Bo', 80],
        [3, 'Cy', 61],
        [4, 'Di', null],
        [5, 'Ed', 79],
      ]),
    ],
    cases: [
      { name: 'the example' },
      { name: 'the exact boundaries', rows: { students: [[1, 'a', 90], [2, 'b', 70], [3, 'c', 89]] } },
      { name: 'everyone absent', rows: { students: [[1, 'a', null]] } },
    ],
    ordered: true,
    hints: ['CASE WHEN ... THEN ... WHEN ... THEN ... ELSE ... END checks its conditions top to bottom and stops at the first true one.', 'Put the NULL check first, or a NULL score falls through to ELSE.'],
    answer:
      "SELECT name,\n       CASE\n         WHEN score IS NULL THEN 'absent'\n         WHEN score >= 90 THEN 'A'\n         WHEN score >= 80 THEN 'B'\n         WHEN score >= 70 THEN 'C'\n         ELSE 'F'\n       END AS grade\nFROM students\nORDER BY name;",
    why: 'Order matters in CASE: the first true WHEN wins, so check the highest bar first. NULL >= 90 is unknown, not true, so a NULL score would land in ELSE.',
    concepts: ['case', 'null'],
  },
  {
    id: 'sql-strings',
    title: 'Tidy up names and emails',
    topic: 'text',
    difficulty: 'Easy',
    statement: [
      'Names were typed in any case. Return `id`, `full_name` (first name with only its first letter capitalized, a space, then the last name in capitals), and `domain` (the part of the email after @). Order by id.',
      'For example `aDA`, `lovelace`, `ada@math.org` becomes `Ada LOVELACE`, `math.org`.',
    ],
    tables: [
      t('users', 'id INTEGER PRIMARY KEY, first TEXT, last TEXT, email TEXT', [
        [1, 'aDA', 'lovelace', 'ada@math.org'],
        [2, 'alan', 'Turing', 'alan@bletchley.uk'],
        [3, 'GRACE', 'hopper', 'grace@navy.mil'],
      ]),
    ],
    cases: [
      { name: 'the example' },
      { name: 'a one-letter first name', rows: { users: [[1, 'j', 'doe', 'j@x.io']] } },
      { name: 'a subdomain', rows: { users: [[1, 'kim', 'lee', 'kim@mail.example.com']] } },
    ],
    ordered: true,
    hints: [
      'UPPER and LOWER change case. SUBSTR(text, start, length) cuts out a piece; positions start at 1.',
      '|| joins text in SQLite and Postgres (MySQL uses CONCAT).',
      "INSTR(email, '@') is the position of the @.",
    ],
    answer:
      "SELECT id,\n       UPPER(SUBSTR(first, 1, 1)) || LOWER(SUBSTR(first, 2)) || ' ' || UPPER(last) AS full_name,\n       SUBSTR(email, INSTR(email, '@') + 1) AS domain\nFROM users\nORDER BY id;",
    why: 'String functions build new text from pieces. SUBSTR without a length goes to the end. MySQL spells these CONCAT, SUBSTRING and LOCATE (or SUBSTRING_INDEX); Postgres uses POSITION.',
    concepts: ['strings'],
  },
  {
    id: 'sql-dates',
    title: 'Signups per month in 2024',
    topic: 'text',
    difficulty: 'Easy',
    statement: ['Return each `month` of 2024 (like `2024-01`) that had signups, and its number of `signups`. Order by month.'],
    tables: [
      t('signups', 'id INTEGER PRIMARY KEY, signed_up TEXT', [
        [1, '2024-01-03'],
        [2, '2024-01-28'],
        [3, '2023-12-31'],
        [4, '2024-03-09'],
        [5, '2024-03-10'],
        [6, '2024-03-31'],
      ]),
    ],
    cases: [
      { name: 'the example' },
      { name: 'nothing in 2024', rows: { signups: [[1, '2023-05-05'], [2, '2025-01-01']] } },
      { name: 'new year\'s eve and day', rows: { signups: [[1, '2023-12-31'], [2, '2024-01-01'], [3, '2024-12-31']] } },
    ],
    ordered: true,
    hints: [
      "strftime('%Y-%m', signed_up) gives '2024-01'. strftime('%Y', ...) gives just the year.",
      'Filter to 2024 in WHERE, then GROUP BY the month.',
    ],
    answer:
      "SELECT strftime('%Y-%m', signed_up) AS month, COUNT(*) AS signups\nFROM signups\nWHERE strftime('%Y', signed_up) = '2024'\nGROUP BY month\nORDER BY month;",
    why: 'SQLite stores dates as text and formats them with strftime. In MySQL this is DATE_FORMAT(d, \'%Y-%m\') and YEAR(d); in Postgres, TO_CHAR(d, \'YYYY-MM\') or DATE_TRUNC(\'month\', d).',
    concepts: ['dates', 'group-by'],
  },

  // ---------- Interview classics ----------
  {
    id: 'sql-delete-duplicates',
    title: 'Delete duplicate emails',
    topic: 'classics',
    difficulty: 'Medium',
    statement: [
      'Write a DELETE that removes duplicate emails from `person`, keeping only the row with the smallest id for each email. The table is checked after your statement runs.',
    ],
    tables: [
      t('person', 'id INTEGER PRIMARY KEY, email TEXT', [
        [1, 'a@x.com'],
        [2, 'b@x.com'],
        [3, 'a@x.com'],
        [4, 'b@x.com'],
        [5, 'c@x.com'],
      ]),
    ],
    cases: [
      { name: 'the example' },
      { name: 'no duplicates: nothing deleted', rows: { person: [[1, 'a@x.com'], [2, 'b@x.com']] } },
      { name: 'the smallest id is not first', rows: { person: [[7, 'q@x.com'], [3, 'q@x.com'], [9, 'q@x.com']] } },
    ],
    ordered: false,
    checkTable: 'person',
    starter: '-- Delete duplicate emails, keeping the smallest id.\nDELETE FROM person\nWHERE\n',
    hints: [
      'First, SELECT the ids to keep: SELECT MIN(id) FROM person GROUP BY email.',
      'Then delete every row whose id is NOT IN that list.',
      'Another way: DELETE FROM person WHERE EXISTS (SELECT 1 FROM person p2 WHERE p2.email = person.email AND p2.id < person.id).',
    ],
    answer: 'DELETE FROM person\nWHERE id NOT IN (\n  SELECT MIN(id) FROM person GROUP BY email\n);',
    why: 'Find what to keep, then delete the rest. Always try the SELECT version first in real life: a DELETE can\'t be undone. (MySQL won\'t let a DELETE read its own table in a subquery directly; wrap it in another SELECT there.)',
    concepts: ['delete', 'group-by', 'aggregates'],
  },
  {
    id: 'sql-consecutive',
    title: 'Three in a row',
    topic: 'classics',
    difficulty: 'Hard',
    statement: [
      'The logs table has ids in order. Return every `num` that appears at least three times in a row (consecutive ids), once each. Any order.',
    ],
    tables: [
      t('logs', 'id INTEGER PRIMARY KEY, num INTEGER', [
        [1, 1],
        [2, 1],
        [3, 1],
        [4, 2],
        [5, 1],
        [6, 2],
        [7, 2],
      ]),
    ],
    cases: [
      { name: 'the example' },
      { name: 'three times but not in a row', rows: { logs: [[1, 5], [2, 6], [3, 5], [4, 5]] } },
      { name: 'a run of five is listed once', rows: { logs: [[1, 9], [2, 9], [3, 9], [4, 9], [5, 9]] } },
    ],
    ordered: false,
    hints: [
      'Look at each row together with the next two: LEAD(num, 1) and LEAD(num, 2) OVER (ORDER BY id).',
      'Keep rows where all three are equal, then SELECT DISTINCT num.',
      'A triple self join on l2.id = l1.id + 1 and l3.id = l1.id + 2 works too.',
    ],
    answer:
      'WITH w AS (\n  SELECT num,\n         LEAD(num, 1) OVER (ORDER BY id) AS next1,\n         LEAD(num, 2) OVER (ORDER BY id) AS next2\n  FROM logs\n)\nSELECT DISTINCT num\nFROM w\nWHERE num = next1 AND num = next2;',
    why: 'LEAD lines each row up with the rows after it, so "three in a row" becomes a check across one row. DISTINCT stops a long run from listing the number many times.',
    concepts: ['lag-lead', 'distinct', 'window-functions'],
  },
  {
    id: 'sql-islands',
    title: 'Login streaks (gaps and islands)',
    topic: 'classics',
    difficulty: 'Hard',
    statement: [
      'Each row is a day a user logged in (at most once per day). Return every streak of consecutive days: `user_id`, `streak_start`, `streak_end` and `days`. Order by user_id, then streak_start.',
    ],
    tables: [
      t('logins', 'user_id INTEGER, day TEXT', [
        [1, '2024-06-01'],
        [1, '2024-06-02'],
        [1, '2024-06-03'],
        [1, '2024-06-05'],
        [2, '2024-06-02'],
        [2, '2024-06-04'],
        [2, '2024-06-05'],
      ]),
    ],
    cases: [
      { name: 'the example' },
      { name: 'one long streak across a month end', rows: { logins: [[1, '2024-01-30'], [1, '2024-01-31'], [1, '2024-02-01']] } },
      { name: 'no two days in a row', rows: { logins: [[3, '2024-01-01'], [3, '2024-01-03'], [3, '2024-01-05']] } },
    ],
    ordered: true,
    hints: [
      'Number each user\'s days 1, 2, 3... with ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY day).',
      'Subtract that number of days from the date. Within a streak, the result stays the same; it jumps at a gap. That value names the island.',
      "date(day, '-' || rn || ' days') does the subtraction. Then GROUP BY user_id and that value.",
    ],
    answer:
      "WITH numbered AS (\n  SELECT user_id, day,\n         date(day, '-' || ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY day) || ' days') AS island\n  FROM logins\n)\nSELECT user_id, MIN(day) AS streak_start, MAX(day) AS streak_end, COUNT(*) AS days\nFROM numbered\nGROUP BY user_id, island\nORDER BY user_id, streak_start;",
    why: 'Dates go up by 1 inside a streak, and so does the row number, so date minus row number stays fixed until a gap. Grouping by that fixed value collects each streak. This trick solves most "consecutive" questions.',
    concepts: ['row-number', 'dates', 'group-by'],
  },
  {
    id: 'sql-bought-everything',
    title: 'Customers who bought every product',
    topic: 'classics',
    difficulty: 'Hard',
    statement: ['Return the `customer_id` of every customer who bought every product in the products table at least once. Order by customer_id.'],
    tables: [
      t('products', 'id INTEGER PRIMARY KEY, name TEXT', [
        [1, 'Mug'],
        [2, 'Lamp'],
        [3, 'Pen'],
      ]),
      t('purchases', 'customer_id INTEGER, product_id INTEGER', [
        [1, 1],
        [1, 2],
        [1, 3],
        [2, 1],
        [2, 1],
        [2, 2],
        [3, 3],
        [3, 2],
        [3, 1],
      ]),
    ],
    cases: [
      { name: 'the example' },
      { name: 'buying one product three times is not three products', rows: { purchases: [[1, 1], [1, 1], [1, 1]] } },
      { name: 'nobody bought everything', rows: { purchases: [[1, 1], [2, 2]] } },
    ],
    ordered: true,
    hints: [
      'Count how many different products each customer bought: COUNT(DISTINCT product_id).',
      'Compare with the number of products: HAVING COUNT(DISTINCT product_id) = (SELECT COUNT(*) FROM products).',
    ],
    answer:
      'SELECT customer_id\nFROM purchases\nGROUP BY customer_id\nHAVING COUNT(DISTINCT product_id) = (SELECT COUNT(*) FROM products)\nORDER BY customer_id;',
    why: 'This is "relational division": for all products, did the customer buy it? Counting distinct products and comparing with the total turns it into one GROUP BY.',
    concepts: ['having', 'count', 'scalar-subquery'],
  },
  {
    id: 'sql-union',
    title: 'One mailing list (UNION)',
    topic: 'classics',
    difficulty: 'Easy',
    statement: [
      'Combine the emails of `customers` and `subscribers` into one list of `email`, each address once, in alphabetical order.',
    ],
    tables: [
      t('customers', 'id INTEGER PRIMARY KEY, email TEXT', [
        [1, 'ana@x.com'],
        [2, 'bo@x.com'],
      ]),
      t('subscribers', 'id INTEGER PRIMARY KEY, email TEXT', [
        [1, 'bo@x.com'],
        [2, 'cy@x.com'],
        [3, 'cy@x.com'],
      ]),
    ],
    cases: [
      { name: 'the example' },
      { name: 'no subscribers', rows: { subscribers: [] } },
      { name: 'the same people in both', rows: { customers: [[1, 'a@x.com']], subscribers: [[1, 'a@x.com']] } },
    ],
    ordered: true,
    hints: ['UNION stacks two results with the same columns and removes duplicates. UNION ALL keeps them.', 'One ORDER BY at the very end sorts the whole stack.'],
    answer: 'SELECT email FROM customers\nUNION\nSELECT email FROM subscribers\nORDER BY email;',
    why: 'UNION removes duplicates across and within both lists (so cy@x.com shows once). UNION ALL is faster when you know there are none or want to keep them.',
    concepts: ['union'],
  },

  // ---------- From objects to tables (the port) ----------
  {
    id: 'sql-port-rows',
    title: 'Port: objects become rows',
    topic: 'objects',
    difficulty: 'Easy',
    statement: [
      'The port from the Objects section, saved in a database instead of in memory. Each object becomes a row and each of its fields a column: a Container\'s code and weight are columns of `containers`, and its code is the primary key (the value that tells rows apart, like a dict key).',
      'In the classes, the yard held containers in a dict. A table can\'t hold another table, so "where is this container?" becomes a column instead: `ship_id` holds the id of the ship it\'s on, or NULL when it\'s in the yard. A column that points at another table\'s key is a foreign key.',
      'Return the `code` and `weight` of every container in the yard, heaviest first (by code when weights tie).',
    ],
    tables: [SHIPS, CONTAINERS],
    cases: [
      { name: 'the example' },
      { name: 'an empty yard', rows: { containers: [['C1', 10, 1], ['C2', 5, 2]] } },
      { name: 'equal weights go by code', rows: { containers: [['C9', 5, null], ['C2', 5, null], ['C7', 8, null], ['C1', 3, 1]] } },
    ],
    ordered: true,
    hints: [
      'In the yard means ship_id has no value: NULL.',
      'NULL never equals anything, not even NULL, so `ship_id = NULL` matches nothing. Write `ship_id IS NULL`.',
      'ORDER BY weight DESC, code.',
    ],
    answer: 'SELECT code, weight\nFROM containers\nWHERE ship_id IS NULL\nORDER BY weight DESC, code;',
    why: 'In Python this was sorted(port.yard.containers.values(), ...). In the database the yard isn\'t a thing of its own; it\'s the rows with no ship. Objects are quick and simple while the program runs, but disappear when it stops; rows survive a restart and can answer questions nobody planned for.',
    concepts: ['keys', 'is-null', 'order-by', 'objects-to-tables'],
  },
  {
    id: 'sql-port-manifest',
    title: 'Port: a list becomes a table',
    topic: 'objects',
    difficulty: 'Easy',
    statement: [
      'In Python each Ship had `self.manifest = [...]`, a list of container codes. A row can\'t hold a list, so the list moves into a table of its own: `manifest` has one row per code, with a `ship_id` pointing back at the ship it belongs to. That is how "a ship has many codes" (a one-to-many relationship) is stored.',
      'For every ship, return its `name` and `manifest_size`, the number of codes on its manifest, ordered by name. Ships with an empty manifest show 0.',
    ],
    tables: [SHIPS, MANIFEST],
    cases: [
      { name: 'the example' },
      { name: 'no manifests at all', rows: { manifest: [] } },
      { name: 'one ship, many codes', rows: { ships: [[7, 'Delta', 'load']], manifest: [[7, 'A'], [7, 'B'], [7, 'C']] } },
    ],
    ordered: true,
    hints: [
      'Join ships to manifest on manifest.ship_id = ships.id.',
      'A plain JOIN drops ships with no manifest rows. LEFT JOIN keeps every ship.',
      'COUNT(m.code) counts only the matched rows, so a ship with none gets 0. COUNT(*) would give it 1.',
    ],
    answer:
      'SELECT s.name, COUNT(m.code) AS manifest_size\nFROM ships s\nLEFT JOIN manifest m ON m.ship_id = s.id\nGROUP BY s.id, s.name\nORDER BY s.name;',
    why: 'In Python: [(ship.name, len(ship.manifest)) for ship in ships]. In SQL, the list lives in its own table and the join puts it back together. The shared-manifest bug can\'t happen here: every manifest row says which ship it belongs to.',
    concepts: ['keys', 'left-join', 'count', 'group-by', 'objects-to-tables'],
  },
  {
    id: 'sql-port-remaining',
    title: 'Port: remaining() as a query',
    topic: 'objects',
    difficulty: 'Medium',
    statement: [
      'The same question two ways. In Python, `ship.remaining()` listed the manifest codes still waiting: for an unloading ship the ones still on board, for a loading ship the ones not on board yet.',
      'Write it as one query for every ship at once: return `name` (the ship) and `code` for each manifest code still waiting, ordered by name, then code. Every code on a manifest has a row in `containers`.',
    ],
    tables: [SHIPS, CONTAINERS, MANIFEST],
    cases: [
      { name: 'the example' },
      {
        name: 'everything already moved',
        rows: { containers: [['C1', 10, null], ['C2', 12, null], ['C4', 15, 2], ['C5', 9, 2], ['C6', 11, 2]] },
      },
      {
        name: "a loading ship whose container is on another ship still waits for it",
        rows: { ships: [[1, 'Atlas', 'unload'], [2, 'Borealis', 'load']], containers: [['C1', 10, 1]], manifest: [[1, 'C1'], [2, 'C1']] },
      },
    ],
    ordered: true,
    hints: [
      'Start from manifest, and join ships (for the name and mode) and containers (for where each code is now).',
      "Unloading ships wait for codes still on board: `s.mode = 'unload' AND c.ship_id = s.id`.",
      "Loading ships wait for codes not on board yet: `s.mode = 'load' AND c.ship_id IS NOT s.id` (IS NOT treats NULL as a value, so a container in the yard counts).",
    ],
    answer:
      "SELECT s.name, m.code\nFROM manifest m\nJOIN ships s ON s.id = m.ship_id\nJOIN containers c ON c.code = m.code\nWHERE (s.mode = 'unload' AND c.ship_id = s.id)\n   OR (s.mode = 'load' AND c.ship_id IS NOT s.id)\nORDER BY s.name, m.code;",
    why: 'The method answered for one ship by looping over its manifest; the query answers for every ship in one go, and the database can use indexes to do it fast on millions of rows. In real programs both live together: classes for the rules, a database to keep the data. A library that turns rows into objects and back is called an ORM.',
    concepts: ['inner-join', 'keys', 'where', 'objects-to-tables'],
  },
]
