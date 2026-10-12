// Rewrites a learner's JavaScript so it reports on itself while it runs: the JavaScript
// side of what src/python/tracer.py does with sys.settrace.
//
// Browsers have no hook that fires on every line of JavaScript, so instead each
// statement gets a call in front of it, `__ct.s(line, {total: () => total, ...})`,
// that hands the runtime (runtime.ts) a way to read every variable in scope. The
// parts of each assignment are wrapped in `__ct.r(id, value)` so the visualizer can
// say what a change was made of, and every function reports when it starts and ends.
//
// A function that uses variables of a function around it (a closure) is handed to
// `__ct.f(fn, {count: () => count}, name)`, so the runtime can show what it remembers,
// and its own steps can read those variables too.

import { parse } from 'acorn'
import { generate } from 'astring'
import type { AssignPlan, CodeError, ExprPlan, LoopPlan, PointerSpec, TargetPlan } from '../types'

// ESTree nodes as acorn makes them; loosely typed, since this file builds and rewrites many kinds.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Node = { type: string; start?: number; end?: number; loc?: any; [key: string]: any }

export const RUNTIME = '__ct'
export const HIDDEN_PREFIX = '_ct_idx_'
export const MODULE = '<module>'
const MAX_SEQ_PARTS = 8

export interface Instrumented {
  /** The body of a function taking (__ct, console); it returns the problem's function, if it was asked for. */
  code: string
  plans: AssignPlan[]
  loops: LoopPlan[]
  pointers: PointerSpec[]
}

/** Parse and rewrite `source`; a syntax error comes back as a CodeError. */
export function instrument(source: string, callName: string | null = null): Instrumented | { error: CodeError } {
  let program: Node
  try {
    // Module code is always strict, so mistakes like assigning to an undeclared name are errors.
    program = parse(source, { ecmaVersion: 'latest', sourceType: 'module', locations: true }) as unknown as Node
  } catch (err) {
    const e = err as SyntaxError & { loc?: { line: number; column: number } }
    return {
      error: {
        kind: 'syntax',
        message: String(e.message).replace(/ \(\d+:\d+\)$/, ''),
        line: e.loc?.line ?? 1,
        col: (e.loc?.column ?? 0) + 1,
      },
    }
  }
  const outside = program.body.find((s: Node) => /^(Import|Export)/.test(s.type))
  if (outside) {
    return {
      error: { kind: 'syntax', message: 'import and export are not available here', line: outside.loc.start.line, col: 1 },
    }
  }
  const t = new Instrumenter(source)
  const pointers = [...t.hiddenPointers(program), ...indexPointers(program)]
  const loops = loopPlans(program, source)
  const body = t.program(program, callName)
  return { code: generate(body), plans: t.plans, loops, pointers }
}

// ---- small node builders ----

const id = (name: string): Node => ({ type: 'Identifier', name }) as Node
const lit = (value: string | number | boolean | null): Node => ({ type: 'Literal', value }) as Node
const member = (object: Node, name: string): Node =>
  ({ type: 'MemberExpression', object, property: id(name), computed: false, optional: false }) as Node
const call = (callee: Node, args: Node[]): Node => ({ type: 'CallExpression', callee, arguments: args, optional: false }) as Node
const rt = (fn: string, args: Node[]) => call(member(id(RUNTIME), fn), args)
const stmt = (expression: Node): Node => ({ type: 'ExpressionStatement', expression }) as Node
const block = (body: Node[]): Node => ({ type: 'BlockStatement', body }) as Node
const seq = (expressions: Node[]): Node => ({ type: 'SequenceExpression', expressions }) as Node
const isFunction = (n: Node) =>
  n.type === 'FunctionDeclaration' || n.type === 'FunctionExpression' || n.type === 'ArrowFunctionExpression'

/** Every name a binding pattern declares: `[a, {b}]` gives a and b. */
function patternNames(p: Node | null, out: string[] = []): string[] {
  if (!p) return out
  switch (p.type) {
    case 'Identifier':
      out.push(p.name)
      break
    case 'ArrayPattern':
      p.elements.forEach((e: Node | null) => patternNames(e, out))
      break
    case 'ObjectPattern':
      p.properties.forEach((prop: Node) => patternNames(prop.type === 'RestElement' ? prop.argument : prop.value, out))
      break
    case 'RestElement':
      patternNames(p.argument, out)
      break
    case 'AssignmentPattern':
      patternNames(p.left, out)
      break
  }
  return out
}

/** Names that `let`, `const`, `class` and function declarations add to a block, in source order. */
function blockNames(body: Node[]): string[] {
  const out: string[] = []
  for (const s of body) {
    if (s.type === 'VariableDeclaration' && s.kind !== 'var') s.declarations.forEach((d: Node) => patternNames(d.id, out))
    else if ((s.type === 'ClassDeclaration' || s.type === 'FunctionDeclaration') && s.id) out.push(s.id.name)
  }
  return out
}

