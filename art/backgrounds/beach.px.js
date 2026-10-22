// A beach day: waves rolling in and washing up the sand, a sailboat on the horizon, umbrellas and
// towels, people strolling the shore, a kid building a sandcastle, a crab scuttling, gulls overhead.
include("palette.px.js", { palette: true })
include("kit.px.js")
include("people.px.js")
pal({
  A: "#3c8ee0", C: "#62acee", D: "#90caf4", E: "#c4e6fa",              // sky
  I: "#eef4fa", K: "#c4d4e8",                                          // clouds
  L: "#1e74b8", M: "#2a90cc", 6: "#4ab0dc", 7: "#7cd0e8", F: "#bdf0f4", // sea: deep to foam-blue
  a: "#f6e2a8", c: "#e8cc88", d: "#d2b06c", e: "#c8a466",              // sand: dry, mid, wet, darker wet
  f: "#ffffff",                                                        // foam
  i: "#ff6a6a", l: "#ffd84a", m: "#56c8b8", o: "#ff9ad0",              // umbrellas and towels
  q: "#8a6a4a", u: "#ffcf3a", v: "#ffeaa0",                            // umbrella pole, sun
  x: "#e85a3a", z: "#b8402a",                                          // the crab
  O: "#4a7a3a", Q: "#6aa04a", U: "#8a5a36",                            // palm leaves, trunk
})
ramps("ACDE", "LM67F", "edca", "zx", "OQ")

const SEA = 84, SHORE = 120

person("swimmer", { skin: "t", hair: "j", top: "b", legs: "b" })
person("sunhat", { skin: "s", hair: "H", top: "o", dress: true, long: true, hat: HAT.sun })
person("surfer", { skin: "s", hair: "H", top: "y", legs: "r" })
person("sandkid", { skin: "t", hair: "J", top: "r", legs: "r", kid: true, hat: HAT.cap })
person("reader", { skin: "s", hair: "h", top: "g", legs: "n", hat: HAT.sun })

anim("_crab", { w: 9, h: 5, frames: 2, fps: 6, outline: "k", pivot: [4, 5] }, (c) => {
  const f = c.frame
  c.ellipse(4, 2, 3, 1, "x"); c.px(3, 0, "k"); c.px(5, 0, "k"); c.px(0, 1 - f, "x"); c.px(8, 1 - f, "x")
  for (const lx of [1, 3, 5, 7]) c.px(lx + (f ? 0 : lx < 4 ? -1 : 1), 4, "z")
})

function umbrella(c, x, base, k1, k2) {
  c.line(x, base, x + 2, base - 26, "q")
  for (let i = -14; i <= 14; i++) {
    const top = base - 26 - Math.round(7 * Math.cos(i / 14 * Math.PI / 2))
    c.vline(x + 2 + i, top, base - 25 - top + (Math.abs(i) % 5 === 0 ? 1 : 0), Math.floor((i + 14) / 5) % 2 ? k1 : k2)
  }
  c.px(x + 2, base - 34, "q")
}

