// A small SQL tokenizer: just enough to find a query's clauses, split statements and spot keywords.
// It knows strings ('...'), quoted names ("..." and `...` and [...]), comments (-- and /* */), numbers,
// words and punctuation, so a keyword written inside a string or comment is never mistaken for a clause.

export type TokenKind = 'word' | 'string' | 'name' | 'number' | 'punct' | 'comment' | 'space'

export interface Token {
  kind: TokenKind
  text: string
  /** Offsets into the source, end exclusive. */
  start: number
  end: number
  /** How many brackets deep it sits: 0 is the statement itself, 1 is inside (...). */
  depth: number
  /** Upper-cased text, for words. */
  upper: string
}

export function tokenize(sql: string): Token[] {
  const out: Token[] = []
  let i = 0
  let depth = 0
  const push = (kind: TokenKind, start: number, end: number) => {
    const text = sql.slice(start, end)
    if (kind === 'punct' && text === ')') depth = Math.max(0, depth - 1)
    out.push({ kind, text, start, end, depth, upper: kind === 'word' ? text.toUpperCase() : text })
    if (kind === 'punct' && text === '(') depth++
  }
  while (i < sql.length) {
    const ch = sql[i]
    const start = i
    if (/\s/.test(ch)) {
      while (i < sql.length && /\s/.test(sql[i])) i++
      push('space', start, i)
    } else if (sql.startsWith('--', i)) {
      while (i < sql.length && sql[i] !== '\n') i++
      push('comment', start, i)
    } else if (sql.startsWith('/*', i)) {
      const end = sql.indexOf('*/', i + 2)
      i = end < 0 ? sql.length : end + 2
      push('comment', start, i)
    } else if (ch === "'" || ch === '"' || ch === '`' || ch === '[') {
      const close = ch === '[' ? ']' : ch
      i++
      while (i < sql.length) {
        if (sql[i] === close) {
          // '' inside a string is an escaped quote.
          if (close !== ']' && sql[i + 1] === close) i += 2
          else {
            i++
            break
          }
        } else i++
      }
      push(ch === "'" ? 'string' : 'name', start, i)
    } else if (/[0-9]/.test(ch) || (ch === '.' && /[0-9]/.test(sql[i + 1] ?? ''))) {
      while (i < sql.length && /[0-9.eE]/.test(sql[i])) i++
      push('number', start, i)
    } else if (/[A-Za-z_]/.test(ch)) {
      while (i < sql.length && /[A-Za-z0-9_$]/.test(sql[i])) i++
      push('word', start, i)
    } else {
      // Two-character operators stay together.
      const two = sql.slice(i, i + 2)
      i += ['<=', '>=', '<>', '!=', '==', '||'].includes(two) ? 2 : 1
      push('punct', start, i)
    }
  }
  return out
}

/** Tokens that carry meaning (no spaces or comments). */
export const meaningful = (tokens: Token[]) => tokens.filter((t) => t.kind !== 'space' && t.kind !== 'comment')

export interface Statement {
  text: string
  /** Where it starts in the source, so errors can name a line. */
  start: number
}

/** Splits a script at the semicolons between statements, leaving out empty ones. */
export function splitStatements(sql: string): Statement[] {
  const tokens = tokenize(sql)
  const out: Statement[] = []
  let begin = 0
  const finish = (end: number) => {
    const piece = sql.slice(begin, end)
    const body = meaningful(tokenize(piece))
    if (body.length) out.push({ text: piece.trim(), start: begin + (piece.length - piece.trimStart().length) })
  }
  for (const t of tokens) {
    if (t.kind === 'punct' && t.text === ';' && t.depth === 0) {
      finish(t.start)
      begin = t.end
    }
  }
  finish(sql.length)
  return out
}

/** The 1-based line of a source offset. */
export const lineOf = (sql: string, offset: number) => sql.slice(0, offset).split('\n').length

/** Whether a statement reads data (SELECT, WITH ... SELECT, VALUES) rather than changing it. */
export function isQuery(statement: string): boolean {
  const first = meaningful(tokenize(statement))[0]
  return !!first && ['SELECT', 'WITH', 'VALUES'].includes(first.upper)
}
