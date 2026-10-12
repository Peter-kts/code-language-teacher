/// <reference lib="webworker" />
import { runTests, runTraced } from '../js/runtime'
import type { TestResult, TraceResult } from '../types'
import type { WorkerRequest, WorkerResponse } from './pyodide.worker'

// The JavaScript twin of pyodide.worker.ts: same messages, but nothing to load first.
// The learner's code runs here, off the page's thread, so a slow loop can't freeze the editor.

self.postMessage({ type: 'ready' } satisfies WorkerResponse)

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const { id, code, call, tests } = event.data
  let result: TraceResult
  let testResults: TestResult[] | null = null
  try {
    result = runTraced(code, call ?? null)
    if (result.ok && call && tests) testResults = runTests(code, call.name, tests)
  } catch (err) {
    result = { ok: false, error: { kind: 'internal', message: String(err), line: null } }
  }
  self.postMessage({ type: 'result', id, result, tests: testResults } satisfies WorkerResponse)
}
