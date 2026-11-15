// POST /api/chat: streams a Claude answer as plain text.
// Used by the Vite dev server (vite.config.ts) and the production server (server/index.mjs).
import Anthropic from '@anthropic-ai/sdk'
import { existsSync } from 'node:fs'
import { createHash, timingSafeEqual } from 'node:crypto'
import { join } from 'node:path'
import { applyTool, describeTables, playgroundTools, PlaygroundEditError, readPlayground } from './playground.mjs'

// Load ANTHROPIC_API_KEY from a .env file in the project root, if there is one.
const envFile = join(import.meta.dirname, '..', '.env')
if (existsSync(envFile)) process.loadEnvFile(envFile)

const MODEL = 'claude-opus-5-5'
// How many times one answer may go back to Claude after changing the screen (each round resends the chat).
const MAX_TOOL_ROUNDS = 3
// Separates a screen change from the answer's text in the stream (an ASCII "record separator", which
// never shows up in ordinary text). The browser splits these out: see src/chat/stream.ts.
export const EDIT_MARK = '\x1e'

/** What the tools let Claude do, said once for every language. */
const editing = (sql) => `You can also change what is on their screen with tools: edit_code and write_code change ${sql ? 'the query in their editor, and set_table, edit_rows and drop_table change the tables the query runs on' : 'the code in their editor'}. Use them only when the learner asks you to change, fix, add or try something on their screen (like ${sql ? '"add a customer with no orders", "make one salary NULL", "fix my query"' : '"fix my loop", "put that in my editor", "try it with an empty list"'}). For a hint or an explanation, leave their screen alone. After changing something, say in a sentence or two what you changed and what to look for: the changes light up on their screen and one click undoes them, so don't repeat the changed code in a fenced block.`

// The language the learner has picked in the editor, as its name and its code fence tag.
const LANGUAGES = {
  python: { name: 'Python', fence: 'python', simple: 'plain lists, dicts and loops' },
  javascript: { name: 'modern JavaScript', fence: 'javascript', simple: 'plain arrays, objects, Maps and loops (no frameworks or libraries)' },
  sql: { name: 'SQL', fence: 'sql', simple: '' },
}

// SQL has its own workspace: queries run in SQLite in the browser, with stages instead of traced steps.
const sqlSystem = `You are the SQL helper inside a learning IDE. The learner is practicing SQL for job interviews: joins, GROUP BY and HAVING, subqueries, CTEs, window functions, NULL handling and the classic interview questions.

Answer the way a patient tutor would at a whiteboard: one or two sentences, then a short query in a \`\`\`sql fenced block. The learner can insert it into their editor with one click. Queries run in SQLite (in the browser), so write SQLite-compatible SQL; when MySQL or Postgres would spell something differently (DATEDIFF, DATE_FORMAT, CONCAT, ILIKE), say so in a few words, since interviews usually use those.

When they ask about the problem they are working on, give hints and explain ideas rather than the full answer, unless they explicitly ask for it. Their current query and the tables are attached to their latest message.

You can point at things on their screen. Write [[line:N]] for a line of their query, [[step:N]] for a stage of the query (the stages are listed in the <editor> block, in the order SQL runs them), and [[glossary:ID]] for a glossary card. Each becomes a chip they can tap. Use only the line numbers, steps and glossary ids listed in the <editor> block.

When showing where things are would explain it better than words alone (which stage drops a row, where a join loses a match), end with a tour: a \`\`\`tour block of two to six stops, one per line, each a reference and a short caption, like:
\`\`\`tour
line:3 | This LEFT JOIN keeps every customer
step:2 | Here WHERE drops the rows with NULL
\`\`\`
Leave the tour out for quick syntax questions.

${editing(true)}`

const system = (lang) => `You are the syntax helper inside a code-learning IDE. The learner is practicing ${lang.name} and LeetCode-style problems.

Answer the way a patient tutor would at a whiteboard: one or two sentences, then a short runnable ${lang.name} example in a \`\`\`${lang.fence} fenced block. The learner can insert your code into their editor with one click, so keep examples small and self-contained, using ${lang.simple} that a step-by-step visualizer can draw.

When they ask about the problem they are working on, give hints and explain ideas rather than the full solution, unless they explicitly ask for the answer. Their current code is attached to their latest message for context; refer to it when it helps.

You can point at things on their screen. Write [[line:N]] for a line of their code, [[var:NAME]] for a variable in the visualizer, [[step:N]] for a step of the run, [[console]] for printed output, [[history]] for the list of every change, and [[glossary:ID]] for a glossary card. Each becomes a chip they can tap to see it light up. Use only the line numbers, steps, variable names and glossary ids listed in the <editor> block, and only when pointing helps them find something.

When showing where things are would explain it better than words alone (how a loop moves through a list, where a value changes), end your answer with a tour: a \`\`\`tour block of two to six stops, one per line, each a reference and a short caption, like:
\`\`\`tour
line:3 | The loop starts here
var:nums | It walks this list one box at a time
step:12 | Here total jumps from 4 to 16
\`\`\`
They press "Show me" and a pointer moves through the stops in order. Leave the tour out for quick syntax questions.

${editing(false)}`