/** `var` names anywhere in a function body (not in nested functions): they belong to the whole function. */
function varNames(node: Node | Node[], out: string[] = []): string[] {
  if (!node || typeof node !== 'object') return out
  if (Array.isArray(node)) {
    node.forEach((n) => varNames(n, out))
    return out
  }
  if (isFunction(node) || node.type === 'ClassBody') return out
  if (node.type === 'VariableDeclaration' && node.kind === 'var') node.declarations.forEach((d: Node) => patternNames(d.id, out))
  for (const key of Object.keys(node)) {
    if (key === 'loc') continue
    const v = node[key]
    if (v && typeof v === 'object') varNames(v, out)
  }
  return out
}

/** Calls `visit` on every node under `node`, depth first. */
function walk(node: Node | Node[], visit: (n: Node) => void) {
  if (!node || typeof node !== 'object') return
  if (Array.isArray(node)) {
    node.forEach((n) => walk(n, visit))
    return
  }
  if (typeof node.type === 'string') visit(node)
  for (const key of Object.keys(node)) {
    if (key === 'loc') continue
    const v = node[key]
    if (v && typeof v === 'object') walk(v, visit)
  }
}

/** Every plain name read or written under `node`: not property names like the `length` of `xs.length`. */
function referencedNames(node: Node | Node[], out = new Set<string>()): Set<string> {
  if (!node || typeof node !== 'object') return out
  if (Array.isArray(node)) {
    node.forEach((n) => referencedNames(n, out))
    return out
  }
  if (node.type === 'Identifier') out.add(node.name)
  else if (node.type === 'MemberExpression' && !node.computed) referencedNames(node.object, out)
  else if ((node.type === 'Property' || node.type === 'MethodDefinition' || node.type === 'PropertyDefinition') && !node.computed)
    referencedNames(node.value, out)
  else
    for (const key of Object.keys(node)) {
      if (key === 'loc') continue
      const v = node[key]
      if (v && typeof v === 'object') referencedNames(v, out)
    }
  return out
}

const AUG_OPS: Record<string, string> = {
  '+=': '+', '-=': '-', '*=': '*', '/=': '/', '%=': '%', '**=': '**', '<<=': '<<', '>>=': '>>', '>>>=': '>>>',
  '|=': '|', '^=': '^', '&=': '&', '&&=': '&&', '||=': '||', '??=': '??',
}
const ARITHMETIC = new Set(['+', '-', '*', '/', '%', '**', '<<', '>>', '>>>', '|', '^', '&'])
/** Names that read like variables but are values: shown as literals, not as variables read. */
const CONSTANT_NAMES = new Set(['undefined', 'NaN', 'Infinity'])

/** One function's worth of scopes, innermost last, for working out which names a step can read. */
type Scopes = string[][]

class Instrumenter {
  plans: AssignPlan[] = []
  private ids = 0
  private lines: string[]
  /** Hidden index counters for `for (const n of nums)`, keyed by the loop node. */
  private hidden = new Map<Node, string>()
  /** The scopes the statement being rewritten can see, innermost last. */
  private current: Scopes = []
  /** The program's own scopes: globals, which a function uses but doesn't count as remembering. */
  private module: Scopes = []
  /** How many functions the code being rewritten is inside. */
  private depth = 0
  /** Where closures made by function declarations are registered: the top of their block, since the functions exist from there (hoisting). */
  private hoisted: Node[] | null = null

  constructor(private source: string) {
    this.lines = source.split('\n')
  }

  program(program: Node, callName: string | null): Node {
    const scopes: Scopes = [varNames(program.body), blockNames(program.body)]
    this.module = scopes
    this.current = scopes
    const body = this.statements(program.body, scopes, false)
    // Hand the problem's function back from inside the block that declares it.
    if (callName && /^[A-Za-z_$][\w$]*$/.test(callName)) {
      body.push({
        type: 'ReturnStatement',
        argument: {
          type: 'ConditionalExpression',
          test: {
            type: 'BinaryExpression',
            operator: '===',
            left: { type: 'UnaryExpression', operator: 'typeof', prefix: true, argument: id(callName) },
            right: lit('function'),
          },
          consequent: id(callName),
          alternate: id('undefined'),
        },
      } as Node)
    }
    return { type: 'Program', sourceType: 'script', body: [this.frame(MODULE, body)] } as Node
  }

