import type { Builtin, BuiltinHit } from '../syntax/builtins'
import { tokenize } from './tokens'

// Short explanations of SQL keywords and functions, shown when hovering one in the SQL editor
// (the same pop-up as Python's and JavaScript's built-ins, src/syntax/CodeHover.tsx).
// Each links to the SQL glossary card (src/sql/cards.ts) that teaches it.

const k = (name: string, signature: string, summary: string, example: string, card?: string): Builtin => ({ name, signature, summary, example, card })

const KEYWORDS: Builtin[] = [
  k('SELECT', 'SELECT col, expr AS name', 'Picks and computes the output columns. Runs late: after FROM, WHERE, GROUP BY and HAVING.', 'SELECT name, salary * 12 AS yearly', 'select'),
  k('FROM', 'FROM table [alias]', 'The table the rows come from. Runs first.', 'FROM employees e', 'select'),
  k('WHERE', 'WHERE condition', 'Keeps rows where the condition is true (not false, not NULL). Runs before grouping, so no aggregates here.', "WHERE city = 'Paris'", 'where'),
  k('JOIN', 'JOIN t ON condition', 'Same as INNER JOIN: pairs rows of two tables where ON is true; unmatched rows drop out.', 'JOIN departments d ON d.id = e.department_id', 'inner-join'),
  k('INNER', 'INNER JOIN t ON condition', 'Keeps only pairs that match on both sides.', 'INNER JOIN orders o ON o.customer_id = c.id', 'inner-join'),
  k('LEFT', 'LEFT [OUTER] JOIN t ON condition', 'Keeps every row of the left table; NULLs where the right has no match.', 'LEFT JOIN orders o ON o.customer_id = c.id', 'left-join'),
  k('RIGHT', 'RIGHT [OUTER] JOIN t ON condition', 'Keeps every row of the right table; a LEFT JOIN with the tables swapped.', 'RIGHT JOIN departments d ON ...', 'right-join'),
  k('FULL', 'FULL [OUTER] JOIN t ON condition', 'Keeps unmatched rows from both sides, NULL-filled.', 'FULL OUTER JOIN store s ON s.sku = w.sku', 'full-join'),
  k('OUTER', 'LEFT | RIGHT | FULL OUTER JOIN', 'Optional word: LEFT OUTER JOIN is the same as LEFT JOIN.', 'LEFT OUTER JOIN orders o ON ...', 'left-join'),
  k('CROSS', 'CROSS JOIN t', 'Every row paired with every row: rows multiply.', 'FROM sizes CROSS JOIN colors', 'cross-join'),
  k('ON', 'JOIN t ON condition', 'How rows of the two tables match. Usually a foreign key = primary key.', 'ON e.department_id = d.id', 'inner-join'),
  k('USING', 'JOIN t USING (col)', 'Shorthand for ON a.col = b.col when both tables call the column the same.', 'JOIN orders USING (customer_id)', 'inner-join'),
  k('GROUP', 'GROUP BY col, ...', 'One group per distinct value; each group becomes one output row.', 'GROUP BY department_id', 'group-by'),
  k('HAVING', 'HAVING condition', 'Filters groups after GROUP BY, so it can use COUNT, SUM and friends.', 'HAVING COUNT(*) > 1', 'having'),
  k('ORDER', 'ORDER BY col [ASC | DESC], ...', 'Sorts the result. Without it, the order is not guaranteed.', 'ORDER BY salary DESC, name', 'order-by'),
  k('PARTITION', 'OVER (PARTITION BY col ...)', 'Splits the rows into groups for a window function, without merging them.', 'ROW_NUMBER() OVER (PARTITION BY department_id ORDER BY salary DESC)', 'window-functions'),
  k('LIMIT', 'LIMIT n [OFFSET k]', 'Keeps the first n rows (after skipping k). Runs last.', 'ORDER BY salary DESC LIMIT 3', 'limit'),
  k('OFFSET', 'LIMIT n OFFSET k', 'Skips the first k rows before LIMIT counts.', 'LIMIT 1 OFFSET 1  -- the 2nd row', 'limit'),
  k('DISTINCT', 'SELECT DISTINCT ... | COUNT(DISTINCT col)', 'Removes duplicate rows, or counts different values.', 'SELECT DISTINCT city FROM customers', 'distinct'),
  k('AS', 'expr AS name', 'Names a column or table. Column names made here can be used in ORDER BY, but not in WHERE.', 'COUNT(*) AS orders', 'aliases'),
  k('IN', 'x IN (a, b) | x IN (SELECT ...)', 'True when x is in the list. Careful: NOT IN with a NULL in the list is never true.', "city IN ('Paris', 'Rome')", 'in-between-like'),
  k('BETWEEN', 'x BETWEEN low AND high', 'A range that includes both ends.', 'joined BETWEEN 2020 AND 2022', 'in-between-like'),
  k('LIKE', "text LIKE 'pattern'", '% matches any run of characters, _ exactly one.', "email LIKE '%@mail.com'", 'in-between-like'),
  k('IS', 'x IS NULL | x IS NOT NULL', 'The only test that works on NULL. = NULL is never true.', 'WHERE city IS NULL', 'is-null'),
  k('NULL', 'NULL', 'Unknown or missing. Comparisons with it give NULL, and arithmetic with it gives NULL.', 'NULL + 1  -- NULL', 'null'),
  k('CASE', 'CASE WHEN cond THEN a ... ELSE b END', "SQL's if/else. The first true WHEN wins.", "CASE WHEN score >= 90 THEN 'A' ELSE 'B' END", 'case'),
  k('WHEN', 'CASE WHEN cond THEN value', 'One branch of a CASE, checked top to bottom.', "WHEN salary > 8000 THEN 'high'", 'case'),
  k('EXISTS', 'EXISTS (SELECT ...)', 'True when the subquery finds any row. NOT EXISTS is the safe "has no match".', 'WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id)', 'exists'),
  k('WITH', 'WITH name AS (query) SELECT ...', 'Names a step (a CTE) that the main query can read like a table.', 'WITH totals AS (SELECT ...) SELECT * FROM totals', 'cte'),
  k('RECURSIVE', 'WITH RECURSIVE name AS (start UNION ALL step)', 'A CTE that reads itself, repeating until a round adds nothing.', 'WITH RECURSIVE n(x) AS (SELECT 1 UNION ALL SELECT x + 1 FROM n WHERE x < 5)', 'recursive-cte'),
  k('UNION', 'query UNION [ALL] query', 'Stacks two results. UNION removes duplicates, UNION ALL keeps them.', 'SELECT email FROM a UNION SELECT email FROM b', 'union'),
  k('INTERSECT', 'query INTERSECT query', 'Rows that are in both results.', 'SELECT id FROM a INTERSECT SELECT id FROM b', 'union'),
  k('EXCEPT', 'query EXCEPT query', 'Rows of the first result that are not in the second (Oracle: MINUS).', 'SELECT id FROM a EXCEPT SELECT id FROM b', 'union'),
  k('OVER', 'function() OVER (PARTITION BY ... ORDER BY ...)', 'Makes a function a window function: it sees other rows, and every row stays.', 'SUM(amount) OVER (ORDER BY day)', 'window-functions'),
  k('ROWS', 'ROWS BETWEEN start AND end', 'A window frame counted in rows, like 2 PRECEDING AND CURRENT ROW.', 'AVG(x) OVER (ORDER BY day ROWS BETWEEN 2 PRECEDING AND CURRENT ROW)', 'window-frames'),
  k('PRECEDING', 'n PRECEDING', 'In a frame: n rows before the current one (UNBOUNDED PRECEDING is the first row).', 'ROWS BETWEEN 2 PRECEDING AND CURRENT ROW', 'window-frames'),
  k('DELETE', 'DELETE FROM t WHERE ...', 'Removes matching rows. With no WHERE, removes them all.', 'DELETE FROM person WHERE id NOT IN (...)', 'delete'),
  k('INSERT', 'INSERT INTO t (cols) VALUES (...)', 'Adds rows.', "INSERT INTO departments VALUES (5, 'Design')", 'insert-update'),
  k('UPDATE', 'UPDATE t SET col = value WHERE ...', 'Changes rows. With no WHERE, changes them all.', 'UPDATE employees SET salary = salary + 100 WHERE id = 3', 'insert-update'),
  k('INDEX', 'CREATE INDEX name ON t(col)', 'A sorted lookup on some columns, so finding rows needs no full scan.', 'CREATE INDEX idx_dept ON employees(department_id)', 'indexes'),
]

