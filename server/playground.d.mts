// Types for playground.mjs, so the browser code (TypeScript) can import it.

export type Cell = string | number | null
export interface SqlTable {
  name: string
  columns: string
  rows: Cell[][]
}
export interface PlaygroundState {
  code: string
  /** Only in the SQL workspace: the tables the query runs on. */
  tables?: SqlTable[]
}

export const MAX_ROWS: number
export class PlaygroundEditError extends Error {}
export function playgroundTools(subject: 'python' | 'javascript' | 'sql'): { name: string; description: string; input_schema: Record<string, unknown> }[]
export function applyTool(state: PlaygroundState, name: string, input: unknown): { state: PlaygroundState; summary: string }
export function columnNames(columns: string): string[]
export function changedLines(before: string, after: string): number[]
export function describeTables(tables: SqlTable[], maxRows?: number, maxChars?: number): string
export function readPlayground(raw: unknown, code: unknown): PlaygroundState
