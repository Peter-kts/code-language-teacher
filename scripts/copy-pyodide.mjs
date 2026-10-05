// Copy the Pyodide runtime into public/ so the app serves it itself (no CDN).
import { cpSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const src = dirname(require.resolve('pyodide/package.json'))
const dest = join(import.meta.dirname, '..', 'public', 'pyodide')
const files = ['pyodide.asm.js', 'pyodide.asm.wasm', 'python_stdlib.zip', 'pyodide-lock.json']

mkdirSync(dest, { recursive: true })
for (const file of files) cpSync(join(src, file), join(dest, file))
console.log(`Copied Pyodide runtime to ${dest}`)
