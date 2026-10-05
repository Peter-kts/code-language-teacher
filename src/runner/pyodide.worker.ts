/// <reference lib="webworker" />
import { loadPyodide, type PyodideInterface } from 'pyodide'
import tracerSource from '../python/tracer.py?raw'
import type { RunRequest, TestResult, TraceResult } from '../types'

export type WorkerRequest = { id: number } & RunRequest
export type WorkerResponse =
  | { type: 'ready' }
  | { type: 'result'; id: number; result: TraceResult; tests: TestResult[] | null }

const indexURL = new URL(`${import.meta.env.BASE_URL}pyodide/`, self.location.origin).href

const pyodideReady: Promise<PyodideInterface> = loadPyodide({ indexURL }).then((py) => {
  py.FS.writeFile('/home/pyodide/tracer.py', tracerSource)
  py.runPython('import sys; sys.path.insert(0, "/home/pyodide")\nimport json\nfrom tracer import run_traced, run_tests')
  self.postMessage({ type: 'ready' } satisfies WorkerResponse)
  return py
})

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const { id, code, call, tests } = event.data
  let result: TraceResult
  let testResults: TestResult[] | null = null
  try {
    const py = await pyodideReady
    // Pass data in as JSON so Python sees plain lists and dicts.
    py.globals.set('_ct_request', JSON.stringify({ code, call: call ?? null, tests: tests ?? null }))
    result = JSON.parse(
      py.runPython('_r = json.loads(_ct_request)\nrun_traced(_r["code"], call=_r["call"])'),
    )
    if (result.ok && call && tests) {
      testResults = JSON.parse(py.runPython('run_tests(_r["code"], _r["call"]["name"], _r["tests"])'))
    }
  } catch (err) {
    result = { ok: false, error: { kind: 'internal', message: String(err), line: null } }
  }
  self.postMessage({ type: 'result', id, result, tests: testResults } satisfies WorkerResponse)
}
