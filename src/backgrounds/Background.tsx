import { useEffect, useState } from 'react'
import { GalaxyBackground } from '../galaxy/GalaxyBackground'
import { PixelBackground } from './PixelBackground'
import { sceneForDate, sceneFromUrl, type BackgroundMode, type Scene } from './scenes'

/** Today's scene, turning over at midnight even with the app left open (checked once a minute). */
export function useTodaysScene(): Scene {
  const [scene, setScene] = useState(() => sceneFromUrl(window.location.search) ?? sceneForDate(new Date()))
  useEffect(() => {
    if (sceneFromUrl(window.location.search)) return
    const id = window.setInterval(() => {
      const next = sceneForDate(new Date())
      setScene((s) => (s.id === next.id ? s : next))
    }, 60_000)
    return () => window.clearInterval(id)
  }, [])
  return scene
}

/** Whatever sits behind the app: the day's pixel scene or the galaxy. */
export function Background({ mode, scene }: { mode: BackgroundMode; scene: Scene }) {
  return mode === 'galaxy' ? <GalaxyBackground /> : <PixelBackground scene={scene} />
}
