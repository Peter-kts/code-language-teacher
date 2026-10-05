# code-language-teacher

A browser IDE for learning programming languages and LeetCode patterns: write code, watch it visualized live, and look up syntax as you go.

## Run it

```sh
npm install
npm run dev
```

Open the printed URL. Python runs entirely in your browser.

The **Ask Claude** chat needs an Anthropic API key, which stays on the server side and never reaches the browser. Copy `.env.example` to `.env` and paste your key after `ANTHROPIC_API_KEY=`, then restart `npm run dev`. `.env` is git-ignored, so the key is never committed.

**Deploy to Vercel:** import the GitHub repo at vercel.com/new (it detects Vite), add `ANTHROPIC_API_KEY` under Settings → Environment Variables, and deploy. `api/chat.mjs` runs the chat; every push to `main` redeploys.

For a production build on your own server: `npm run build && ANTHROPIC_API_KEY=... npm start` (serves on port 8787, or `PORT`).

## How it works

- **Editor:** Monaco (the editor inside VS Code), bundled locally.
- **Running Python:** [Pyodide](https://pyodide.org) runs real CPython in a Web Worker (`src/runner/pyodide.worker.ts`), so a runaway loop never freezes the page. The runtime is copied from `node_modules` into `public/pyodide` on install.
- **Live updates:** 300ms after you stop typing, the code is parsed. A syntax error gets a red squiggle and the last good visual stays up; otherwise the code runs and the visual redraws. Runs are capped at 2000 steps, and a run stuck on one slow line is stopped after 5 seconds.
- **Tracing:** `src/python/tracer.py` runs the code under `sys.settrace` and records the variables at every line. It also reads the code to find pointers:
  - `for n in nums` puts an arrow labeled `n` under the current box (duplicates are handled, because the loop is rewritten to count its position).
  - `for i in range(len(nums))`, `for i, n in enumerate(nums)` and any `nums[i]` put an arrow labeled `i` under box `i`, which also covers two-pointer code like `l` and `r`.
- **Visuals:** lists and tuples are drawn as boxes with indexes and pointer arrows (`src/viz`). Step through the run with the slider or Play; the current line is highlighted in the editor.
- **Problems:** LeetCode-style problems live in `src/problems/problems.ts` (Two Sum so far). The tracer calls your function with the selected test case so the visual walks through its body, dicts are drawn as key/value tables with new entries highlighted, and every test case is run to show pass/fail.
- **Ask Claude:** a chat panel (`src/chat`) that streams answers from `server/chat.mjs`, which calls the Claude API with your current code and problem as context. Code blocks in answers have an Insert button. The same handler runs inside the Vite dev server and the production server (`server/index.mjs`).
- **Syntax cards:** built-in Python examples with an Insert button (`src/syntax`) that work without an API key.

## Tests

```sh
npm run test:py   # tracer tests (needs python3)
npm test          # TypeScript unit tests
npm run build     # typecheck + production build
```
