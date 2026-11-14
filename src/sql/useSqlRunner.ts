import { useEffect, useRef, useState } from 'react'
import type { CheckSpec, RunOutput, SqlTable } from './engine'
import type { SqlRequest, SqlResponse } from './sql.worker'

// Runs the SQL shortly after each edit, like useRunner does for Python and JavaScript.
// Keeps the last output that ran without an error, so a half-typed query doesn't blank the tables.

export type SqlStatus = 'loading' | 'running' | 'idle'

/** One run's output, with the exact code it ran (the editor may be ahead of it). */
export type SqlRun = RunOutput & { code: string; /** Which tables and checks it ran against. */ dataKey: string }

const DEBOUNCE_MS = 300
// A recursive CTE without a stop can loop forever.
const RUN_TIMEOUT_MS = 4000

const spawn = () => new Worker(new URL('./sql.worker.ts', import.meta.url), { type: 'module' })

export function useSqlRunner(code: string, tables: SqlTable[], check: CheckSpec | undefined, enabled: boolean) {
  const key = JSON.stringify({ code, tables, check })
  const [status, setStatusState] = useState<SqlStatus>('loading')
  const statusRef = useRef<SqlStatus>('loading')
  const setStatus = (s: SqlStatus) => {
    statusRef.current = s
    setStatusState(s)
  }
  // The latest output, and the latest one without an error (what the stages and tables keep showing).
  const [output, setOutput] = useState<SqlRun | null>(null)
  const [good, setGood] = useState<SqlRun | null>(null)
  // Results from another problem or test case belong to other tables, so they're never handed out,
  // not even for the one render between switching and the new run starting.
  const dataKey = JSON.stringify({ tables, check })
  const sent = useRef(new Map<number, { code: string; dataKey: string }>())
  const [failure, setFailure] = useState<string | null>(null)
  const workerRef = useRef<Worker | null>(null)
  const latest = useRef(0)
  const timer = useRef<number | undefined>(undefined)

  const attach = (worker: Worker) => {
    worker.onmessage = (e: MessageEvent<SqlResponse>) => {
      const msg = e.data
      if (msg.type === 'ready') {
        if (statusRef.current === 'loading') setStatus('idle')
        return
      }
      if (msg.id !== latest.current && msg.id !== 0) return
      window.clearTimeout(timer.current)
      setStatus('idle')
      if (msg.type === 'failed') {
        setFailure(msg.message)
        return
      }
      setFailure(null)
      const run = { ...msg.output, code: '', dataKey: '', ...sent.current.get(msg.id) }
      sent.current.clear()
      setOutput(run)
      if (!run.error) setGood(run)
    }
    workerRef.current = worker
  }

  useEffect(() => {
    if (!enabled) return
    setStatus('loading')
    attach(spawn())
    return () => {
      window.clearTimeout(timer.current)
      workerRef.current?.terminate()
      workerRef.current = null
    }
  }, [enabled])

  useEffect(() => {
    if (!enabled) return
    const handle = window.setTimeout(() => {
      const id = ++latest.current
      const req = JSON.parse(key) as Omit<SqlRequest, 'id'>
      if (statusRef.current !== 'loading') setStatus('running')
      sent.current.set(id, { code: req.code, dataKey: JSON.stringify({ tables: req.tables, check: req.check }) })
      workerRef.current?.postMessage({ id, ...req } satisfies SqlRequest)
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => {
        if (id !== latest.current || statusRef.current === 'loading') return
        workerRef.current?.terminate()
        attach(spawn())
        setStatus('loading')
        setFailure('Stopped: the query took too long. A recursive CTE needs a WHERE that ends it.')
      }, RUN_TIMEOUT_MS)
    }, DEBOUNCE_MS)
    return () => window.clearTimeout(handle)
  }, [key, enabled])

  const current = (run: SqlRun | null) => (run?.dataKey === dataKey ? run : null)
  return { status, output: current(output), good: current(good), failure }
}
