import { useEffect, useRef } from 'react'

const IMAGE_URL = '/galaxy.webp'
const TRAIL_LENGTH = 8

const VERT = `
attribute vec2 p;
void main() { gl_Position = vec4(p, 0.0, 1.0); }
`

const FRAG = `
precision highp float;
uniform sampler2D uTex;
uniform vec2 uRes;
uniform vec2 uImg;
uniform float uDpr;
uniform float uTime;
uniform float uDrift;
uniform vec2 uMouse;
uniform float uActive;
uniform float uZoom;
uniform vec3 uTrail[${TRAIL_LENGTH}];

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}

vec3 starLayer(vec2 px, float cellPx, float density, float seed, float sizeMin, float sizeMax) {
  vec2 p = px / cellPx;
  vec2 cell = floor(p);
  vec2 f = fract(p);
  float h = hash(cell + seed);
  if (h > density) return vec3(0.0);
  vec2 pos = vec2(hash(cell + seed + 1.3), hash(cell + seed + 7.1)) * 0.8 + 0.1;
  float r = length((f - pos) * cellPx) / uDpr;
  float size = mix(sizeMin, sizeMax, pow(hash(cell + seed + 3.7), 3.0));
  float tw = 0.5 + 0.5 * sin(uTime * mix(0.4, 1.8, hash(cell + seed + 9.2)) + h * 80.0);
  float core = smoothstep(size + 0.8, size * 0.2, r);
  float halo = exp(-(r * r) / (size * 14.0)) * 0.3;
  vec3 tint = mix(vec3(0.70, 0.80, 1.0), vec3(1.0, 0.84, 0.95), hash(cell + seed + 5.5));
  return tint * (core + halo) * mix(0.35, 1.0, tw);
}

void main() {
  vec2 px = gl_FragCoord.xy;
  vec2 uv = px / uRes;
  vec2 mpx = uMouse * uRes;
  vec2 d = px - mpx;
  float dist = length(d) / uDpr;

  // Gravity well: a gentle swirl and slight pinch around the cursor.
  float well = smoothstep(190.0, 0.0, dist) * uActive;
  float ang = well * well * 0.28;
  float c = cos(ang), s = sin(ang);
  vec2 rd = mat2(c, -s, s, c) * d;
  rd *= 1.0 - well * 0.05;
  vec2 wpx = mpx + rd;

  // Ripples left behind by fast mouse movement.
  for (int i = 0; i < ${TRAIL_LENGTH}; i++) {
    vec3 tr = uTrail[i];
    float life = 1.0 - tr.z;
    if (life <= 0.0) continue;
    vec2 td = px - tr.xy * uRes;
    float r = length(td) / uDpr;
    float ring = exp(-pow((r - tr.z * 130.0) / 18.0, 2.0));
    wpx += normalize(td + 0.0001) * ring * life * life * 3.0 * uDpr;
  }

  // Parallax and flowing gas (the drift noise varies across the image, so it warps).
  float t = uTime * uDrift;
  vec2 par = (uMouse - 0.5) * uActive;
  vec2 wuv = wpx / uRes;
  vec2 drift = vec2(
    noise(wuv * 1.4 + t * 0.018),
    noise(wuv * 1.4 + vec2(7.3, 2.9) - t * 0.015)
  ) - 0.5;
  vec2 imgPx = wpx - par * 16.0 * uDpr + drift * 34.0 * uDpr * uDrift;

  // Slow camera: pan, a slight tilt and a gentle breathing zoom.
  vec2 rel = imgPx - uRes * 0.5;
  float tilt = sin(t * 0.021) * 0.035;
  rel = mat2(cos(tilt), -sin(tilt), sin(tilt), cos(tilt)) * rel;
  rel += vec2(sin(t * 0.013), cos(t * 0.011)) * 38.0 * uDpr;
  float k = max(uRes.x / uImg.x, uRes.y / uImg.y) * uZoom * (1.0 + 0.025 * sin(t * 0.08));
  vec2 tuv = (rel / k + uImg * 0.5) / uImg;
  vec3 col = texture2D(uTex, tuv).rgb;

  // Keep it subtle, with a faint slow pulse of light.
  col = pow(col, vec3(1.1)) * 0.62 * (1.0 + 0.05 * sin(t * 0.11));

  // Faint lavender light near the cursor.
  float glow = smoothstep(280.0, 0.0, dist) * uActive;
  col += col * glow * 0.22 + vec3(0.78, 0.70, 1.0) * glow * glow * 0.02;

  // Procedural stars, nudged aside and slightly brightened near the cursor.
  vec2 dir = d / max(length(d), 0.0001);
  vec2 push = dir * well * 7.0 * uDpr;
  vec3 stars = starLayer(px - push - par * 22.0 * uDpr, 34.0 * uDpr, 0.38, 1.0, 0.35, 0.9) * 0.55
             + starLayer(px - push - par * 36.0 * uDpr, 110.0 * uDpr, 0.32, 17.0, 0.6, 1.6);
  col += stars * (0.75 + well * 0.6);

  // Vignette to the page background.
  vec2 q = (uv - 0.5) * vec2(uRes.x / uRes.y, 1.0);
  float vig = smoothstep(1.1, 0.2, length(q * vec2(0.8, 1.05)));
  col = mix(vec3(0.02, 0.016, 0.04), col, mix(0.2, 1.0, vig));

  gl_FragColor = vec4(col, 1.0);
}
`

/**
 * Fixed full-screen nebula behind the app. The gas flows and the view slowly
 * pans, tilts and breathes; the mouse gently bends and lights the gas, nudges
 * stars aside and leaves faint ripples when it moves fast. Touch devices get
 * the ambient motion only, and reduced-motion users get a still image.
 */
