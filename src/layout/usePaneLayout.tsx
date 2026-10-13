import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react'
import { DEFAULT_COLUMNS, DEFAULT_ROWS, dragConsole, dragDivider, toggleDivider } from './split'

const STORAGE_KEY = 'clt.layout.v1'
const DIVIDER_PX = 7
const MIN_COLUMN_PX = 180
// Phones are short, so stacked panes may get smaller than side-by-side ones.
const MIN_ROW_PX = 120
const MIN_CONSOLE_PX = 72
const DEFAULT_CONSOLE_PX = 210
const KEY_STEP_PX = 32

/** Auto stacks the panes when the window is taller than wide or narrow, and puts them side by side otherwise. */
export type LayoutMode = 'auto' | 'columns' | 'stacked'
export const LAYOUT_MODES: LayoutMode[] = ['auto', 'columns', 'stacked']

interface Saved {
  mode: LayoutMode
  /** Side by side: widths of code, visualizer and side panel. */
  columns: number[]
  remembered: number[]
  /** Stacked: heights of the same three panes, kept apart so switching doesn't mix them up. */
  rows: number[]
  rowsRemembered: number[]
  console: number
  consoleRemembered: number
}

const sizesOk = (a: unknown): a is number[] =>
  Array.isArray(a) && a.length === 3 && a.every((n) => typeof n === 'number' && n >= 0) && a.some((n) => n > 0)

function load(): Saved {
  const fallback: Saved = {
    mode: 'auto',
    columns: DEFAULT_COLUMNS,
    remembered: DEFAULT_COLUMNS,
    rows: DEFAULT_ROWS,
    rowsRemembered: DEFAULT_ROWS,
    console: DEFAULT_CONSOLE_PX,
    consoleRemembered: DEFAULT_CONSOLE_PX,
  }
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as Partial<Saved> | null
    if (!saved) return fallback
    const next = { ...fallback, ...saved }
    if (!LAYOUT_MODES.includes(next.mode)) next.mode = 'auto'
    if (!sizesOk(next.columns) || !sizesOk(next.remembered)) Object.assign(next, { columns: DEFAULT_COLUMNS, remembered: DEFAULT_COLUMNS })
    if (!sizesOk(next.rows) || !sizesOk(next.rowsRemembered)) Object.assign(next, { rows: DEFAULT_ROWS, rowsRemembered: DEFAULT_ROWS })
    return next
  } catch {
    return fallback
  }
}

// What Auto treats as a portrait screen: taller than wide, or too narrow for three columns.
const PORTRAIT_QUERY = '(orientation: portrait), (max-width: 900px)'

/** Whether the window currently counts as portrait, updated when it's resized or rotated. */
function usePortrait() {
  const [portrait, setPortrait] = useState(() => window.matchMedia(PORTRAIT_QUERY).matches)
  useEffect(() => {
    const query = window.matchMedia(PORTRAIT_QUERY)
    const update = () => setPortrait(query.matches)
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])
  return portrait
}

/** Follows the pointer from pointerdown until release, with the cursor locked to `cursor`. */
function track(e: PointerEvent<HTMLElement>, cursor: string, onMove: (dx: number, dy: number) => void) {
  if (e.button !== 0) return
  e.preventDefault()
  const el = e.currentTarget
  const x0 = e.clientX
  const y0 = e.clientY
  el.setPointerCapture(e.pointerId)
  document.body.style.cursor = cursor
  document.body.classList.add('resizing')
  const move = (ev: globalThis.PointerEvent) => onMove(ev.clientX - x0, ev.clientY - y0)
  const up = () => {
    el.removeEventListener('pointermove', move)
    el.removeEventListener('pointerup', up)
    el.removeEventListener('pointercancel', up)
    document.body.style.cursor = ''
    document.body.classList.remove('resizing')
  }
  el.addEventListener('pointermove', move)
  el.addEventListener('pointerup', up)
  el.addEventListener('pointercancel', up)
}

const PANE_NAMES = ['code', 'visualizer', 'side panel']

/**
 * Sizes for the three panes and the console, resized by dragging the
 * dividers. The panes sit side by side as columns, or stacked as rows in
 * portrait; each arrangement keeps its own sizes. A pane dragged below its
 * minimum collapses; dragging the divider back out or double-clicking it
 * reopens the pane. Sizes and the chosen mode survive reloads.
 */
