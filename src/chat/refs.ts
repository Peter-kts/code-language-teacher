// The small pointing language Claude's answers use to name parts of the screen:
// [[line:3]], [[var:total]], [[step:12]], [[console]], [[history]], [[glossary:for-loop]],
// and a ```tour block listing stops for the "Show me" pointer, one per line: `line:3 | caption`.
// Parsing is pure, so it is tested without a browser; finding things on screen lives in App.

export type RefKind = 'line' | 'var' | 'step' | 'console' | 'history' | 'glossary'

export interface Ref {
  kind: RefKind
  /** The line or step number, variable name or glossary id; empty for console and history. */
  arg: string
}

export interface TourStop {
  ref: Ref
  caption: string
}

/** What exists right now, so references to anything else are dropped rather than pointing at nothing. */
export interface RefContext {
  lineCount: number
  stepCount: number
  vars: ReadonlySet<string>
  glossary: ReadonlySet<string>
}

const KINDS: RefKind[] = ['line', 'var', 'step', 'console', 'history', 'glossary']
const NEEDS_ARG: Record<RefKind, boolean> = { line: true, var: true, step: true, console: false, history: false, glossary: true }

/** Reads `var:total` (or `console`) into a reference; null when it isn't one. */
export function parseRef(text: string): Ref | null {
  const m = /^\s*([a-z]+)\s*(?::\s*([^\s\]|]+))?\s*$/.exec(text)
  if (!m || !KINDS.includes(m[1] as RefKind)) return null
  const kind = m[1] as RefKind
  const arg = m[2] ?? ''
  if (NEEDS_ARG[kind] !== (arg !== '')) return null
  if ((kind === 'line' || kind === 'step') && !/^\d+$/.test(arg)) return null
  return { kind, arg }
}

export function refExists(ref: Ref, ctx: RefContext): boolean {
  switch (ref.kind) {
    case 'line':
      return Number(ref.arg) >= 1 && Number(ref.arg) <= ctx.lineCount
    case 'step':
      return Number(ref.arg) >= 1 && Number(ref.arg) <= ctx.stepCount
    case 'var':
      return ctx.vars.has(ref.arg)
    case 'glossary':
      return ctx.glossary.has(ref.arg)
    case 'console':
    case 'history':
      return ctx.stepCount > 0
  }
}

/** The words a chip shows: "line 3", "total", "step 12". */
export function refLabel(ref: Ref): string {
  switch (ref.kind) {
    case 'line':
      return `line ${ref.arg}`
    case 'step':
      return `step ${ref.arg}`
    case 'console':
      return 'Console'
    case 'history':
      return 'History'
    default:
      return ref.arg
  }
}

export type ProsePart = { text: string } | { ref: Ref; raw: string }

/** Splits prose into plain text and [[references]]. Anything in brackets that isn't a reference stays as text. */
export function splitRefs(text: string): ProsePart[] {
  const parts: ProsePart[] = []
  const re = /\[\[([^\]\n]{1,80})\]\]/g
  let last = 0
  for (let m = re.exec(text); m; m = re.exec(text)) {
    const ref = parseRef(m[1])
    if (!ref) continue
    if (m.index > last) parts.push({ text: text.slice(last, m.index) })
    parts.push({ ref, raw: m[0] })
    last = re.lastIndex
  }
  if (last < text.length) parts.push({ text: text.slice(last) })
  return parts
}

/**
 * Takes the ```tour block out of an answer. While the answer is still streaming the block
 * may be unfinished; it is hidden all the same, and only a finished one gives stops.
 */
export function takeTour(text: string): { body: string; stops: TourStop[] } {
  const m = /```tour[^\n]*\n([\s\S]*?)(```|$)/.exec(text)
  if (!m) return { body: text, stops: [] }
  const body = (text.slice(0, m.index) + text.slice(m.index + m[0].length)).trim()
  if (m[2] !== '```') return { body, stops: [] }
  const stops: TourStop[] = []
  for (const line of m[1].split('\n')) {
    const bar = line.indexOf('|')
    const ref = parseRef((bar < 0 ? line : line.slice(0, bar)).replace(/^\s*(?:[-*]|\d+[.)])\s*/, '').trim().replace(/^\[\[|\]\]$/g, ''))
    if (ref) stops.push({ ref, caption: bar < 0 ? '' : line.slice(bar + 1).trim() })
  }
  return { body, stops }
}

/** For the server: what the learner sees, so Claude names real lines, steps and variables. */
export interface ViewSummary {
  step: number
  steps: number
  vars: string[]
  glossary: string[]
}
