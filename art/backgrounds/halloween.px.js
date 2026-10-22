// Halloween night, the cute kind: a big moon, a crooked little haunted house with flickering
// windows, a pumpkin patch of grinning jack-o'-lanterns, kids trick-or-treating in costume, friendly
// ghosts bobbing about, bats flapping past and a black cat on the fence.
include("palette.px.js", { palette: true })
include("kit.px.js")
include("people.px.js")
pal({
  A: "#1e1640", C: "#2e2058", D: "#4a2c72", E: "#6e3a82",              // sky, top down
  I: "#fff2c4", K: "#f6d27a", L: "#e0a85a",                            // moon
  M: "#3a2a5a", 6: "#2a1e46",                                          // far hills, near hill
  a: "#3c3260", c: "#2c2450", d: "#4c4078",                            // the house: wall, shade, trim
  e: "#1a1430", f: "#ffcf5a", i: "#ff9a3a",                            // dark, window light, warm
  l: "#f08a2a", m: "#c45a1e", o: "#ffd04a", q: "#4a8a3a",              // pumpkins: body, ridges, glow, stem
  u: "#5c4a3a", v: "#3e3028",                                          // fence wood
  x: "#9a8ac8", z: "#6a5a9a",                                          // fog, its edge
  O: "#ece8ff", Q: "#b8b0e0",                                          // ghosts
  U: "#2a3a2a", V: "#3a4c34",                                          // grass
  X: "#7a2a8a", Z: "#a83ac0",                                          // witch purple
  0: "#1a1424",                                                        // bats and the cat
})
ramps("ACDE", "LKI", "mlo", "zx", "QO")

const GROUND = 140

person("witchkid", { skin: "s", hair: "J", top: "p", dress: true, kid: true, hat: HAT.witch })
person("vampkid", { skin: "s", hair: "j", top: "n", legs: "N", kid: true })
person("pumpkid", { skin: "t", hair: "j", top: "y", legs: "n", kid: true, hat: "..llll..\n.llllll." })
person("mom", { skin: "t", hair: "h", top: "r", legs: "n", long: true })

// a sheet ghost, floating: it bobs and its hem ripples
anim("_ghost", { w: 12, h: 15, frames: 8, fps: 8, outline: "k", pivot: [6, 15] }, (c) => {
  const b = Math.round(Math.sin(c.phase * Math.PI * 2))
  c.circ(6, 5 + b, 5, "O"); c.rect(1, 5 + b, 11, 7, "O"); c.rect(8, 4 + b, 3, 8, "Q")
  for (let x = 1; x < 12; x++) if ((x + c.frame) % 4 < 2) c.px(x, 12 + b, "O")
  c.px(4, 5 + b, "k"); c.px(7, 5 + b, "k"); c.rect(5, 8 + b, 2, 1, "k"); c.px(3, 7 + b, "r"); c.px(8, 7 + b, "r")
})

// a bat, 4 frames
anim("_bat", { w: 11, h: 5, frames: 4, fps: 10, pivot: [5, 2] }, (c) => {
  const up = [0, 1, 2, 1][c.frame]
  c.rect(4, 1, 3, 3, "0"); c.px(4, 0, "0"); c.px(6, 0, "0")
  c.line(4, 2, 0, up * 2 - 1 < 0 ? 0 : up, "0"); c.line(6, 2, 10, up * 2 - 1 < 0 ? 0 : up, "0")
  c.line(1, 1 + up, 3, 3, "0"); c.line(9, 1 + up, 7, 3, "0"); c.px(5, 2, "f")
})

// a jack-o'-lantern whose face flickers
function lantern(c, x, y, r, f, seed) {
  c.ellipse(x, y, r + 2, r, "m"); c.ellipse(x, y, r + 1, r - 1, "l"); c.vline(x, y - r + 1, r * 2 - 2, "m")
  c.rect(x - 1, y - r - 2, 2, 3, "q")
  const glow = Math.sin((f / 12 + hash(seed, 1)) * Math.PI * 2) + hash(seed, f >> 1) * 0.6 > 0.4 ? "I" : "f"
  c.hline(x - 3, y - 2, 2, glow); c.px(x - 2, y - 3, glow); c.hline(x + 2, y - 2, 2, glow); c.px(x + 2, y - 3, glow)
  c.hline(x - 3, y + 1, 7, glow); c.px(x - 1, y + 2, glow); c.px(x + 1, y + 2, glow); c.px(x - 2, y + 1, "m"); c.px(x + 2, y + 1, "m")
}

