// A snowy afternoon in a little village: snow falling, smoke from the chimneys, skaters circling a
// frozen pond, kids around a snowman, a kid sledding, pine trees heavy with snow.
include("palette.px.js", { palette: true })
include("kit.px.js")
include("people.px.js")
pal({
  A: "#8aa6d0", C: "#a8bede", D: "#c8d6ea", E: "#e2eaf4",              // overcast sky
  I: "#ffffff", K: "#e4ecf6", L: "#c4d2e6", M: "#9cb0cc",              // snow: lit, mid, shade, deep
  6: "#7e96b8", 7: "#98aeca",                                          // far hills
  a: "#2e5a4a", c: "#3e7458", d: "#1e4038",                            // pines
  e: "#c8e4f0", f: "#a4cce0", i: "#e6f4fa",                            // ice
  l: "#b85a48", m: "#8a3e3a", o: "#6a8ab0", q: "#4a6488",              // house walls: red, its shade, blue, shade
  u: "#ffd878", v: "#6a4a3a",                                          // warm windows, wood
  x: "#f08a3a", z: "#a0a0b4",                                          // carrot, smoke
})
ramps("ACDE", "MLKI", "dac", "fei")

const GROUND = 112

person("skater1", { skin: "s", hair: "H", top: "r", legs: "n", hat: HAT.beanie })
person("skater2", { skin: "t", hair: "j", top: "b", dress: true, long: true, hat: HAT.beanie })
person("skater3", { skin: "s", hair: "J", top: "g", legs: "n", kid: true, hat: HAT.beanie })
person("snowkid1", { skin: "t", hair: "h", top: "y", legs: "b", kid: true, hat: HAT.beanie })
person("snowkid2", { skin: "s", hair: "j", top: "p", legs: "n", kid: true, hat: HAT.beanie })
person("walker", { skin: "s", hair: "W", top: "R", legs: "n", hat: HAT.beanie })

function pine(c, x, base, h) {
  c.rect(x - 1, base - 3, 3, 3, "v")
  for (let i = 0; i < 4; i++) {
    const ty = base - 3 - i * h / 4.5, w = Math.round(h * 0.42 * (1 - i / 5))
    c.poly([x - w, ty, x + 1, ty - h / 3, x + w + 1, ty], "a"); c.poly([x + 1, ty, x + 1, ty - h / 3, x + w + 1, ty], "d")
    c.hline(x - w + 1, Math.round(ty) - 1, Math.round(w * 0.9), "K"); c.px(x, Math.round(ty - h / 3) + 1, "I")
  }
}

function cottage(c, x, base, w, h, wall, wallS) {
  c.rect(x, base - h, w, h, wall); c.rect(x + w - 4, base - h, 4, h, wallS)
  c.poly([x - 4, base - h + 1, x + w / 2, base - h - 12, x + w + 4, base - h + 1], "K")
  c.line(x + w / 2, base - h - 12, x + w + 4, base - h, "L"); c.hline(x - 4, base - h, w + 9, "L")
  for (let i = 0; i < w + 8; i += 3) c.vline(x - 4 + i, base - h + 1, 1 + (i % 2), "I")     // snow hanging over the eave
  c.rect(x + w - 9, base - h - 14, 4, 8, "m"); c.rect(x + w - 10, base - h - 15, 6, 2, "I")
  for (let wx = x + 3; wx < x + w - 6; wx += 9) { c.rect(wx, base - h + 5, 5, 5, "u"); c.vline(wx + 2, base - h + 5, 5, "v"); c.hline(wx - 1, base - h + 10, 7, "I") }
  c.rect(x + 2, base - 9, 5, 9, "v")
}

