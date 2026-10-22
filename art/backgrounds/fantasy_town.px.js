// A fantasy market town on a golden afternoon: a castle on the hill with its pennants flying, a
// street of timber-framed houses with smoking chimneys, market stalls, townsfolk (a wizard, a
// knight, a merchant), a little dragon flapping across the sky and a hot-air balloon drifting.
include("palette.px.js", { palette: true })
include("kit.px.js")
include("people.px.js")
pal({
  A: "#6aa6e8", C: "#94c4f0", D: "#c4def4", E: "#f6e2c8",              // sky, top down to a warm haze
  I: "#ece6f2", K: "#c4bcd8",                                          // clouds
  L: "#8aa8c8", M: "#a8c0dc", 6: "#6e8cb0",                            // far hills, castle in haze
  F: "#7aa860", 7: "#5e8c4c",                                          // the hill's grass
  a: "#f2e4c4", c: "#d8c4a0", d: "#b49c7c",                            // plaster: lit, shade, deep
  e: "#5a3c2c", f: "#3c2820",                                          // timber beams, door
  i: "#d8584c", l: "#a03c3c", m: "#4c78b8", o: "#34548c",              // roofs: red, blue
  q: "#ffe08a", u: "#c88c3c",                                          // lit windows, shutters
  v: "#b8aca0", x: "#8c8078", z: "#6a605c",                            // cobbles: light, mid, gaps
  O: "#e8e0d4", Q: "#bdb2a6", U: "#948a82",                            // castle stone
  V: "#5ab05a", X: "#2e7a44", Z: "#ffd23a",                            // dragon: body, belly shade, wing; also gold
  0: "#d24a5a", 1: "#f4f0e8", 2: "#3a8ad0", 3: "#f2a43a",              // awnings, pennants, balloon
  4: "#9a8a80", 5: "#c8beb4",                                          // smoke
  8: "#8c5c3a", 9: "#a87850",                                          // crates, stall wood
})
ramps("ACDE", "dca", "lI", "UQO", "xv", "45")

const HZ = 110, STREET = 150

person("wizard", { skin: "s", hair: "W", top: "p", dress: true, hat: HAT.witch })
person("knight", { skin: "s", hair: "h", top: "W", legs: "n", hat: "........\n..WWWW.." })
person("merchant", { skin: "t", hair: "j", top: "y", legs: "n" })
person("baker", { skin: "s", hair: "H", top: "w", dress: true, long: true })
person("child", { skin: "t", hair: "J", top: "g", legs: "b", kid: true })
person("bard", { skin: "s", hair: "J", top: "r", legs: "g", hat: HAT.cap })

// a timber-framed house standing on (x, base): plaster, crossing beams, windows lit warm, a roof
function house(c, x, base, w, h, roof, roofS, seed) {
  const top = base - h
  c.rect(x, top, w, h, "a"); c.rect(x + w - 3, top, 3, h, "c")
  c.box(x, top, w, h, "e"); c.hline(x, top + Math.floor(h / 2), w, "e")
  for (let bx = x; bx < x + w - 4; bx += 8) { c.line(bx, top + Math.floor(h / 2), bx + 4, top, "e"); c.line(bx + 4, base - 1, bx + 8, top + Math.floor(h / 2), "e") }
  // roof: a steep gable
  const rh = Math.round(w * 0.6)
  c.poly([x - 3, top + 1, x + w / 2, top - rh, x + w + 3, top + 1], roof)
  c.line(x + w / 2, top - rh, x + w + 3, top, roofS); c.hline(x - 3, top, w + 6, roofS)
  for (let ry = top - rh + 4; ry < top; ry += 3) c.hline(x + Math.round(w / 2 - (ry - top + rh) * 0.6), ry, Math.round((ry - top + rh) * 1.2), roofS)
  // chimney
  c.rect(x + w - 8, top - rh + 6, 4, 8, "U"); c.hline(x + w - 9, top - rh + 6, 6, "Q")
  // windows with shutters, a door
  for (let wx = x + 3; wx < x + w - 6; wx += 9) {
    const wy = top + 3
    c.rect(wx, wy, 4, 5, "q"); c.vline(wx + 2, wy, 5, "e"); c.vline(wx - 1, wy, 5, "u"); c.vline(wx + 4, wy, 5, "u")
    if (hash(wx, seed) < 0.5) c.rect(wx, wy + 4, 4, 1, "0")       // a flower box
  }
  const dx = x + Math.floor(w / 2) - 3
  for (const lx of [x + 4, x + w - 9]) { c.rect(lx, base - 11, 5, 5, "q"); c.vline(lx + 2, base - 11, 5, "e"); c.hline(lx - 1, base - 6, 7, "u") }
  c.rect(dx, base - 12, 6, 12, "f"); c.px(dx + 4, base - 6, "Z"); c.hline(dx - 1, base - 13, 8, "e")
}

