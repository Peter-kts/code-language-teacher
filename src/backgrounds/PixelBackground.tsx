import { useEffect, useRef, useState } from 'react'
import { coverSize, focusLeft, type Scene } from './scenes'

/**
 * Today's pixel-art scene, fixed behind the app. The browser plays the GIF itself (and pauses it
 * when the tab is hidden), so there is no drawing loop here: this only sizes the picture to a whole
 * number of screen pixels per art pixel and dims it. Reduced-motion users get its first frame, still.
 */
export function PixelBackground({ scene }: { scene: Scene }) {
  const [view, setView] = useState(() => ({ w: window.innerWidth, h: window.innerHeight, dpr: window.devicePixelRatio || 1 }))
  const [reduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [loaded, setLoaded] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const src = `/backgrounds/${scene.id}.gif`

  useEffect(() => {
    const onResize = () => setView({ w: window.innerWidth, h: window.innerHeight, dpr: window.devicePixelRatio || 1 })
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Reduced motion: draw the GIF's first frame onto a canvas once, and show that instead.
  useEffect(() => {
    setLoaded(false)
    if (!reduced) return
    const img = new Image()
    img.onload = () => {
      const canvas = canvasRef.current
      if (!canvas) return
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      canvas.getContext('2d')?.drawImage(img, 0, 0)
      setLoaded(true)
    }
    img.src = src
    return () => {
      img.onload = null
    }
  }, [src, reduced])

  const { width, height } = coverSize(view.w, view.h, view.dpr)
  const style = {
    width,
    height,
    left: focusLeft(view.w, width, scene.focus),
    top: (view.h - height) / 2,
    filter: `brightness(${scene.brightness}) saturate(0.9)`,
  }
  const className = loaded ? 'pixel-sky ready' : 'pixel-sky'

  return (
    <>
      {reduced ? (
        <canvas ref={canvasRef} className={className} style={style} aria-hidden="true" />
      ) : (
        <img key={src} src={src} alt="" className={className} style={style} onLoad={() => setLoaded(true)} />
      )}
      <div className="pixel-shade" aria-hidden="true" />
    </>
  )
}
