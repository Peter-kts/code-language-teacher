// Shared helpers for the backgrounds: every scene is 320x180, 192 frames at 8 fps (a 24 s loop).
const W = 320, H = 180, FRAMES = 192, FPS = 8

// A round tree: a dark mass heaped with clumps, each clump dark under, mid in its body, lit on the
// cap toward the sun (upper left). keys: [trunk dark, trunk, deep, dark, mid, lit, glint]
function roundTree(c, x, base, size, keys, seed = 1) {
  const [td, tm, deep, dark, mid, lit, glint] = keys
  const r = c.rng(seed)
  const th = Math.round(size * 0.9), cy = base - th - Math.round(size * 0.55)
  c.rect(x - 2, base - th, 4, th, tm); c.vline(x + 1, base - th, th, td)
  c.line(x, base - th + 3, x - 5, base - th - 2, tm, 2)
  c.ellipse(x, cy, size, Math.round(size * 0.8), deep)
  const n = 7 + Math.floor(size / 3)
  const clumps = []
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2, d = r() * 0.65
    clumps.push([x + Math.round(Math.cos(a) * size * d), cy + Math.round(Math.sin(a) * size * 0.7 * d), Math.round(size * (0.32 + r() * 0.18))])
  }
  clumps.sort((p, q) => q[1] - p[1])            // lower ones first, upper ones heaped over them
  for (const [px, py, pr] of clumps) {
    c.circ(px, py, pr, dark)
    c.circ(px - 1, py - 1, pr - 1, mid)
    c.circ(px - Math.ceil(pr / 3), py - Math.ceil(pr / 3), Math.max(1, Math.round(pr / 2.4)), lit)
  }
  for (let i = 0; i < size / 2; i++) {
    const [px, py, pr] = clumps[Math.floor(r() * clumps.length)]
    c.px(px - Math.round(pr / 2) + Math.floor(r() * 2), py - pr + 1 + Math.floor(r() * 2), glint)
  }
}

// Someone walking back and forth between xa and xb on row y over the loop, stopping a moment at each
// end (idle). The way out and back is one loop; `shift` (0-1) starts them at another point of it.
function pace(c, name, xa, xb, y, shift = 0, hold = 24) {
  const walk = (FRAMES - 2 * hold) / 2, t = (c.frame + Math.round(shift * FRAMES)) % FRAMES
  const len = Math.abs(xb - xa), dir = Math.sign(xb - xa)
  let x, right, moving = true
  if (t < walk) { x = xa + dir * Math.floor(len * t / walk); right = dir > 0 }
  else if (t < walk + hold) { x = xb; right = dir > 0; moving = false }
  else if (t < 2 * walk + hold) { x = xb - dir * Math.floor(len * (t - walk - hold) / walk); right = dir < 0 }
  else { x = xa; right = dir < 0; moving = false }
  const flip = right ? undefined : "x"
  if (moving) c.stamp(name, x, y, { frame: t % 4, flip })
  else c.stamp(name + "_idle", x, y, { frame: Math.floor(t / 4) % 2, flip })
}

// Something crossing the whole picture once a loop (it wraps while off screen): `dir` 1 rightward.
function crossX(c, x0, pad, dir = 1, laps = 1) {
  const L = W + 2 * pad
  return ((Math.round(x0 + dir * laps * L * c.frame / FRAMES) % L) + L) % L - pad
}

// A bird of two keys flapping (4 frames): a "v" whose wings rise and fall.
function bird(c, x, y, key, f) {
  const up = [0, 1, 2, 1][f % 4]
  c.px(x, y, key); c.px(x - 1, y - 1 + up, key); c.px(x + 1, y - 1 + up, key)
  c.px(x - 2, y - 2 + up * 2, key); c.px(x + 2, y - 2 + up * 2, key)
}
