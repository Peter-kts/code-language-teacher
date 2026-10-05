import { useEffect, useRef, useState } from 'react'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

const PASSCODE_KEY = 'chat-passcode'

function loadPasscode() {
  try {
    return localStorage.getItem(PASSCODE_KEY) ?? ''
  } catch {
    return ''
  }
}

const SUGGESTIONS = ['How do I write a for loop in Python?', 'How do dicts work?', 'Give me a hint for this problem']

export function Chat({
  code,
  problem,
  onInsert,
}: {
  code: string
  problem: string | null
  onInsert: (code: string) => void
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [passcode, setPasscode] = useState(loadPasscode)
  const [needsPasscode, setNeedsPasscode] = useState(false)
  const [passcodeInput, setPasscodeInput] = useState('')
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => endRef.current?.scrollIntoView({ block: 'end' }), [messages])

  const send = async (text: string) => {
    const question = text.trim()
    if (!question || busy) return
    const history: ChatMessage[] = [...messages, { role: 'user', content: question }]
    setMessages([...history, { role: 'assistant', content: '' }])
    setInput('')
    setBusy(true)
    const append = (chunk: string) =>
      setMessages((ms) => [...ms.slice(0, -1), { role: 'assistant', content: ms[ms.length - 1].content + chunk }])
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-chat-passcode': encodeURIComponent(passcode) },
        body: JSON.stringify({ messages: history, code, problem }),
      })
      if (res.status === 401) {
        setNeedsPasscode(true)
        // Drop the unanswered question; it can be asked again after unlocking.
        setMessages(messages)
        setInput(question)
        return
      }
      if (!res.body) throw new Error(`HTTP ${res.status}`)
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        append(decoder.decode(value, { stream: true }))
      }
    } catch (err) {
      append(`Couldn't reach the chat server (${String(err)}).`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="chat">
      <div className="chat-log">
        {messages.length === 0 && (
          <div className="chat-empty">
            <p className="muted">Ask how to write something in Python, or for a hint on the problem.</p>
            {SUGGESTIONS.map((s) => (
              <button key={s} className="suggestion" onClick={() => send(s)}>
                {s}
              </button>
            ))}
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`msg msg-${m.role}`}>
            {m.role === 'assistant' ? (
              <AssistantText text={m.content} onInsert={onInsert} pending={busy && i === messages.length - 1} />
            ) : (
              m.content
            )}
          </div>
        ))}
        <div ref={endRef} />
      </div>
      {needsPasscode && (
        <form
          className="chat-form"
          onSubmit={(e) => {
            e.preventDefault()
            const value = passcodeInput.trim()
            if (!value) return
            setPasscode(value)
            try {
              localStorage.setItem(PASSCODE_KEY, value)
            } catch {
              // Storage blocked: the passcode still works until the page reloads.
            }
            setPasscodeInput('')
            setNeedsPasscode(false)
          }}
        >
          <input
            className="syntax-input"
            type="password"
            placeholder={passcode ? 'Wrong passcode, try again' : 'Enter the chat passcode'}
            value={passcodeInput}
            onChange={(e) => setPasscodeInput(e.target.value)}
            autoFocus
          />
          <button type="submit">Unlock</button>
        </form>
      )}
      <form
        className="chat-form"
        onSubmit={(e) => {
          e.preventDefault()
          send(input)
        }}
      >
        <input
          className="syntax-input"
          placeholder="e.g. how do I loop over a dict?"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button type="submit" disabled={busy || !input.trim()}>
          Ask
        </button>
      </form>
    </div>
  )
}

/** Render prose with ```fenced``` code blocks, each with an Insert button. */
function AssistantText({ text, onInsert, pending }: { text: string; onInsert: (code: string) => void; pending: boolean }) {
  if (!text && pending) return <span className="muted">Thinking…</span>
  return (
    <>
      {splitFences(text).map((part, i) =>
        part.code !== undefined ? (
          <div key={i} className="chat-code">
            <pre>{part.code}</pre>
            {part.closed && <button onClick={() => onInsert(part.code!)}>Insert</button>}
          </div>
        ) : (
          <p key={i}>{part.text}</p>
        ),
      )}
    </>
  )
}

export function splitFences(text: string): { text?: string; code?: string; closed?: boolean }[] {
  const parts: { text?: string; code?: string; closed?: boolean }[] = []
  const re = /```[a-zA-Z0-9]*\n([\s\S]*?)(```|$)/g
  let last = 0
  for (let m = re.exec(text); m; m = re.exec(text)) {
    if (m.index > last) parts.push({ text: text.slice(last, m.index).trim() })
    parts.push({ code: m[1].replace(/\n$/, ''), closed: m[2] === '```' })
    last = re.lastIndex
    if (m[0].length === 0) break
  }
  if (last < text.length) parts.push({ text: text.slice(last).trim() })
  return parts.filter((p) => p.code !== undefined || p.text)
}
