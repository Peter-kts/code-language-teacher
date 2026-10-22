// A summer afternoon in the park: a pond with ducks, people strolling on the path, a kid flying a
// kite, a picnic, a dog running, butterflies. Sun up on the right, clouds drifting.
include("palette.px.js", { palette: true })
include("kit.px.js")
include("people.px.js")
pal({
  A: "#4a90e0", C: "#6fb0ec", D: "#9ccdf2", E: "#c8e6f6",            // sky, top down
  I: "#e6eef8", K: "#bccbe0",                                          // cloud gray, cloud base
  L: "#68a874", M: "#86c088", 6: "#a8d4a0",                            // far trees in haze
  a: "#94d464", c: "#82c656", d: "#5fa848", e: "#bce674", 7: "#4a8c40", // lawn: stripes, shade, light, deep
  f: "#f0e2c0", i: "#d4c098", 8: "#bba67e",                            // path, its edge, pebbles
  l: "#4aa0d8", m: "#7cc4ec", o: "#c4ecfa", q: "#3a7ab8",              // pond: water, light, glint, deep
  u: "#5a3a2a", v: "#7a5236",                                          // bark
  x: "#24603a", z: "#3a8440", O: "#5aac46", Q: "#8ad058", U: "#d0f080", // leaves: deep to glint
  V: "#fff6c8", X: "#ffe27a", Z: "#fff0a0",                            // sun
  0: "#9a6a44", 1: "#64402c",                                          // bench
  3: "#f39a3a", 4: "#d09058", 5: "#9a6438",                            // duck beak, dog
})
ramps("ACDE", "xzOQU", "uv", "Nn", "7dcae")

const HZ = 92, PATH = 134

person("stroller", { skin: "s", hair: "h", top: "r", legs: "b" })
person("jogger", { skin: "t", hair: "j", top: "y", legs: "n", cap: true, hat: HAT.cap })
person("lady", { skin: "s", hair: "H", top: "p", dress: true, long: true, hat: HAT.sun })
person("grandpa", { skin: "t", hair: "W", top: "g", legs: "n" })
person("kid", { skin: "s", hair: "J", top: "b", legs: "n", kid: true })
person("picnic1", { skin: "t", hair: "j", top: "w", dress: true, long: true })
person("picnic2", { skin: "s", hair: "h", top: "g", legs: "b" })

sprite("_bench", { pivot: "bottom", outline: "k" }, `
  000000000000
  111111111111
  000000000000
  .1........1.
  .1........1.`)

// a duck, swimming right; 2 frames of a bob
anim("_duck", { w: 9, h: 7, frames: 2, fps: 2, outline: "k", pivot: [4, 6] }, (c) => {
  const b = c.frame
  c.rect(1, 3 + b, 7, 3, "w"); c.hline(2, 6 + b, 5, "W"); c.rect(5, 0 + b, 3, 3, "w"); c.px(6, 1 + b, "k"); c.px(8, 2 + b, "3")
  c.hline(1, 3 + b, 2, "W")
})

// a dog trotting right, 4 frames
anim("_dog", { w: 11, h: 8, frames: 4, fps: 8, outline: "k", pivot: [5, 8] }, (c) => {
  const f = c.frame, up = f % 2
  c.rect(2, 3 - up, 7, 3, "4"); c.rect(7, 1 - up, 3, 3, "4"); c.px(10, 2 - up, "4"); c.px(8, 2 - up, "k")
  c.px(7, 0 - up + 1, "5"); c.px(1, 2 - up, "5"); c.px(0, 1 - up, "5")
  const legs = f % 2 ? [3, 7] : [2, 8]
  for (const lx of legs) c.vline(lx, 6 - up, 2 + up, "5")
})

