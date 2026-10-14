import { useEffect, useRef, useState } from 'react'
import type { CodeError, Language, RunRequest, TestResult, TraceResult } from '../types'
import type { WorkerRequest, WorkerResponse } from './pyodide.worker'

export type RunnerStatus = 'loading' | 'running' | 'idle'

/** A successful trace: the visual keeps showing the last one while code is broken. */
export type GoodTrace = Extract<TraceResult, { ok: true }> & {
  /** The source that produced this trace (may lag the editor while code is broken). */
  code: string
  /** The language it ran in: right after a switch, the other language's trace is still showing. */
  language: Language
}

const DEBOUNCE_MS = 300
// The tracer caps steps, but a single slow line (e.g. 10**10**8) can still hang.
const RUN_TIMEOUT_MS = 5000

// Each language runs in its own worker; both answer with the same messages.
function spawnWorker(language: Language) {
  return language === 'javascript'
    ? new Worker(new URL('./js.worker.ts', import.meta.url), { type: 'module' })
    : new Worker(new URL('./pyodide.worker.ts', import.meta.url), { type: 'module' })
}

/**
 * Re-run shortly after each edit; keep the last trace that compiled.
 * Switching `language` starts that language's worker with a clean slate.
 */
export function useRunner(request: RunRequest, language: Language) {
  // Effects key off the serialized request so a new-but-equal object doesn't re-run.
  const requestKey = JSON.stringify(request)
  const [status, setStatusState] = useState<RunnerStatus>('loading')
  const statusRef = useRef<RunnerStatus>('loading')
  const setStatus = (next: RunnerStatus) => {
    statusRef.current = next
    setStatusState(next)
  }
  const [trace, setTrace] = useState<GoodTrace | null>(null)
  const [error, setError] = useState<CodeError | null>(null)
  const [tests, setTests] = useState<TestResult[] | null>(null)
  // The function the trace and tests above called, so a caller can tell they're from another problem.
  const [ranFor, setRanFor] = useState<string | null>(null)
  const workerRef = useRef<Worker | null>(null)
  const latestId = useRef(0)
  const latestCode = useRef('')
  const latestCall = useRef<string | null>(null)
  const timeoutRef = useRef<number | undefined>(undefined)

  const attach = (worker: Worker, ranIn: Language) => {
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
        setTrace({ ...msg.result, code: latestCode.current, language: ranIn })
        setError(msg.result.error)
        setTests(msg.tests)
        setRanFor(latestCall.current)
      } else {
        setError(msg.result.error)
      }
    }
    workerRef.current = worker
  }

  useEffect(() => {
    setStatus('loading')
    setTrace(null)
    setError(null)
    setTests(null)
    setRanFor(null)
    attach(spawnWorker(language), language)
    return () => {
      window.clearTimeout(timeoutRef.current)
      workerRef.current?.terminate()
    }
  }, [language])

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const id = ++latestId.current
      const req = JSON.parse(requestKey) as RunRequest
      latestCode.current = req.code
      latestCall.current = req.call?.name ?? req.testFor ?? null
      if (statusRef.current !== 'loading') setStatus('running')
      workerRef.current?.postMessage({ id, ...req } satisfies WorkerRequest)
      window.clearTimeout(timeoutRef.current)
      timeoutRef.current = window.setTimeout(() => {
        if (id !== latestId.current) return
        // Only a stuck run gets here; Pyodide's first load is covered by 'loading'.
        if (statusRef.current !== 'running') return
        workerRef.current?.terminate()
        attach(spawnWorker(language), language)
        setStatus('loading')
        setError({ kind: 'runtime', message: 'Stopped: the code took too long to run.', line: null })
      }, RUN_TIMEOUT_MS)
    }, DEBOUNCE_MS)
    return () => window.clearTimeout(handle)
  }, [requestKey, language])

  return { status, trace, error, tests, ranFor }
}
