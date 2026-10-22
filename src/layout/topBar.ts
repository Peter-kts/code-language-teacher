// "More room": the top bar can be hidden so the panes get the whole frame. The choice is
// remembered like the background, so the app reopens the way it was left.

export const TOP_BAR_KEY = 'clt.topbar.v1'

export function loadTopBarHidden(storage?: Pick<Storage, 'getItem'>): boolean {
  try {
    // Read localStorage inside the try: with storage blocked, merely touching it throws.
    return (storage ?? globalThis.localStorage)?.getItem(TOP_BAR_KEY) === 'hidden'
  } catch {
    return false
  }
}

export function saveTopBarHidden(hidden: boolean, storage?: Pick<Storage, 'setItem'>) {
  try {
    ;(storage ?? globalThis.localStorage)?.setItem(TOP_BAR_KEY, hidden ? 'hidden' : 'shown')
  } catch {
    // Blocked storage: the choice lasts until the page reloads.
  }
}