let client

/** @param {import('node:http').IncomingMessage} req @param {import('node:http').ServerResponse} res */
export async function handleChat(req, res) {
  if (req.method === 'GET') {
    // Setup check: open /api/chat in a browser to see what this deploy can see.
    // Reports only whether settings exist, never their values.
    const key = apiKey()
    res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' }).end(
      JSON.stringify(
        {
          apiKeySet: Boolean(key),
          apiKeyLooksRight: key.startsWith('sk-ant-') && /^[\x21-\x7e]+$/.test(key),
          passcodeRequired: Boolean(process.env.CHAT_PASSWORD),
          environment: process.env.VERCEL_ENV ?? 'local',
          commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
        },
        null,
        2,
      ),
    )
    return
  }
  if (req.method !== 'POST') {
    res.writeHead(405).end()
    return
  }
  // Optional passcode so strangers who find the site can't spend your API credits.
  if (process.env.CHAT_PASSWORD && !passcodeMatches(req.headers['x-chat-passcode'], process.env.CHAT_PASSWORD)) {
    res.writeHead(401, { 'content-type': 'text/plain' }).end('This chat needs a passcode.')
    return
  }
  let body
  try {
    // Some hosts (e.g. Vercel) parse JSON bodies before the handler runs.
    body = req.body && typeof req.body === 'object' ? req.body : JSON.parse(await readBody(req))
  } catch {
    res.writeHead(400, { 'content-type': 'text/plain' }).end('Bad request')
    return
  }
  const history = Array.isArray(body.messages) ? body.messages.slice(-20) : []
  if (history.length === 0 || history.at(-1).role !== 'user') {
    res.writeHead(400, { 'content-type': 'text/plain' }).end('Expected a user message')
    return
  }
  const lang = Object.hasOwn(LANGUAGES, body.language) ? LANGUAGES[body.language] : LANGUAGES.python
  const subject = Object.hasOwn(LANGUAGES, body.language) ? body.language : 'python'
  // The screen as it is now: Claude's tool calls are checked and applied against this copy.
  let screen = readPlayground(body.playground, body.code)
  const context = [
    body.problem ? `Problem: ${body.problem}` : 'Mode: free playground',
    `Current code (numbered for [[line:N]]; the numbers are not part of the code):\n\`\`\`${lang.fence}\n${numbered(screen.code)}\n\`\`\``,
    ...viewLines(body.view),
    ...(screen.tables
      ? [
          `The data the query runs on (row numbers are for edit_rows${body.problem ? '; in a problem, changing tables only changes the data shown for the current test case so they can explore, while the tests keep their own data' : ''}):\n${describeTables(screen.tables) || '(no tables)'}`,
        ]
      : []),
  ].join('\n')
  /** @type {any[]} */
  let messages = history.map((m, i) => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: i === history.length - 1 ? `${String(m.content)}\n\n<editor>\n${context}\n</editor>` : String(m.content),
  }))

  try {
    if (!apiKey()) throw new Error('missing api key')
    client ??= new Anthropic({ apiKey: apiKey() })
    const tools = playgroundTools(subject)
    let wroteText = false
    let started = false
    // If the learner leaves (closes the tab, starts a new chat), stop paying for the answer.
    let current = null
    let gone = false
    res.on('close', () => {
      if (res.writableEnded) return
      gone = true
      current?.abort()
    })
    for (let round = 0; round < MAX_TOOL_ROUNDS && !gone; round++) {
      // A tool-free last round, so the answer always ends in words rather than a call nobody runs.
      const last = round === MAX_TOOL_ROUNDS - 1
      const stream = client.beta.messages.stream({
        model: MODEL,
        max_tokens: 4000,
        output_config: { effort: 'low' },
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        system: body.language === 'sql' ? sqlSystem : system(lang),
        tools,
        ...(last && { tool_choice: { type: 'none' } }),
        messages,
      })
      if (!started) {
        res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-cache' })
        started = true
      }
      current = stream
      let gap = wroteText
      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta' && event.delta.text) {
          // Text after a screen change starts a new paragraph.
          res.write(gap ? `\n\n${event.delta.text}` : event.delta.text)
          gap = false
          wroteText = true
        }
      }
      const final = await stream.finalMessage()
      if (final.stop_reason === 'refusal') {
        res.write('\n\n(Claude declined to answer that one.)')
        break
      }
      if (final.stop_reason !== 'tool_use') break
      // Apply each change in order; the browser is told about the ones that worked.
      const results = []
      for (const block of final.content) {
        if (block.type !== 'tool_use') continue
        try {
          const applied = applyTool(screen, block.name, block.input)
          screen = applied.state
          res.write(`${EDIT_MARK}${JSON.stringify({ name: block.name, input: block.input })}${EDIT_MARK}`)
          results.push({ type: 'tool_result', tool_use_id: block.id, content: `Done: ${applied.summary}. It is on their screen now.` })
        } catch (err) {
          if (!(err instanceof PlaygroundEditError)) throw err
          results.push({ type: 'tool_result', tool_use_id: block.id, content: err.message, is_error: true })
        }
      }
      messages = [...messages, { role: 'assistant', content: final.content }, { role: 'user', content: results }]
    }
    res.end()
  } catch (err) {
    console.error('chat error:', err)
    const detail = String(err?.error?.error?.message ?? err?.message ?? err)
    const message =
      err instanceof Anthropic.AuthenticationError
        ? 'Anthropic rejected the API key. Check ANTHROPIC_API_KEY (in .env locally, or in Vercel → Settings → Environment Variables).'
        : /^missing api key|could not resolve authentication/i.test(detail)
          ? 'The chat can\'t see an Anthropic API key. Locally, set ANTHROPIC_API_KEY in .env and restart. On Vercel, add it under Settings → Environment Variables with Production ticked, then redeploy (new variables only apply to new deploys).'
          : /credit balance/i.test(detail)
            ? 'Your Anthropic account is out of credits. Add some under Billing at console.anthropic.com, then try again.'
            : err instanceof Anthropic.RateLimitError
              ? 'Claude is rate limited right now. Try again in a moment.'
              : `Claude API error${err?.status ? ` ${err.status}` : ''}: ${detail}`
    if (!res.headersSent) res.writeHead(502, { 'content-type': 'text/plain' })
    res.end(message)
  }
}