  /** `for (const n of nums)` loops over a plain name: they get a hidden counter, so the arrow under nums knows which box n came from. */
  hiddenPointers(program: Node): PointerSpec[] {
    const out: PointerSpec[] = []
    // Loops with the same name over the same array share one counter (and pointer), so a second
    // `for (const c of s)` moves the arrow rather than leaving it where the first loop ended.
    const shared = new Map<string, string>()
    walk(program, (n) => {
      if (n.type !== 'ForOfStatement' || n.right.type !== 'Identifier') return
      const names = n.left.type === 'VariableDeclaration' ? patternNames(n.left.declarations[0].id) : []
      if (n.left.type !== 'VariableDeclaration' || n.left.declarations[0].id.type !== 'Identifier' || names.length !== 1) return
      const pair = `${names[0]}\0${n.right.name}`
      const key = shared.get(pair) ?? `${HIDDEN_PREFIX}${n.loc.start.line}_${n.loc.start.column}`
      this.hidden.set(n, key)
      if (shared.has(pair)) return
      shared.set(pair, key)
      out.push({ label: names[0], var: key, target: n.right.name })
    })
    return out
  }

  /** `{ __ct.e(name); try { body } catch (e) { __ct.x(e); throw e } finally { __ct.o() } }` */
  private frame(name: string, body: Node[], captured: string[] = []): Node {
    const err = '__ct_err'
    const names = { type: 'ArrayExpression', elements: captured.map((n) => lit(n)) } as Node
    return block([
      stmt(rt('e', captured.length ? [lit(name), names] : [lit(name)])),
      {
        type: 'TryStatement',
        block: block(body),
        handler: {
          type: 'CatchClause',
          param: id(err),
          body: block([stmt(rt('x', [id(err)])), { type: 'ThrowStatement', argument: id(err) } as Node]),
        },
        finalizer: block([stmt(rt('o', []))]),
      } as Node,
    ])
  }

  /** `{total: () => total, ...}`: how a step reads each variable in scope. Names still in their temporal dead zone throw, and the runtime skips them. */
  private getters(scopes: Scopes): Node {
    const names = [...new Set(scopes.flat())].filter((n) => !n.startsWith('__ct'))
    return {
      type: 'ObjectExpression',
      properties: names.map((name) => ({
        type: 'Property',
        kind: 'init',
        key: lit(name),
        value: { type: 'ArrowFunctionExpression', params: [], body: id(name), expression: true },
        computed: false,
        method: false,
        shorthand: false,
      })),
    } as Node
  }

  private step(line: number, scopes: Scopes): Node {
    return rt('s', [lit(line), this.getters(scopes)])
  }

  /** Rewrites a function; returns the outer variables it uses (what it remembers as a closure). */
  private function(fn: Node, name: string): string[] {
    const params: string[] = []
    fn.params.forEach((p: Node) => patternNames(p, params))
    let body: Node[]
    if (fn.body.type === 'BlockStatement') body = fn.body.body
    else {
      // `x => x * 2` becomes `x => { return x * 2 }`, so the return gets a step of its own.
      body = [{ type: 'ReturnStatement', argument: fn.body, loc: fn.body.loc, start: fn.body.start, end: fn.body.end } as Node]
      fn.expression = false
    }
    const own = [params, varNames(body), blockNames(body)]
    const mine = new Set([...own.flat(), ...(fn.id ? [fn.id.name] : [])])
    // Names of enclosing functions and blocks (not globals) that this one reads or writes.
    const outer = new Set(this.current.filter((s) => !this.module.includes(s)).flat())
    const used = referencedNames([fn.params, body])
    const captured = [...used].filter((n) => outer.has(n) && !mine.has(n) && !n.startsWith('__ct'))
    // Its own names first, then everything around it (a callback's `total`, say), since it can read and change those too.
    const scopes: Scopes = [...own, ...this.current]
    const saved = this.current
    this.current = scopes
    this.depth++
    fn.body = this.frame(name, this.statements(body, scopes, false), captured)
    this.depth--
    this.current = saved
    return captured
  }

  /** Functions made inside a function are shown as closures, even before they use anything from it. */
  private isClosure(captured: string[]) {
    return captured.length > 0 || this.depth > 0
  }

  /** `__ct.f(fn, {count: () => count}, "name")`: lets the runtime read what a closure remembers. */
  private closure(fn: Node, captured: string[], name: string): Node {
    return rt('f', [fn, this.getters([captured]), lit(name)])
  }

