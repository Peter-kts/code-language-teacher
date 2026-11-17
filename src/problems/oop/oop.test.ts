import { spawnSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'
import { runTests, runTraced } from '../../js/runtime'
import { cardFor } from '../../syntax/cards'
import type { Language, RunCase, TestResult, TraceResult } from '../../types'
import { buildObjectScene, isObjectModel } from '../../viz/objects'
import { JS_CONCEPTS } from '../concepts'
import { CONCEPT_GROUPS, PROBLEMS, runCases } from '../problems'
import { PY_CONCEPTS } from '../pyConcepts'
import { OOP_PROBLEMS } from '.'

// Every object problem, in both languages: its starter runs, its tests fail on the starter and
// pass on the worked answer. Python runs in CPython with the same tracer.py the browser loads.

type Job = { trace: string } | { code: string; name: string; cases: RunCase[] }

const RUNNER = `
import json, sys
sys.path.insert(0, "src/python")
from tracer import run_tests, run_traced
out = []
for job in json.load(sys.stdin):
    if "trace" in job:
        out.append(json.loads(run_traced(job["trace"])))
    else:
        out.append(json.loads(run_tests(job["code"], job["name"], job["cases"], max_seconds=20)))
print(json.dumps(out))
`

function runPython<T>(jobs: Job[]): T[] {
  const done = spawnSync('python3', ['-c', RUNNER], { input: JSON.stringify(jobs), encoding: 'utf8', maxBuffer: 1 << 28 })
  if (done.status !== 0) throw new Error(done.stderr)
  return JSON.parse(done.stdout)
}

const builds = OOP_PROBLEMS.filter((p) => p.kind === 'build')
const failing = (results: TestResult[]) => results.flatMap((r, i) => (r.passed ? [] : [`${i + 1}: ${r.error ?? `got ${r.got}`}`]))
const LANGUAGES: Language[] = ['python', 'javascript']

describe('object-oriented problems', () => {
  it('have ids of their own, a section, hints, glossary cards, and tests or an explanation', () => {
    const ids = [...PROBLEMS, ...JS_CONCEPTS, ...PY_CONCEPTS, ...OOP_PROBLEMS].map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
    const groups = new Set(CONCEPT_GROUPS.map((g) => g.id))
    for (const p of OOP_PROBLEMS) {
      expect(p.track, p.id).toBe('oop')
      expect(groups.has(p.group!), p.id).toBe(true)
      expect(p.hints.length, p.id).toBeGreaterThan(0)
      for (const language of LANGUAGES) {
        expect(p.starters[language].trim(), `${p.id} ${language}`).not.toBe('')
        expect(p.concepts[language].length, p.id).toBeGreaterThan(0)
        for (const id of p.concepts[language]) expect(cardFor(language, id), `${p.id}: ${language} card ${id}`).toBeDefined()
      }
      if (p.kind === 'build') {
        expect(p.tests.length, p.id).toBeGreaterThan(0)
        expect(p.tests.every((t) => t.run && t.name), p.id).toBe(true)
        expect(p.answer, p.id).toBeDefined()
      } else {
        expect(p.explain?.length, p.id).toBeGreaterThan(0)
      }
    }
  })

  it('have starters and worked answers that run without an error in Python', () => {
    const codes = OOP_PROBLEMS.flatMap((p) => [p.starters.python, ...(p.answer ? [p.answer.python] : [])])
    const runs = runPython<TraceResult>(codes.map((trace) => ({ trace })))
    runs.forEach((run, i) => {
      expect(run.ok && run.error, codes[i].slice(0, 200)).toBe(null)
      expect(run.ok && run.truncated, codes[i].slice(0, 200)).toBe(false)
    })
  })

  it('have starters and worked answers that run without an error in JavaScript', () => {
    for (const p of OOP_PROBLEMS) {
      for (const code of [p.starters.javascript, ...(p.answer ? [p.answer.javascript] : [])]) {
        const run = runTraced(code)
        expect(run.ok ? run.error : run.error.message, p.id).toBe(null)
        expect(run.ok && run.truncated, p.id).toBe(false)
      }
    }
  })

  it('fail their tests on the starter and pass on the worked answer, in Python', () => {
    const cases = (p: (typeof builds)[number]) => runCases(p.tests, 'python')
    const before = runPython<TestResult[]>(builds.map((p) => ({ code: p.starters.python, name: p.functionName, cases: cases(p) })))
    const after = runPython<TestResult[]>(builds.map((p) => ({ code: p.answer!.python, name: p.functionName, cases: cases(p) })))
    builds.forEach((p, i) => {
      expect(before[i].some((r) => !r.passed), p.id).toBe(true)
      expect(failing(after[i]), p.id).toEqual([])
    })
  })

  it('fail their tests on the starter and pass on the worked answer, in JavaScript', () => {
    for (const p of builds) {
      const cases = runCases(p.tests, 'javascript')
      expect(runTests(p.starters.javascript, p.functionName, cases).some((r) => !r.passed), p.id).toBe(true)
      expect(failing(runTests(p.answer!.javascript, p.functionName, cases)), p.id).toEqual([])
    }
  })

  it('print what the shared manifest explanation says', () => {
    const p = OOP_PROBLEMS.find((q) => q.id === 'oop-shared-manifest')!
    const [py] = runPython<TraceResult>([{ trace: p.starters.python }])
    const js = runTraced(p.starters.javascript)
    if (!py.ok || !js.ok) throw new Error('did not run')
    expect(py.stdout).toBe("['C1']\nTrue\n[]\n")
    expect(js.stdout).toBe('["C1"]\ntrue\n[]\n')
  })

  it('draw the shared manifest as one list on the class, in both languages', () => {
    const p = OOP_PROBLEMS.find((q) => q.id === 'oop-shared-manifest')!
    const [py] = runPython<TraceResult>([{ trace: p.starters.python }])
    const js = runTraced(p.starters.javascript)
    for (const run of [py, js]) {
      if (!run.ok) throw new Error('did not run')
      const last = run.steps[run.steps.length - 1]
      expect(isObjectModel(last)).toBe(true)
      const scene = buildObjectScene(last, undefined)!
      const atlas = scene.roots.find((r) => r.name === 'atlas')!.value
      const borealis = scene.roots.find((r) => r.name === 'borealis')!.value
      if (atlas.kind !== 'object' || borealis.kind !== 'object') throw new Error('not cards')
      // The manifest is listed under "on the class" on both ships, holding C1 on both.
      for (const card of [atlas.card, borealis.card]) {
        expect(card.classFields.map((f) => f.name)).toEqual([run === py ? 'manifest' : 'static manifest'])
        expect(card.classFields[0].value).toMatchObject({ kind: 'list', items: [{ kind: 'plain' }] })
      }
      // In Python both ships reach it as their own field, so the second is marked as the first's list.
      if (run === py) expect(borealis.card.classFields[0].value).toMatchObject({ sharedWith: ['atlas.manifest'] })
      // The trucks' loads are their own.
      const t2 = scene.roots.find((r) => r.name === 't2')!.value
      if (t2.kind !== 'object') throw new Error('not a card')
      expect(t2.card.classFields).toEqual([])
      expect(t2.card.fields.map((f) => f.name)).toContain('load')
    }
  })

  it('draw the port as boxes inside boxes, with each container once', () => {
    const p = OOP_PROBLEMS.find((q) => q.id === 'oop-port-5-port')!
    const [py] = runPython<TraceResult>([{ trace: p.answer!.python }])
    const js = runTraced(p.answer!.javascript)
    for (const run of [py, js]) {
      if (!run.ok) throw new Error('did not run')
      const last = run.steps[run.steps.length - 1]
      const scene = buildObjectScene(last, undefined)!
      const port = scene.roots.find((r) => r.name === 'port')!.value
      if (port.kind !== 'object') throw new Error('not a card')
      expect(port.card.cls).toBe('Port')
      const yard = port.card.fields.find((f) => f.name === 'yard')!.value
      expect(yard).toMatchObject({ kind: 'object', card: { cls: 'Yard' } })
      // atlas and borealis are also variables: drawn inside the port first, then as chips.
      const atlas = scene.roots.find((r) => r.name === 'atlas')!.value
      expect(atlas.kind === 'seen' || atlas.kind === 'object').toBe(true)
    }
  })
})
