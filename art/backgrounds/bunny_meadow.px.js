// A spring meadow: a windmill turning on the hill, a rainbow, bunnies hopping through the flowers,
// butterflies and bees, a gardener, and someone reading under a blossom tree.
include("palette.px.js", { palette: true })
include("kit.px.js")
include("people.px.js")
pal({
  A: "#6ab4ec", C: "#8cc8f2", D: "#b0dcf6", E: "#d8eefa",              // sky
  I: "#f2f6fa", K: "#cad8ea",                                          // clouds
  L: "#9ad07a", M: "#7ab866", 6: "#b8e08c",                            // hills: far, near, light
  a: "#8ad25e", c: "#70be4c", d: "#56a43e", e: "#c4ec7a",              // meadow
  f: "#f4ece0", i: "#d8ccbc", l: "#a8988a",                            // windmill: wall, shade, stone
  m: "#a05a3e", o: "#7a4430",                                          // roof, sails' wood
  q: "#ffb8d0", u: "#ff8ab4", v: "#ffe4ee",                            // blossom
  x: "#f4f0ec", z: "#d6c8c0", O: "#ff9aa8",                            // bunny: white, shade, nose and ear
  Q: "#c8a07a", U: "#9a7656",                                          // brown bunny
  0: "#ff6a6a", 1: "#ffb04a", 2: "#ffe45a", 3: "#7ad46a", 4: "#5ab0f0", 5: "#9a7ae0", // rainbow
  7: "#6aa8d8",                                                        // the windmill's window
})
ramps("ACDE", "dcae", "zx", "UQ", "uqv")

const HZ = 104

person("gardener", { skin: "s", hair: "J", top: "g", legs: "b", hat: HAT.sun })
person("reader", { skin: "t", hair: "j", top: "y", dress: true, long: true })
person("hiker", { skin: "s", hair: "h", top: "r", legs: "n", hat: HAT.cap })

// a bunny hopping right: crouch, leap, land, sit (6 frames); `k` body, `s` shade
function bunny(name, k, s) {
  anim(name, { w: 11, h: 11, frames: 6, fps: 8, outline: "k", pivot: [5, 11] }, (c) => {
    const lift = [0, 2, 4, 3, 1, 0][c.frame], stretch = c.frame === 2 || c.frame === 3
    const y = 6 - lift
    c.ellipse(4, y + 2, stretch ? 4 : 3, 2, k); c.circ(8, y, 2, k); c.vline(7, y - 4, 3, k); c.vline(9, y - 4, 3, k); c.px(7, y - 3, "O"); c.px(9, y - 3, "O")
    c.px(9, y, "k"); c.px(10, y + 1, "O"); c.px(0, y + 1, "x"); c.hline(2, y + 4, 4, s)
  })
}
bunny("_bunny_w", "x", "z"); bunny("_bunny_b", "Q", "U")

// a bunny's way: hop from xa to xb and back, pausing to nibble at either end
function hops(c, name, xa, xb, y, shift) {
  const t = (c.frame + Math.round(shift * FRAMES)) % FRAMES, half = FRAMES / 2
  const going = t < half, u = going ? t : t - half
  const moveFrames = 72, x = u < moveFrames ? Math.round(xa + (xb - xa) * (going ? u : moveFrames - u) / moveFrames * 1) : going ? xb : xa
  const right = (xb > xa) === going
  const pos = u < moveFrames ? (going ? xa + (xb - xa) * u / moveFrames : xb - (xb - xa) * u / moveFrames) : (going ? xb : xa)
  c.stamp(name, Math.round(pos), y, { frame: u < moveFrames ? u % 6 : 0, flip: right ? undefined : "x" })
}