// a market stall with a striped awning; key: the awning's color
function stall(c, x, base, k) {
  c.rect(x, base - 10, 22, 10, "9"); c.hline(x, base - 10, 22, "8"); c.vline(x + 1, base - 22, 22, "8"); c.vline(x + 20, base - 22, 22, "8")
  for (let i = 0; i < 24; i++) c.vline(x - 1 + i, base - 25, 5 + (i % 3 === 1 ? 1 : 0), Math.floor(i / 3) % 2 ? "1" : k)
  for (let i = 0; i < 7; i++) c.circ(x + 3 + i * 3, base - 12, 1, "ZriZgr3"[i])   // fruit and bread on the counter
}

anim("_pennant", { w: 9, h: 4, frames: 8, fps: 8 }, (c) => {
  for (let x = 0; x < 9; x++) {
    const y = Math.round(Math.sin((x / 4 - c.phase) * Math.PI * 2) * (x / 9))
    const h = Math.max(1, 3 - Math.floor(x / 3))
    c.vline(x, 1 + y + (3 - h) / 2 | 0, h, x % 4 === 3 ? "1" : "0")
  }
})

// the little dragon, flying right: 4 frames of wingbeat
anim("_dragon", { w: 18, h: 12, frames: 4, fps: 8, outline: "k", pivot: [9, 6] }, (c) => {
  const up = [0, 2, 4, 2][c.frame]
  c.ellipse(8, 7, 5, 2, "V"); c.hline(5, 9, 6, "X")
  c.rect(12, 3, 4, 4, "V"); c.px(14, 4, "k"); c.px(16, 5, "V"); c.px(12, 2, "Z"); c.px(14, 2, "Z")
  c.line(3, 7, 0, 5, "V"); c.px(0, 4, "Z")
  c.poly([5, 6, 9, 6, 6, 1 + up], "Z"); c.line(5, 6, 6, 1 + up, "3")
})