const FUNCTIONS: Builtin[] = [
  k('COUNT', 'COUNT(*) | COUNT(col) | COUNT(DISTINCT col)', 'Rows, non-NULL values, or different values.', 'COUNT(o.id)  -- 0 for a customer with no orders', 'count'),
  k('SUM', 'SUM(col)', 'Adds up the values, skipping NULLs. NULL (not 0) when there are none.', 'SUM(amount)', 'aggregates'),
  k('AVG', 'AVG(col)', 'The average of the non-NULL values.', 'ROUND(AVG(salary), 2)', 'aggregates'),
  k('MIN', 'MIN(col)', 'The smallest value. Works on numbers, text and dates.', 'MIN(order_date)', 'aggregates'),
  k('MAX', 'MAX(col)', 'The largest value.', 'MAX(salary)', 'aggregates'),
  k('TOTAL', 'TOTAL(col)', 'SQLite only: like SUM, but 0.0 instead of NULL when there are no values.', 'TOTAL(amount)', 'aggregates'),
  k('GROUP_CONCAT', 'GROUP_CONCAT(col, sep)', "Joins a group's values into one string. Postgres: STRING_AGG.", "GROUP_CONCAT(name, ', ')", 'aggregates'),
  k('COALESCE', 'COALESCE(a, b, ...)', 'The first argument that is not NULL.', 'COALESCE(commission, 0)', 'coalesce'),
  k('IFNULL', 'IFNULL(a, b)', 'a, or b when a is NULL (MySQL and SQLite). Same as COALESCE with two.', 'IFNULL(city, "?")', 'coalesce'),
  k('NULLIF', 'NULLIF(a, b)', 'NULL when a = b, else a. Handy to avoid dividing by zero.', 'total / NULLIF(count, 0)', 'coalesce'),
  k('ROUND', 'ROUND(x, digits)', 'Rounds to that many decimals.', 'ROUND(2.345, 2)  -- 2.35', 'round'),
  k('CAST', 'CAST(x AS type)', 'Converts a value to INTEGER, REAL, TEXT...', 'CAST(julianday(b) - julianday(a) AS INTEGER)', 'round'),
  k('ABS', 'ABS(x)', 'The value without its sign.', 'ABS(-5)  -- 5', 'round'),
  k('UPPER', 'UPPER(text)', 'Text in capitals.', "UPPER('ada')  -- 'ADA'", 'strings'),
  k('LOWER', 'LOWER(text)', 'Text in small letters.', "LOWER('ADA')  -- 'ada'", 'strings'),
  k('LENGTH', 'LENGTH(text)', 'How many characters.', "LENGTH('hello')  -- 5", 'strings'),
  k('SUBSTR', 'SUBSTR(text, start [, length])', 'A piece of text. Positions start at 1; no length means to the end.', "SUBSTR('hello', 2, 3)  -- 'ell'", 'strings'),
  k('SUBSTRING', 'SUBSTRING(text, start [, length])', 'Same as SUBSTR (the name MySQL and Postgres use).', "SUBSTRING('hello', 1, 1)  -- 'h'", 'strings'),
  k('TRIM', 'TRIM(text)', 'Removes spaces from both ends (LTRIM, RTRIM for one end).', "TRIM('  hi ')  -- 'hi'", 'strings'),
  k('REPLACE', 'REPLACE(text, find, with)', 'Replaces every occurrence.', "REPLACE('a-b-c', '-', '')  -- 'abc'", 'strings'),
  k('INSTR', 'INSTR(text, find)', 'Position of the first match, from 1; 0 if none. MySQL: LOCATE, Postgres: POSITION.', "INSTR('ada@x.io', '@')  -- 4", 'strings'),
  k('CONCAT', 'CONCAT(a, b, ...)', 'Joins text. || does the same in SQLite and Postgres.', "CONCAT(first, ' ', last)", 'strings'),
  k('STRFTIME', "strftime('%Y-%m', date)", "Formats a date. %Y year, %m month, %d day. MySQL: DATE_FORMAT, Postgres: TO_CHAR.", "strftime('%Y-%m', '2024-03-09')  -- '2024-03'", 'dates'),
  k('DATE', "date(d, '+1 day')", 'A date, optionally moved by modifiers like +1 day, -1 month, start of month.', "date('2024-02-28', '+1 day')  -- '2024-02-29'", 'dates'),
  k('JULIANDAY', 'julianday(d)', 'The date as a day number, so subtracting two gives the days between. MySQL: DATEDIFF.', "julianday('2024-01-10') - julianday('2024-01-01')  -- 9.0", 'dates'),
  k('ROW_NUMBER', 'ROW_NUMBER() OVER (...)', '1, 2, 3... in the window order, always unique.', 'ROW_NUMBER() OVER (PARTITION BY dept ORDER BY salary DESC)', 'row-number'),
  k('RANK', 'RANK() OVER (...)', 'Ties share a rank, then it skips: 1, 1, 3.', 'RANK() OVER (ORDER BY score DESC)', 'rank'),
  k('DENSE_RANK', 'DENSE_RANK() OVER (...)', 'Ties share a rank, no gaps: 1, 1, 2.', 'DENSE_RANK() OVER (ORDER BY salary DESC)', 'rank'),
  k('NTILE', 'NTILE(n) OVER (...)', 'Splits the rows into n nearly equal buckets numbered 1 to n.', 'NTILE(4) OVER (ORDER BY salary)  -- quartiles', 'window-functions'),
  k('LAG', 'LAG(col [, n [, default]]) OVER (...)', 'The value n rows back (1 by default) in the window order.', 'LAG(temp) OVER (ORDER BY day)', 'lag-lead'),
  k('LEAD', 'LEAD(col [, n [, default]]) OVER (...)', 'The value n rows ahead in the window order.', 'LEAD(order_date) OVER (PARTITION BY customer_id ORDER BY order_date)', 'lag-lead'),
  k('FIRST_VALUE', 'FIRST_VALUE(col) OVER (...)', "The first row's value in the window.", 'FIRST_VALUE(name) OVER (PARTITION BY dept ORDER BY salary DESC)', 'window-functions'),
]