anim("bunny_meadow", { w: W, h: H, frames: FRAMES, fps: FPS },
  grad(0, 0, W, HZ, "ACDE"),
  // a soft rainbow behind the hills
  (c) => { ;["0", "1", "2", "3", "4", "5"].forEach((k, i) => c.arc(70, HZ - 2, 80 - i * 3, 180, 360, k, { inner: 78 - i * 3 })) },
  clouds({ y: 36, gap: 96, w: 48, h: 14, n: 4, seed: 12, keys: "fIK", empty: [3] }),
  // hills
  (c) => {
    for (let x = 0; x < W; x++) { const h = Math.round(14 + 12 * vnoise(x / 50, 9)); c.vline(x, HZ - h, h + 2, "L") }
    c.ellipse(250, HZ + 20, 110, 40, "M"); c.ellipse(244, HZ + 18, 100, 36, "6"); c.ellipse(250, HZ + 22, 104, 36, "M")
  },
  // the windmill on the hill, its sails turning (a whole turn per loop, so it closes)
  (c) => {
    const mx = 250, mb = 92
    c.poly([mx - 10, mb, mx - 7, mb - 34, mx + 7, mb - 34, mx + 10, mb], "f"); c.poly([mx + 3, mb, mx + 3, mb - 34, mx + 7, mb - 34, mx + 10, mb], "i")
    c.poly([mx - 9, mb - 33, mx, mb - 44, mx + 9, mb - 33], "m"); c.rect(mx - 2, mb - 10, 4, 10, "o"); c.rect(mx - 2, mb - 24, 3, 4, "7")
    const a0 = c.phase * Math.PI * 2 * 3
    for (let i = 0; i < 4; i++) {
      const a = a0 + i * Math.PI / 2, ex = mx + Math.round(Math.cos(a) * 22), ey = mb - 36 + Math.round(Math.sin(a) * 22)
      c.line(mx, mb - 36, ex, ey, "o")
      const px = -Math.sin(a), py = Math.cos(a)
      for (let r = 7; r <= 21; r++) { const sx = mx + Math.cos(a) * r, sy = mb - 36 + Math.sin(a) * r; c.line(Math.round(sx), Math.round(sy), Math.round(sx + px * 4), Math.round(sy + py * 4), r % 3 ? "x" : "i") }
    }
    c.circ(mx, mb - 36, 1, "o")
  },
  // the meadow, with tufts and flowers
  (c) => {
    c.rect(0, HZ, W, H, "c"); c.rect(0, HZ + 6, W, H, "a"); for (let x = 0; x < W; x++) c.vline(x, HZ + 4 + Math.round(2 * Math.sin(x / 13)), 4, "c")
    for (let i = 0; i < 140; i++) {
      const x = Math.floor(hash(i, 14) * W), y = HZ + 10 + Math.floor(hash(i, 15) * (H - HZ - 10)), sw = Math.round(Math.sin(c.phase * Math.PI * 4 + x / 20))
      if (i % 2) { c.px(x, y, "d"); c.px(x + sw, y - 1, "c") }
      else { c.vline(x, y - 2, 2, "d"); c.px(x + (y > 150 ? sw : 0), y - 3, "0u2v5w"[i % 6]) }
    }
    // bigger flowers in clumps: a petal on each side of a yellow middle
    for (let i = 0; i < 36; i++) {
      const x = Math.floor(hash(i, 51) * W), y = HZ + 16 + Math.floor(hash(i, 52) * (H - HZ - 18)), k = "uw5q0"[i % 5]
      c.vline(x, y + 1, 3, "d"); c.px(x - 1, y, k); c.px(x + 1, y, k); c.px(x, y - 1, k); c.px(x, y + 1, k); c.px(x, y, "2")
    }
  },
  // the blossom tree with someone reading under it
  (c) => {
    roundTree(c, 46, 146, 22, ["U", "Q", "O", "u", "q", "v", "I"], 21)
    c.stamp("reader_idle", 58, 150, { frame: Math.floor(c.frame / 10) % 2, flip: "x" })
    // petals drifting down from it
    for (let i = 0; i < 12; i++) {
      const t = (c.phase * 2 + hash(i, 40)) % 1, x = 20 + Math.floor(hash(i, 41) * 80) + Math.round(t * 40), y = 100 + Math.round(t * 70)
      c.px(x + Math.round(2 * Math.sin(t * 12)), y, "q")
    }
  },
  // the gardener among the flowers, and a hiker on the path over the hill
  (c) => {
    pace(c, "gardener", 140, 200, 162, 0.1, 50)
    pace(c, "hiker", 196, 300, 118, 0.6, 16)
    hops(c, "_bunny_w", 100, 170, 138, 0)
    hops(c, "_bunny_b", 280, 220, 150, 0.3)
    hops(c, "_bunny_w", 230, 300, 172, 0.6)
    // butterflies and a bee
    const ph = c.phase * Math.PI * 2
    ;[[120, 128, "u"], [200, 140, "2"], [280, 132, "4"], [90, 160, "5"]].forEach(([bx, by, k], i) => {
      const x = bx + Math.round(16 * Math.sin(ph * (i + 1) + i)), y = by + Math.round(7 * Math.sin(ph * (i + 2) + i * 2)), open = (c.frame + i) % 2
      c.px(x, y, "k"); c.px(x - 1, y - open, k); c.px(x + 1, y - open, k); if (!open) { c.px(x - 1, y, k); c.px(x + 1, y, k) }
    })
    const bx = 170 + Math.round(30 * Math.sin(ph * 3)), by = 150 + Math.round(10 * Math.sin(ph * 5))
    c.px(bx, by, "2"); c.px(bx + 1, by, "k"); c.px(bx, by - 1 - (c.frame % 2), "x")
  },
)