anim("beach", { w: W, h: H, frames: FRAMES, fps: FPS },
  grad(0, 0, W, SEA, "ACDE"),
  (c) => { c.circ(56, 26, 18, "E"); c.circ(56, 26, 12, "u"); c.circ(54, 24, 8, "v") },
  clouds({ y: 40, gap: 100, w: 50, h: 12, n: 4, seed: 6, keys: "fIK", empty: [0] }),
  // the sea, in bands, with glints moving across
  (c) => {
    c.rect(0, SEA, W, SHORE - SEA, "M"); c.rect(0, SEA, W, 3, "L"); dither(0, SEA + 3, W, 4, "L", "M", 0.5)
    c.rect(0, SEA + 18, W, SHORE - SEA - 18, "6"); dither(0, SEA + 14, W, 4, "M", "6", 0.5)
    for (let i = 0; i < 40; i++) {
      const y = SEA + 3 + Math.floor(hash(i, 3) * (SHORE - SEA - 8)), len = 2 + Math.floor(hash(i, 4) * 5)
      const x = ((Math.floor(hash(i, 5) * W) + Math.round(c.phase * 64 * (1 + (i % 3)))) % (W + 8)) - 4
      if (Math.sin((c.phase * 6 + hash(i, 6)) * Math.PI * 2) > -0.3) c.hline(x, y, len, y < SEA + 18 ? "6" : "7")
    }
  },
  // a sailboat drifting along the horizon
  (c) => {
    const bx = crossX(c, 200, 16, -1, 1), by = SEA + 2 + (c.frame % 16 < 8 ? 0 : 1)
    c.poly([bx - 7, by - 3, bx + 7, by - 3, bx + 5, by, bx - 5, by], "x"); c.vline(bx, by - 18, 15, "q")
    c.poly([bx + 1, by - 17, bx + 1, by - 4, bx + 9, by - 4], "f"); c.poly([bx - 1, by - 14, bx - 1, by - 4, bx - 7, by - 4], "I")
  },
  // the sand
  (c) => {
    c.rect(0, SHORE, W, H - SHORE, "a")
    for (let i = 0; i < 160; i++) { const x = Math.floor(hash(i, 8) * W), y = SHORE + 8 + Math.floor(hash(i, 9) * 60); c.px(x, y, "c") }
  },
  // waves: the water runs up the sand and back, a foam line on its edge, twice a loop
  (c) => {
    for (let x = 0; x < W; x++) {
      const t = (c.phase * 2 + x / 900) % 1
      const reach = Math.round(10 * Math.sin(t * Math.PI) + 3 * vnoise(x / 14, Math.floor(c.phase * 2)))
      c.rect(x, SHORE, 1, 2 + reach + 3, "e")               // the sand it wet
      c.rect(x, SHORE, 1, 1 + reach, "7"); c.px(x, SHORE + 1 + reach, "f")
      if (hash(x, 2) < 0.35) c.px(x, SHORE + reach, "F")
      // a breaker further out, rolling in
      const by = SHORE - 14 + Math.round(12 * t)
      if (t < 0.85 && vnoise(x / 20, 3) > 0.35) { c.px(x, by, "f"); if (hash(x, 5) < 0.5) c.px(x, by + 1, "F") }
    }
  },
  // palm on the right, umbrellas and towels, a sandcastle
  (c) => {
    c.curve([300, H, 296, 140, 286, 100, 278, 82], "U", { width: 5 })
    for (let y = 92; y < H; y += 6) c.line(298 - Math.round((H - y) * 0.15), y, 302 - Math.round((H - y) * 0.15), y, "q")
    const sway = Math.round(2 * Math.sin(c.phase * Math.PI * 4))
    ;[[-30, 10], [-22, -2], [-6, -10], [14, -4], [26, 10], [8, 14]].forEach(([dx, dy]) => {
      c.curve([278, 80, 278 + dx / 2, 76 + dy / 2 - 6, 278 + dx + sway, 80 + dy], "O", { width: 4 })
      c.curve([278, 79, 278 + dx / 2, 75 + dy / 2 - 6, 278 + dx + sway, 79 + dy], "Q")
    })
    c.circ(276, 84, 2, "U"); c.circ(281, 85, 2, "U")
    umbrella(c, 70, 160, "i", "f"); umbrella(c, 200, 150, "m", "l")
    c.poly([50, 164, 82, 164, 86, 174, 54, 174], "o"); c.poly([180, 154, 212, 154, 216, 164, 184, 164], "l")
    for (let y = 155; y < 164; y += 3) c.hline(184 + (y - 155) * 0.4 | 0, y, 30, "u")
    // sandcastle
    const sx = 130, sb = 168
    c.rect(sx - 12, sb - 8, 24, 8, "d"); c.rect(sx - 12, sb - 8, 24, 2, "c")
    for (const tx of [sx - 10, sx + 6]) { c.rect(tx, sb - 16, 6, 8, "d"); c.rect(tx, sb - 16, 6, 1, "c"); c.px(tx, sb - 17, "d"); c.px(tx + 5, sb - 17, "d") }
    c.rect(sx - 3, sb - 20, 6, 12, "c"); c.px(sx - 3, sb - 21, "c"); c.px(sx + 2, sb - 21, "c"); c.rect(sx - 1, sb - 5, 3, 5, "e")
    c.vline(sx, sb - 26, 6, "q"); c.rect(sx + 1, sb - 26, 4, 2, "i")
  },
  // people and critters
  (c) => {
    pace(c, "sunhat", 20, 150, 132, 0.2)
    pace(c, "swimmer", 230, 140, 128, 0.6, 30)
    pace(c, "surfer", 250, 310, 140, 0.1, 20)
    c.stamp("sandkid_idle", 146, 170, { frame: Math.floor(c.frame / 6) % 2, flip: "x" })
    c.stamp("reader_idle", 76, 172, { frame: Math.floor(c.frame / 10) % 2 })
    const cx = crossX(c, 100, 10, 1, 1)
    c.stamp("_crab", cx, 176, { frame: c.frame % 2 })
    for (let i = 0; i < 3; i++) {
      const t = c.phase * Math.PI * 2 + i * 2
      bird(c, 120 + i * 50 + Math.round(30 * Math.sin(t)), 30 + i * 8 + Math.round(6 * Math.sin(t * 2)), "f", c.frame + i)
    }
  },
)
