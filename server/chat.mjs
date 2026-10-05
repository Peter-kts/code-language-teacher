// POST /api/chat: streams a Claude answer as plain text.
// Used by the Vite dev server (vite.config.ts) and the production server (server/index.mjs).
import Anthropic from '@anthropic-ai/sdk'

const MODEL = 'claude-opus-5-5'

const SYSTEM = `You are the syntax helper inside a code-learning IDE. The learner is practicing Python and LeetCode-style problems.

Answer the way a patient tutor would at a whiteboard: one or two sentences, then a short runnable Python example in a \`\`\`python fenced block. The learner can insert your code into their editor with one click, so keep examples small and self-contained, using plain lists, dicts and loops that a step-by-step visualizer can draw.

When they ask about the problem they are working on, give hints and explain ideas rather than the full solution, unless they explicitly ask for the answer. Their current code is attached to their latest message for context; refer to it when it helps.`

let client

/** @param {import('node:http').IncomingMessage} req @param {import('node:http').ServerResponse} res */
export async function handleChat(req, res) {
  if (req.method !== 'POST') {
    res.writeHead(405).end()
    return
  }
  let body
  try {
    body = JSON.parse(await readBody(req))
  } catch {
    res.writeHead(400, { 'content-type': 'text/plain' }).end('Bad request')
    return
  }
  const history = Array.isArray(body.messages) ? body.messages.slice(-20) : []
  if (history.length === 0 || history.at(-1).role !== 'user') {
    res.writeHead(400, { 'content-type': 'text/plain' }).end('Expected a user message')
    return
  }
  const context = [
    body.problem ? `Problem: ${body.problem}` : 'Mode: free playground',
    `Current code:\n\`\`\`python\n${String(body.code ?? '').slice(0, 8000)}\n\`\`\``,
  ].join('\n')
  const messages = history.map((m, i) => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: i === history.length - 1 ? `${String(m.content)}\n\n<editor>\n${context}\n</editor>` : String(m.content),
  }))

  try {
    client ??= new Anthropic()
    const stream = client.beta.messages.stream({
      model: MODEL,
      max_tokens: 4000,
      output_config: { effort: 'low' },
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: SYSTEM,
      messages,
    })
    res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-cache' })
    req.on('close', () => stream.abort())
    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') res.write(event.delta.text)
    }
    const final = await stream.finalMessage()
    if (final.stop_reason === 'refusal') res.write('\n\n(Claude declined to answer that one.)')
    res.end()
  } catch (err) {
    const message =
      err instanceof Anthropic.AuthenticationError || /credentials|api key/i.test(String(err?.message))
        ? 'The chat needs an Anthropic API key. Start the app with ANTHROPIC_API_KEY set.'
        : err instanceof Anthropic.RateLimitError
          ? 'Claude is rate limited right now. Try again in a moment.'
          : `Chat error: ${err?.message ?? err}`
    if (!res.headersSent) res.writeHead(502, { 'content-type': 'text/plain' })
    res.end(message)
  }
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
