/// <reference lib="webworker" />
import initSqlJs, { type SqlJsStatic } from 'sql.js'
import wasmUrl from 'sql.js/dist/sql-wasm-browser.wasm?url'
import { runAll, type CheckSpec, type RunOutput, type SqlTable } from './engine'

// SQLite, compiled to WebAssembly, runs here off the page's thread, so a runaway query can't freeze
// the editor (useSqlRunner stops the worker if a run takes too long). Vite bundles the .wasm file,
// so nothing loads from a CDN.

export interface SqlRequest {
  id: number
  code: string
  tables: SqlTable[]
  check?: CheckSpec
}

export type SqlResponse =
  | { type: 'ready' }
  | { type: 'result'; id: number; output: RunOutput }
  | { type: 'failed'; id: number; message: string }

let ready: Promise<SqlJsStatic> | null = null
const load = () => (ready ??= initSqlJs({ locateFile: () => wasmUrl }))

load().then(
  () => self.postMessage({ type: 'ready' } satisfies SqlResponse),
  (err) => self.postMessage({ type: 'failed', id: 0, message: `SQLite failed to load: ${err}` } satisfies SqlResponse),
)

self.onmessage = async (event: MessageEvent<SqlRequest>) => {
  const { id, code, tables, check } = event.data
  try {
    const SQL = await load()
    self.postMessage({ type: 'result', id, output: runAll(SQL, code, tables, check) } satisfies SqlResponse)
  } catch (err) {
    self.postMessage({ type: 'failed', id, message: String((err as Error)?.message ?? err) } satisfies SqlResponse)
  }
}