  /** Rewrite every function inside an expression (callbacks, arrow functions, class methods). */
  private expressions(node: Node | null, nameHint = '<anonymous>') {
    if (!node) return
    if (isFunction(node)) {
      this.function(node, node.id?.name ?? nameHint)
      return
    }
    for (const key of Object.keys(node)) {
      if (key === 'loc') continue
      const v = node[key]
      if (!v || typeof v !== 'object') continue
      const children: Node[] = Array.isArray(v) ? v : [v]
      children.forEach((child, i) => {
        if (!child || typeof child.type !== 'string') return
        let hint = '<anonymous>'
        if (node.type === 'VariableDeclarator' && key === 'init' && node.id.type === 'Identifier') hint = node.id.name
        else if ((node.type === 'Property' || node.type === 'MethodDefinition' || node.type === 'PropertyDefinition') && key === 'value')
          hint = node.key.name ?? String(node.key.value ?? hint)
        else if (node.type === 'AssignmentExpression' && key === 'right' && node.left.type === 'Identifier') hint = node.left.name
        if (!isFunction(child)) {
          this.expressions(child, hint)
          return
        }
        const name = child.id?.name ?? hint
        const captured = this.function(child, name)
        // A method's function can't be wrapped in a call; it can only use what its class or object can.
        const isMethod = node.type === 'MethodDefinition' || (node.type === 'Property' && (node.method || node.kind !== 'init'))
        if (!this.isClosure(captured) || isMethod) return
        const wrapped = this.closure(child, captured, name)
        if (Array.isArray(v)) v[i] = wrapped
        else node[key] = wrapped
      })
    }
  }

  /** A statement list with a step in front of each statement. `nested` adds a block scope. */
  private statements(body: Node[], scopes: Scopes, nested = true): Node[] {
    const inner = nested ? [...scopes, blockNames(body)] : scopes
    const saved = this.hoisted
    const hoisted: Node[] = (this.hoisted = [])
    const out = body.flatMap((s) => this.statement(s, inner, true))
    this.hoisted = saved
    return [...hoisted, ...out]
  }

  /** A loop or if body as a block, so steps can go inside it. */
  private body(s: Node, scopes: Scopes): Node {
    return block(this.statements(s.type === 'BlockStatement' ? s.body : [s], scopes))
  }

  private statement(s: Node, scopes: Scopes, withStep: boolean): Node[] {
    const saved = this.current
    this.current = scopes
    try {
      return this.rewrite(s, scopes, withStep)
    } finally {
      this.current = saved
    }
  }

  private rewrite(s: Node, scopes: Scopes, withStep: boolean): Node[] {
    const line: number = s.loc.start.line
    const pre = withStep ? [stmt(this.step(line, scopes))] : []
    switch (s.type) {
      case 'EmptyStatement':
        return []
      case 'FunctionDeclaration': {
        // Declared before the code runs (hoisted), so nothing happens on its line.
        const captured = this.function(s, s.id.name)
        if (!this.isClosure(captured)) return [s]
        const register = stmt(this.closure(id(s.id.name), captured, s.id.name))
        if (!this.hoisted) return [s, register]
        this.hoisted.push(register)
        return [s]
      }
      case 'VariableDeclaration':
        for (const d of s.declarations) {
          if (!d.init) continue
          const value = this.record(d, 'init')
          this.plans.push({ line, op: null, targets: [this.target(d.id)], value })
        }
        this.expressions(s)
        return [...pre, s]
      case 'ExpressionStatement':
        this.recordExpression(s, line)
        this.expressions(s)
        return [...pre, s]
      case 'IfStatement':
        this.expressions(s.test)
        s.consequent = this.body(s.consequent, scopes)
        if (s.alternate) s.alternate = this.body(s.alternate, scopes)
        return [...pre, s]
      case 'ForStatement': {
        const head = s.init?.type === 'VariableDeclaration' && s.init.kind !== 'var' ? s.init.declarations.flatMap((d: Node) => patternNames(d.id)) : []
        const inLoop = [...scopes, head]
        if (s.init?.type === 'VariableDeclaration') {
          for (const d of s.init.declarations) if (d.init) this.plans.push({ line, op: null, targets: [this.target(d.id)], value: this.planOnly(d.init) })
        }
        if (s.update) this.updatePlan(s.update, line)
        ;[s.init, s.test, s.update].forEach((n) => this.expressions(n))
        s.body = this.body(s.body, inLoop)
        // The step before each update shows the loop line again, as Python's `for` line does on every pass.
        s.update = seq([this.step(line, inLoop), ...(s.update ? [s.update] : [])])
        return [...pre, s]
      }
      case 'WhileStatement':
        this.expressions(s.test)
        s.body = this.body(s.body, scopes)
        // A step on every check of the condition, including the first.
        s.test = seq([this.step(line, scopes), s.test])
        return [s]
      case 'DoWhileStatement':
        this.expressions(s.test)
        s.body = this.body(s.body, scopes)
        s.test = seq([this.step(s.test.loc.start.line, scopes), s.test])
        return [...pre, s]
      case 'ForOfStatement':
      case 'ForInStatement': {
        const names = s.left.type === 'VariableDeclaration' ? patternNames(s.left.declarations[0].id) : []
        const inLoop = [...scopes, names]
        this.expressions(s.right)
        s.body = this.body(s.body, inLoop)
        if (!s.body.body.length) {
          // With nothing in the body yet (just a comment, say), still step once per pass so the loop
          // variables show: on the body's first line, as Python steps on a `pass`.
          const { start, end } = s.loc
          s.body.body.push(stmt(this.step(end.line > start.line + 1 ? start.line + 1 : line, inLoop)))
        }
        const over = s.type === 'ForInStatement' ? rt('k', [s.right]) : s.right
        // Each pass after the first steps on the loop line before taking the next item.
        s.right = rt('i', [
          lit(line),
          over,
          this.getters(scopes),
          { type: 'ArrayExpression', elements: names.map((n) => lit(n)) } as Node,
          lit(this.hidden.get(s) ?? null),
        ])
        s.type = 'ForOfStatement'
        s.await = false
        return [...pre, s]
      }
      case 'BlockStatement':
        return [block(this.statements(s.body, scopes))]
      case 'TryStatement':
        s.block = block(this.statements(s.block.body, scopes))
        if (s.handler) s.handler.body = block(this.statements(s.handler.body.body, [...scopes, patternNames(s.handler.param)]))
        if (s.finalizer) s.finalizer = block(this.statements(s.finalizer.body, scopes))
        return [...pre, s]
      case 'SwitchStatement': {
        this.expressions(s.discriminant)
        const inner = [...scopes, blockNames(s.cases.flatMap((c: Node) => c.consequent))]
        // A function declared in a case belongs to the switch's own block: register it in place.
        const outerHoisted = this.hoisted
        this.hoisted = null
        for (const c of s.cases) {
          this.expressions(c.test)
          c.consequent = c.consequent.flatMap((x: Node) => this.statement(x, inner, true))
        }
        this.hoisted = outerHoisted
        return [...pre, s]
      }
      case 'LabeledStatement':
        // Nothing may come between a label and its loop, so the step goes before the label.
        s.body = (([one]) => one)(this.statement(s.body, scopes, false))
        return [...pre, s]
      default:
        // return, throw, break, continue, class declarations and the like.
        this.expressions(s)
        return [...pre, s]
    }
  }

