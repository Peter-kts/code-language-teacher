import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react'
import { DEFAULT_COLUMNS, dragConsole, dragDivider, toggleDivider } from './split'

const STORAGE_KEY = 'clt.layout.v1'
const DIVIDER_PX = 7
const MIN_COLUMN_PX = 180
const MIN_CONSOLE_PX = 72
const DEFAULT_CONSOLE_PX = 210
const KEY_STEP_PX = 32

interface Saved {
  columns: number[]
  remembered: number[]
  console: number
  consoleRemembered: number
}

function load(): Saved {
  const fallback = { columns: DEFAULT_COLUMNS, remembered: DEFAULT_COLUMNS, console: DEFAULT_CONSOLE_PX, consoleRemembered: DEFAULT_CONSOLE_PX }
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as Saved | null
    const ok = (a: unknown) => Array.isArray(a) && a.length === 3 && a.every((n) => typeof n === 'number' && n >= 0)
    if (!saved || !ok(saved.columns) || !ok(saved.remembered) || saved.columns.every((n) => n === 0)) return fallback
    return { ...fallback, ...saved }
  } catch {
    return fallback
  }
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
 * Sizes for the three columns and the console, resized by dragging the
 * dividers. A pane dragged below its minimum collapses; dragging the divider
 * back out or double-clicking it reopens the pane. Sizes survive reloads.
 */
export function usePaneLayout() {
  const [state, setState] = useState(load)
  const panesRef = useRef<HTMLElement>(null)
  const vizRef = useRef<HTMLElement>(null)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // Private windows can refuse storage; the layout still works for this visit.
    }
  }, [state])

  const setColumns = (columns: number[]) => setState((s) => ({ ...s, columns }))
  const setConsole = (h: number) => setState((s) => ({ ...s, console: h }))
  // Remember open sizes as they were before a drag or key press, not the
  // in-between sizes a pane passes through on its way to collapsing.
  const remember = () =>
    setState((s) => ({
      ...s,
      remembered: s.columns.map((c, i) => (c > 0 ? c : s.remembered[i])),
      consoleRemembered: s.console > 0 ? s.console : s.consoleRemembered,
    }))

  /** fr units per pixel of the panes row, and the minimum column in fr. */
  const scale = (columns: number[]) => {
    const width = (panesRef.current?.clientWidth ?? 1200) - 2 * DIVIDER_PX
    const frPerPx = columns.reduce((a, b) => a + b, 0) / Math.max(width, 1)
    return { frPerPx, min: MIN_COLUMN_PX * frPerPx }
  }

  const columnDivider = (i: number) => {
    const { columns } = state
    const closed = columns[i] === 0 ? i : columns[i + 1] === 0 ? i + 1 : -1
    const nudge = (px: number) => {
      const { frPerPx, min } = scale(columns)
      setColumns(dragDivider(columns, i, px * frPerPx, min))
    }
    const toggle = () => setColumns(toggleDivider(columns, i, state.remembered, scale(columns).min))
    return {
      role: 'separator',
      'aria-orientation': 'vertical' as const,
      'aria-label': `Resize ${PANE_NAMES[i]} and ${PANE_NAMES[i + 1]}`,
      tabIndex: 0,
      className: `divider divider-col${closed >= 0 ? ` divider-closed closed-${closed < i + 1 ? 'left' : 'right'}` : ''}`,
      title:
        closed >= 0
          ? `Drag or double-click to show the ${PANE_NAMES[closed]}`
          : 'Drag to resize, or narrow a pane to hide it · double-click to reset',
      onPointerDown: (e: PointerEvent<HTMLElement>) => {
        const start = columns
        const { frPerPx, min } = scale(start)
        remember()
        track(e, 'col-resize', (dx) => setColumns(dragDivider(start, i, dx * frPerPx, min)))
      },
      onDoubleClick: toggle,
      onKeyDown: (e: KeyboardEvent<HTMLElement>) => {
        remember()
        if (e.key === 'ArrowLeft') nudge(-KEY_STEP_PX)
        else if (e.key === 'ArrowRight') nudge(KEY_STEP_PX)
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

  const [a, b, c] = state.columns
  return {
    panesRef,
    vizRef,
    panesStyle: {
      gridTemplateColumns: `minmax(0, ${a}fr) ${DIVIDER_PX}px minmax(0, ${b}fr) ${DIVIDER_PX}px minmax(0, ${c}fr)`,
    } as CSSProperties,
    paneClass: (i: number) => (state.columns[i] === 0 ? ' pane-collapsed' : ''),
    columnDivider,
    consoleDivider,
    consoleStyle: (state.console > 0 ? { height: state.console } : undefined) as CSSProperties | undefined,
    consoleCollapsed: state.console === 0,
  }
}
