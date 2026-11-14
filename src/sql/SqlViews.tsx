import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import type { Cell, Comparison, JoinPicture, NamedResult, ResultSet, StageResult } from './engine'
import type { JoinKind } from './stages'

// The drawings of the SQL workspace: tables, the query's stages, the join picture and your result next to
// the expected one. All plain React and SVG, fed by what sql.worker.ts sends back.

export function CellView({ value }: { value: Cell }) {
  if (value === null) return <span className="sql-null">NULL</span>
  if (typeof value === 'number') return <>{Number.isInteger(value) ? value : Number(value.toFixed(6))}</>
  return <>{value}</>
}

export function SqlTable({
  result,
  caption,
  rowClass,
  hideFirst = false,
  onRowHover,
  rowRef,
  empty = 'no rows',
}: {
  result: ResultSet
  caption?: ReactNode
  rowClass?: (i: number, row: Cell[]) => string | undefined
  /** Leave out a helper column (the group number of the GROUP BY stage). */
  hideFirst?: boolean
  onRowHover?: (i: number | null) => void
  rowRef?: (i: number, el: HTMLTableRowElement | null) => void
  empty?: string
}) {
  const from = hideFirst ? 1 : 0
  return (
    <div className="sql-table-wrap">
      <table className="sql-table">
        {caption && <caption>{caption}</caption>}
        <thead>
          <tr>
            {result.columns.slice(from).map((c, i) => (
              <th key={i}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {result.rows.map((row, i) => (
            <tr
              key={i}
              className={rowClass?.(i, row)}
              ref={rowRef && ((el) => rowRef(i, el))}
              onMouseEnter={onRowHover && (() => onRowHover(i))}
              onMouseLeave={onRowHover && (() => onRowHover(null))}
            >
              {row.slice(from).map((v, j) => (
                <td key={j} className={typeof v === 'number' ? 'num' : undefined}>
                  <CellView value={v} />
                </td>
              ))}
            </tr>
          ))}
          {result.rows.length === 0 && (
            <tr className="sql-empty-row">
              <td colSpan={Math.max(1, result.columns.length - from)}>{empty}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

/** The input tables, side by side. */
export function TablesView({ tables, title }: { tables: NamedResult[]; title: string }) {
  return (
    <details className="sql-section" open>
      <summary>
        {title} <span className="muted">{tables.length}</span>
      </summary>
      <div className="sql-tables">
        {tables.map((t) => (
          <SqlTable
            key={t.name}
            result={t}
            caption={
              <>
                <strong>{t.name}</strong> <span className="muted">{t.rows.length} rows</span>
              </>
            }
          />
        ))}
      </div>
    </details>
  )
}

// ---------- Stages ----------

const BANDS = 6

export function StageTable({ stage }: { stage: StageResult }) {
  if (stage.view === 'groups') {
    return <SqlTable result={stage.result} hideFirst rowClass={(_, row) => `band band-${(Number(row[0]) - 1) % BANDS}`} />
  }
  if (stage.view === 'having') {
    const last = stage.result.columns.length - 1
    return <SqlTable result={stage.result} rowClass={(_, row) => (row[last] === 'dropped' ? 'row-dropped' : 'row-kept')} />
  }
  return <SqlTable result={stage.result} />
}

/** How the row count changed from the stage before, in words. */
export function stageCount(stages: StageResult[], i: number): string {
  const s = stages[i]
  const n = s.result.rows.length
  const rows = (k: number) => `${k} row${k === 1 ? '' : 's'}`
  const prev = stages[i - 1]
  if (s.id === 'where' && prev) return `kept ${n} of ${rows(prev.result.rows.length)}`
  if (s.id === 'group') {
    const groups = new Set(s.result.rows.map((r) => r[0])).size
    return `${rows(n)} in ${groups} group${groups === 1 ? '' : 's'}`
  }
  if (s.id === 'having') {
    const kept = s.result.rows.filter((r) => r.at(-1) === 'kept').length
    return `kept ${kept} of ${n} group${n === 1 ? '' : 's'}`
  }
  return s.result.rows.length >= 200 ? 'first 200 rows' : rows(n)
}

// ---------- The join picture ----------

/** A small Venn picture of which rows a join keeps. */
export function Venn({ kind }: { kind: JoinKind }) {
  const id = useRef(`venn-${Math.random().toString(36).slice(2)}`).current
  if (kind === 'cross') {
    return (
      <svg className="venn" viewBox="0 0 56 36" aria-hidden="true">
        {[0, 1, 2].map((r) => [0, 1, 2, 3].map((c) => <rect key={`${r}${c}`} x={6 + c * 12} y={4 + r * 10} width={8} height={7} rx={1.5} className="venn-fill" />))}
      </svg>
    )
  }
  const leftAll = kind === 'left' || kind === 'full'
  const rightAll = kind === 'right' || kind === 'full'
  return (
    <svg className="venn" viewBox="0 0 56 36" aria-hidden="true">
      <defs>
        <clipPath id={id}>
          <circle cx="21" cy="18" r="14" />
        </clipPath>
      </defs>
      {leftAll && <circle cx="21" cy="18" r="14" className="venn-fill" />}
      {rightAll && <circle cx="35" cy="18" r="14" className="venn-fill" />}
      <circle cx="35" cy="18" r="14" className="venn-fill" clipPath={`url(#${id})`} />
      <circle cx="21" cy="18" r="14" className="venn-line" />
      <circle cx="35" cy="18" r="14" className="venn-line" />
    </svg>
  )
}

const KEEPS: Record<JoinKind, string> = {
  inner: 'keeps only rows that match on both sides',
  left: 'keeps every left row; no match means NULLs on the right',
  right: 'keeps every right row; no match means NULLs on the left',
  full: 'keeps every row from both sides, NULL-filled where there is no match',
  cross: 'pairs every row with every row',
}

const MAX_LINES = 80

export function JoinView({ join }: { join: JoinPicture }) {
  const { shape, left, right, pairs } = join
  const gridRef = useRef<HTMLDivElement>(null)
  const leftRows = useRef<(HTMLTableRowElement | null)[]>([])
  const rightRows = useRef<(HTMLTableRowElement | null)[]>([])
  const [ys, setYs] = useState<{ left: number[]; right: number[]; height: number } | null>(null)
  const [hover, setHover] = useState<{ side: 'left' | 'right'; i: number } | null>(null)

  // Where each row's middle is, measured after layout and again when the pane is resized.
  useLayoutEffect(() => {
    const grid = gridRef.current
    if (!grid) return
    const measure = () => {
      const top = grid.getBoundingClientRect().top
      const mid = (el: HTMLTableRowElement | null) => {
        if (!el) return 0
        const r = el.getBoundingClientRect()
        return r.top - top + r.height / 2
      }
      setYs({ left: leftRows.current.map(mid), right: rightRows.current.map(mid), height: grid.clientHeight })
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(grid)
    return () => observer.disconnect()
  }, [join])

  const leftMatched = new Set(pairs.filter(([i, j]) => i !== null && j !== null).map(([i]) => i))
  const rightMatched = new Set(pairs.filter(([i, j]) => i !== null && j !== null).map(([, j]) => j))
  const keepsLeft = shape.kind === 'left' || shape.kind === 'full'
  const keepsRight = shape.kind === 'right' || shape.kind === 'full'
  const matches = pairs.filter((p): p is [number, number] => p[0] !== null && p[1] !== null)
  const lit = (i: number, j: number) => hover && (hover.side === 'left' ? hover.i === i : hover.i === j)
  const partner = (side: 'left' | 'right', i: number) =>
    hover && hover.side !== side && matches.some(([a, b]) => (side === 'left' ? a === i && b === hover.i : b === i && a === hover.i))
  const rowClass = (side: 'left' | 'right') => (i: number) => {
    const matched = side === 'left' ? leftMatched.has(i) : rightMatched.has(i)
    const kept = side === 'left' ? keepsLeft : keepsRight
    const lit = hover?.side === side && hover.i === i
    return [matched || shape.kind === 'cross' ? 'join-matched' : kept ? 'join-kept' : 'join-dropped', (lit || partner(side, i)) && 'join-lit']
      .filter(Boolean)
      .join(' ')
  }
  const unmatchedLeft = left.rows.length - leftMatched.size
  const unmatchedRight = right.rows.length - rightMatched.size
  const label = (t: { table: string; alias: string }) => (t.alias !== t.table ? `${t.table} ${t.alias}` : t.table)
  const drawLines = matches.length <= MAX_LINES

  return (
    <section className="sql-section sql-join" aria-label="How the join matched rows">
      <div className="sql-join-head">
        <Venn kind={shape.kind} />
        <div>
          <div>
            <strong>{shape.op}</strong> {shape.condition && <code>{shape.condition}</code>}
          </div>
          <p className="muted">
            {shape.op} {KEEPS[shape.kind]}. {matches.length} matching pair{matches.length === 1 ? '' : 's'}
            {shape.kind !== 'cross' && unmatchedLeft > 0 && `, ${unmatchedLeft} left row${unmatchedLeft === 1 ? '' : 's'} ${keepsLeft ? 'kept with NULLs' : 'dropped'}`}
            {shape.kind !== 'cross' && unmatchedRight > 0 && `, ${unmatchedRight} right row${unmatchedRight === 1 ? '' : 's'} ${keepsRight ? 'kept with NULLs' : 'dropped'}`}.
            {shape.self && ' A self join: the same table on both sides, under two names.'}
            {shape.more && ' This shows the first join; the next joins add to these rows the same way.'}
          </p>
        </div>
      </div>
      <div className="sql-join-grid" ref={gridRef}>
        <SqlTable
          result={left}
          caption={<strong>{label(shape.left)}</strong>}
          rowClass={rowClass('left')}
          onRowHover={(i) => setHover(i === null ? null : { side: 'left', i })}
          rowRef={(i, el) => (leftRows.current[i] = el)}
        />
        <svg className="sql-join-lines" height={ys?.height ?? 0} viewBox={`0 0 100 ${ys?.height || 1}`} preserveAspectRatio="none" aria-hidden="true">
          {ys &&
            drawLines &&
            matches.map(([i, j], k) => (
              <path
                key={k}
                d={`M 0 ${ys.left[i]} C 50 ${ys.left[i]}, 50 ${ys.right[j]}, 100 ${ys.right[j]}`}
                className={lit(i, j) ? 'join-line lit' : hover ? 'join-line dim' : 'join-line'}
                vectorEffect="non-scaling-stroke"
              />
            ))}
        </svg>
        <SqlTable
          result={right}
          caption={<strong>{label(shape.right)}</strong>}
          rowClass={rowClass('right')}
          onRowHover={(i) => setHover(i === null ? null : { side: 'right', i })}
          rowRef={(i, el) => (rightRows.current[i] = el)}
        />
      </div>
      <p className="sql-legend muted">
        <span>
          <i className="dot matched" /> matched
        </span>
        {shape.kind !== 'cross' && (keepsLeft || keepsRight) && (
          <span>
            <i className="dot kept" /> no match, kept with NULLs
          </span>
        )}
        {shape.kind !== 'cross' && (!keepsLeft || !keepsRight) && (
          <span>
            <i className="dot dropped" /> no match, dropped
          </span>
        )}
        {!drawLines && <span>{matches.length} pairs: too many lines to draw</span>}
        <span>Hover a row to see its partners</span>
      </p>
    </section>
  )
}

// ---------- Your result next to the expected one ----------

export function CompareView({ got, expected, comparison, title }: { got: ResultSet | null; expected: ResultSet; comparison: Comparison | null; title: string }) {
  const extra = new Set(comparison?.extra)
  const missing = new Set(comparison?.missing)
  return (
    <section className="sql-section">
      <h3 className="sql-h">
        {title}
        {comparison && <span className={comparison.passed ? 'badge pass' : 'badge'}>{comparison.passed ? '✓ matches' : `✗ ${comparison.reason}`}</span>}
      </h3>
      <div className="sql-tables">
        {got ? (
          <SqlTable result={got} caption={<strong>Your result</strong>} rowClass={(i) => (extra.has(i) ? 'row-extra' : undefined)} />
        ) : (
          <p className="muted">Your query has no result yet.</p>
        )}
        <SqlTable result={expected} caption={<strong>Expected</strong>} rowClass={(i) => (missing.has(i) ? 'row-missing' : undefined)} />
      </div>
      {comparison && (comparison.extra.length > 0 || comparison.missing.length > 0) && (
        <p className="sql-legend muted">
          <span>
            <i className="dot dropped" /> a row that shouldn't be there
          </span>
          <span>
            <i className="dot kept" /> a row you are missing
          </span>
        </p>
      )}
    </section>
  )
}
