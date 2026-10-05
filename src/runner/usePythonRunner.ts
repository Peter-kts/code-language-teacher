import { useEffect, useRef, useState } from 'react'
import type { CodeError, TraceResult } from '../types'
import type { WorkerRequest, WorkerResponse } from './pyodide.worker'

export type RunnerStatus = 'loading' | 'running' | 'idle'

/** A successful trace: the visual keeps showing the last one while code is broken. */
export type GoodTrace = Extract<TraceResult, { ok: true }>

const DEBOUNCE_MS = 300
// The tracer caps steps, but a single slow line (e.g. 10**10**8) can still hang.
const RUN_TIMEOUT_MS = 5000

function spawnWorker() {
  return new Worker(new URL('./pyodide.worker.ts', import.meta.url), { type: 'module' })
}

/** Re-run `code` shortly after each edit; keep the last trace that compiled. */
export function usePythonRunner(code: string) {
  const [status, setStatusState] = useState<RunnerStatus>('loading')
  const statusRef = useRef<RunnerStatus>('loading')
  const setStatus = (next: RunnerStatus) => {
    statusRef.current = next
    setStatusState(next)
  }
  const [trace, setTrace] = useState<GoodTrace | null>(null)
  const [error, setError] = useState<CodeError | null>(null)
  const workerRef = useRef<Worker | null>(null)
  const latestId = useRef(0)
  const timeoutRef = useRef<number | undefined>(undefined)

  const attach = (worker: Worker) => {
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const msg = event.data
      if (msg.type === 'ready') {
        if (statusRef.current === 'loading') setStatus('idle')
        return
      }
      if (msg.id !== latestId.current) return
      window.clearTimeout(timeoutRef.current)
      setStatus('idle')
      if (msg.result.ok) {
        setTrace(msg.result)
        setError(msg.result.error)
      } else {
        setError(msg.result.error)
      }
    }
    workerRef.current = worker
  }

  useEffect(() => {
    attach(spawnWorker())
    return () => {
      window.clearTimeout(timeoutRef.current)
      workerRef.current?.terminate()
    }
  }, [])

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const id = ++latestId.current
      if (statusRef.current !== 'loading') setStatus('running')
      workerRef.current?.postMessage({ id, code } satisfies WorkerRequest)
      window.clearTimeout(timeoutRef.current)
      timeoutRef.current = window.setTimeout(() => {
        if (id !== latestId.current) return
        // Only a stuck run gets here; Pyodide's first load is covered by 'loading'.
        if (statusRef.current !== 'running') return
        workerRef.current?.terminate()
        attach(spawnWorker())
        setStatus('loading')
        setError({ kind: 'runtime', message: 'Stopped: the code took too long to run.', line: null })
      }, RUN_TIMEOUT_MS)
    }, DEBOUNCE_MS)
    return () => window.clearTimeout(handle)
  }, [code])

  return { status, trace, error }
}