anim("winter_village", { w: W, h: H, frames: FRAMES, fps: FPS },
  grad(0, 0, W, GROUND, "ACDE"),
  (c) => { for (let x = 0; x < W; x++) { const h = Math.round(20 + 14 * vnoise(x / 40, 6)); c.vline(x, GROUND - h, h, "7"); c.vline(x, GROUND - Math.round(h * 0.5), h, "D") } },
  (c) => { for (let i = 0; i < 9; i++) pine(c, 8 + i * 38 + Math.floor(hash(i, 2) * 12), GROUND - 4, 20 + Math.floor(hash(i, 3) * 10)) },
  plume(70, 66, "Kzz", { every: 4, life: 48, rise: 30, wind: 0.3, size: [2, 6], seed: 3 }),
  plume(247, 70, "Kzz", { every: 4, life: 48, rise: 30, wind: 0.3, size: [2, 6], seed: 5 }),
  (c) => { cottage(c, 40, GROUND, 36, 26, "l", "m"); cottage(c, 220, GROUND, 34, 22, "o", "q"); cottage(c, 268, GROUND + 2, 30, 20, "l", "m") },
  // the snowy ground, gently rolling
  (c) => {
    for (let x = 0; x < W; x++) { const y = GROUND + Math.round(3 * Math.sin(x / 40)); c.rect(x, y, 1, H - y, "K"); c.px(x, y, "I") }
    for (let i = 0; i < 60; i++) { const x = Math.floor(hash(i, 4) * W), y = GROUND + 8 + Math.floor(hash(i, 5) * 60); c.hline(x, y, 3 + (i % 4), "L") }
  },
  // the frozen pond with skaters going round it
  (c) => {
    const px = 150, py = 150
    c.ellipse(px, py, 64, 14, "L"); c.ellipse(px, py, 62, 12, "f"); c.ellipse(px, py - 1, 58, 9, "e"); c.line(px - 40, py - 4, px - 20, py - 7, "i"); c.line(px + 10, py + 2, px + 34, py - 2, "i")
    const skaters = ["skater1", "skater2", "skater3"]
    const placed = skaters.map((n, i) => {
      const a = c.phase * Math.PI * 2 * (i === 2 ? 2 : 1) + i * 2.1
      return { n, x: px + Math.round(48 * Math.cos(a)), y: py + 3 + Math.round(8 * Math.sin(a)), right: Math.sin(a) < 0 }
    }).sort((p, q) => p.y - q.y)
    for (const s of placed) c.stamp(s.n, s.x, s.y, { frame: 1, flip: s.right ? undefined : "x" })
  },
  // the snowman and the kids around it; a sledder going down the slope at the left
  (c) => {
    const sx = 268, sb = 160
    c.circ(sx, sb - 7, 9, "M"); c.circ(sx, sb - 19, 7, "M"); c.circ(sx, sb - 28, 5, "M"); c.ellipse(sx + 4, sb + 1, 12, 2, "L")
    c.circ(sx, sb - 7, 8, "K"); c.circ(sx, sb - 19, 6, "K"); c.circ(sx, sb - 28, 4, "K")
    c.circ(sx - 2, sb - 9, 5, "I"); c.circ(sx - 2, sb - 21, 3, "I"); c.circ(sx - 1, sb - 29, 2, "I"); c.circ(sx + 3, sb - 5, 4, "L"); c.circ(sx + 2, sb - 17, 3, "L")
    c.px(sx - 1, sb - 29, "k"); c.px(sx + 2, sb - 29, "k"); c.hline(sx + 3, sb - 28, 3, "x")
    c.rect(sx - 4, sb - 34, 8, 2, "N"); c.rect(sx - 3, sb - 38, 6, 4, "N"); c.hline(sx - 5, sb - 24, 10, "r"); c.vline(sx + 3, sb - 23, 4, "r")
    c.px(sx, sb - 19, "k"); c.px(sx, sb - 16, "k"); c.line(sx - 6, sb - 20, sx - 12, sb - 25, "v"); c.line(sx + 6, sb - 20, sx + 12, sb - 24, "v")
    pace(c, "snowkid1", 240, 252, 166, 0.1, 60)
    pace(c, "snowkid2", 300, 286, 164, 0.6, 60)
    pace(c, "walker", 20, 110, 128, 0.4)
    // the sled: down the hill from the left once a loop, then gone behind the edge
    const t = (c.phase * 2) % 1, lx = -20 + Math.round(t * 140), ly = 166 - Math.round(12 * (1 - t))
    c.rect(lx - 6, ly - 2, 12, 2, "r"); c.hline(lx - 7, ly, 14, "v"); c.px(lx + 7, ly - 1, "v")
    c.stamp("snowkid1_idle", lx, ly - 2, { frame: 0 })
  },
  // falling snow: two layers, each flake falling a whole number of laps per loop, drifting sideways
  (c) => {
    for (let i = 0; i < 110; i++) {
      const near = i % 3 === 0, laps = near ? 4 : 2
      const t = (c.phase * laps + hash(i, 1)) % 1
      const y = Math.round(t * (H + 6)) - 3
      const x = (Math.floor(hash(i, 2) * W) + Math.round(6 * Math.sin(t * Math.PI * 4 + i))) % W
      if (near) { c.rect(x, y, 2, 2, "I") } else c.px(x, y, i % 2 ? "I" : "K")
    }
  },
)