anim("fantasy_town", { w: W, h: H, frames: FRAMES, fps: FPS },
  grad(0, 0, W, HZ, "ACDE"),
  clouds({ y: 30, gap: 110, w: 60, h: 16, n: 4, seed: 2, keys: "wIK", empty: [1] }),
  // far hills, then the castle's hill
  (c) => {
    for (let x = 0; x < W; x++) { const h = Math.round(16 + 10 * vnoise(x / 30, 2)); c.vline(x, HZ - h, h, "M") }
    c.rect(0, HZ - 2, W, 40, "7"); c.ellipse(160, HZ + 8, 120, 40, "F"); c.ellipse(160, HZ + 10, 118, 36, "7"); c.ellipse(150, HZ + 4, 100, 34, "F")
  },
  // the castle: towers with cone roofs, a keep, battlements; pennants fly from the cones
  (c) => {
    const base = 82
    c.rect(124, base - 22, 72, 24, "Q"); c.rect(124, base - 22, 72, 2, "O")
    for (let x = 124; x < 196; x += 4) c.rect(x, base - 25, 2, 3, "Q")
    c.rect(146, base - 44, 28, 24, "O"); c.rect(166, base - 44, 8, 24, "Q")
    for (let x = 146; x < 174; x += 4) c.rect(x, base - 47, 2, 3, "O")
    c.rect(155, base - 12, 10, 14, "f"); c.circ(160, base - 12, 5, "f")
    for (const [tx, th] of [[118, 40], [196, 40], [160, 56]]) {
      c.rect(tx - 6, base - th, 12, th, "O"); c.rect(tx + 2, base - th, 4, th, "Q")
      c.poly([tx - 8, base - th, tx, base - th - 18, tx + 8, base - th], "m"); c.line(tx, base - th - 18, tx + 8, base - th, "o")
      c.vline(tx, base - th - 24, 6, "f"); c.stamp("_pennant", tx + 1, base - th - 25, { delay: tx * 10 })
      c.rect(tx - 1, base - th + 8, 3, 5, "q"); c.rect(tx - 1, base - th + 18, 3, 5, "q")
    }
    for (const wx of [151, 158, 165]) c.rect(wx, base - 38, 3, 5, "q")
    // the road winding up to the gate
    c.curve([160, base + 2, 150, base + 12, 172, base + 20, 160, HZ + 2], "v", { width: 3 })
  },
  plume(78, 98, "5O4", { every: 4, life: 48, rise: 28, wind: 0.25, size: [2, 6], seed: 2 }),
  plume(273, 94, "5O4", { every: 4, life: 48, rise: 28, wind: 0.25, size: [2, 6], seed: 7 }),
  // the street of houses
  (c) => {
    house(c, 4, STREET - 14, 36, 30, "i", "l", 1)
    house(c, 50, STREET - 14, 34, 34, "m", "o", 2)
    house(c, 236, STREET - 14, 38, 32, "i", "l", 3)
    house(c, 282, STREET - 14, 34, 28, "m", "o", 4)
    // cobbles: courses of stones, offset each row
    c.rect(0, STREET - 14, W, H - STREET + 14, "x")
    for (let y = STREET - 14; y < H; y += 3) for (let x = (y % 6 ? 0 : 2); x < W; x += 5) {
      const k = (x * 3 + y * 7) % 23                                   // a regular sprinkle of tinted stones packs small in the GIF
      c.rect(x, y, 4, 2, k === 0 ? "c" : k < 4 ? "Q" : "v"); c.px(x + 3, y + 1, "x")
    }
    c.hline(0, STREET - 14, W, "z")
    stall(c, 100, STREET - 6, "0"); stall(c, 196, STREET - 4, "2")
  },
  // the fountain in the square: a round basin, a spout, water falling and rippling
  (c) => {
    const fx = 160, fb = 172
    c.ellipse(fx, fb - 4, 26, 6, "U"); c.ellipse(fx, fb - 5, 24, 5, "O"); c.ellipse(fx, fb - 5, 21, 3, "2"); c.ellipse(fx, fb - 6, 17, 2, "m")
    c.rect(fx - 2, fb - 22, 4, 17, "Q"); c.rect(fx - 6, fb - 23, 12, 2, "O"); c.circ(fx, fb - 26, 2, "O")
    for (let i = 0; i < 6; i++) {
      const side = i % 2 ? 1 : -1, t = ((c.frame / 8 + i / 6) % 1)
      const x = fx + side * Math.round(3 + 10 * t), y = fb - 24 + Math.round(-4 * t + 22 * t * t)
      c.px(x, y, "1"); c.px(x, y + 1, "M")
    }
    const r = 4 + (c.frame % 16) / 2
    c.ellipse(fx, fb - 6, Math.round(r * 1.6), Math.max(1, Math.round(r / 4)), "1", true)
  },
  // townsfolk
  (c) => {
    pace(c, "merchant", 108, 112, STREET - 6, 0, 80)
    pace(c, "baker", 205, 210, STREET - 4, 0.4, 80)
    pace(c, "wizard", 60, 170, STREET + 6, 0.15)
    pace(c, "knight", 300, 150, STREET + 14, 0.6)
    pace(c, "child", 130, 230, STREET + 22, 0.3, 10)
    pace(c, "bard", 20, 70, STREET + 26, 0.8, 50)
  },
  // the balloon drifting slowly, the dragon crossing
  (c) => {
    const t = c.phase * Math.PI * 2
    const bx = 60 + Math.round(8 * Math.sin(t)), by = 34 + Math.round(3 * Math.sin(t * 2))
    c.circ(bx, by, 10, "3"); for (let i = -8; i <= 8; i += 4) c.vline(bx + i, by - Math.round(Math.sqrt(100 - i * i)) + 1, Math.round(Math.sqrt(100 - i * i) * 2) - 1, i % 8 ? "0" : "3")
    c.line(bx - 6, by + 8, bx - 3, by + 15, "e"); c.line(bx + 6, by + 8, bx + 3, by + 15, "e"); c.rect(bx - 3, by + 15, 7, 5, "8")
    const dx = crossX(c, 0, 20, 1, 1), dy = 52 + Math.round(6 * Math.sin(t * 3))
    c.stamp("_dragon", dx, dy, { frame: c.frame % 4 })
    bird(c, crossX(c, 200, 10, -1, 2), 20, "N", c.frame)
  },
)
