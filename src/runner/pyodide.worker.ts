/// <reference lib="webworker" />
import { loadPyodide, type PyodideInterface } from 'pyodide'
import tracerSource from '../python/tracer.py?raw'
import type { TraceResult } from '../types'

export type WorkerRequest = { id: number; code: string }
export type WorkerResponse =
  | { type: 'ready' }
  | { type: 'result'; id: number; result: TraceResult }

const indexURL = new URL(`${import.meta.env.BASE_URL}pyodide/`, self.location.origin).href

const pyodideReady: Promise<PyodideInterface> = loadPyodide({ indexURL }).then((py) => {
  py.FS.writeFile('/home/pyodide/tracer.py', tracerSource)
  py.runPython('import sys; sys.path.insert(0, "/home/pyodide")\nfrom tracer import run_traced')
  self.postMessage({ type: 'ready' } satisfies WorkerResponse)
  return py
})

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const { id, code } = event.data
  let result: TraceResult
  try {
    const py = await pyodideReady
    const runTraced = py.globals.get('run_traced')
    const json: string = runTraced(code)
    runTraced.destroy()
    result = JSON.parse(json)
  } catch (err) {
    result = { ok: false, error: { kind: 'internal', message: String(err), line: null } }
  }
  self.postMessage({ type: 'result', id, result } satisfies WorkerResponse)
}