anim("halloween", { w: W, h: H, frames: FRAMES, fps: FPS },
  grad(0, 0, W, 110, "ACDE"),
  // stars, a few twinkling
  (c) => { for (let i = 0; i < 40; i++) { const x = Math.floor(hash(i, 1) * W), y = Math.floor(hash(i, 2) * 70); if ((c.frame + i * 3) % 24 > 2 || i % 3) c.px(x, y, i % 4 ? "x" : "I") } },
  // the moon, low and huge
  (c) => { c.circ(70, 52, 30, "E"); c.circ(70, 52, 26, "L"); c.circ(70, 52, 24, "K"); c.circ(67, 49, 18, "I"); c.circ(80, 44, 3, "K"); c.circ(60, 62, 4, "K"); c.circ(82, 62, 2, "K") },
  // hills
  (c) => {
    for (let x = 0; x < W; x++) { const h = Math.round(30 + 14 * vnoise(x / 40, 3)); c.vline(x, 110 - h + 20, H, "M") }
    c.ellipse(230, 128, 110, 40, "6")
  },
  // the crooked little house on the hill: leaning walls, a turret, windows flickering
  (c) => {
    const hx = 218, hb = 96
    c.poly([hx - 22, hb, hx - 20, hb - 30, hx + 20, hb - 32, hx + 22, hb], "a"); c.rect(hx + 10, hb - 31, 11, 31, "c")
    c.poly([hx - 26, hb - 29, hx - 2, hb - 52, hx + 24, hb - 31], "e"); c.line(hx - 26, hb - 29, hx - 2, hb - 52, "d")
    c.rect(hx + 14, hb - 60, 10, 30, "a"); c.poly([hx + 12, hb - 59, hx + 22, hb - 80, hx + 27, hb - 59], "e"); c.px(hx + 22, hb - 81, "f")
    const fl = (i) => (Math.sin(c.frame / 5 + i * 2.3) + Math.sin(c.frame / 2.1 + i) > -0.6 ? "f" : "i")
    ;[[hx - 15, hb - 24], [hx - 4, hb - 24], [hx + 8, hb - 24], [hx + 17, hb - 52], [hx - 4, hb - 42]].forEach(([wx, wy], i) => {
      c.rect(wx, wy, 6, 7, fl(i)); c.vline(wx + 3, wy, 7, "e"); c.hline(wx, wy + 3, 6, "e")
    })
    c.rect(hx - 3, hb - 13, 8, 13, "e"); c.circ(hx + 1, hb - 13, 4, "e"); c.px(hx + 3, hb - 6, "f")
    // a path of lanterns down the hill
    c.curve([hx + 1, hb, hx - 10, hb + 14, hx + 10, hb + 28, hx - 4, GROUND + 4], "u", { width: 4 })
  },
  // ground and fence
  (c) => {
    c.rect(0, GROUND - 4, W, H, "U")
    for (let x = 0; x < W; x++) { c.vline(x, GROUND - 6 - Math.floor(hash(x, 4) * 3), 3, "V") }
    for (let x = 4; x < 140; x += 9) { c.rect(x, GROUND - 22, 3, 18, "u"); c.px(x + 1, GROUND - 23, "u"); c.vline(x + 2, GROUND - 22, 18, "v") }
    c.hline(0, GROUND - 17, 140, "v"); c.hline(0, GROUND - 10, 140, "v")
  },
  // the black cat on the fence, swishing its tail and blinking
  (c) => {
    const cx = 100, cy = GROUND - 24
    c.ellipse(cx, cy - 3, 4, 3, "0"); c.circ(cx + 4, cy - 7, 3, "0"); c.px(cx + 2, cy - 11, "0"); c.px(cx + 6, cy - 11, "0")
    if (c.frame % 48 > 2) { c.px(cx + 3, cy - 7, "o"); c.px(cx + 6, cy - 7, "o") }
    const sw = Math.round(3 * Math.sin(c.phase * Math.PI * 6))
    c.curve([cx - 4, cy - 2, cx - 8, cy - 6, cx - 7 + sw, cy - 12], "0")
  },
  // fog drifting low
  (c) => {
    for (let x = 0; x < W; x++) {
      const n = vnoise(((x + c.frame * 320 / FRAMES) % 320) / 26, 0)
      const n2 = vnoise((x % 320) / 26 + 12.3, 0)
      const v = n * (1 - c.phase) + n2 * c.phase, h = Math.round(v * 6)
      for (let y = 0; y < h; y++) if (bayer(x, y) < 0.5 + 0.1 * y) c.px(x, GROUND - 2 - y, "z")
    }
  },
  // the lane the kids walk along, lit warm by the lanterns
  (c) => {
    for (let x = 140; x < W; x++) { const y0 = 154 + Math.round(3 * Math.sin(x / 30)); c.rect(x, y0, 1, 24, "v"); c.px(x, y0 - 1, "u") }
    for (let i = 0; i < 90; i++) { const x = Math.floor(hash(i, 21) * W), y = GROUND + Math.floor(hash(i, 22) * 40); if (c.is(x, y, "U")) c.vline(x, y, 2, "V") }
  },
  // the pumpkin patch
  (c) => {
    const spots = [[30, 152, 6], [58, 164, 8], [92, 150, 5], [118, 168, 7], [16, 172, 7], [150, 146, 5], [262, 148, 5], [302, 150, 6]]
    spots.forEach(([x, y, r], i) => lantern(c, x, y, r, c.frame, i))
    c.curve([10, 160, 30, 158, 58, 170, 90, 156, 118, 174], "q")
  },
  // trick-or-treaters walking the street
  (c) => {
    pace(c, "mom", 150, 240, 158, 0.1)
    pace(c, "witchkid", 160, 250, 162, 0.12)
    pace(c, "pumpkid", 260, 170, 168, 0.5, 30)
    pace(c, "vampkid", 200, 120, 174, 0.75, 20)
  },
  // ghosts drifting, bats crossing
  (c) => {
    const t = c.phase * Math.PI * 2
    c.stamp("_ghost", 140 + Math.round(30 * Math.sin(t)), 70 + Math.round(8 * Math.sin(t * 2)), { frame: c.frame % 8 })
    c.stamp("_ghost", 290 + Math.round(12 * Math.sin(t * 2 + 1)), 112 + Math.round(5 * Math.sin(t * 3)), { frame: (c.frame + 3) % 8, flip: "x" })
    for (let i = 0; i < 4; i++) {
      const bx = crossX(c, i * 80, 12, i % 2 ? 1 : -1, 1 + (i % 2)), by = 24 + i * 9 + Math.round(4 * Math.sin(t * (2 + i) + i))
      c.stamp("_bat", bx, by, { frame: (c.frame + i) % 4 })
    }
  },
)
