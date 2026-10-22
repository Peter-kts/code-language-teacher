// The pixel-art backgrounds: animated GIFs in public/backgrounds/, drawn with pxl from the
// sources in art/backgrounds/ (`npm run backgrounds` renders them again).

export interface Scene {
  id: string
  title: string
  /** The column of the 320 px wide picture to keep in view when a tall screen crops its sides. */
  focus: number
  /** How bright to show it: daytime scenes are dimmed more so code over them stays readable. */
  brightness: number
}

/** The picture's size in its own pixels. */
export const SCENE_W = 320
export const SCENE_H = 180

// Keep in step with SCENES in scripts/build-backgrounds.mjs.
export const SCENES: Scene[] = [
  { id: 'summer_park', title: 'Summer park', focus: 170, brightness: 0.5 },
  { id: 'fantasy_town', title: 'Fantasy town', focus: 160, brightness: 0.5 },
  { id: 'halloween', title: 'Halloween night', focus: 190, brightness: 0.85 },
  { id: 'beach', title: 'Beach day', focus: 140, brightness: 0.5 },
  { id: 'lantern_night', title: 'Lantern festival', focus: 150, brightness: 0.85 },
  { id: 'winter_village', title: 'Winter village', focus: 200, brightness: 0.45 },
  { id: 'bunny_meadow', title: 'Bunny meadow', focus: 130, brightness: 0.5 },
]

/** Whole days since 1 January 1970 on the viewer's own calendar, so the scene turns over at their midnight. */
export function dayNumber(date: Date): number {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000)
}

/** Today's scene: the list in turn, one a day, except that 31 October is always Halloween. */
export function sceneForDate(date: Date, scenes: Scene[] = SCENES): Scene {
  if (date.getMonth() === 9 && date.getDate() === 31) {
    const halloween = scenes.find((s) => s.id === 'halloween')
    if (halloween) return halloween
  }
  const n = scenes.length
  return scenes[((dayNumber(date) % n) + n) % n]
}

/** What sits behind the app: today's pixel scene, or the galaxy it had before. */
export type BackgroundMode = 'daily' | 'galaxy'

export const BACKGROUND_KEY = 'clt.background.v1'

export function loadBackgroundMode(storage?: Pick<Storage, 'getItem'>): BackgroundMode {
  try {
    // Read localStorage inside the try: with storage blocked, merely touching it throws.
    return (storage ?? globalThis.localStorage)?.getItem(BACKGROUND_KEY) === 'galaxy' ? 'galaxy' : 'daily'
  } catch {
    return 'daily'
  }
}

export function saveBackgroundMode(mode: BackgroundMode, storage?: Pick<Storage, 'setItem'>) {
  try {
    ;(storage ?? globalThis.localStorage)?.setItem(BACKGROUND_KEY, mode)
  } catch {
    // Blocked storage: the choice lasts until the page reloads.
  }
}

/** A scene named in the address (?bg=beach), to look at one on another day. */
export function sceneFromUrl(search: string, scenes: Scene[] = SCENES): Scene | null {
  const id = new URLSearchParams(search).get('bg')
  return scenes.find((s) => s.id === id) ?? null
}

/**
 * How big to draw the picture so it covers the screen with every art pixel the same whole number
 * of screen pixels wide (crisp, no pixel a little wider than its neighbor). Sizes are in CSS px;
 * `dpr` is the screen's device pixels per CSS px.
 */
export function coverSize(viewW: number, viewH: number, dpr: number) {
  const scale = Math.max(1, Math.ceil(Math.max((viewW * dpr) / SCENE_W, (viewH * dpr) / SCENE_H)))
  return { width: (SCENE_W * scale) / dpr, height: (SCENE_H * scale) / dpr, scale }
}

/** Left edge (CSS px) that keeps the scene's focus column in the middle without showing past its sides. */
export function focusLeft(viewW: number, width: number, focus: number): number {
  const left = viewW / 2 - (focus / SCENE_W) * width
  return Math.min(0, Math.max(viewW - width, left))
}