  /** `i++` in a for loop's update: its plan, so the counter's change reads as +1. */
  private updatePlan(update: Node, line: number) {
    if (update.type === 'UpdateExpression' && update.argument.type === 'Identifier') {
      this.plans.push({ line, op: update.operator === '++' ? '+' : '-', targets: [this.target(update.argument)], value: one() })
    } else if (update.type === 'AssignmentExpression' && update.left.type === 'Identifier') {
      this.plans.push({ line, op: AUG_OPS[update.operator] ?? null, targets: [this.target(update.left)], value: this.planOnly(update.right) })
    }
  }

  /** Plans and records an expression statement that changes something. */
  private recordExpression(s: Node, line: number) {
    const e = s.expression
    if (e.type === 'AssignmentExpression') {
      // `a = b = 0` sets both.
      const targets: TargetPlan[] = []
      let node = e
      while (node.right.type === 'AssignmentExpression' && node.operator === '=' && node.right.operator === '=') {
        targets.push(this.target(node.left))
        node = node.right
      }
      targets.push(this.target(node.left))
      const value = this.record(node, 'right')
      const op = e.operator === '=' ? null : (AUG_OPS[e.operator] ?? null)
      this.plans.push({ line, op, targets: e.operator === '=' ? targets : [targets[0]], value })
    } else if (e.type === 'UpdateExpression' && e.argument.type === 'Identifier') {
      this.plans.push({ line, op: e.operator === '++' ? '+' : '-', targets: [this.target(e.argument)], value: one() })
    } else if (e.type === 'UpdateExpression' && e.argument.type === 'MemberExpression') {
      const target = this.target(e.argument)
      this.plans.push({ line, op: e.operator === '++' ? '+' : '-', targets: [target], value: one() })
    } else if (isMapSet(e)) {
      // `counts.set(c, n)` is the Map's `counts[c] = n`: planned the same way, so the row gets `= from n`.
      const name = e.callee.object.name
      const text = `${name}.get(${this.text(e.arguments[0])})`
      const key = this.record(e.arguments, '0')
      const target: TargetPlan = { kind: 'item', name, key, text }
      this.plans.push({ line, op: null, targets: [target], value: this.record(e.arguments, '1') })
    } else if (
      e.type === 'CallExpression' &&
      e.callee.type === 'MemberExpression' &&
      e.callee.object.type === 'Identifier' &&
      e.callee.object.name !== 'console'
    ) {
      // `stack.push(n)` changes `stack`: record what it was given, so `n` lights up.
      const target: TargetPlan = { kind: 'name', name: e.callee.object.name }
      const [node, value] = this.expr(e, false)
      s.expression = node
      this.plans.push({ line, op: 'call', targets: [target], value })
    }
  }

