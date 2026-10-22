// Render the pixel-art backgrounds in art/backgrounds/ with pxl (github.com/augusto-scarvalho/claude-pxl)
// and copy each scene's GIF to public/backgrounds/. The GIFs are committed, so the app's own build
// never needs pxl; run this only after changing a scene: `npm run backgrounds`.
// pxl is cloned once into .cache/claude-pxl at a pinned commit (or set PXL to a pxl.js to use).
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { GifReader, GifWriter } from 'omggif'

const root = join(import.meta.dirname, '..')
const PXL_REPO = 'https://github.com/augusto-scarvalho/claude-pxl.git'
const PXL_COMMIT = 'e3a9df9abfbde23ef83d52ad5c8a1e6fb5f831c9'
// Keep in step with src/backgrounds/scenes.ts.
const SCENES = ['summer_park', 'fantasy_town', 'halloween', 'beach', 'lantern_night', 'winter_village', 'bunny_meadow']

function pxlPath() {
  if (process.env.PXL) return process.env.PXL
  const dir = join(root, '.cache', 'claude-pxl')
  if (!existsSync(join(dir, 'bin', 'pxl.js'))) {
    mkdirSync(dir, { recursive: true })
    execFileSync('git', ['clone', '--quiet', PXL_REPO, dir], { stdio: 'inherit' })
  }
  execFileSync('git', ['-C', dir, 'checkout', '--quiet', PXL_COMMIT], { stdio: 'inherit' })
  return join(dir, 'bin', 'pxl.js')
}

// pxl writes every frame as a full rectangle. Most of a scene stands still from one frame to the
// next, so re-encode it: each frame keeps only the box around what changed, and inside that box the
// unchanged pixels are transparent (they show the frame before). Same picture; a busy scene shrinks
// to a fifth, and a scene that pxl already packs well keeps pxl's file.
function shrinkGif(input) {
  const gif = new GifReader(new Uint8Array(input))
  const { width: w, height: h } = gif
  const frames = []
  let canvas = new Uint8Array(w * h * 4)
  for (let i = 0; i < gif.numFrames(); i++) {
    gif.decodeAndBlitFrameRGBA(i, canvas)
    frames.push({ rgba: canvas.slice(), delay: gif.frameInfo(i).delay })
  }
  // one palette for all frames, the last slot kept for "unchanged"
  const index = new Map(), palette = []
  const key = (px, i) => (px[i] << 16) | (px[i + 1] << 8) | px[i + 2]
  for (const f of frames) for (let i = 0; i < f.rgba.length; i += 4) {
    const k = key(f.rgba, i)
    if (!index.has(k)) { index.set(k, palette.length); palette.push(k) }
  }
  if (palette.length > 255) throw new Error(`too many colors for a GIF (${palette.length})`)
  const CLEAR = 255
  while (palette.length < 256) palette.push(0)
  const out = new Uint8Array(w * h * frames.length + 4096 * frames.length)
  const writer = new GifWriter(out, w, h, { palette, loop: 0 })
  frames.forEach((f, n) => {
    const prev = n > 0 ? frames[n - 1].rgba : null
    let x0 = 0, y0 = 0, x1 = w - 1, y1 = h - 1
    if (prev) {
      x0 = w; y0 = h; x1 = -1; y1 = -1
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4
        if (key(prev, i) !== key(f.rgba, i)) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y) }
      }
      if (x1 < 0) { x0 = y0 = x1 = y1 = 0 }                     // nothing changed: one clear pixel
    }
    const fw = x1 - x0 + 1, fh = y1 - y0 + 1, pixels = new Uint8Array(fw * fh)
    for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) {
      const i = ((y0 + y) * w + x0 + x) * 4, k = key(f.rgba, i)
      pixels[y * fw + x] = prev && key(prev, i) === k ? CLEAR : index.get(k)
    }
    writer.addFrame(x0, y0, fw, fh, pixels, { delay: f.delay, disposal: 1, transparent: prev ? CLEAR : undefined })
  })
  return Buffer.from(out.subarray(0, writer.end()))
}

const pxl = pxlPath()
const art = join(root, 'art', 'backgrounds')
const out = join(art, 'out')
const dest = join(root, 'public', 'backgrounds')
mkdirSync(dest, { recursive: true })
const only = process.argv.slice(2)
for (const name of only.length ? only : SCENES) {
  rmSync(join(out, 'anims', `${name}.gif`), { force: true })
  execFileSync('node', [pxl, 'build', join(art, `${name}.px.js`), '--only', name, '--no-preview', '--out', out], { stdio: 'inherit' })
  const raw = readFileSync(join(out, 'anims', `${name}.gif`))
  const shrunk = shrinkGif(raw), small = shrunk.length < raw.length ? shrunk : raw
  writeFileSync(join(dest, `${name}.gif`), small)
  console.log(`${name}.gif  ${Math.round(raw.length / 1024)} KB -> ${Math.round(small.length / 1024)} KB`)
}