export function usePaneLayout() {
  const [state, setState] = useState(load)
  const portrait = usePortrait()
  const stacked = state.mode === 'stacked' || (state.mode === 'auto' && portrait)
  const sizesKey = stacked ? 'rows' : 'columns'
  const rememberedKey = stacked ? 'rowsRemembered' : 'remembered'
  const sizes = state[sizesKey]
  const panesRef = useRef<HTMLElement>(null)
  const vizRef = useRef<HTMLElement>(null)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // Private windows can refuse storage; the layout still works for this visit.
    }
  }, [state])

  const setSizes = (next: number[]) => setState((s) => ({ ...s, [sizesKey]: next }))
  const setConsole = (h: number) => setState((s) => ({ ...s, console: h }))
  // Remember open sizes as they were before a drag or key press, not the
  // in-between sizes a pane passes through on its way to collapsing.
  const remember = () =>
    setState((s) => ({
      ...s,
      [rememberedKey]: s[sizesKey].map((c, i) => (c > 0 ? c : s[rememberedKey][i])),
      consoleRemembered: s.console > 0 ? s.console : s.consoleRemembered,
    }))

  /** fr units per pixel along the panes (across for columns, down for rows), and the minimum pane in fr. */
  const scale = (sizes: number[]) => {
    const el = panesRef.current
    const length = (stacked ? (el?.clientHeight ?? 800) : (el?.clientWidth ?? 1200)) - 2 * DIVIDER_PX
    const frPerPx = sizes.reduce((a, b) => a + b, 0) / Math.max(length, 1)
    return { frPerPx, min: (stacked ? MIN_ROW_PX : MIN_COLUMN_PX) * frPerPx }
  }

  const columnDivider = (i: number) => {
    const closed = sizes[i] === 0 ? i : sizes[i + 1] === 0 ? i + 1 : -1
    const nudge = (px: number) => {
      const { frPerPx, min } = scale(sizes)
      setSizes(dragDivider(sizes, i, px * frPerPx, min))
    }
    const toggle = () => setSizes(toggleDivider(sizes, i, state[rememberedKey], scale(sizes).min, stacked ? DEFAULT_ROWS : DEFAULT_COLUMNS))
    const side = closed < i + 1 ? (stacked ? 'top' : 'left') : stacked ? 'bottom' : 'right'
    return {
      role: 'separator',
      // A separator's orientation is the line's own: a line between columns is vertical.
      'aria-orientation': stacked ? ('horizontal' as const) : ('vertical' as const),
      'aria-label': `Resize ${PANE_NAMES[i]} and ${PANE_NAMES[i + 1]}`,
      tabIndex: 0,
      className: `divider ${stacked ? 'divider-row divider-pane-row' : 'divider-col'}${closed >= 0 ? ` divider-closed closed-${side}` : ''}`,
      title:
        closed >= 0
          ? `Drag or double-click to show the ${PANE_NAMES[closed]}`
          : `Drag to resize, or ${stacked ? 'shrink' : 'narrow'} a pane to hide it · double-click to reset`,
      onPointerDown: (e: PointerEvent<HTMLElement>) => {
        const start = sizes
        const { frPerPx, min } = scale(start)
        remember()
        track(e, stacked ? 'row-resize' : 'col-resize', (dx, dy) => setSizes(dragDivider(start, i, (stacked ? dy : dx) * frPerPx, min)))
      },
      onDoubleClick: toggle,
      onKeyDown: (e: KeyboardEvent<HTMLElement>) => {
        remember()
        if (e.key === (stacked ? 'ArrowUp' : 'ArrowLeft')) nudge(-KEY_STEP_PX)
        else if (e.key === (stacked ? 'ArrowDown' : 'ArrowRight')) nudge(KEY_STEP_PX)
        else if (e.key === 'Enter') toggle()
        else return
        e.preventDefault()
      },
    }
  }

  const consoleMax = () => Math.max((vizRef.current?.clientHeight ?? 600) - DIVIDER_PX, MIN_CONSOLE_PX)
  const consoleToggle = () => setConsole(state.console > 0 ? 0 : Math.min(state.consoleRemembered, consoleMax()))
  const consoleDivider = {
    role: 'separator',
    'aria-orientation': 'horizontal' as const,
    'aria-label': 'Resize console',
    tabIndex: 0,
    className: `divider divider-row${state.console === 0 ? ' divider-closed' : ''}`,
    title: state.console === 0 ? 'Drag or double-click to open the console' : 'Drag to resize the console · double-click to hide it',
    onPointerDown: (e: PointerEvent<HTMLElement>) => {
      const start = state.console
      const max = consoleMax()
      remember()
      track(e, 'row-resize', (_, dy) => setConsole(dragConsole(start, dy, MIN_CONSOLE_PX, max)))
    },
    onDoubleClick: consoleToggle,
    onKeyDown: (e: KeyboardEvent<HTMLElement>) => {
      remember()
      if (e.key === 'ArrowUp') setConsole(dragConsole(state.console, -KEY_STEP_PX, MIN_CONSOLE_PX, consoleMax()))
      else if (e.key === 'ArrowDown') setConsole(dragConsole(state.console, KEY_STEP_PX, MIN_CONSOLE_PX, consoleMax()))
      else if (e.key === 'Enter') consoleToggle()
      else return
      e.preventDefault()
    },
  }

  const [a, b, c] = sizes
  const tracks = `minmax(0, ${a}fr) ${DIVIDER_PX}px minmax(0, ${b}fr) ${DIVIDER_PX}px minmax(0, ${c}fr)`
  return {
    panesRef,
    vizRef,
    mode: state.mode,
    setMode: (mode: LayoutMode) => setState((s) => ({ ...s, mode })),
    stacked,
    panesClass: stacked ? 'panes stacked' : 'panes',
    panesStyle: (stacked
      ? { gridTemplateRows: tracks, gridTemplateColumns: 'minmax(0, 1fr)' }
      : { gridTemplateColumns: tracks }) as CSSProperties,
    paneClass: (i: number) => (sizes[i] === 0 ? ' pane-collapsed' : ''),
    columnDivider,
    consoleDivider,
    consoleStyle: (state.console > 0 ? { height: state.console } : undefined) as CSSProperties | undefined,
    consoleCollapsed: state.console === 0,
  }
}