  private target(node: Node): TargetPlan {
    if (node.type === 'Identifier') return { kind: 'name', name: node.name }
    if (node.type === 'ArrayPattern') return { kind: 'seq', items: node.elements.map((e: Node | null) => (e ? this.target(e) : { kind: 'other' })) }
    if (node.type === 'MemberExpression' && node.object.type === 'Identifier') {
      // The key is read even though the item is written: record it too.
      let key: ExprPlan | null
      if (node.computed) key = this.record(node, 'property')
      else key = { kind: 'const', text: node.property.name, value: [JSON.stringify(node.property.name), null] }
      return { kind: 'item', name: node.object.name, key, text: this.text(node) }
    }
    return { kind: 'other' }
  }

  /** Wraps `parent[key]` so its value is recorded; returns its plan. */
  private record(parent: Node, key: string): ExprPlan | null {
    const [node, plan] = this.expr(parent[key])
    parent[key] = node
    return plan
  }

  /** A plan for code that already ran by the time anything could record it (a for loop's head): constants only. */
  private planOnly(node: Node): ExprPlan | null {
    if (node.type === 'Literal' && typeof node.value === 'number') return { kind: 'const', text: this.text(node), value: [String(node.value), node.value] }
    return null
  }

  private each(parent: Node, key: string): ExprPlan[] {
    const list: Node[] = parent[key]
    const plans: ExprPlan[] = []
    list.forEach((n, i) => {
      if (!n) return
      if (n.type === 'SpreadElement') {
        // `f(...xs)` and `[...xs]` read xs.
        const plan = this.record(n, 'argument')
        if (plan) plans.push(plan)
        return
      }
      const [node, plan] = this.expr(n)
      list[i] = node
      if (plan) plans.push(plan)
    })
    return plans
  }

