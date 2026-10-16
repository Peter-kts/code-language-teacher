import { spawnSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'
import { runTests, runTraced } from '../js/runtime'
import type { RunCase, TestResult } from '../types'
import { PROBLEMS, type Problem } from './problems'
import { REFERENCES } from './reference'

// Every problem is checked in both languages: its worked answer passes every case and the
// speed test, its slow answer runs out of steps, and its starters run without an error.
// Python runs in CPython with the same tracer.py the browser loads into Pyodide.

const cases = (p: Problem): RunCase[] => (p.speed ? [...p.tests, p.speed] : p.tests)

interface PyJob {
  code: string
  name: string
  cases?: RunCase[]
  call?: { name: string; args: unknown[] }
  io?: Problem['io']
}

const PY_RUNNER = `
import json, sys
sys.path.insert(0, "src/python")
from tracer import run_tests, run_traced
out = []
for job in json.load(sys.stdin):
    if "call" in job:
        out.append(json.loads(run_traced(job["code"], call=job["call"], node_io=job.get("io"))))
    else:
        out.append(json.loads(run_tests(job["code"], job["name"], job["cases"], max_seconds=20, node_io=job.get("io"))))
print(json.dumps(out))
`

function runPython<T>(jobs: PyJob[]): T[] {
  const done = spawnSync('python3', ['-c', PY_RUNNER], { input: JSON.stringify(jobs), encoding: 'utf8', maxBuffer: 1 << 28 })
  if (done.status !== 0) throw new Error(done.stderr)
  return JSON.parse(done.stdout)
}

const failures = (p: Problem, results: TestResult[]) =>
  results.flatMap((r, i) => (r.passed ? [] : [`${p.id} case ${i === p.tests.length ? 'speed' : i + 1}: ${r.error ?? `got ${r.got}`}`]))

describe('reference answers', () => {
  it('exist for every problem, with a slow version wherever there is a speed test', () => {
    for (const p of PROBLEMS) {
      const ref = REFERENCES[p.id]
      expect(ref, p.id).toBeDefined()
      if (p.speed) expect(ref.slow, `${p.id} has a speed test, so it needs a slow answer`).toBeDefined()
    }
  })

  it('pass every case and the speed test in JavaScript', () => {
    for (const p of PROBLEMS) {
      expect(failures(p, runTests(REFERENCES[p.id].javascript, p.functionName, cases(p), p.io))).toEqual([])
    }
  })

  it('pass every case and the speed test in Python', () => {
    const results = runPython<TestResult[]>(
      PROBLEMS.map((p) => ({ code: REFERENCES[p.id].python, name: p.functionName, cases: cases(p), io: p.io })),
    )
    expect(PROBLEMS.flatMap((p, i) => failures(p, results[i]))).toEqual([])
  })

  it('run out of steps when slow, in both languages, while still answering the small cases', () => {
    const slow = PROBLEMS.filter((p) => p.speed)
    const py = runPython<TestResult[]>(slow.map((p) => ({ code: REFERENCES[p.id].slow!.python, name: p.functionName, cases: cases(p), io: p.io })))
    slow.forEach((p, i) => {
      const js = runTests(REFERENCES[p.id].slow!.javascript, p.functionName, cases(p), p.io)
      for (const [language, results] of [
        ['javascript', js],
        ['python', py[i]],
      ] as const) {
        expect(results.slice(0, p.tests.length).every((r) => r.passed), `${p.id} (${language}): the slow answer should still be right`).toBe(true)
        expect(results[p.tests.length].error ?? '', `${p.id} (${language}): the slow answer should be too slow`).toMatch(/^too slow/)
      }
    })
  })

  it('leave the fast answer plenty of room under the step budget', () => {
    // A fast answer written a little differently (more lines per pass) should still pass.
    const py = runPython<TestResult[]>(
      PROBLEMS.filter((p) => p.speed).map((p) => ({ code: REFERENCES[p.id].python, name: p.functionName, cases: [p.speed!], io: p.io })),
    )
    PROBLEMS.filter((p) => p.speed).forEach((p, i) => {
      const js = runTests(REFERENCES[p.id].javascript, p.functionName, [p.speed!], p.io)[0]
      for (const r of [js, py[i][0]]) expect(r.steps! * 2, `${p.id}: ${r.steps} of ${p.speed!.maxSteps} steps`).toBeLessThanOrEqual(p.speed!.maxSteps)
    })
  })
})

describe('starters', () => {
  it('run without an error in both languages', () => {
    for (const p of PROBLEMS) {
      const run = runTraced(p.starters.javascript, { name: p.functionName, args: p.tests[0].args }, undefined, p.io)
      expect(run.ok && run.error, `${p.id} (javascript)`).toBe(null)
    }
    const py = runPython<{ ok: boolean; error: unknown }>(
      PROBLEMS.map((p) => ({ code: p.starters.python, name: p.functionName, call: { name: p.functionName, args: p.tests[0].args }, io: p.io })),
    )
    PROBLEMS.forEach((p, i) => expect(py[i].ok && py[i].error, `${p.id} (python)`).toBe(null))
  })
})
