// Chibi people, 7 px wide and 12 tall before the outline: a big head (half the height), a body no
// wider than it, short legs. Side view facing right; stamp with { flip: "x" } to face left.
// person(name, look) makes `name` (a 4-frame walk at 8 fps) and `name_idle` (2 frames, breathing).
// look: { skin: "s"|"t", hair: key, top: key, legs: key, dress?: true, hat?: [rows of a grid] ,
//         long?: true (hair down the back), kid?: true (2 px shorter) }
const SHADE = { s: "S", t: "T", r: "R", b: "B", y: "Y", p: "P", g: "G", w: "W", n: "N", h: "j", H: "Y", j: "j", J: "R" }

function drawPerson(c, look, step, bob) {
  const sk = look.skin || "s", skS = SHADE[sk], top = look.top || "b", topS = SHADE[top] || top
  const legs = look.legs || "n", legsS = SHADE[legs] || legs, hair = look.hair || "h"
  const y0 = (look.kid ? 4 : 2) + bob   // head top; room above for a hat
  // head: 6 wide, 6 tall, face to the right
  c.rect(1, y0 + 1, 6, 5, sk)
  c.hline(2, y0, 4, hair); c.rect(1, y0 + 1, 6, 1, hair); c.rect(1, y0 + 2, 2, 2, hair); c.px(1, y0 + 4, hair)
  if (look.long) c.rect(0, y0 + 2, 2, look.kid ? 5 : 7, hair)
  c.px(5, y0 + 3, "k")                                   // eye
  c.px(6, y0 + 4, "r")                                   // a blush
  c.px(2, y0 + 5, skS)                                   // the jaw's shade at the back
  if (look.hat) c.grid(0, y0 - 2, look.hat)
  // body
  const by = y0 + 6, bh = look.kid ? 3 : 4
  if (look.dress) {
    c.rect(2, by, 4, 2, top); c.rect(1, by + 2, 6, bh - 1, top); c.hline(1, by + bh, 6, topS)
  } else {
    c.rect(2, by, 4, bh, top); c.vline(2, by, bh, topS)
  }
  // the near arm swings with the step
  const ax = [3, 4, 3, 2][step]
  c.vline(ax, by + 1, 2, topS); c.px(ax, by + 3, sk)
  // legs: two columns, the far one darker, apart on frames 0 and 2
  const ly = by + bh + (look.dress ? 1 : 0), apart = step % 2 === 0
  const near = step === 0 ? 5 : 2, far = step === 0 ? 2 : 5
  if (apart) { c.vline(far, ly, 2, legsS); c.vline(near, ly, 2, legs); c.px(far + 1, ly + 1, "k"); c.px(near + 1, ly + 1, "k") }
  else { c.vline(3, ly, 2, legsS); c.vline(4, ly, 2, legs); c.px(5, ly + 1, "k") }
}

function person(name, look) {
  const h = 16
  anim(name, { w: 8, h, frames: 4, fps: 8, outline: "k", pivot: [4, h] }, (c) => drawPerson(c, look, c.frame, c.frame % 2))
  anim(name + "_idle", { w: 8, h, frames: 2, fps: 2, outline: "k", pivot: [4, h] }, (c) => drawPerson(c, look, 1, 0), (c) => {
    if (c.frame) c.warp((x, y) => y < h - 3 && [0, 1])
  })
}

// small hats, drawn 2 rows above the head's top (8 px wide grids, "." keeps)
const HAT = {
  witch: "...kp...\n..kpp...\n.kppppk.\npppppppp",
  sun: "..yyyy..\nyyyyyyyy",
  cap: "..rrrr..\n..rrrrrr",
  crown: ".y.y.y..\n.yyyyy..",
  beanie: "..rrrr..\n.rrrrrr.",
}
