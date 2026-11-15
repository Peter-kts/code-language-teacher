import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import type { Cell, Comparison, JoinPicture, NamedResult, ResultSet, StageResult } from './engine'
import type { JoinKind, StageId } from './stages'
import { DROP_STEPS, type DropStep, type Effects, type TableEffect } from './effects'

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
  colClass,
  rowTag,
  ghostRows,
}: {
  result: ResultSet
  caption?: ReactNode
  rowClass?: (i: number, row: Cell[]) => string | undefined
  /** A class for every cell of a column (counted after any hidden first column). */
  colClass?: (j: number) => string | undefined
  /** A short note at the end of a row, like "dropped by WHERE". When given, the table gets a notes column. */
  rowTag?: (i: number) => ReactNode
  /** Rows that are gone (deleted), drawn crossed out after the real ones, with their note. */
  ghostRows?: { row: Cell[]; tag: ReactNode }[]
  /** Leave out a helper column (the group number of the GROUP BY stage). */
  hideFirst?: boolean
  onRowHover?: (i: number | null) => void
  rowRef?: (i: number, el: HTMLTableRowElement | null) => void
  empty?: string
}) {
  const from = hideFirst ? 1 : 0
  const notes = !!rowTag || !!ghostRows?.length
  const cells = (row: Cell[]) =>
    row.slice(from).map((v, j) => (
      <td key={j} className={[typeof v === 'number' ? 'num' : '', colClass?.(j) ?? ''].filter(Boolean).join(' ') || undefined}>
        <CellView value={v} />
      </td>
    ))
  return (
    <div className="sql-table-wrap">
      <table className="sql-table">
        {caption && <caption>{caption}</caption>}
        <thead>
          <tr>
            {result.columns.slice(from).map((c, i) => (
              <th key={i} className={colClass?.(i)}>
                {c}
              </th>
            ))}
            {notes && <th className="sql-note-col" aria-label="What happened to the row" />}
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
              {cells(row)}
              {notes && <td className="sql-note">{rowTag?.(i)}</td>}
            </tr>
          ))}
          {ghostRows?.map((g, i) => (
            <tr key={`ghost-${i}`} className="row-gone">
              {cells(g.row)}
              <td className="sql-note">{g.tag}</td>
            </tr>
          ))}
          {result.rows.length === 0 && !ghostRows?.length && (
            <tr className="sql-empty-row">
              <td colSpan={Math.max(1, result.columns.length - from + (notes ? 1 : 0))}>{empty}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

/** The input tables, side by side, colored by what the query touches when effects are given. */
export function TablesView({
  tables,
  title,
  effects,
  stage,
  when = 'after',
}: {
  tables: NamedResult[]
  title: string
  effects?: Effects | null
  /** The stage on screen: rows drop out of the tables as the stages that drop them are reached. */
  stage?: StageId | null
  /** 'after': these are the tables after the statement ran (the playground). 'before': before it (a problem that changes data). */
  when?: 'before' | 'after'
}) {
  const find = (name: string) => effects?.tables.find((e) => e.table.toLowerCase() === name.toLowerCase())
  const looks = tables.map((t) => tableLook(t, find(t.name), effects ?? null, stage ?? null, when))
  const seen = new Set(looks.flatMap((l) => l.legend))
  // Tables the statement uses come first, so the colored ones are in view.
  const order = tables.map((_, i) => i).sort((a, b) => Number(!looks[a].effect) - Number(!looks[b].effect))
  return (
    <details className="sql-section" open>
      <summary>
        {title} <span className="muted">{tables.length}</span>
      </summary>
      <div className="sql-tables">
        {order.map((i) => {
          const t = tables[i]
          const look = looks[i]
          return (
            <div key={t.name} className={effects && !look.effect ? 'sql-untouched' : undefined}>
              <SqlTable
                result={t}
                caption={
                  <>
                    <strong>{t.name}</strong> {look.badge && <span className={`sql-role ${look.badge.className}`}>{look.badge.text}</span>}{' '}
                    <span className="muted">{look.count}</span>
                  </>
                }
                colClass={look.colClass}
                rowClass={look.rowClass}
                rowTag={look.rowTag}
                ghostRows={look.ghostRows}
              />
            </div>
          )
        })}
      </div>
      {effects && seen.size > 0 && (
        <p className="sql-legend muted">
          {LEGEND.filter((l) => seen.has(l.key)).map((l) => (
            <span key={l.key}>
              <i className={`dot ${l.dot}`} /> {l.text}
            </span>
          ))}
        </p>
      )}
    </details>
  )
}

type LegendKey = 'shown' | 'set' | 'used' | 'in' | 'out' | 'changed' | 'added' | 'gone' | 'will-change' | 'will-go'
const LEGEND: { key: LegendKey; dot: string; text: string }[] = [
  { key: 'shown', dot: 'col-shown', text: 'column SELECT shows (or counts) in the result' },
  { key: 'set', dot: 'col-shown', text: 'column the statement writes' },
  { key: 'used', dot: 'col-used', text: 'column used to join, filter, group or sort' },
  { key: 'in', dot: 'matched', text: 'row still in play' },
  { key: 'out', dot: 'faded', text: 'row dropped (the note says by what)' },
  { key: 'changed', dot: 'matched', text: 'row the UPDATE changed' },
  { key: 'added', dot: 'matched', text: 'row the INSERT added' },
  { key: 'gone', dot: 'dropped', text: 'row the DELETE removed' },
  { key: 'will-change', dot: 'kept', text: 'row your statement will change' },
  { key: 'will-go', dot: 'dropped', text: 'row your statement will delete' },
]

/** A cell as short text, for notes like "salary 7500 → 8000". */
const show = (v: Cell) => (v === null ? 'NULL' : typeof v === 'number' ? String(Number.isInteger(v) ? v : Number(v.toFixed(6))) : `'${v}'`)

const DROP_NOTE: Record<DropStep, string> = {
  join: 'no JOIN match',
  where: 'dropped by WHERE',
  having: 'group dropped by HAVING',
  limit: 'cut by LIMIT',
}

/** Which row-dropping steps have run by the time a stage is on screen. */
export function stepsReached(stage: StageId | null): DropStep[] {
  switch (stage) {
    case 'with':
      return []
    case 'from':
      return ['join']
    case 'where':
    case 'group':
      return ['join', 'where']
    case 'having':
    case 'select':
    case 'order':
      return ['join', 'where', 'having']
    default:
      return DROP_STEPS
  }
}

/** Why a row is out at this stage, or null when it is still in play. */
export function dropReason(rowid: number, keep: TableEffect['keep'], reached: DropStep[]): DropStep | null {
  for (const step of reached) {
    const kept = keep?.[step]
    if (kept && !kept.includes(rowid)) return step
  }
  return null
}

interface TableLook {
  effect: TableEffect | undefined
  badge: { text: string; className: string } | null
  count: string
  legend: LegendKey[]
  colClass?: (j: number) => string | undefined
  rowClass?: (i: number) => string | undefined
  rowTag?: (i: number) => ReactNode
  ghostRows?: { row: Cell[]; tag: ReactNode }[]
}

function tableLook(t: NamedResult, e: TableEffect | undefined, effects: Effects | null, stage: StageId | null, when: 'before' | 'after'): TableLook {
  const rowsWord = (k: number) => `${k} row${k === 1 ? '' : 's'}`
  const plain: TableLook = { effect: e, badge: effects ? { text: 'not used', className: 'none' } : null, count: rowsWord(t.rows.length), legend: [] }
  if (!effects || !e) return plain
  const shown = new Set(e.shown)
  const used = new Set(e.used)
  const legend = new Set<LegendKey>()
  const colClass = (j: number) => {
    const c = t.columns[j]
    if (shown.has(c)) return 'col-shown'
    if (used.has(c)) return 'col-used'
    return undefined
  }
  if (e.shown.some((c) => t.columns.includes(c))) legend.add(e.role === 'target' ? 'set' : 'shown')
  if (e.used.some((c) => t.columns.includes(c) && !shown.has(c))) legend.add('used')
  const ids = t.rowids
  const look: TableLook = { ...plain, colClass, legend: [] }

  if (e.role === 'read') {
    look.badge = { text: effects.kind === 'query' ? 'read inside' : 'read', className: 'read' }
  } else if (e.role === 'from') {
    look.badge = { text: e.aliases.some((a) => a !== e.table) ? `FROM as ${e.aliases.filter((a) => a !== e.table).join(', ')}` : 'FROM', className: 'from' }
    if (ids && e.keep) {
      const reached = stepsReached(stage)
      const reasons = ids.map((id) => dropReason(id, e.keep, reached))
      const kept = reasons.filter((r) => r === null).length
      look.rowClass = (i) => (reasons[i] ? 'row-out' : 'row-in')
      look.rowTag = (i) => (reasons[i] ? `✗ ${DROP_NOTE[reasons[i]!]}` : null)
      look.count = kept < ids.length ? `${kept} of ${rowsWord(ids.length)} in play` : `all ${rowsWord(ids.length)} in play`
      if (kept) legend.add('in')
      if (kept < ids.length) legend.add('out')
    }
  } else {
    // The table an INSERT, UPDATE or DELETE changes.
    const hit = new Set(e.hit ?? [])
    const added = new Set(e.added ?? [])
    look.badge = { text: effects.kind.toUpperCase(), className: 'target' }
    if (ids && effects.kind === 'update' && e.hit) {
      const n = ids.filter((id) => hit.has(id)).length
      if (when === 'after') {
        look.rowClass = (i) => (hit.has(ids[i]) ? 'row-changed' : undefined)
        // Which values changed, old → new, from the rows as they were before the UPDATE.
        const before = new Map((e.old ?? []).map((r) => [Number(r[0]), r.slice(1)]))
        look.rowTag = (i) => {
          if (!hit.has(ids[i])) return null
          const was = before.get(ids[i])
          const diffs = was ? t.columns.flatMap((c, j) => (was[j] !== t.rows[i][j] ? [`${c} ${show(was[j])} → ${show(t.rows[i][j])}`] : [])) : []
          return diffs.length ? `✓ ${diffs.join(', ')}` : '✓ set (same value)'
        }
        look.count = `${n} of ${rowsWord(ids.length)} changed`
        if (n) legend.add('changed')
      } else {
        look.rowClass = (i) => (hit.has(ids[i]) ? 'row-will-change' : undefined)
        look.rowTag = (i) => (hit.has(ids[i]) ? 'will change' : null)
        look.count = `${n} of ${rowsWord(ids.length)} will change`
        if (n) legend.add('will-change')
      }
      // Only the changed rows' set columns are news; the others stay plain.
      look.colClass = (j) => (shown.has(t.columns[j]) ? 'col-set' : colClass(j))
    } else if (ids && effects.kind === 'delete' && e.hit) {
      if (when === 'after') {
        look.ghostRows = (e.removed ?? []).map((row) => ({ row: row.slice(1), tag: '✗ deleted' }))
        look.count = `${rowsWord(ids.length)} left, ${e.removed?.length ?? 0} deleted`
        if (e.removed?.length) legend.add('gone')
      } else {
        look.rowClass = (i) => (hit.has(ids[i]) ? 'row-will-go' : undefined)
        look.rowTag = (i) => (hit.has(ids[i]) ? '✗ will be deleted' : null)
        const n = ids.filter((id) => hit.has(id)).length
        look.count = `${n} of ${rowsWord(ids.length)} will be deleted`
        if (n) legend.add('will-go')
      }
    } else if (ids && effects.kind === 'insert' && when === 'after') {
      look.rowClass = (i) => (added.has(ids[i]) ? 'row-added' : undefined)
      look.rowTag = (i) => (added.has(ids[i]) ? '+ new' : null)
      look.count = `${rowsWord(ids.length)}, ${added.size} new`
      if (added.size) legend.add('added')
    }
  }
  look.legend = [...legend]
  return look
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

/**
 * Which stage to show: the one you picked, found by its name so it stays put while the query changes
 * around it. If no stage has that name any more, the same position, clamped to the new last stage.
 * Nothing picked means the last stage, which is where a run starts.
 */
export function pickedStage(picked: { label: string; index: number } | null, labels: string[]): number {
  const last = labels.length - 1
  if (!picked) return last
  // Same name at the same place first (two UNION parts can share a name), then anywhere.
  const found = labels[picked.index] === picked.label ? picked.index : labels.indexOf(picked.label)
  return found >= 0 ? found : Math.max(0, Math.min(picked.index, last))
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
