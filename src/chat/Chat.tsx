import { useEffect, useRef, useState, type Ref } from 'react'
import { loadHistory, saveHistory, type ChatMessage } from './history'
import type { Language } from '../types'
import { refExists, refLabel, splitRefs, takeTour, type Ref as ScreenRef, type RefContext, type TourStop, type ViewSummary } from './refs'

const PASSCODE_KEY = 'chat-passcode'

function loadPasscode() {
  try {
    return localStorage.getItem(PASSCODE_KEY) ?? ''
  } catch {
    return ''
  }
}

const SUGGESTIONS: Record<Language, string[]> = {
  python: ['How do I write a for loop in Python?', 'How do dicts work?', 'Give me a hint for this problem'],
  javascript: ['How do I write a for loop in JavaScript?', 'When should I use a Map instead of an object?', 'Give me a hint for this problem'],
}

export function Chat({
  code,
  language,
  problem,
  onInsert,
  inputRef,
  view,
  refContext,
  onPoint,
  onShowMe,
}: {
  code: string
  language: Language
  problem: string | null
  onInsert: (code: string) => void
  /** What the visualizer shows, sent along so Claude can name real steps and variables. */
  view: ViewSummary
  /** What exists on screen, so references to anything else render as plain words. */
  refContext: RefContext
  /** A reference chip was clicked: light that thing up. */
  onPoint: (ref: ScreenRef) => void
  /** Show me was pressed: walk the pointer through these stops, starting from the button. */
  onShowMe: (stops: TourStop[], from: { x: number; y: number }) => void
  /** The question box, so a shortcut can jump to it. */
  inputRef?: Ref<HTMLInputElement>
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(loadHistory)
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [passcode, setPasscode] = useState(loadPasscode)
  const [needsPasscode, setNeedsPasscode] = useState(false)
  const [passcodeInput, setPasscodeInput] = useState('')
  const endRef = useRef<HTMLDivElement>(null)

  // Braces matter: newer browsers return a Promise from scrollIntoView, and React
  // would treat a returned value as the effect's cleanup function.
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [messages])

  // Save once a reply has finished streaming, not on every chunk.
  useEffect(() => {
    if (!busy) saveHistory(messages)
  }, [messages, busy])

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
        body: JSON.stringify({ messages: history, code, language, problem, view }),
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
            <p className="muted">
              Ask how to write something in {language === 'python' ? 'Python' : 'JavaScript'}, or for a hint on the problem.
            </p>
            {SUGGESTIONS[language].map((s) => (
              <button key={s} className="suggestion" onClick={() => send(s)}>
                {s}
              </button>
            ))}
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`msg msg-${m.role}`}>
            {m.role === 'assistant' ? (
              <AssistantText
                text={m.content}
                onInsert={onInsert}
                pending={busy && i === messages.length - 1}
                refContext={refContext}
                onPoint={onPoint}
                onShowMe={onShowMe}
              />
            ) : (
              m.content
            )}
          </div>
        ))}
        <div ref={endRef} />
      </div>
      {messages.length > 0 && !busy && (
        <button className="chat-new" onClick={() => setMessages([])} title="Clear this conversation and start fresh">
          New chat
        </button>
      )}
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
          ref={inputRef}
          className="syntax-input"
          placeholder={language === 'python' ? 'e.g. how do I loop over a dict?' : 'e.g. how do I loop over a Map?'}
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

/**
 * Render prose with ```fenced``` code blocks, each with an Insert button. [[References]] to the
 * screen become chips, and a ```tour block becomes a Show me button.
 */
function AssistantText({
  text,
  onInsert,
  pending,
  refContext,
  onPoint,
  onShowMe,
}: {
  text: string
  onInsert: (code: string) => void
  pending: boolean
  refContext: RefContext
  onPoint: (ref: ScreenRef) => void
  onShowMe: (stops: TourStop[], from: { x: number; y: number }) => void
}) {
  if (!text && pending) return <span className="muted">Thinking…</span>
  const { body, stops } = takeTour(text)
  // Stops for things that aren't there (an old run, a line since deleted) are skipped.
  const tour = stops.filter((s) => refExists(s.ref, refContext))
  return (
    <>
      {splitFences(body).map((part, i) =>
        part.code !== undefined ? (
          <div key={i} className="chat-code">
            <pre>{part.code}</pre>
            {part.closed && <button onClick={() => onInsert(part.code!)}>Insert</button>}
          </div>
        ) : (
          <p key={i}>
            {splitRefs(part.text!).map((p, j) =>
              'text' in p ? (
                p.text
              ) : refExists(p.ref, refContext) ? (
                <button key={j} className={`ref-chip ref-${p.ref.kind}`} onClick={() => onPoint(p.ref)} title="Show where this is">
                  {refLabel(p.ref)}
                </button>
              ) : (
                <span key={j} className="ref-gone" title="Not on screen any more">
                  {refLabel(p.ref)}
                </span>
              ),
            )}
          </p>
        ),
      )}
      {!pending && tour.length > 0 && (
        <button
          className="show-me"
          onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect()
            onShowMe(tour, { x: r.left + r.width / 2, y: r.top + r.height / 2 })
          }}
        >
          👆 Show me
        </button>
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
