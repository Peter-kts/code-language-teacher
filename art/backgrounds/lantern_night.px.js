// A lantern festival on a summer night: paper lanterns rising slowly into the stars, a river below
// mirroring them, an arched bridge with people watching, little houses with warm windows, fireflies.
include("palette.px.js", { palette: true })
include("kit.px.js")
include("people.px.js")
pal({
  A: "#0e1030", C: "#1a1c4a", D: "#2c2a64", E: "#48367a",              // night sky, top down
  I: "#fff4d0", K: "#ffd27a", L: "#ff9a4a", M: "#e0603a",              // lantern: core, glow, body, shade
  6: "#1a2a3a", 7: "#24384a",                                          // far trees
  a: "#2a3a5a", c: "#1c2846", d: "#3a4e78", e: "#5a6ea0",              // river: body, deep, light, glint
  f: "#4a3a36", i: "#6a5246", l: "#2e2420",                            // bridge wood: mid, lit, dark
  m: "#3a3056", o: "#2a2442", q: "#ffd870",                            // houses: wall, shade, window
  u: "#a83a3a", v: "#7a2a30",                                          // roofs
  x: "#1e3a2a", z: "#2a4c34",                                          // grass bank
  O: "#d6ff8a", Q: "#9ad85a",                                          // fireflies
})
ramps("ACDE", "MLKI", "cade")

const BANK = 128

person("watcher1", { skin: "s", hair: "j", top: "r", dress: true, long: true })
person("watcher2", { skin: "t", hair: "h", top: "b", legs: "n" })
person("watcher3", { skin: "s", hair: "H", top: "y", legs: "n", kid: true })
person("walker", { skin: "t", hair: "j", top: "p", legs: "n" })

// one paper lantern, 5x6, glowing
function paper(c, x, y, flick) {
  c.rect(x - 2, y - 3, 5, 6, "L"); c.vline(x + 2, y - 3, 6, "M"); c.rect(x - 1, y - 2, 2, 3, flick ? "I" : "K")
  c.hline(x - 1, y - 4, 3, "L"); c.px(x, y + 3, "K")
}

// lanterns: each rises one lap of the sky per loop (or two), swaying a little, starting at its own time
const LANTERNS = Array.from({ length: 26 }, (_, i) => ({ x: 20 + Math.floor(hash(i, 1) * 280), off: hash(i, 2), laps: i % 4 === 0 ? 2 : 1, sway: 2 + hash(i, 3) * 4 }))
function lanternAt(c, l, i) {
  const span = BANK + 20, t = (c.phase * l.laps + l.off) % 1
  const y = BANK - 4 - Math.round(t * span), x = l.x + Math.round(l.sway * Math.sin(t * Math.PI * 4 + i))
  return [x, y, t]
}