const BY_WORD = new Map(KEYWORDS.map((b) => [b.name, b]))
const BY_FUNCTION = new Map(FUNCTIONS.map((b) => [b.name, b]))

/** Every keyword and function name with a hover, for tests. */
export const SQL_HOVERS: Builtin[] = [...KEYWORDS, ...FUNCTIONS]

/** The SQL keyword or function under a 0-based column of one line, if it has a hover. */
export function sqlKeywordAt(line: string, column: number): BuiltinHit | null {
  const tokens = tokenize(line)
  const i = tokens.findIndex((t) => column >= t.start && column < t.end)
  const tok = tokens[i]
  if (!tok || tok.kind !== 'word') return null
  const next = tokens.slice(i + 1).find((t) => t.kind !== 'space')
  const prev = tokens.slice(0, i).reverse().find((t) => t.kind !== 'space')
  // Written after a dot, it's a column (e.date), not the keyword.
  if (prev?.text === '.') return null
  const called = next?.text === '('
  let builtin = called ? (BY_FUNCTION.get(tok.upper) ?? BY_WORD.get(tok.upper)) : BY_WORD.get(tok.upper)
  // BY belongs to the word before it: GROUP BY, ORDER BY, PARTITION BY.
  if (!builtin && tok.upper === 'BY' && prev?.kind === 'word') builtin = BY_WORD.get(prev.upper)
  return builtin ? { builtin, start: tok.start, end: tok.end } : null
}
