import type { SyntaxCard } from '../syntax/cards'
import { SQL_TOPICS } from './problems'

// The SQL glossary. Same card shape as the Python and JavaScript ones (src/syntax/cards.ts), with SQL's own
// topics (the problem topics), learning path and questions. Every example runs on the playground tables
// (employees, departments, customers, orders), so Insert gives a query you can run straight away.
// Where MySQL or Postgres spell something differently, the card says so: interviews rarely use SQLite.

export type SqlQuestion = 'filter' | 'combine' | 'summarize' | 'missing' | 'steps' | 'compare' | 'text-dates' | 'change' | 'sql-broke'

export const SQL_LEVELS: { id: 1 | 2 | 3 | 4; label: string }[] = [
  { id: 1, label: '1. First queries' },
  { id: 2, label: '2. Combining tables' },
  { id: 3, label: '3. Grouping and subqueries' },
  { id: 4, label: '4. Window functions and beyond' },
]

export const SQL_QUESTIONS: { id: SqlQuestion; label: string }[] = [
  { id: 'filter', label: 'Pick some rows' },
  { id: 'combine', label: 'Combine tables' },
  { id: 'summarize', label: 'Count or total things' },
  { id: 'missing', label: 'Handle missing values' },
  { id: 'compare', label: 'Rank or compare rows' },
  { id: 'steps', label: 'Break a query into steps' },
  { id: 'text-dates', label: 'Work with text and dates' },
  { id: 'change', label: 'Change the data' },
  { id: 'sql-broke', label: 'Something broke' },
]

export { SQL_TOPICS }