export function GalaxyBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const gl = canvas?.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' })
    if (!canvas || !gl) return // the CSS fallback image stays visible

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const compile = (type: number, src: string) => {
      const sh = gl.createShader(type)!
      gl.shaderSource(sh, src)
      gl.compileShader(sh)
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(sh))
        return null
      }
      return sh
    }
    const vs = compile(gl.VERTEX_SHADER, VERT)
    const fs = compile(gl.FRAGMENT_SHADER, FRAG)
    if (!vs || !fs) return
    const prog = gl.createProgram()!
    gl.attachShader(prog, vs)
    gl.attachShader(prog, fs)
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(prog))
      return
    }
    gl.useProgram(prog)

    // One oversized triangle covers the screen.
    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const loc = gl.getAttribLocation(prog, 'p')
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)

    const u = (name: string) => gl.getUniformLocation(prog, name)
    const U = {
      tex: u('uTex'), res: u('uRes'), img: u('uImg'), dpr: u('uDpr'), time: u('uTime'), drift: u('uDrift'),
      mouse: u('uMouse'), active: u('uActive'), zoom: u('uZoom'), trail: u('uTrail'),
    }

    let dpr = 1
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      const w = Math.round(window.innerWidth * dpr)
      const h = Math.round(window.innerHeight * dpr)
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
        gl.viewport(0, 0, w, h)
      }
    }
    resize()

    // Mouse only: touch keeps the idle drift.
    const target = { x: 0.5, y: 0.5 }
    const mouse = { x: 0.5, y: 0.5 }
    let hovering = false
    let active = 0
    const trail = Array.from({ length: TRAIL_LENGTH }, () => ({ x: 0, y: 0, born: -1e9 }))
    let trailIdx = 0
    let lastPush = 0
    let lastPt: { x: number; y: number; t: number } | null = null

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      hovering = true
      target.x = e.clientX / window.innerWidth
      target.y = 1 - e.clientY / window.innerHeight
      const now = performance.now()
      if (lastPt) {
        const speed = Math.hypot(e.clientX - lastPt.x, e.clientY - lastPt.y) / Math.max(1, now - lastPt.t)
        if (speed > 1.6 && now - lastPush > 110) {
          trail[trailIdx] = { x: target.x, y: target.y, born: now }
          trailIdx = (trailIdx + 1) % TRAIL_LENGTH
          lastPush = now
        }
      }
      lastPt = { x: e.clientX, y: e.clientY, t: now }
    }
    const onLeave = () => {
      hovering = false
    }

    const trailData = new Float32Array(TRAIL_LENGTH * 3)
    let imgW = 2048
    let imgH = 2048
    let raf = 0
    let last = performance.now()
    const t0 = last

    const frame = (now: number) => {
      const step = Math.min(50, now - last) / 16.667
      last = now
      // Slow, floaty follow.
      const a = 1 - Math.pow(0.97, step)
      mouse.x += (target.x - mouse.x) * a
      mouse.y += (target.y - mouse.y) * a
      active += ((hovering ? 1 : 0) - active) * (1 - Math.pow(0.975, step))
      for (let i = 0; i < TRAIL_LENGTH; i++) {
        trailData[i * 3] = trail[i].x
        trailData[i * 3 + 1] = trail[i].y
        trailData[i * 3 + 2] = Math.min(1, (now - trail[i].born) / 1000)
      }
      gl.uniform2f(U.res, canvas.width, canvas.height)
      gl.uniform2f(U.img, imgW, imgH)
      gl.uniform1f(U.dpr, dpr)
      gl.uniform1f(U.time, (now - t0) / 1000)
      gl.uniform1f(U.drift, reduced ? 0 : 1)
      gl.uniform2f(U.mouse, mouse.x, mouse.y)
      gl.uniform1f(U.active, active)
      gl.uniform1f(U.zoom, 1.08)
      gl.uniform3fv(U.trail, trailData)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
      raf = requestAnimationFrame(frame)
    }

    let tex: WebGLTexture | null = null
    let ready = false
    const img = new Image()
    img.onload = () => {
      imgW = img.naturalWidth
      imgH = img.naturalHeight
      const pot = (imgW & (imgW - 1)) === 0 && (imgH & (imgH - 1)) === 0
      tex = gl.createTexture()
      gl.bindTexture(gl.TEXTURE_2D, tex)
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img)
      if (pot) {
        gl.generateMipmap(gl.TEXTURE_2D)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.MIRRORED_REPEAT)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.MIRRORED_REPEAT)
      } else {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      }
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
      gl.uniform1i(U.tex, 0)
      ready = true
      // Draw the first frame right away so the canvas has content before it fades in.
      if (!document.hidden) frame(performance.now())
      canvas.classList.add('ready')
    }
    img.src = IMAGE_URL

    // Stop drawing while the tab is hidden.
    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf)
        raf = 0
      } else if (ready && !raf) {
        last = performance.now()
        raf = requestAnimationFrame(frame)
      }
    }

    window.addEventListener('resize', resize)
    document.addEventListener('visibilitychange', onVisibility)
    if (!reduced) {
      window.addEventListener('pointermove', onMove, { passive: true })
      document.documentElement.addEventListener('mouseleave', onLeave)
    }

    return () => {
      img.onload = null
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pointermove', onMove)
      document.documentElement.removeEventListener('mouseleave', onLeave)
      canvas.classList.remove('ready')
      gl.deleteTexture(tex)
      gl.deleteBuffer(buf)
      gl.deleteProgram(prog)
      gl.deleteShader(vs)
      gl.deleteShader(fs)
    }
  }, [])

  return (
    <>
      <div className="sky-fallback" aria-hidden="true" />
      <canvas ref={canvasRef} className="sky" aria-hidden="true" />
      <div className="grain" aria-hidden="true" />
    </>
  )
}