  /**
   * Wrap `node` as `__ct.r(id, node)` so its value is recorded; returns (new node, plan).
   * `receiver` false leaves the object of a method call unrecorded (the `stack` of `stack.push(n)`, which is the target).
   */
  private expr(node: Node, receiver = true): [Node, ExprPlan | null] {
    if (node.type === 'Literal' && !node.regex) {
      return [node, { kind: 'const', text: this.text(node), value: brief(node.value) }]
    }
    if (node.type === 'TemplateLiteral' && node.expressions.length === 0) {
      return [node, { kind: 'const', text: this.text(node), value: brief(node.quasis[0].value.cooked) }]
    }
    if (node.type === 'Identifier' && CONSTANT_NAMES.has(node.name)) {
      return [node, { kind: 'const', text: node.name, value: [node.name, null] }]
    }
    if ((node.type === 'ObjectExpression' && node.properties.length) || node.type === 'NewExpression') {
      // `{ x: 1 }` and `new Map()` read no variables, like Python's `{"x": 1}` and `{}`: a constant, not a source.
      if (isLiteralNode(node)) return [node, { kind: 'const', text: this.text(node), value: [this.text(node), null] }]
    }
    // Only valid where they stand, or values that would mean nothing as a part.
    if (['SpreadElement', 'FunctionExpression', 'ArrowFunctionExpression', 'ClassExpression', 'Super'].includes(node.type)) return [node, null]
    let plan: ExprPlan
    const text = this.text(node)
    if (node.type === 'Identifier') {
      plan = { kind: 'name', name: node.name, text }
    } else if (isMapGet(node)) {
      // `counts.get(c)` reads counts[c] like an index does, so it lights up that row.
      const key = this.each(node, 'arguments')[0] ?? null
      plan = { kind: 'sub', name: node.callee.object.name, of: null, key, text }
    } else if (isDefaulted(node)) {
      // `counts.get(c) ?? 0` and `seen[c] || 0` are Python's `counts.get(c, 0)`: a read of counts[c],
      // with the default when it's missing, so `counts.set(c, (counts.get(c) ?? 0) + 1)` reads as +1.
      const read = node.left
      const name = read.type === 'CallExpression' ? read.callee.object.name : read.object.name
      let key: ExprPlan | null
      if (read.type === 'CallExpression') key = this.each(read, 'arguments')[0] ?? null
      else if (read.computed) key = this.record(read, 'property')
      else key = { kind: 'const', text: read.property.name, value: [JSON.stringify(read.property.name), null] }
      plan = { kind: 'sub', name, of: null, key, text }
    } else if (node.type === 'MemberExpression' && !node.computed && ['length', 'size'].includes(node.property.name)) {
      // `nums.length` reads nums as a whole.
      plan = { kind: 'other', parts: [this.record(node, 'object')].filter(Boolean) as ExprPlan[], text }
    } else if (node.type === 'MemberExpression' && !node.optional && node.object.type !== 'Super') {
      const name = node.object.type === 'Identifier' ? node.object.name : null
      const of = name === null ? this.record(node, 'object') : null
      const key: ExprPlan | null = node.computed
        ? this.record(node, 'property')
        : { kind: 'const', text: node.property.name ?? '', value: [JSON.stringify(node.property.name ?? ''), null] }
      plan = { kind: 'sub', name, of, key, text }
    } else if (node.type === 'BinaryExpression' && ARITHMETIC.has(node.operator)) {
      const left = this.record(node, 'left')
      const right = this.record(node, 'right')
      plan = { kind: 'bin', op: node.operator, left, right, text }
    } else if (node.type === 'UnaryExpression' && ['-', '+', '!', '~'].includes(node.operator)) {
      plan = { kind: 'unary', op: node.operator, operand: this.record(node, 'argument'), text }
    } else if (
      node.type === 'ArrayExpression' &&
      node.elements.length <= MAX_SEQ_PARTS &&
      node.elements.every((e: Node | null) => e && e.type !== 'SpreadElement')
    ) {
      // Itemized so `[a, b] = [b, a + b]` can pair each target with its value.
      const items = node.elements.map((_: Node, i: number) => this.record(node.elements, String(i)))
      plan = { kind: 'seq', items, text }
    } else {
      // Calls, comparisons and the like are one part each, but the names they
      // read are recorded too, so they still light up as sources.
      let parts: (ExprPlan | null)[] = []
      if ((node.type === 'CallExpression' || node.type === 'NewExpression') && !node.optional) {
        // What a method is called on is read too: `nums.slice(1)` and `[...word].sort()` are
        // Python's `nums[1:]` and `sorted(word)`. Not globals like Math, which aren't data.
        const on = node.type === 'CallExpression' && node.callee.type === 'MemberExpression' && !node.callee.optional ? node.callee.object : null
        const isData = on && (on.type !== 'Identifier' || (receiver && this.current.some((s) => s.includes(on.name))))
        if (isData && !['Super', 'ThisExpression'].includes(on.type)) parts.push(this.record(node.callee, 'object'))
        parts.push(...this.each(node, 'arguments'))
      } else if (node.type === 'ArrayExpression' && node.elements.some((e: Node | null) => e?.type === 'SpreadElement')) {
        parts = this.each(node, 'elements')
      } else if (node.type === 'LogicalExpression' || node.type === 'BinaryExpression') {
        parts = [this.record(node, 'left'), this.record(node, 'right')]
      } else if (node.type === 'ConditionalExpression') {
        parts = [this.record(node, 'test'), this.record(node, 'consequent'), this.record(node, 'alternate')]
      }
      plan = { kind: 'other', parts: parts.filter(Boolean) as ExprPlan[], text }
    }
    this.ids += 1
    plan.id = this.ids
    Object.assign(plan, this.span(node))
    const wrapped = rt('r', [lit(this.ids), node])
    wrapped.loc = node.loc
    return [wrapped, plan]
  }

  private text(node: Node) {
    return this.source.slice(node.start, node.end).split(/\s+/).join(' ')
  }

  private span(node: Node) {
    return span(node, this.lines)
  }
}

/** The `1` that `i++` adds, as a part. */
const one = (): ExprPlan => ({ kind: 'const', text: '1', value: ['1', 1] })

function isMapGet(node: Node) {
  return (
    node.type === 'CallExpression' &&
    node.callee.type === 'MemberExpression' &&
    !node.callee.computed &&
    node.callee.property.name === 'get' &&
    node.callee.object.type === 'Identifier' &&
    node.arguments.length === 1 &&
    node.arguments[0].type !== 'SpreadElement'
  )
}

/** `counts.set(key, value)` on a plain name. */
function isMapSet(node: Node) {
  return (
    node.type === 'CallExpression' &&
    node.callee.type === 'MemberExpression' &&
    !node.callee.computed &&
    !node.callee.optional &&
    node.callee.property.name === 'set' &&
    node.callee.object.type === 'Identifier' &&
    node.arguments.length === 2 &&
    node.arguments.every((a: Node) => a.type !== 'SpreadElement')
  )
}

/** `counts.get(c) ?? 0` or `seen[c] || 0`: an item read, with a written-out default. */
function isDefaulted(node: Node) {
  if (node.type !== 'LogicalExpression' || !['??', '||'].includes(node.operator)) return false
  const { left, right } = node
  if (right.type !== 'Literal' || right.regex) return false
  if (isMapGet(left)) return true
  return (
    left.type === 'MemberExpression' &&
    !left.optional &&
    left.object.type === 'Identifier' &&
    !(!left.computed && ['length', 'size'].includes(left.property.name))
  )
}