export const SQL_CARDS: SyntaxCard[] = [
  // ---------- 1. First queries ----------
  {
    id: 'select',
    title: 'SELECT and FROM',
    topic: 'basics',
    level: 1,
    questions: ['filter'],
    keywords: ['select', 'from', 'columns', 'query', 'star'],
    explanation: 'SELECT names the columns you want, FROM names the table. SELECT * means every column. A query always returns a new table.',
    code: 'SELECT name, salary\nFROM employees;\n',
  },
  {
    id: 'query-order',
    title: 'The order SQL runs a query',
    topic: 'basics',
    level: 1,
    questions: ['steps', 'sql-broke'],
    keywords: ['order', 'execution', 'logical', 'runs', 'why', 'alias', 'where'],
    explanation:
      'You write SELECT first, but SQL runs FROM/JOIN → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT. That is why WHERE can\'t use a SELECT alias but ORDER BY can. The stage buttons above the result step through this order.',
    code: 'SELECT department_id, COUNT(*) AS people  -- 5\nFROM employees                            -- 1\nWHERE salary > 5000                       -- 2\nGROUP BY department_id                    -- 3\nHAVING COUNT(*) > 1                       -- 4\nORDER BY people DESC                      -- 6\nLIMIT 2;                                  -- 7\n',
  },
  {
    id: 'where',
    title: 'WHERE: keep some rows',
    topic: 'basics',
    level: 1,
    questions: ['filter'],
    keywords: ['where', 'filter', 'condition', 'and', 'or', 'not', 'equals'],
    explanation:
      "WHERE keeps the rows where a condition is true. Combine conditions with AND, OR and NOT, and use brackets when mixing them. Text goes in 'single quotes'.",
    code: "SELECT name, salary\nFROM employees\nWHERE salary >= 7000 AND department_id = 1;\n",
  },
  {
    id: 'in-between-like',
    title: 'IN, BETWEEN and LIKE',
    topic: 'basics',
    level: 1,
    questions: ['filter', 'text-dates'],
    keywords: ['in', 'between', 'like', 'pattern', 'wildcard', 'percent', 'list', 'range'],
    explanation:
      "IN checks against a list, BETWEEN a range including both ends. LIKE matches a pattern: % is any run of characters, _ exactly one. (SQLite's LIKE ignores case; Postgres has ILIKE for that.)",
    code: "SELECT name, city\nFROM customers\nWHERE city IN ('Paris', 'Rome')\n  AND name LIKE 'A%';\n",
  },
  {
    id: 'order-by',
    title: 'ORDER BY',
    topic: 'basics',
    level: 1,
    questions: ['filter', 'compare'],
    keywords: ['order', 'sort', 'asc', 'desc', 'ascending', 'descending'],
    explanation:
      'ORDER BY sorts the result, ASC (the default) or DESC. Later keys break ties. Without ORDER BY, SQL promises no order at all, even if it looks sorted.',
    code: 'SELECT name, salary\nFROM employees\nORDER BY salary DESC, name;\n',
  },
  {
    id: 'limit',
    title: 'LIMIT and OFFSET',
    topic: 'basics',
    level: 1,
    questions: ['filter', 'compare'],
    keywords: ['limit', 'offset', 'top', 'first', 'skip', 'fetch'],
    explanation:
      'LIMIT n keeps the first n rows; OFFSET k skips k rows first. They run last, after ORDER BY. SQL Server writes TOP n; standard SQL writes FETCH FIRST n ROWS ONLY.',
    code: 'SELECT name, salary\nFROM employees\nORDER BY salary DESC\nLIMIT 2 OFFSET 1;  -- 2nd and 3rd highest\n',
  },
  {
    id: 'distinct',
    title: 'DISTINCT',
    topic: 'basics',
    level: 1,
    questions: ['filter', 'summarize'],
    keywords: ['distinct', 'unique', 'duplicates', 'dedupe', 'once'],
    explanation: 'SELECT DISTINCT removes duplicate result rows. It looks at all the selected columns together, not just the first one.',
    code: 'SELECT DISTINCT department_id\nFROM employees;\n',
  },
  {
    id: 'aliases',
    title: 'Aliases (AS)',
    topic: 'basics',
    level: 1,
    questions: ['combine', 'steps'],
    keywords: ['as', 'alias', 'rename', 'name', 'short'],
    explanation:
      'AS gives a column or table a new name. Table aliases (employees e) keep joins short and say which table a column comes from. Column aliases exist from SELECT on, so ORDER BY can use them but WHERE cannot.',
    code: 'SELECT e.name AS employee, e.salary * 12 AS yearly\nFROM employees AS e\nORDER BY yearly DESC;\n',
  },
  {
    id: 'null',
    title: 'NULL: unknown',
    topic: 'nulls',
    level: 1,
    questions: ['missing', 'sql-broke'],
    keywords: ['null', 'unknown', 'missing', 'empty', 'three', 'valued', 'logic'],
    explanation:
      'NULL means "unknown". Anything compared with NULL is unknown too (even NULL = NULL), and WHERE keeps only true rows, so NULLs quietly drop out. Arithmetic with NULL gives NULL.',
    code: "SELECT name, referred_by,\n       referred_by = 2 AS is_two,      -- NULL for NULL rows\n       referred_by <> 2 AS is_not_two  -- also NULL!\nFROM customers;\n",
  },
  {
    id: 'is-null',
    title: 'IS NULL and IS NOT NULL',
    topic: 'nulls',
    level: 1,
    questions: ['missing', 'filter'],
    keywords: ['is', 'null', 'not', 'missing', 'test', 'check'],
    explanation: 'IS NULL is the only way to test for NULL; = NULL is never true. IS NOT NULL is the opposite.',
    code: 'SELECT name\nFROM customers\nWHERE city IS NULL;\n',
  },
  {
    id: 'coalesce',
    title: 'COALESCE: a fallback for NULL',
    topic: 'nulls',
    level: 1,
    questions: ['missing'],
    keywords: ['coalesce', 'ifnull', 'isnull', 'nvl', 'default', 'fallback', 'null', 'zero'],
    explanation:
      'COALESCE(a, b, ...) returns the first value that is not NULL. MySQL also has IFNULL(a, b), SQL Server ISNULL, Oracle NVL. NULLIF(a, b) goes the other way: NULL when a = b.',
    code: "SELECT name, COALESCE(city, 'unknown') AS city\nFROM customers;\n",
  },
  {
    id: 'case',
    title: 'CASE WHEN',
    topic: 'text',
    level: 1,
    questions: ['filter', 'summarize'],
    keywords: ['case', 'when', 'then', 'else', 'end', 'if', 'condition', 'bucket'],
    explanation:
      "CASE is SQL's if/else: the first WHEN that is true wins, ELSE covers the rest (or gives NULL if left out). It works anywhere a value can go, even inside SUM.",
    code: "SELECT name,\n       CASE WHEN salary >= 8000 THEN 'high'\n            WHEN salary >= 6000 THEN 'mid'\n            ELSE 'low' END AS band\nFROM employees;\n",
  },
  {
    id: 'round',
    title: 'ROUND and CAST',
    topic: 'grouping',
    level: 1,
    questions: ['summarize'],
    keywords: ['round', 'cast', 'decimal', 'integer', 'real', 'convert', 'type'],
    explanation: 'ROUND(x, 2) rounds to 2 decimals. CAST(x AS INTEGER) or CAST(x AS REAL) changes the type.',
    code: 'SELECT name, ROUND(salary / 12.0, 2) AS monthly, CAST(salary / 1000 AS INTEGER) AS thousands\nFROM employees;\n',
  },
  {
    id: 'strings',
    title: 'Text functions',
    topic: 'text',
    level: 1,
    questions: ['text-dates'],
    keywords: ['string', 'text', 'upper', 'lower', 'substr', 'substring', 'length', 'trim', 'replace', 'concat', 'instr', 'concatenate'],
    explanation:
      "UPPER, LOWER, LENGTH, TRIM, REPLACE, SUBSTR(text, start, length) with positions from 1, and INSTR(text, 'x') to find a position. || joins text in SQLite and Postgres; MySQL uses CONCAT(a, b) (SQLite has it too).",
    code: "SELECT UPPER(name) AS shout,\n       LENGTH(name) AS letters,\n       SUBSTR(name, 1, 2) || '.' AS short\nFROM employees;\n",
  },
  {
    id: 'dates',
    title: 'Dates',
    topic: 'text',
    level: 1,
    questions: ['text-dates'],
    keywords: ['date', 'dates', 'strftime', 'month', 'year', 'day', 'julianday', 'datediff', 'interval', 'extract'],
    explanation:
      "SQLite keeps dates as text like '2024-01-31' (so they sort and compare correctly) and works on them with date(d, '+1 day'), strftime('%Y-%m', d) and julianday(a) - julianday(b) for days between. MySQL: DATE_ADD, DATE_FORMAT, DATEDIFF. Postgres: d + INTERVAL '1 day', TO_CHAR, EXTRACT, DATE_TRUNC.",
    code: "SELECT order_date,\n       strftime('%Y-%m', order_date) AS month,\n       date(order_date, '+7 days') AS week_later,\n       julianday('2024-12-31') - julianday(order_date) AS days_left\nFROM orders;\n",
  },
  {
    id: 'integer-division',
    title: 'Integer division',
    topic: 'grouping',
    level: 1,
    questions: ['sql-broke', 'summarize'],
    keywords: ['division', 'integer', 'divide', 'percentage', 'percent', 'zero', 'decimal', 'ratio'],
    explanation:
      'Whole number divided by whole number gives a whole number in SQLite, Postgres and SQL Server: 1 / 3 is 0. Multiply by 100.0 or CAST to REAL first. (MySQL\'s / gives decimals; DIV is its whole-number division.)',
    code: 'SELECT 1 / 3 AS whole, 1.0 / 3 AS decimal, 100.0 * 2 / 3 AS pct;\n',
  },

  // ---------- 2. Combining tables ----------
  {
    id: 'inner-join',
    title: 'INNER JOIN',
    topic: 'joins',
    level: 2,
    questions: ['combine'],
    keywords: ['join', 'inner', 'combine', 'match', 'on', 'tables', 'relate'],
    explanation:
      'JOIN (same as INNER JOIN) pairs each row of one table with the rows of another where ON is true. Rows with no partner disappear from both sides. The join picture draws a line for each pair.',
    code: 'SELECT e.name, d.name AS department\nFROM employees e\nJOIN departments d ON e.department_id = d.id;\n',
  },
  {
    id: 'left-join',
    title: 'LEFT JOIN',
    topic: 'joins',
    level: 2,
    questions: ['combine', 'missing'],
    keywords: ['left', 'outer', 'join', 'keep', 'all', 'unmatched', 'optional'],
    explanation:
      'LEFT JOIN keeps every row of the left (first) table. Where nothing on the right matches, the right side\'s columns are NULL. A condition on the right table in WHERE turns it back into an inner join; put it in ON instead.',
    code: 'SELECT d.name, e.name AS employee\nFROM departments d\nLEFT JOIN employees e ON e.department_id = d.id;\n',
  },
  {
    id: 'right-join',
    title: 'RIGHT JOIN',
    topic: 'joins',
    level: 2,
    questions: ['combine', 'missing'],
    keywords: ['right', 'outer', 'join', 'keep'],
    explanation: 'RIGHT JOIN keeps every row of the right table: a LEFT JOIN with the tables swapped. Most people swap the tables and write LEFT JOIN.',
    code: 'SELECT e.name AS employee, d.name AS department\nFROM employees e\nRIGHT JOIN departments d ON e.department_id = d.id;\n',
  },
  {
    id: 'full-join',
    title: 'FULL OUTER JOIN',
    topic: 'joins',
    level: 2,
    questions: ['combine', 'missing'],
    keywords: ['full', 'outer', 'join', 'both', 'reconcile', 'compare'],
    explanation:
      'FULL OUTER JOIN keeps unmatched rows from both sides, NULL-filled. Handy for comparing two lists. MySQL has none: UNION a LEFT JOIN with a RIGHT JOIN.',
    code: 'SELECT d.name AS department, e.name AS employee\nFROM departments d\nFULL OUTER JOIN employees e ON e.department_id = d.id;\n',
  },
  {
    id: 'self-join',
    title: 'Self join',
    topic: 'joins',
    level: 2,
    questions: ['combine', 'compare'],
    keywords: ['self', 'join', 'same', 'table', 'manager', 'hierarchy', 'pairs'],
    explanation: 'A table joined to itself under two aliases, like employees e and their managers m. Useful for hierarchies and for comparing rows of one table.',
    code: 'SELECT e.name AS employee, m.name AS manager\nFROM employees e\nLEFT JOIN employees m ON e.manager_id = m.id;\n',
  },
  {
    id: 'cross-join',
    title: 'CROSS JOIN',
    topic: 'joins',
    level: 2,
    questions: ['combine'],
    keywords: ['cross', 'join', 'cartesian', 'product', 'every', 'combination', 'pairs'],
    explanation: 'CROSS JOIN pairs every row with every row: 4 × 7 rows gives 28. FROM a, b with no condition does the same, which is why a forgotten ON makes a huge result.',
    code: 'SELECT d.name, e.name\nFROM departments d\nCROSS JOIN employees e;\n',
  },
  {
    id: 'anti-join',
    title: 'Anti-join: rows with no match',
    topic: 'joins',
    level: 2,
    questions: ['combine', 'missing'],
    keywords: ['anti', 'join', 'never', 'without', 'missing', 'not', 'exists', 'no', 'match'],
    explanation:
      '"Customers with no orders" is LEFT JOIN, then WHERE right.id IS NULL. NOT EXISTS (...) says the same thing more directly. Avoid NOT IN when the list could hold a NULL.',
    code: 'SELECT c.name\nFROM customers c\nLEFT JOIN orders o ON o.customer_id = c.id\nWHERE o.id IS NULL;\n',
  },
  {
    id: 'union',
    title: 'UNION and UNION ALL',
    topic: 'classics',
    level: 2,
    questions: ['combine'],
    keywords: ['union', 'all', 'stack', 'append', 'combine', 'intersect', 'except', 'minus'],
    explanation:
      'UNION stacks two results with the same number of columns and removes duplicates; UNION ALL keeps them (and is faster). INTERSECT keeps rows in both, EXCEPT (Oracle: MINUS) rows only in the first.',
    code: "SELECT name, 'employee' AS kind FROM employees\nUNION ALL\nSELECT name, 'customer' FROM customers;\n",
  },
  {
    id: 'keys',
    title: 'Primary and foreign keys',
    topic: 'joins',
    level: 2,
    questions: ['combine'],
    keywords: ['primary', 'foreign', 'key', 'keys', 'constraint', 'unique', 'references', 'schema', 'relationship'],
    explanation:
      'A primary key identifies each row (unique, not NULL). A foreign key is a column that holds another table\'s primary key, like employees.department_id → departments.id. Joins usually match a foreign key to a primary key.',
    code: 'CREATE TABLE teams (\n  id INTEGER PRIMARY KEY,\n  name TEXT NOT NULL UNIQUE,\n  lead_id INTEGER REFERENCES employees(id)\n);\nINSERT INTO teams VALUES (1, \'Core\', 1);\nSELECT * FROM teams;\n',
  },

  // ---------- 3. Grouping and subqueries ----------
  {
    id: 'aggregates',
    title: 'Aggregates: COUNT, SUM, AVG, MIN, MAX',
    topic: 'grouping',
    level: 3,
    questions: ['summarize'],
    keywords: ['aggregate', 'count', 'sum', 'avg', 'average', 'min', 'max', 'total', 'mean'],
    explanation:
      'Aggregates turn many rows into one value. Without GROUP BY the whole table is one group, so you get one row. All of them skip NULLs, except COUNT(*).',
    code: 'SELECT COUNT(*) AS people, SUM(salary) AS payroll,\n       AVG(salary) AS average, MIN(salary) AS lowest, MAX(salary) AS highest\nFROM employees;\n',
  },
  {
    id: 'count',
    title: 'COUNT(*) vs COUNT(col) vs COUNT(DISTINCT col)',
    topic: 'grouping',
    level: 3,
    questions: ['summarize', 'missing', 'sql-broke'],
    keywords: ['count', 'distinct', 'star', 'null', 'rows', 'how', 'many'],
    explanation:
      'COUNT(*) counts rows. COUNT(col) counts rows where col is not NULL, which is what you want after a LEFT JOIN. COUNT(DISTINCT col) counts different values.',
    code: 'SELECT COUNT(*) AS customers, COUNT(city) AS with_city, COUNT(DISTINCT city) AS cities\nFROM customers;\n',
  },
  {
    id: 'group-by',
    title: 'GROUP BY',
    topic: 'grouping',
    level: 3,
    questions: ['summarize'],
    keywords: ['group', 'by', 'per', 'each', 'groups', 'bucket', 'category'],
    explanation:
      'GROUP BY makes one group per distinct value, and each group becomes one row. Every other selected column must be an aggregate or in the GROUP BY. (SQLite and old MySQL let you break that rule and pick an arbitrary row; interviewers count it as a bug.)',
    code: 'SELECT department_id, COUNT(*) AS people, AVG(salary) AS avg_salary\nFROM employees\nGROUP BY department_id;\n',
  },
  {
    id: 'having',
    title: 'HAVING: filter groups',
    topic: 'grouping',
    level: 3,
    questions: ['summarize', 'filter'],
    keywords: ['having', 'filter', 'group', 'aggregate', 'where', 'difference'],
    explanation:
      'HAVING filters groups after GROUP BY, so it can use aggregates. WHERE filters rows before grouping and can\'t. A classic question: "what is the difference between WHERE and HAVING?"',
    code: 'SELECT department_id, COUNT(*) AS people\nFROM employees\nWHERE salary > 5000\nGROUP BY department_id\nHAVING COUNT(*) >= 3;\n',
  },
  {
    id: 'conditional-aggregation',
    title: 'Conditional aggregation (pivot)',
    topic: 'grouping',
    level: 3,
    questions: ['summarize'],
    keywords: ['pivot', 'conditional', 'case', 'sum', 'count', 'filter', 'columns', 'crosstab'],
    explanation:
      "Put CASE inside an aggregate to count or sum only some rows: SUM(CASE WHEN ... THEN 1 ELSE 0 END). It turns rows into columns (a pivot). Postgres also has COUNT(*) FILTER (WHERE ...).",
    code: "SELECT department_id,\n       SUM(CASE WHEN salary >= 7500 THEN 1 ELSE 0 END) AS high_paid,\n       SUM(CASE WHEN salary < 7500 THEN 1 ELSE 0 END) AS others\nFROM employees\nGROUP BY department_id;\n",
  },
  {
    id: 'scalar-subquery',
    title: 'Subqueries',
    topic: 'subqueries',
    level: 3,
    questions: ['steps', 'compare'],
    keywords: ['subquery', 'nested', 'inner', 'query', 'scalar', 'in', 'derived', 'table'],
    explanation:
      'A query inside a query. In WHERE or SELECT it must give one value (scalar) or, after IN, one column. In FROM it acts as a table and needs an alias. A scalar subquery with no rows gives NULL.',
    code: 'SELECT name, salary\nFROM employees\nWHERE salary > (SELECT AVG(salary) FROM employees);\n',
  },
  {
    id: 'correlated-subquery',
    title: 'Correlated subqueries',
    topic: 'subqueries',
    level: 3,
    questions: ['compare', 'steps'],
    keywords: ['correlated', 'subquery', 'outer', 'each', 'row', 'per'],
    explanation:
      'A subquery that uses a column of the outer query, so it runs once per outer row: "compare each employee with their own department\'s average". Often a window function or a join does it faster.',
    code: 'SELECT e.name, e.salary\nFROM employees e\nWHERE e.salary > (\n  SELECT AVG(x.salary) FROM employees x WHERE x.department_id = e.department_id\n);\n',
  },
  {
    id: 'exists',
    title: 'EXISTS and NOT EXISTS',
    topic: 'subqueries',
    level: 3,
    questions: ['filter', 'missing'],
    keywords: ['exists', 'not', 'semi', 'join', 'any', 'in', 'null'],
    explanation:
      'EXISTS (subquery) is true when the subquery finds at least one row. NOT EXISTS is the safe way to say "no match": NOT IN returns nothing at all if its list holds a NULL.',
    code: 'SELECT d.name\nFROM departments d\nWHERE NOT EXISTS (\n  SELECT 1 FROM employees e WHERE e.department_id = d.id\n);\n',
  },
  {
    id: 'cte',
    title: 'CTEs: WITH',
    topic: 'ctes',
    level: 3,
    questions: ['steps'],
    keywords: ['with', 'cte', 'common', 'table', 'expression', 'step', 'temporary', 'named'],
    explanation:
      'WITH name AS (query) gives a step a name, and the main query reads it like a table. Several steps are separated by commas, and later ones can read earlier ones. Easier to read than nested subqueries.',
    code: 'WITH dept_pay AS (\n  SELECT department_id, AVG(salary) AS avg_salary\n  FROM employees\n  GROUP BY department_id\n)\nSELECT d.name, p.avg_salary\nFROM dept_pay p\nJOIN departments d ON d.id = p.department_id;\n',
  },
  {
    id: 'delete',
    title: 'DELETE',
    topic: 'classics',
    level: 3,
    questions: ['change'],
    keywords: ['delete', 'remove', 'rows', 'truncate', 'duplicates'],
    explanation:
      'DELETE FROM t WHERE ... removes the rows the WHERE matches; without WHERE it removes every row. Run it as a SELECT first to see what would go.',
    code: 'DELETE FROM employees WHERE salary < 6000;\nSELECT * FROM employees;\n',
  },
  {
    id: 'insert-update',
    title: 'INSERT and UPDATE',
    topic: 'classics',
    level: 3,
    questions: ['change'],
    keywords: ['insert', 'update', 'set', 'values', 'add', 'change', 'modify', 'upsert'],
    explanation: 'INSERT INTO t (cols) VALUES (...) adds rows. UPDATE t SET col = value WHERE ... changes them; forgetting the WHERE changes every row.',
    code: "INSERT INTO departments (id, name) VALUES (5, 'Design');\nUPDATE employees SET salary = salary + 500 WHERE department_id = 3;\nSELECT * FROM employees;\n",
  },
  {
    id: 'indexes',
    title: 'Indexes',
    topic: 'classics',
    level: 3,
    questions: ['steps'],
    keywords: ['index', 'indexes', 'performance', 'fast', 'slow', 'scan', 'b', 'tree', 'explain'],
    explanation:
      'An index is a sorted copy of some columns that lets the database find rows without reading the whole table, like a book\'s index. It speeds up WHERE, JOIN and ORDER BY on those columns, and slows down writes a little. EXPLAIN QUERY PLAN shows whether one is used.',
    code: 'CREATE INDEX idx_emp_dept ON employees(department_id);\nEXPLAIN QUERY PLAN\nSELECT * FROM employees WHERE department_id = 2;\n',
  },

  // ---------- 4. Window functions and beyond ----------
  {
    id: 'window-functions',
    title: 'Window functions: OVER',
    topic: 'windows',
    level: 4,
    questions: ['compare', 'summarize'],
    keywords: ['window', 'over', 'partition', 'analytic', 'function', 'without', 'grouping'],
    explanation:
      'A window function looks at a set of rows related to the current one without merging them: every row stays. PARTITION BY splits the rows into groups, ORDER BY sets the order inside each. They run in SELECT, so filter on them one level out (a CTE).',
    code: 'SELECT name, department_id, salary,\n       AVG(salary) OVER (PARTITION BY department_id) AS dept_avg\nFROM employees;\n',
  },
  {
    id: 'row-number',
    title: 'ROW_NUMBER and top N per group',
    topic: 'windows',
    level: 4,
    questions: ['compare'],
    keywords: ['row_number', 'row', 'number', 'top', 'n', 'per', 'group', 'first', 'latest', 'dedupe'],
    explanation:
      'ROW_NUMBER() numbers rows 1, 2, 3... in the window\'s order, restarting for each PARTITION. Filter rn <= N outside it for "top N per group", or rn = 1 for "latest row per user".',
    code: 'WITH ranked AS (\n  SELECT name, department_id, salary,\n         ROW_NUMBER() OVER (PARTITION BY department_id ORDER BY salary DESC) AS rn\n  FROM employees\n)\nSELECT * FROM ranked WHERE rn = 1;\n',
  },
  {
    id: 'rank',
    title: 'RANK vs DENSE_RANK',
    topic: 'windows',
    level: 4,
    questions: ['compare'],
    keywords: ['rank', 'dense_rank', 'dense', 'ties', 'position', 'place', 'nth', 'highest'],
    explanation:
      'With a tie for first: ROW_NUMBER gives 1, 2; RANK gives 1, 1 then 3 (a gap); DENSE_RANK gives 1, 1 then 2. Use DENSE_RANK for "Nth highest distinct value".',
    code: 'SELECT name, salary,\n       ROW_NUMBER() OVER (ORDER BY salary DESC) AS row_num,\n       RANK() OVER (ORDER BY salary DESC) AS rnk,\n       DENSE_RANK() OVER (ORDER BY salary DESC) AS dense_rnk\nFROM employees;\n',
  },
  {
    id: 'lag-lead',
    title: 'LAG and LEAD',
    topic: 'windows',
    level: 4,
    questions: ['compare', 'text-dates'],
    keywords: ['lag', 'lead', 'previous', 'next', 'row', 'before', 'after', 'change', 'difference', 'compare'],
    explanation:
      'LAG(col) reads the value from the previous row in the window order, LEAD(col) from the next one; NULL past the edge. LAG(col, 2, 0) looks two back with 0 as the default. Great for day-over-day changes.',
    code: 'SELECT customer_id, order_date, amount,\n       LAG(amount) OVER (PARTITION BY customer_id ORDER BY order_date) AS previous,\n       LEAD(order_date) OVER (PARTITION BY customer_id ORDER BY order_date) AS next_order\nFROM orders;\n',
  },
  {
    id: 'running-total',
    title: 'Running totals',
    topic: 'windows',
    level: 4,
    questions: ['summarize', 'compare'],
    keywords: ['running', 'cumulative', 'total', 'sum', 'so', 'far', 'over', 'order'],
    explanation:
      'SUM(x) OVER (ORDER BY ...) adds up every row from the start to the current one. Add PARTITION BY to restart the total for each group.',
    code: 'SELECT order_date, amount,\n       SUM(amount) OVER (ORDER BY order_date) AS running_total\nFROM orders;\n',
  },
  {
    id: 'window-frames',
    title: 'Window frames: ROWS BETWEEN',
    topic: 'windows',
    level: 4,
    questions: ['summarize', 'compare'],
    keywords: ['frame', 'rows', 'between', 'preceding', 'following', 'moving', 'rolling', 'average', 'range'],
    explanation:
      'A frame picks which rows around the current one the function sees: ROWS BETWEEN 2 PRECEDING AND CURRENT ROW is a 3-row moving window. With ORDER BY and no frame, the default runs from the first row to the current one.',
    code: 'SELECT order_date, amount,\n       AVG(amount) OVER (ORDER BY order_date ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) AS moving_avg\nFROM orders;\n',
  },
  {
    id: 'recursive-cte',
    title: 'Recursive CTEs',
    topic: 'ctes',
    level: 4,
    questions: ['steps'],
    keywords: ['recursive', 'cte', 'hierarchy', 'tree', 'series', 'sequence', 'generate', 'levels', 'org', 'chart'],
    explanation:
      'WITH RECURSIVE: a starting query, UNION ALL, then a query that reads the CTE itself. It repeats until a round adds no rows. Used for org charts, trees and number or date series. Give it a WHERE that ends it.',
    code: 'WITH RECURSIVE n(x) AS (\n  SELECT 1\n  UNION ALL\n  SELECT x + 1 FROM n WHERE x < 5\n)\nSELECT x FROM n;\n',
  },
  {
    id: 'objects-to-tables',
    title: 'Objects to tables',
    topic: 'objects',
    level: 4,
    questions: ['combine'],
    keywords: ['object', 'class', 'orm', 'table', 'row', 'list', 'foreign', 'key', 'model', 'design', 'save', 'persist'],
    explanation:
      'Saving objects in a database: each class becomes a table, each object a row, each field a column, with a primary key to tell rows apart. An object that holds another becomes a foreign key column pointing at it. A list inside an object (a ship\'s manifest) becomes a table of its own, one row per item, each pointing back at its owner. Objects are quick while the program runs; tables survive restarts and can be queried in new ways.',
    code: "CREATE TABLE ships (id INTEGER PRIMARY KEY, name TEXT);\nCREATE TABLE manifest (ship_id INTEGER REFERENCES ships(id), code TEXT);\nINSERT INTO ships VALUES (1, 'Atlas');\nINSERT INTO manifest VALUES (1, 'C1'), (1, 'C2');\nSELECT s.name, m.code FROM ships s JOIN manifest m ON m.ship_id = s.id;\n",
  },
]
