import { beforeEach, describe, expect, it, vi } from 'vitest'
import { takeEdits } from './stream'

// The chat server's tool loop, with the Anthropic SDK replaced by a script of canned replies.
type Reply = { text: string; stop: string; tools?: { id: string; name: string; input: unknown }[] }
const script: Reply[] = []
const requests: any[] = []

vi.mock('@anthropic-ai/sdk', () => {
  class Anthropic {
    static AuthenticationError = class extends Error {}
    static RateLimitError = class extends Error {}
    beta = {
      messages: {
        stream(params: any) {
          requests.push(structuredClone(params))
          const reply = script.shift()!
          const content = [...(reply.text ? [{ type: 'text', text: reply.text }] : []), ...(reply.tools ?? []).map((t) => ({ type: 'tool_use', ...t }))]
          return {
            abort() {},
            async *[Symbol.asyncIterator]() {
              if (reply.text) yield { type: 'content_block_delta', delta: { type: 'text_delta', text: reply.text } }
            },
            finalMessage: async () => ({ stop_reason: reply.stop, content }),
          }
        },
      },
    }
  }
  return { default: Anthropic }
})

async function ask(body: object) {
  process.env.ANTHROPIC_API_KEY = 'sk-ant-test'
  delete process.env.CHAT_PASSWORD
  const { handleChat } = await import('../../server/chat.mjs')
  let out = ''
  const res: any = {
    headersSent: false,
    writableEnded: false,
    on() {},
    writeHead() {
      res.headersSent = true
      return res
    },
    write(chunk: string) {
      out += chunk
    },
    end(chunk?: string) {
      if (chunk) out += chunk
    },
  }
  const req: any = { method: 'POST', headers: {}, body }
  await handleChat(req, res)
  return out
}

const tables = [{ name: 'employees', columns: 'id INTEGER, name TEXT', rows: [[1, 'Ana']] }]

describe('chat server tools', () => {
  beforeEach(() => {
    script.length = 0
    requests.length = 0
  })

  it('applies a change, streams it to the browser and tells Claude it worked', async () => {
    script.push(
      { text: 'Adding a row.', stop: 'tool_use', tools: [{ id: 't1', name: 'edit_rows', input: { table: 'employees', add: [[2, 'Ben']] } }] },
      { text: 'Done: look at row 2.', stop: 'end_turn' },
    )
    const out = await ask({ messages: [{ role: 'user', content: 'add Ben' }], language: 'sql', code: 'SELECT 1;', playground: { tables } })
    const { text, edits } = takeEdits(out)
    expect(text).toBe('Adding a row.\n\nDone: look at row 2.')
    expect(edits).toEqual([{ name: 'edit_rows', input: { table: 'employees', add: [[2, 'Ben']] } }])
    // Claude saw the rows (numbered) and the tools, and got a result for its call.
    expect(requests[0].messages[0].content).toContain("  1 | 1 | 'Ana'")
    expect(requests[0].tools.map((t: any) => t.name)).toContain('edit_rows')
    expect(requests[1].messages.at(-1).content).toEqual([{ type: 'tool_result', tool_use_id: 't1', content: expect.stringMatching(/^Done: Added 1 row/) }])
  })

  it('sends a bad call back to Claude as an error, and not to the browser', async () => {
    script.push(
      { text: '', stop: 'tool_use', tools: [{ id: 't1', name: 'edit_rows', input: { table: 'employees', remove: [5] } }] },
      { text: 'There is only one row.', stop: 'end_turn' },
    )
    const out = await ask({ messages: [{ role: 'user', content: 'remove row 5' }], language: 'sql', code: '', playground: { tables } })
    expect(takeEdits(out).edits).toEqual([])
    expect(requests[1].messages.at(-1).content[0]).toMatchObject({ is_error: true, content: expect.stringMatching(/no row 5/) })
  })

  it('stops calling tools after a few rounds, so an answer always ends in words', async () => {
    const call = { text: '', stop: 'tool_use', tools: [{ id: 't', name: 'write_code', input: { code: 'x = 1\n' } }] }
    script.push(call, call, { text: 'Finished.', stop: 'end_turn' })
    const out = await ask({ messages: [{ role: 'user', content: 'write it' }], language: 'python', code: '' })
    expect(takeEdits(out).text).toBe('Finished.')
    expect(requests).toHaveLength(3)
    expect(requests[2].tool_choice).toEqual({ type: 'none' })
    expect(requests[0].tools.map((t: any) => t.name)).toEqual(['edit_code', 'write_code', 'set_data', 'remove_data'])
  })

  it('gives Python data in a block the browser can rebuild', async () => {
    script.push(
      { text: '', stop: 'tool_use', tools: [{ id: 't1', name: 'set_data', input: { name: 'orders', value: [{ id: 1 }] } }] },
      { text: 'Try summing the totals.', stop: 'end_turn' },
    )
    const out = await ask({ messages: [{ role: 'user', content: 'give me orders' }], language: 'python', code: 'print(1)\n' })
    expect(takeEdits(out).edits).toEqual([{ name: 'set_data', input: { name: 'orders', value: [{ id: 1 }] } }])
    expect(requests[1].messages.at(-1).content[0].content).toMatch(/^Done: Gave you orders \(1 item\)/)
  })

  it('shows Claude the values and output at the step on screen', async () => {
    script.push({ text: 'ok', stop: 'end_turn' })
    await ask({
      messages: [{ role: 'user', content: 'why?' }],
      language: 'python',
      code: 'x = [1]\nprint(x)\n',
      view: { step: 2, steps: 2, vars: ['x'], glossary: [], values: { x: '[1]' }, output: '[1]\n' },
    })
    expect(requests[0].messages[0].content).toContain('Values at this step:\nx = [1]')
    expect(requests[0].messages[0].content).toContain('Printed so far:\n[1]')
  })
})