/** The code with its line numbers, so Claude can point at [[line:N]] without counting. */
function numbered(code) {
  return code
    .split('\n')
    .map((line, i) => `${String(i + 1).padStart(3)}  ${line}`)
    .join('\n')
}

/** What the visualizer shows: the step, the variables and the glossary card ids Claude may point at. */
function viewLines(view) {
  if (!view || typeof view !== 'object') return []
  const names = (list, max) => (Array.isArray(list) ? list.filter((v) => typeof v === 'string').slice(0, max).join(', ') : '')
  const steps = Number(view.steps) || 0
  if (Array.isArray(view.stages)) {
    return [
      steps
        ? `Query stages, in the order SQL runs them (step:N): ${names(view.stages, 30).split(', ').map((s, i) => `${i + 1}=${s}`).join(', ')}. Showing step ${Number(view.step) || steps}.`
        : 'Query stages: none yet (the query has not run).',
      `Tables: ${names(view.tables, 20) || '(none)'}`,
      `Glossary ids: ${names(view.glossary, 200)}`,
    ]
  }
  return [
    steps
      ? `Visualizer: showing step ${Number(view.step) || steps} of ${steps}. Variables: ${names(view.vars, 60) || '(none)'}`
      : 'Visualizer: nothing has run yet (no steps or variables to point at).',
    ...valueLines(view),
    `Glossary ids: ${names(view.glossary, 200)}`,
  ]
}

/** The values the visualizer shows at this step, and what has printed so far, kept short. */
function valueLines(view) {
  const out = []
  if (typeof view.input === 'string' && view.input) out.push(`Running with: ${view.input.slice(0, 400)}`)
  if (view.values && typeof view.values === 'object') {
    const pairs = Object.entries(view.values)
      .filter(([, v]) => typeof v === 'string')
      .slice(0, 40)
      .map(([k, v]) => `${k} = ${v.length > 200 ? `${v.slice(0, 200)}…` : v}`)
    if (pairs.length) out.push(`Values at this step:\n${pairs.join('\n')}`)
  }
  if (typeof view.output === 'string' && view.output) {
    const text = view.output.length > 1500 ? `…${view.output.slice(-1500)}` : view.output
    out.push(`Printed so far:\n${text}`)
  }
  return out
}

// Trim stray spaces or newlines that sneak in when a key is pasted into a settings page.
function apiKey() {
  return (process.env.ANTHROPIC_API_KEY ?? '').trim()
}

function passcodeMatches(given, expected) {
  if (typeof given !== 'string') return false
  // The client URI-encodes the passcode, since headers can't carry characters
  // like the narrow no-break space some keyboards insert.
  let decoded = given
  try {
    decoded = decodeURIComponent(given)
  } catch {}
  // NFKC turns look-alike spaces into plain ones, so a copied passcode still matches.
  const normalize = (v) => v.normalize('NFKC').trim()
  const digest = (v) => createHash('sha256').update(normalize(v)).digest()
  return timingSafeEqual(digest(decoded), digest(expected))
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', (chunk) => {
      data += chunk
      if (data.length > 200_000) reject(new Error('too large'))
    })
    req.on('end', () => resolve(data))
    req.on('error', reject)
  })
}