anim("summer_park", { w: W, h: H, frames: FRAMES, fps: FPS },
  // sky and sun
  grad(0, 0, W, HZ, "ACDE"),
  (c) => {
    const sx = 268, sy = 28, pulse = Math.round(Math.sin(c.phase * Math.PI * 4))
    c.circ(sx, sy, 22 + pulse, "E"); c.circ(sx, sy, 16, "Z"); c.circ(sx, sy, 13, "X"); c.circ(sx - 2, sy - 2, 9, "V")
  },
  clouds({ y: 34, gap: 90, w: 52, h: 16, n: 4, seed: 4, keys: "wIK", empty: [2] }),
  clouds({ y: 60, gap: 60, w: 30, h: 9, n: 4, seed: 9, keys: "wIK", x: 20 }),
  // far trees: a bumpy line in haze, tops lit
  (c) => {
    for (let x = 0; x < W; x++) {
      const h = Math.round(7 + 5 * vnoise(x / 9, 1) + 4 * vnoise(x / 23, 5))
      c.vline(x, HZ - h, h + 2, "L"); c.vline(x, HZ - h, 1, "6"); if (vnoise(x / 9, 1) > 0.55) c.px(x, HZ - h + 1, "M")
    }
  },
  // lawn: mowing stripes, darker along the far edge
  (c) => {
    for (let y = HZ; y < H; y++) for (let x = 0; x < W; x++) {
      const band = Math.floor((x + (y - HZ) * 1.6) / 22) % 2
      c.px(x, y, band ? "a" : "c")
    }
    c.rect(0, HZ, W, 2, "d"); dither(0, HZ + 2, W, 3, "d", "c", 0.5)
  },
  // the path: a gentle S across the lawn, edged, a few pebbles
  (c) => {
    for (let x = 0; x < W; x++) {
      const y = PATH + Math.round(4 * Math.sin(x / 50))
      c.vline(x, y - 4, 9, "f"); c.px(x, y - 5, "i"); c.px(x, y + 5, "i")
      if (hash(x, 7) < 0.08) c.px(x, y - 2 + Math.floor(hash(x, 3) * 5), "8")
    }
  },
  // the pond, bottom left, its glints coming and going
  (c) => {
    c.ellipse(78, 163, 58, 14, "7"); c.ellipse(78, 164, 56, 12, "l"); c.ellipse(78, 166, 50, 8, "q"); c.ellipse(76, 160, 40, 3, "m")
    for (let i = 0; i < 9; i++) {
      const gx = 40 + Math.floor(hash(i, 2) * 76), gy = 156 + Math.floor(hash(i, 5) * 14)
      if (Math.sin((c.phase * 4 + hash(i, 9)) * Math.PI * 2) > 0.2) c.hline(gx, gy, 2 + (i % 3), "o")
    }
  },
  // trees far to near, a bench, flowers
  (c) => {
    const T = ["u", "v", "x", "z", "O", "Q", "U"]
    roundTree(c, 110, 100, 11, T, 3); roundTree(c, 205, 98, 9, T, 8)
    roundTree(c, 160, 112, 15, T, 5)
    c.stamp("_bench", 128, 128)
    for (let i = 0; i < 70; i++) {
      const fx = Math.floor(hash(i, 11) * W), fy = HZ + 6 + Math.floor(hash(i, 12) * (H - HZ - 6))
      if (c.is(fx, fy, "ac")) c.px(fx, fy, "rywpy"[i % 5])
    }
  },
  // people on the path; a picnic; the dog
  (c) => {
    pace(c, "grandpa", 120, 150, 129, 0.5, 40)
    pace(c, "stroller", 40, 130, 136, 0.1)
    pace(c, "lady", 290, 190, 133, 0.35)
    pace(c, "jogger", 180, 300, 141, 0.7, 8)
    // picnic blanket, a checker of red and white
    for (let y = 0; y < 8; y++) for (let x = 0; x < 22; x++) c.px(236 + x + (7 - y), 158 + y, ((x >> 2) + (y >> 1)) % 2 ? "r" : "w")
    c.stamp("picnic1_idle", 246, 160, { frame: Math.floor(c.frame / 6) % 2 })
    c.stamp("picnic2_idle", 258, 161, { frame: Math.floor(c.frame / 5 + 1) % 2, flip: "x" })
    const dx = crossX(c, 40, 14, 1, 2)
    c.stamp("_dog", dx, 152, { frame: c.frame % 4 })
  },
  // the kid and the kite, which dips and swings on its string
  (c) => {
    const kx = 180, ky = 118
    c.stamp("kid_idle", kx, ky, { frame: Math.floor(c.frame / 8) % 2 })
    const t = c.phase * Math.PI * 2
    const ax = 150 + Math.round(10 * Math.sin(t * 2)), ay = 46 + Math.round(5 * Math.sin(t * 3))
    c.curve([kx + 3, ky - 9, (kx + ax) / 2 + 6, (ky + ay) / 2 + 4, ax, ay + 4], "w")
    c.poly([ax, ay - 5, ax + 4, ay, ax, ay + 5, ax - 4, ay], "r"); c.line(ax, ay - 5, ax, ay + 5, "y"); c.line(ax - 4, ay, ax + 4, ay, "y")
    for (let i = 0; i < 3; i++) c.px(ax - 1 + Math.round(2 * Math.sin(t * 4 + i)), ay + 6 + i * 2, "rby"[i])
  },
  // big trees in front at both sides
  (c) => {
    const T = ["u", "v", "x", "z", "O", "Q", "U"]
    roundTree(c, 18, 150, 22, T, 11); roundTree(c, 304, 150, 24, T, 13)
  },
  // ducks paddling, butterflies, birds
  (c) => {
    pace(c, "_duck", 50, 100, 166, 0.2, 0)
    const ph = c.phase * Math.PI * 2
    ;[[90, 120, "y"], [220, 140, "p"], [270, 112, "w"]].forEach(([bx, by, k], i) => {
      const x = bx + Math.round(14 * Math.sin(ph * (i + 1) + i)), y = by + Math.round(6 * Math.sin(ph * (i + 2) + i * 2))
      const open = (c.frame + i) % 2
      c.px(x, y, "k"); c.px(x - 1, y - open, k); c.px(x + 1, y - open, k)
    })
    bird(c, crossX(c, 60, 10, -1), 22, "N", c.frame); bird(c, crossX(c, 72, 10, -1) + 9, 26, "N", c.frame + 2)
  },
)
