import { useEffect, useRef, useState, type Ref } from 'react'
import { loadHistory, saveHistory, type ChatMessage } from './history'
import type { Subject } from '../types'
import { refExists, refLabel, splitRefs, takeTour, type Ref as ScreenRef, type RefContext, type TourStop, type ViewSummary } from './refs'
import { applyTool, MAX_ROWS, PlaygroundEditError, type PlaygroundState } from '../../server/playground.mjs'
import { chatMarks, type ChatMarks } from './marks'
import { takeEdits } from './stream'

const PASSCODE_KEY = 'chat-passcode'

/** Two screens are the same when their code and tables match exactly. */
const sameScreen = (a: PlaygroundState, b: PlaygroundState) =>
  a.code === b.code && JSON.stringify(a.tables ?? null) === JSON.stringify(b.tables ?? null)

/** What the server sees of earlier answers: their words, plus a note of what they changed on screen. */
function forServer(m: ChatMessage): { role: ChatMessage['role']; content: string } {
  const note = m.edits?.length ? `[Changed on their screen: ${m.edits.join('; ')}${m.undone ? '. They undid these changes.' : ''}]` : ''
  return { role: m.role, content: [m.content, note].filter(Boolean).join('\n\n') || '(no reply)' }
}

function loadPasscode() {
  try {
    return localStorage.getItem(PASSCODE_KEY) ?? ''
  } catch {
    return ''
  }
}

const SUGGESTIONS: Record<Subject, string[]> = {
  sql: ['What is the difference between WHERE and HAVING?', 'When do I use LEFT JOIN instead of JOIN?', 'Give me a hint for this problem'],
  python: ['How do I write a for loop in Python?', 'How do dicts work?', 'Give me a hint for this problem'],
  javascript: ['How do I write a for loop in JavaScript?', 'When should I use a Map instead of an object?', 'Give me a hint for this problem'],
}

export function Chat({
  language,
  problem,
  onInsert,
  inputRef,
  view,
  refContext,
  onPoint,
  onShowMe,
  playground,
  onPlaygroundChange,
}: {
  /** What Claude may read and change: the editor's code and, in SQL, the tables the query runs on. */
  playground: PlaygroundState
  /** Claude changed the screen (or the learner pressed Undo, with no marks): show it. */
  onPlaygroundChange: (next: PlaygroundState, marks: ChatMarks | null) => void
  language: Subject
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
  // The latest screen, for the reply's changes (which land long after send() started) and for Undo.
  const screenRef = useRef(playground)
  screenRef.current = playground
  // What each answer's Undo puts back: the screen before it, if the screen is still as it left it.
  // Kept in memory only: after a reload the changes are listed but can't be undone from here.
  const undos = useRef(new Map<number, { before: PlaygroundState; after: PlaygroundState }>())

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
      setMessages((ms) => [...ms.slice(0, -1), { ...ms[ms.length - 1], content: ms[ms.length - 1].content + chunk }])
    // The screen this question was asked about; Claude's changes are applied to it in order.
    const before = screenRef.current
    let screen = before
    const summaries: string[] = []
    const editId = Date.now()
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-chat-passcode': encodeURIComponent(passcode) },
        body: JSON.stringify({
          messages: history.map(forServer),
          code: before.code,
          language,
          problem,
          view,
          playground: before.tables && { tables: before.tables.map((t) => ({ ...t, rows: t.rows.slice(0, MAX_ROWS) })) },
        }),
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
      let buffer = ''
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        const { text, edits, rest } = takeEdits(buffer + decoder.decode(value, { stream: true }))
        buffer = rest
        if (text) append(text)
        for (const edit of edits) {
          try {
            const applied = applyTool(screen, edit.name, edit.input)
            screen = applied.state
            summaries.push(applied.summary)
          } catch (err) {
            // The server already checked it against the same screen, so this is rare (say, the learner
            // switched problems mid-answer); skip it rather than half-apply.
            if (!(err instanceof PlaygroundEditError)) throw err
            continue
          }
          onPlaygroundChange(screen, chatMarks(before, screen))
          setMessages((ms) => [...ms.slice(0, -1), { ...ms[ms.length - 1], edits: [...summaries], editId }])
        }
      }
    } catch (err) {
      append(`Couldn't reach the chat server (${String(err)}).`)
    } finally {
      if (summaries.length) undos.current.set(editId, { before, after: screen })
      setBusy(false)
    }
  }

  const undo = (m: ChatMessage) => {
    const saved = m.editId !== undefined ? undos.current.get(m.editId) : undefined
    if (!saved || !sameScreen(screenRef.current, saved.after)) return
    onPlaygroundChange(saved.before, null)
    undos.current.delete(m.editId!)
    setMessages((ms) => ms.map((x) => (x.editId === m.editId ? { ...x, undone: true } : x)))
  }

  return (
    <div className="chat">
      <div className="chat-log">
        {messages.length === 0 && (
          <div className="chat-empty">
            <p className="muted">
              Ask how to write something in {language === 'python' ? 'Python' : language === 'sql' ? 'SQL' : 'JavaScript'}, or for a hint on the problem.
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
              <>
                <AssistantText
                  text={m.content}
                  onInsert={onInsert}
                  pending={busy && i === messages.length - 1 && !m.edits?.length}
                  refContext={refContext}
                  onPoint={onPoint}
                  onShowMe={onShowMe}
                />
                {m.edits?.length ? (
                  <EditCard
                    message={m}
                    pending={busy && i === messages.length - 1}
                    undoable={(() => {
                      const saved = m.editId !== undefined ? undos.current.get(m.editId) : undefined
                      return !saved ? 'gone' : sameScreen(playground, saved.after) ? 'yes' : 'changed'
                    })()}
                    onUndo={() => undo(m)}
                  />
                ) : null}
              </>
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
          placeholder={language === 'python' ? 'e.g. how do I loop over a dict?' : language === 'sql' ? 'e.g. how do I find duplicates?' : 'e.g. how do I loop over a Map?'}
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

/** What an answer changed on screen, with one button to put it all back. */
function EditCard({
  message,
  pending,
  undoable,
  onUndo,
}: {
  message: ChatMessage
  pending: boolean
  /** yes: Undo works. changed: the screen has changed since. gone: from before a reload, or another chat. */
  undoable: 'yes' | 'changed' | 'gone'
  onUndo: () => void
}) {
  return (
    <div className={`chat-edits${message.undone ? ' undone' : ''}`}>
      <span className="chat-edits-title">{message.undone ? 'Undone:' : 'Changed on your screen:'}</span>
      <ul>
        {message.edits!.map((e, i) => (
          <li key={i}>{e}</li>
        ))}
      </ul>
      {!pending && !message.undone && undoable !== 'gone' && (
        <button
          onClick={onUndo}
          disabled={undoable !== 'yes'}
          title={undoable === 'yes' ? 'Put everything back as it was before this answer' : "You've changed things since, so this can't be undone in one click (Ctrl+Z still works in the editor)"}
        >
          Undo
        </button>
      )}
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