/** Code that makes a value out of nothing but literals: `{ x: 1 }`, `new Map()`, `new Set([1, 2])`. */
function isLiteralNode(node: Node | null): boolean {
  if (!node) return false
  switch (node.type) {
    case 'Literal':
      return !node.regex
    case 'TemplateLiteral':
      return node.expressions.length === 0
    case 'UnaryExpression':
      return ['-', '+'].includes(node.operator) && isLiteralNode(node.argument)
    case 'ArrayExpression':
      return node.elements.every(isLiteralNode)
    case 'ObjectExpression':
      return node.properties.every(
        (p: Node) => p.type === 'Property' && p.kind === 'init' && !p.method && !p.shorthand && !p.computed && isLiteralNode(p.value),
      )
    case 'NewExpression':
      return node.callee.type === 'Identifier' && ['Map', 'Set', 'Array', 'Object'].includes(node.callee.name) && node.arguments.every(isLiteralNode)
  }
  return false
}

/** Where a node sits on its line, as 1-based columns (none if it spans lines). */
function span(node: Node, lines: string[]): { line?: number; start?: number; end?: number } {
  const { start, end } = node.loc
  if (start.line !== end.line || start.line > lines.length) return {}
  return { line: start.line, start: start.column + 1, end: end.column + 1 }
}

/** A literal's value as the tracer reports recorded values: its text, and the number when it is one. */
function brief(value: unknown): [string, number | null] {
  if (typeof value === 'number') return [String(value), Number.isFinite(value) ? value : null]
  if (typeof value === 'string') return [JSON.stringify(value), null]
  return [String(value), null]
}

/**
 * Integer variables used as indexes into arrays: any `xs[i]`, the `i` of
 * `for (let i = 0; i < xs.length; i++)`, and `for (const [i, x] of xs.entries())`.
 */
function indexPointers(program: Node): PointerSpec[] {
  const found = new Set<string>()
  walk(program, (n) => {
    if (n.type === 'MemberExpression' && n.computed && n.object.type === 'Identifier' && n.property.type === 'Identifier') {
      found.add(`${n.property.name}\0${n.object.name}`)
    } else if (n.type === 'ForStatement' && n.test?.type === 'BinaryExpression' && ['<', '<='].includes(n.test.operator)) {
      const { left, right } = n.test
      if (
        left.type === 'Identifier' &&
        right.type === 'MemberExpression' &&
        !right.computed &&
        right.property.name === 'length' &&
        right.object.type === 'Identifier'
      ) {
        found.add(`${left.name}\0${right.object.name}`)
      }
    } else if (n.type === 'ForOfStatement') {
      const entries = entriesLoop(n)
      if (entries) found.add(`${entries.index}\0${entries.over}`)
    }
  })
  return [...found].sort().map((pair) => {
    const [v, target] = pair.split('\0')
    return { label: v, var: v, target }
  })
}

/** `for (const [i, x] of xs.entries())`: its index, item and array names. */
function entriesLoop(n: Node): { index: string; item: string; over: string; overNode: Node } | null {
  const r = n.right
  const pattern = n.left.type === 'VariableDeclaration' ? n.left.declarations[0].id : null
  if (
    r.type === 'CallExpression' &&
    r.arguments.length === 0 &&
    r.callee.type === 'MemberExpression' &&
    !r.callee.computed &&
    r.callee.property.name === 'entries' &&
    r.callee.object.type === 'Identifier' &&
    pattern?.type === 'ArrayPattern' &&
    pattern.elements.length === 2 &&
    pattern.elements.every((e: Node | null) => e?.type === 'Identifier')
  ) {
    return { index: pattern.elements[0].name, item: pattern.elements[1].name, over: r.callee.object.name, overNode: r.callee.object }
  }
  return null
}

/** `for (const n of nums)` and `for (const [i, n] of nums.entries())`: which array each step's `n` comes from. */
function loopPlans(program: Node, source: string): LoopPlan[] {
  const lines = source.split('\n')
  const loops: LoopPlan[] = []
  walk(program, (n) => {
    if (n.type !== 'ForOfStatement') return
    const line = n.loc.start.line
    const pattern = n.left.type === 'VariableDeclaration' ? n.left.declarations[0].id : n.left
    if (pattern.type === 'Identifier' && n.right.type === 'Identifier') {
      loops.push({ item: pattern.name, over: n.right.name, index: null, ...span(n.right, lines), line })
      return
    }
    const entries = entriesLoop(n)
    if (entries) loops.push({ item: entries.item, over: entries.over, index: entries.index, ...span(entries.overNode, lines), line })
  })
  return loops
}
