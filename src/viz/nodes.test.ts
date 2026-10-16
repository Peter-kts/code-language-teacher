import { describe, expect, it } from 'vitest'
import { runTraced } from '../js/runtime'
import type { NodeIo, Step } from '../types'
import { buildNodeGraph } from './nodes'

function steps(code: string, args: unknown[], io: NodeIo): Step[] {
  const run = runTraced(code, { name: 'f', args }, undefined, io)
  if (!run.ok) throw new Error(run.error.message)
  return run.steps.filter((s) => s.func === 'f')
}

const REVERSE = `function f(head) {
  let prev = null
  let cur = head
  while (cur) {
    const nxt = cur.next
    cur.next = prev
    prev = cur
    cur = nxt
  }
  return prev
}`

describe('node drawings', () => {
  it('lays a linked list out in a row, with names on the nodes they point at', () => {
    const [first] = steps(REVERSE, [[1, 2, 3]], { args: ['list'], result: 'list' })
    const g = buildNodeGraph(first)!
    expect(g.shape).toBe('list')
    expect(g.nodes.map((n) => [n.label, n.x, n.y])).toEqual([
      ['1', 0, 0],
      ['2', 1, 0],
      ['3', 2, 0],
    ])
    expect(Object.values(g.names)).toEqual([['head']])
    // The last node's next is null: drawn as a stub.
    expect(g.edges.filter((e) => e.to === null)).toHaveLength(1)
  })

  it('marks the arrow a line just turned around', () => {
    const all = steps(REVERSE, [[1, 2, 3]], { args: ['list'], result: 'list' })
    const i = all.findIndex((s, k) => k > 0 && JSON.stringify(s.nodes) !== JSON.stringify(all[k - 1].nodes))
    const g = buildNodeGraph(all[i], all[i - 1])!
    const flipped = g.edges.filter((e) => e.changed)
    expect(flipped).toHaveLength(1)
    expect(flipped[0].field).toBe('next')
    // Two chains now: prev's (1 → null) and nxt's (2 → 3), on separate rows.
    expect(new Set(g.nodes.map((n) => n.y)).size).toBe(2)
  })

  it('lays a tree out by depth, left to right in order', () => {
    const [first] = steps('function f(root) {\n  return root\n}', [[4, 2, 7, 1, 3]], { args: ['tree'] })
    const g = buildNodeGraph(first)!
    expect(g.shape).toBe('tree')
    const at = Object.fromEntries(g.nodes.map((n) => [n.label, [n.x, n.y]]))
    expect(at).toEqual({ '1': [0, 2], '2': [1, 1], '3': [2, 2], '4': [3, 0], '7': [4, 1] })
  })

  it('draws a cycle without looping forever', () => {
    const [first] = steps('function f(head) {\n  return head\n}', [{ values: [1, 2, 3], pos: 1 }], { args: ['cycle'] })
    const g = buildNodeGraph(first)!
    expect(g.nodes).toHaveLength(3)
    expect(g.edges.find((e) => e.from === g.nodes[2].id)!.to).toBe(g.nodes[1].id)
  })
})