anim("lantern_night", { w: W, h: H, frames: FRAMES, fps: FPS },
  grad(0, 0, W, BANK, "ACDE"),
  (c) => { for (let i = 0; i < 70; i++) { const x = Math.floor(hash(i, 7) * W), y = Math.floor(hash(i, 8) * 90); if ((c.frame + i * 5) % 32 > 1) c.px(x, y, i % 5 ? "d" : "I") } },
  // a crescent moon
  (c) => { c.circ(266, 30, 10, "I"); c.circ(271, 27, 9, "C") },
  // far trees and hills
  (c) => { for (let x = 0; x < W; x++) { const h = Math.round(10 + 10 * vnoise(x / 12, 4)); c.vline(x, BANK - 26 - h, h + 6, "6"); c.vline(x, BANK - 22 - Math.round(h / 2), h, "7") } },
  // houses on the far bank, windows lit
  (c) => {
    ;[[18, 30, 22], [52, 24, 18], [246, 28, 24], [282, 34, 20]].forEach(([x, w, h], i) => {
      const b = BANK - 14
      c.rect(x, b - h, w, h, "m"); c.rect(x + w - 4, b - h, 4, h, "o")
      c.poly([x - 3, b - h + 1, x + w / 2, b - h - 10, x + w + 3, b - h + 1], "u"); c.line(x + w / 2, b - h - 10, x + w + 3, b - h, "v")
      for (let wx = x + 3; wx < x + w - 5; wx += 7) c.rect(wx, b - h + 4, 3, 4, (c.frame + i * 40) % 96 < 90 || wx > x + 8 ? "q" : "o")
    })
  },
  // the bank and the river
  (c) => {
    c.rect(0, BANK - 14, W, 14, "x"); c.hline(0, BANK - 14, W, "z")
    c.rect(0, BANK, W, H - BANK, "a"); c.rect(0, BANK, W, 3, "c")
    for (let i = 0; i < 50; i++) {
      const y = BANK + 4 + Math.floor(hash(i, 4) * 26), x = (Math.floor(hash(i, 5) * W) + Math.round(c.phase * 96)) % W
      c.hline(x, y, 3 + (i % 4), "d")
    }
    c.rect(0, H - 20, W, 20, "x"); c.hline(0, H - 20, W, "z"); for (let x = 0; x < W; x += 3) c.vline(x, H - 21 - Math.floor(hash(x, 6) * 2), 2, "z")
  },
  // reflections of the lanterns in the water, broken into ripples
  (c) => {
    LANTERNS.forEach((l, i) => {
      const [x, y] = lanternAt(c, l, i), ry = BANK + (BANK - y) / 3
      if (ry < H - 22 && (c.frame + i) % 4) { c.hline(x - 1 + ((c.frame >> 2) % 2), Math.round(ry), 3, "K"); c.px(x, Math.round(ry) + 2, "L") }
    })
  },
  // people on the far bank watching, lantern posts; a little boat drifting by with a lantern
  (c) => {
    const b = BANK - 13
    c.stamp("watcher1_idle", 120, b, { frame: Math.floor(c.frame / 7) % 2 })
    c.stamp("watcher2_idle", 132, b, { frame: Math.floor(c.frame / 9) % 2 })
    c.stamp("watcher3_idle", 196, b, { frame: Math.floor(c.frame / 6) % 2, flip: "x" })
    for (const px of [100, 150, 214]) { c.vline(px, b - 16, 16, "l"); paper(c, px, b - 19, (c.frame + px) % 12 < 6) }
    const bx = crossX(c, 60, 20, 1, 1), by = H - 34 + (c.frame % 16 < 8 ? 0 : 1)
    c.poly([bx - 12, by - 3, bx + 12, by - 3, bx + 8, by + 2, bx - 8, by + 2], "f"); c.hline(bx - 12, by - 3, 25, "i"); c.hline(bx - 7, by + 3, 15, "c")
    c.stamp("watcher2_idle", bx - 3, by - 3, { frame: 0 }); c.vline(bx + 7, by - 14, 11, "l"); paper(c, bx + 7, by - 17, c.frame % 10 < 5)
    c.hline(bx - 9, by + 5, 19, "d")
  },
  // the lanterns rising
  (c) => { LANTERNS.forEach((l, i) => { const [x, y] = lanternAt(c, l, i); paper(c, x, y, (c.frame + i) % 6 < 3) }) },
  // someone strolling the near bank with a lantern
  (c) => {
    pace(c, "walker", 30, 140, H - 4, 0.3)
    pace(c, "watcher1", 300, 200, H - 2, 0.65, 40)
    // reeds along the near bank, swaying
    for (let i = 0; i < 26; i++) {
      const x = 4 + Math.floor(hash(i, 31) * 312), h = 5 + Math.floor(hash(i, 32) * 6), sw = Math.round(Math.sin(c.phase * Math.PI * 4 + i) * (h > 8 ? 1 : 0))
      c.line(x, H - 20, x + sw, H - 20 - h, "z"); if (i % 3 === 0) c.px(x + sw, H - 21 - h, "f")
    }
    // fireflies along the banks
    for (let i = 0; i < 18; i++) {
      const t = c.phase * Math.PI * 2 * (1 + (i % 3)) + i
      const x = Math.floor(hash(i, 13) * W) + Math.round(8 * Math.sin(t)), y = (i % 2 ? BANK - 18 : H - 10) + Math.round(4 * Math.sin(t * 1.5))
      if (Math.sin(t * 2) > -0.2) c.px(x, y, Math.sin(t * 2) > 0.6 ? "O" : "Q")
    }
  },
)
