# code-language-teacher

A browser IDE for learning programming languages and LeetCode patterns: write code, watch it visualized live, and look up syntax as you go.

## Run it

```sh
npm install
npm run dev
```

Open the printed URL. Everything runs in your browser; there is no server.

## How it works

- **Editor:** Monaco (the editor inside VS Code), bundled locally.
- **Running Python:** [Pyodide](https://pyodide.org) runs real CPython in a Web Worker (`src/runner/pyodide.worker.ts`), so a runaway loop never freezes the page. The runtime is copied from `node_modules` into `public/pyodide` on install.
- **Live updates:** 300ms after you stop typing, the code is parsed. A syntax error gets a red squiggle and the last good visual stays up; otherwise the code runs and the visual redraws. Runs are capped at 2000 steps, and a run stuck on one slow line is stopped after 5 seconds.
- **Tracing:** `src/python/tracer.py` runs the code under `sys.settrace` and records the variables at every line. It also reads the code to find pointers:
  - `for n in nums` puts an arrow labeled `n` under the current box (duplicates are handled, because the loop is rewritten to count its position).
  - `for i in range(len(nums))`, `for i, n in enumerate(nums)` and any `nums[i]` put an arrow labeled `i` under box `i`, which also covers two-pointer code like `l` and `r`.
- **Visuals:** lists and tuples are drawn as boxes with indexes and pointer arrows (`src/viz`). Step through the run with the slider or Play; the current line is highlighted in the editor.
- **Syntax helper:** built-in Python syntax cards with an Insert button (`src/syntax`). This is a placeholder for a Claude-powered chat.

## Tests

```sh
npm run test:py   # tracer tests (needs python3)
npm test          # TypeScript unit tests
npm run build     # typecheck + production build
```
