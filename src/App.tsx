import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { flushSync } from 'react-dom'
import Editor, { type OnMount } from '@monaco-editor/react'
import type * as monaco from 'monaco-editor/editor/editor.api'
import { editorLook, remeasureEditorFonts } from './monaco'
import { Background, useTodaysScene } from './backgrounds/Background'
import { loadBackgroundMode, saveBackgroundMode, type BackgroundMode } from './backgrounds/scenes'
import { AutoLayoutIcon, CollapseIcon, ColumnsIcon, ExpandIcon, KeyboardIcon, PauseIcon, PaperIcon, PictureIcon, PlayIcon, TerminalIcon, RowsIcon, SkipBackIcon, SkipForwardIcon, StepBackIcon, StepForwardIcon } from './icons'
import { useRunner } from './runner/useRunner'
import { Visualizer } from './viz/Visualizer'
import { findNames, previousInFrame, stepRoles } from './viz/changes'
import { buildHistory } from './viz/history'
import { formatValue } from './viz/format'
import { HistoryPanel } from './viz/HistoryPanel'
import { ConsolePanel } from './console/ConsolePanel'
import { SyntaxHelper } from './syntax/SyntaxHelper'
import { CodeHover } from './syntax/CodeHover'
import { Chat } from './chat/Chat'
import type { ChatMarks } from './chat/marks'
import { useEditMarks } from './chat/useEditMarks'
import { loadSavedData, saveData, withSavedData } from './chat/savedData'
import { PointerFlash, PointerTour, type Pointing } from './chat/PointerTour'
import type { Ref, RefContext, TourStop, ViewSummary } from './chat/refs'
import { CARDS } from './syntax/cards'
import { CONCEPT_GROUPS, DIFFICULTIES, PROBLEM_TOPICS, PROBLEMS, type Problem } from './problems/problems'
import { progressFor } from './problems/progress'
import { ProblemPanel } from './problems/ProblemPanel'
import { loadSolutions, saveSolution, type Solutions } from './problems/solutions'
import { CONCEPTS } from './problems/concepts'
import { commandFor, focusKind, withShortcut, type Command } from './shortcuts'
import { ShortcutsDialog } from './ShortcutsDialog'
import { stepAfterRerun } from './timeline'
import { TapTip } from './TapTip'
import { loadTopBarHidden, saveTopBarHidden } from './layout/topBar'
import { DEFAULT_THEME, THEME_NAMES, applyTheme, loadTheme, nextTheme, saveTheme, type Theme } from './layout/theme'
import { applyDesign, loadDesign, lookOf, otherDesign, saveDesign, type Design } from './layout/design'
import { DEFAULT_FONT_SCALE, applyFontScale, editorFont, isLargest, isSmallest, loadFontScale, saveFontScale, stepFontScale } from './layout/fontSize'
import { usePaneLayout, type LayoutMode } from './layout/usePaneLayout'
import type { Language, RunRequest } from './types'
import { SqlWorkspace, type SqlStatusReport } from './sql/SqlWorkspace'
import { SQL_PLAYGROUND, SQL_PROBLEMS, SQL_TOPICS, starterFor } from './sql/problems'

const STARTERS: Record<Language, string> = {
  python: `nums = [4, 8, 15, 16, 23, 42]
total = 0
for n in nums:
    total += n
print(total)
`,
  javascript: `const nums = [4, 8, 15, 16, 23, 42]
let total = 0
for (const n of nums) {
  total += n
}
console.log(total)
`,
}

const LANGUAGES: { id: Language; label: string }[] = [
  { id: 'python', label: 'Python' },
  { id: 'javascript', label: 'JavaScript' },
]

const LANGUAGE_KEY = 'clt.language.v1'
// SQL is a switch of its own, so Python or JavaScript stays picked underneath for when you come back.
const SQL_KEY = 'clt.sql.v1'

function savedSql(): boolean {
  try {
    return localStorage.getItem(SQL_KEY) === 'on'
  } catch {
    return false
  }
}

/** Each SQL problem's starting query: the saved passing one, or its starter. */
const sqlStartingCode = (solutions: Solutions): Record<string, string> => ({
  [PLAYGROUND]: SQL_PLAYGROUND,
  ...Object.fromEntries(SQL_PROBLEMS.map((p) => [p.id, solutions.sql[p.id]?.code ?? starterFor(p)])),
})

function savedLanguage(): Language {
  try {
    const saved = localStorage.getItem(LANGUAGE_KEY)
    if (LANGUAGES.some((l) => l.id === saved)) return saved as Language
  } catch {
    // storage blocked: start in Python
  }
  return 'python'
}

/** Everyone's starting code: the playground and each problem, in each language. */
const starterCode = (): Record<Language, Record<string, string>> => ({
  python: {
    [PLAYGROUND]: STARTERS.python,
    ...Object.fromEntries([...PROBLEMS, ...CONCEPTS.python].map((p) => [p.id, p.starters.python])),
  },
  javascript: {
    [PLAYGROUND]: STARTERS.javascript,
    ...Object.fromEntries([...PROBLEMS, ...CONCEPTS.javascript].map((p) => [p.id, p.starters.javascript])),
  },
})

/** The starters, with each solved problem opening on its saved solution instead. */
const PLAYGROUND = 'playground'

const startingCode = (solutions: Solutions) => {
  const code = starterCode()
  // Data the chat gave you in the playground comes back after a reload.
  const saved = loadSavedData()
  for (const language of Object.keys(code) as Language[]) {
    for (const [id, s] of Object.entries(solutions[language])) if (id in code[language]) code[language][id] = s.code
    code[language][PLAYGROUND] = withSavedData(code[language][PLAYGROUND], language, saved)
  }
  return code
}

const PLAY_MS = 700

const LAYOUT_OPTIONS: { mode: LayoutMode; label: string; Icon: () => ReactNode }[] = [
  { mode: 'auto', label: 'Layout: auto (stacked when the screen is taller than wide)', Icon: AutoLayoutIcon },
  { mode: 'columns', label: 'Layout: side by side', Icon: ColumnsIcon },
  { mode: 'stacked', label: 'Layout: stacked (portrait)', Icon: RowsIcon },
]

export default function App() {
  const [mode, setMode] = useState<string>(PLAYGROUND)
  const [language, setLanguageState] = useState<Language>(savedLanguage)
  const [sqlOn, setSqlOnState] = useState(savedSql)
  const setSqlOn = (on: boolean) => {
    setSqlOnState(on)
    // The code editor goes away while SQL shows; a new one mounts on the way back.
    if (on) {
      editorRef.current = null
      setMounted(null)
    }
    try {
      localStorage.setItem(SQL_KEY, on ? 'on' : 'off')
    } catch {
      // not remembered, which is fine
    }
  }
  const setLanguage = (next: Language) => {
    setSqlOn(false)
    setLanguageState(next)
    // Each concept track only exists in its own language.
    if (next !== language && CONCEPTS[language].some((p) => p.id === mode)) setMode(PLAYGROUND)
    try {
      localStorage.setItem(LANGUAGE_KEY, next)
    } catch {
      // not remembered, which is fine
    }
  }
  // Each language keeps its own code, so switching back finds the code where it was left.
  // Code that passes every test is saved per problem and language, and reopens on the next visit.
  const [solutions, setSolutions] = useState(loadSolutions)
  const [background, setBackground] = useState<BackgroundMode>(loadBackgroundMode)
  const todaysScene = useTodaysScene()
  const [topBarHidden, setTopBarHidden] = useState(loadTopBarHidden)
  const toggleTopBar = () => {
    setTopBarHidden(!topBarHidden)
    saveTopBarHidden(!topBarHidden)
  }
  // Text size (src/layout/fontSize.ts): one root size that every rem follows, plus the editor's.
  const [fontScale, setFontScale] = useState(loadFontScale)
  const changeFontScale = (next: number) => {
    setFontScale(next)
    saveFontScale(next)
  }
  // Before paint, so a saved size never flashes at normal first.
  useLayoutEffect(() => applyFontScale(fontScale), [fontScale])
  // Design (src/layout/design.ts): the classic look with its themes, or the paper look, which
  // brings its own colors. The theme is kept while paper is on and comes back when it goes off.
  const [design, setDesign] = useState<Design>(loadDesign)
  const paper = design === 'paper'
  const toggleDesign = () => {
    const next = otherDesign(design)
    setDesign(next)
    saveDesign(next)
  }
  // Color theme (src/layout/theme.ts): the galaxy, the green-screen terminal, or the black and white one.
  const [theme, setTheme] = useState<Theme>(loadTheme)
  const toggleTheme = () => {
    // The paper design has its own colors, so the T key waits until it is off.
    if (design === 'paper') return
    const next = nextTheme(theme)
    setTheme(next)
    saveTheme(next)
  }
  // What the screen shows, for the editor's colors: paper, or else the theme.
  const look = lookOf(design, theme)
  useLayoutEffect(() => {
    // Paper sits on the plain stylesheet, so no theme attributes are left on while it shows.
    applyTheme(paper ? DEFAULT_THEME : theme)
    applyDesign(design)
  }, [theme, design, paper])
  // The editor measured its letters in the other font; measure again once this look's font is in.
  useEffect(() => {
    let current = true
    document.fonts
      ?.load(`15px ${editorLook(look).fontFamily}`)
      .then(() => current && remeasureEditorFonts())
      .catch(() => {})
    return () => {
      current = false
    }
  }, [look])
  // Solved problems in the current language, for the focus theme's progress meter.
  const progress = useMemo(
    () => (sqlOn ? progressFor(solutions, 'sql', SQL_PROBLEMS) : progressFor(solutions, language, [...PROBLEMS, ...CONCEPTS[language]])),
    [sqlOn, solutions, language],
  )
  const toggleBackground = () => {
    const next = background === 'daily' ? 'galaxy' : 'daily'
    setBackground(next)
    saveBackgroundMode(next)
  }
  const [codeByMode, setCodeByMode] = useState(() => startingCode(solutions))
  // The SQL workspace (src/sql) keeps its own queries and problem, here so they survive switching languages.
  const [sqlMode, setSqlMode] = useState<string>(PLAYGROUND)
  const [sqlCode, setSqlCode] = useState(() => sqlStartingCode(solutions))
  const [sqlStatus, setSqlStatus] = useState<SqlStatusReport>({ status: 'loading', error: false })
  const sqlCommandsRef = useRef<Partial<Record<Command, () => void>>>({})
  const [caseIndex, setCaseIndex] = useState(0)
  const layout = usePaneLayout()
  const [sidePanel, setSidePanel] = useState<'chat' | 'history' | 'cards'>('chat')
  const problem: Problem | undefined = PROBLEMS.find((p) => p.id === mode) ?? CONCEPTS[language].find((p) => p.id === mode)
  // Predict problems keep the output and steps covered until the learner has guessed (or skipped).
  const [revealed, setRevealed] = useState<Set<string>>(() => new Set())
  const covered = problem?.kind === 'predict' && !revealed.has(problem.id)
  // The glossary entry a concept chip opened, shown on its own until the learner goes back to the list.
  const [glossaryFocus, setGlossaryFocus] = useState<string | null>(null)
  const openConcept = (id: string) => {
    setGlossaryFocus(id)
    setSidePanel('cards')
  }
  const openProblem = (id: string) => {
    setMode(id)
    setCaseIndex(0)
  }
  const code = codeByMode[language][mode]
  // Keep the playground's data block (what the chat gave you) for the next visit.
  const playgroundCode = codeByMode[language][PLAYGROUND]
  useEffect(() => saveData(language, playgroundCode), [language, playgroundCode])
  const setCode = (next: string) => setCodeByMode((c) => ({ ...c, [language]: { ...c[language], [mode]: next } }))
  // Concept problems run their code as a whole, examples and all; their tests are separate.
  const request: RunRequest = !problem
    ? { code }
    : problem.track
      ? problem.tests.length
        ? { code, tests: problem.tests, testFor: problem.functionName }
        : { code }
      : {
          code,
          call: { name: problem.functionName, args: problem.tests[caseIndex].args },
          // The speed test (a big input with a step budget) runs after the ordinary cases.
          tests: problem.speed ? [...problem.tests, problem.speed] : problem.tests,
          ...(problem.io && { io: problem.io }),
        }
  const { status, trace, error, tests, ranFor } = useRunner(request, language, !sqlOn)
  // Right after switching problems, the last results are still the old problem's until the new run lands.
  const resultsFresh = problem !== undefined && (ranFor ?? '') === problem.functionName
  // trace.code is the exact source those tests ran, even if the editor has changed since. Both languages
  // share function names, so also check the run was in this language (a switch shows the old one briefly).
  const solvedCode =
    resultsFresh && trace?.language === language && tests?.length && tests.every((t) => t.passed) ? trace.code : null
  useEffect(() => {
    if (!problem || solvedCode === null || solutions[language][problem.id]?.code === solvedCode) return
    setSolutions((s) => saveSolution(s, language, problem.id, solvedCode))
  }, [solvedCode, problem, language, solutions])
  const [stepIndex, setStepIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null)
  const monacoRef = useRef<typeof monaco | null>(null)
  // The same editor as state, for the parts that render once it exists.
  const [mounted, setMounted] = useState<{ editor: monaco.editor.IStandaloneCodeEditor; api: typeof monaco } | null>(null)
  const decorations = useRef<monaco.editor.IEditorDecorationsCollection | null>(null)
  const chatInputRef = useRef<HTMLInputElement>(null)
  const shortcutsRef = useRef<HTMLDialogElement>(null)

  // While a predict problem is covered there are no steps to walk, so nothing (line highlights, the scrubber) gives the answer away.
  const steps = covered ? [] : (trace?.steps ?? [])
  const shownStep = Math.min(stepIndex, Math.max(0, steps.length - 1))
  const step = steps[shownStep]
  const prevStep = previousInFrame(steps, shownStep)
  const history = useMemo(() => (trace && !covered ? buildHistory(trace.steps, trace) : []), [trace, covered])
  const variables = useMemo(() => new Set(steps.flatMap((s) => Object.keys(s.vars))), [trace, covered])

  // What the step buttons and the keyboard shortcuts do (keys in src/shortcuts.ts).
  const stepTo = (next: (i: number) => number) => {
    if (steps.length) setStepIndex((i) => Math.max(0, Math.min(steps.length - 1, next(i))))
  }
  const commands: Record<Command, () => void> = {
    playPause: () => {
      if (steps.length < 2) return
      if (stepIndex >= steps.length - 1) setStepIndex(0)
      setPlaying((p) => !p)
    },
    firstStep: () => stepTo(() => 0),
    prevStep: () => stepTo((i) => i - 1),
    nextStep: () => stepTo((i) => i + 1),
    lastStep: () => {
      setPlaying(false)
      stepTo(() => steps.length - 1)
    },
    // Toggles between the code and the question box.
    askClaude: () => {
      if (chatInputRef.current && document.activeElement === chatInputRef.current) {
        editorRef.current?.focus()
        return
      }
      flushSync(() => setSidePanel('chat'))
      chatInputRef.current?.focus()
    },
    focusEditor: () => editorRef.current?.focus(),
    showShortcuts: () => {
      const dialog = shortcutsRef.current
      if (dialog?.open) dialog.close()
      else dialog?.showModal()
    },
    toggleTopBar,
    toggleTheme,
    toggleDesign,
    fontBigger: () => changeFontScale(stepFontScale(fontScale, 1)),
    fontSmaller: () => changeFontScale(stepFontScale(fontScale, -1)),
    fontReset: () => changeFontScale(DEFAULT_FONT_SCALE),
    save: () => {},
  }
  // The editor actions and the key listener are set up once; this keeps them current.
  const commandsRef = useRef(commands)
  useEffect(() => {
    commandsRef.current = commands
  })
  // In SQL, the step keys walk the query's stages, and the workspace has its own editor and chat box.
  const sqlOnRef = useRef(sqlOn)
  sqlOnRef.current = sqlOn
  const runCommand = useCallback((command: Command) => {
    const sqlCommand = sqlOnRef.current ? sqlCommandsRef.current[command] : undefined
    if (sqlCommand) sqlCommand()
    else commandsRef.current[command]()
  }, [])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.isComposing) return
      const command = commandFor(e, focusKind(e.target instanceof Element ? e.target : null))
      if (!command) return
      // While the cheat sheet is open, only ? (to close it) and the Save block apply.
      if (shortcutsRef.current?.open && command !== 'showShortcuts' && command !== 'save') return
      e.preventDefault()
      // Holding Space would flip between play and pause.
      if (e.repeat && command === 'playPause') return
      runCommand(command)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  // Where the scrubber lands on a new trace (rules in src/timeline.ts). Re-runs after an edit keep your step;
  // a new problem, test case or language starts at the final state. Play walks through from the top.
  // The same for Python and JavaScript: both runners hand back a trace the same way.
  const lastRun = useRef<{ context: string; index: number; length: number } | null>(null)
  const runContext = `${language}|${mode}|${caseIndex}`
  useEffect(() => {
    setPlaying(false)
    if (!trace) return
    const length = trace.steps.length
    const before = lastRun.current
    const index = stepAfterRerun(before, length, before?.context === runContext)
    lastRun.current = { context: runContext, index, length }
    setStepIndex(index)
  }, [trace])
  // Remember moves along the timeline, so the next re-run knows where you were.
  useEffect(() => {
    if (lastRun.current) lastRun.current.index = stepIndex
  }, [stepIndex])

  useEffect(() => {
    if (!playing) return
    if (stepIndex >= steps.length - 1) {
      setPlaying(false)
      return
    }
    const t = window.setTimeout(() => setStepIndex((i) => i + 1), PLAY_MS)
    return () => window.clearTimeout(t)
  }, [playing, stepIndex, steps.length])

  // Highlight the line the current step is on, and squiggle any error.
  useEffect(() => {
    const editor = editorRef.current
    const m = monacoRef.current
    if (!editor || !m) return
    decorations.current ??= editor.createDecorationsCollection()
    const model = editor.getModel()
    if (!model) return
    decorations.current.set(
      step
        ? [
            { range: new m.Range(step.line, 1, step.line, 1), options: { isWholeLine: true, className: 'current-line' } },
            ...roleDecorations(m, model),
          ]
        : [],
    )
    m.editor.setModelMarkers(
      model,
      'code',
      error?.line
        ? [
            {
              severity: m.MarkerSeverity.Error,
              message: error.message,
              startLineNumber: error.line,
              startColumn: error.col ?? 1,
              endLineNumber: error.line,
              endColumn: model.getLineMaxColumn(error.line),
            },
          ]
        : [],
    )
  }, [step, error, prevStep, trace])

  // Color the names on the line that just ran: what it changed and what it read.
  const roleDecorations = (m: typeof monaco, model: monaco.editor.ITextModel) => {
    if (!step || !prevStep || !trace) return []
    const line = trace.code.split('\n')[prevStep.line - 1]
    // Skip it while the editor holds newer code than the trace ran.
    if (line === undefined || prevStep.line > model.getLineCount() || model.getLineContent(prevStep.line) !== line) return []
    const { targets, sources, reads } = stepRoles(step, prevStep, trace)
    const at = (start: number, end: number, className: string) => ({
      range: new m.Range(prevStep.line, start, prevStep.line, end),
      options: { inlineClassName: className },
    })
    // The exact spots it read, like all of ages["test"]; a name read without one lights up everywhere.
    const spots = reads.filter((r) => r.start && r.end && (r.item !== undefined || !targets.includes(r.name)))
    const spotted = new Set(spots.map((r) => r.name))
    return [
      ...findNames(line, [...targets, ...sources.filter((s) => !spotted.has(s))], language).map((r) =>
        at(r.start, r.end, targets.includes(r.name) ? 'code-target' : 'code-source'),
      ),
      ...spots.map((r) => at(r.start!, r.end!, 'code-source')),
    ]
  }

  const onMount: OnMount = (editor, m) => {
    editorRef.current = editor
    // A new editor (after coming back from SQL) needs its own highlight collection.
    decorations.current = null
    monacoRef.current = m
    setMounted({ editor, api: m })
    // The same shortcuts while typing. As editor actions they also show up in F1.
    const { KeyMod, KeyCode } = m
    const action = (id: Command, label: string, keybindings: number[] = []) =>
      editor.addAction({
        id: `app.${id}`,
        label,
        keybindings,
        keybindingContext: 'editorTextFocus',
        run: () => commandsRef.current[id](),
      })
    action('playPause', 'Play / pause the run', [KeyMod.CtrlCmd | KeyCode.Enter])
    action('nextStep', 'Next step', [KeyMod.Alt | KeyCode.Period])
    action('prevStep', 'Previous step', [KeyMod.Alt | KeyCode.Comma])
    action('lastStep', 'Last step', [KeyMod.Alt | KeyMod.Shift | KeyCode.Period])
    action('firstStep', 'First step', [KeyMod.Alt | KeyMod.Shift | KeyCode.Comma])
    action('askClaude', 'Ask Claude', [KeyMod.CtrlCmd | KeyCode.KeyI])
    action('showShortcuts', 'Keyboard shortcuts')
    action('toggleTopBar', 'Hide / show the top bar')
    action('toggleTheme', 'Next theme (galaxy, green terminal, black and white, focus)')
    action('toggleDesign', 'Paper design on / off')
    // No keys inside the editor (+ and - are for typing), but they show up in F1.
    action('fontBigger', 'Bigger text')
    action('fontSmaller', 'Smaller text')
    action('fontReset', 'Normal text size')
  }

  // Pointing at things for the chat: its [[references]] and the Show me tour (src/chat/refs.ts).
  const glossaryIds = useMemo(() => CARDS[language].map((c) => c.id), [language])
  const refContext: RefContext = useMemo(
    () => ({ lineCount: code.split('\n').length, stepCount: steps.length, vars: variables, glossary: new Set(glossaryIds) }),
    [code, steps.length, variables, glossaryIds],
  )
  const stepValues = useMemo(
    () => (step && !covered ? Object.fromEntries(Object.entries(step.vars).map(([k, v]) => [k, formatValue(v)])) : null),
    [step, covered],
  )
  const view: ViewSummary = {
    step: steps.length ? shownStep + 1 : 0,
    steps: steps.length,
    vars: [...variables],
    glossary: glossaryIds,
    // What the visualizer shows, so Claude can talk about real values. A predict problem keeps them
    // hidden until the learner has guessed, from Claude too.
    ...(stepValues && { values: stepValues, output: step?.stdout ?? '' }),
    ...(problem && !problem.track && problem.tests[caseIndex] && { input: `${problem.functionName}(${problem.tests[caseIndex].args.map((a) => JSON.stringify(a)).join(', ')})` }),
  }
  // Lines the chat just changed, lit up in the editor until the code changes again.
  const [chatMarks, setChatMarks] = useState<ChatMarks | null>(null)
  useEditMarks(mounted?.editor ?? null, mounted?.api ?? null, code, chatMarks)
  const [flash, setFlash] = useState<{ ref: Ref; n: number } | null>(null)
  const [tour, setTour] = useState<{ stops: TourStop[]; from: { x: number; y: number }; panel: typeof sidePanel } | null>(null)
  const endFlash = useCallback(() => setFlash(null), [])
  // App owns the editor, steps and tabs, so it is the one that knows where each thing is.
  const placesRef = useRef({ steps, shownStep })
  placesRef.current = { steps, shownStep }
  const pointing: Pointing = useMemo(() => {
    const element = (ref: Ref): Element | null => {
      switch (ref.kind) {
        case 'var':
          return document.querySelector(`.viz-pane [data-target="var:${CSS.escape(ref.arg)}"]`)
        case 'step':
          return document.querySelector('.viz-pane .controls')
        case 'console':
          return document.querySelector('.console-dock')
        default:
          return document.querySelector('.syntax-pane')
      }
    }
    const shown = (r: DOMRect | null) => (r && r.width > 0 && r.height > 0 ? r : null)
    const locate = (ref: Ref): DOMRect | null => {
      if (ref.kind !== 'line') return shown(element(ref)?.getBoundingClientRect() ?? null)
      const editor = editorRef.current
      const model = editor?.getModel()
      const n = Number(ref.arg)
      if (!editor || !model || n > model.getLineCount()) return null
      const start = editor.getScrolledVisiblePosition({ lineNumber: n, column: model.getLineFirstNonWhitespaceColumn(n) || 1 })
      const end = editor.getScrolledVisiblePosition({ lineNumber: n, column: model.getLineMaxColumn(n) })
      const box = editor.getDomNode()?.getBoundingClientRect()
      if (!start || !end || !box || start.top < 0 || start.top > box.height) return null
      return shown(new DOMRect(box.left + start.left, box.top + start.top, Math.max(end.left - start.left, 24), start.height))
    }
    const settle = () => new Promise<void>((done) => requestAnimationFrame(() => requestAnimationFrame(() => done())))
    return {
      locate,
      async reveal(ref) {
        const { steps, shownStep } = placesRef.current
        if (ref.kind === 'step' || ref.kind === 'var') setPlaying(false)
        if (ref.kind === 'step') setStepIndex(Number(ref.arg) - 1)
        if (ref.kind === 'var' && !(ref.arg in (steps[shownStep]?.vars ?? {}))) {
          // Not alive at this step: go to the nearest step where it is.
          const near = steps
            .map((s, i) => (ref.arg in s.vars ? i : -1))
            .filter((i) => i >= 0)
            .sort((a, b) => Math.abs(a - shownStep) - Math.abs(b - shownStep))[0]
          if (near !== undefined) setStepIndex(near)
        }
        if (ref.kind === 'history') setSidePanel('history')
        if (ref.kind === 'glossary') {
          setGlossaryFocus(ref.arg)
          setSidePanel('cards')
        }
        await settle()
        if (ref.kind === 'line') {
          const editor = editorRef.current
          editor?.getDomNode()?.scrollIntoView({ block: 'nearest' })
          editor?.revealLineInCenterIfOutsideViewport(Number(ref.arg))
        } else {
          element(ref)?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
        }
        await settle()
        return locate(ref)
      },
    }
  }, [])

  const insert = (snippet: string) => {
    const editor = editorRef.current
    if (!editor) return
    const selection = editor.getSelection()
    if (!selection) return
    editor.executeEdits('syntax-helper', [{ range: selection, text: snippet, forceMoveMarkers: true }])
    editor.focus()
  }

  const shownStatus = sqlOn ? sqlStatus.status : status
  const shownError = sqlOn ? sqlStatus.error : !!error
  const statusText =
    shownStatus === 'loading'
      ? sqlOn
        ? 'Loading SQLite…'
        : language === 'python'
          ? 'Loading Python…'
          : 'Starting…'
      : shownStatus === 'running'
        ? 'Running…'
        : shownError
          ? 'Error'
          : 'Up to date'

  return (
    <div className={background === 'daily' ? 'app pixel-bg' : 'app'}>
      {/* The focus theme drops the moving picture: motion at the edge of sight pulls the eyes away.
          The paper design has no picture either: it is a printed page. */}
      {look !== 'focus' && !paper && <Background mode={background} scene={todaysScene} />}
      <span className="tick tl" aria-hidden="true" />
      <span className="tick tr" aria-hidden="true" />
      <span className="tick bl" aria-hidden="true" />
      <span className="tick br" aria-hidden="true" />
      <div className="frame">
        {topBarHidden ? (
          // The bar is gone, so this small tab is the way back. It keeps the status light,
          // so "Loading…" or "Error" still shows while the bar is hidden.
          <button
            className={`top-restore status-${shownError ? 'error' : shownStatus}`}
            onClick={toggleTopBar}
            aria-label="Show the top bar"
            title={withShortcut(`Show the top bar · ${statusText}`, 'toggleTopBar')}
          >
            <CollapseIcon />
          </button>
        ) : (
          <header className="top">
            {sqlOn ? (
              <nav className="tabs">
                <button className={sqlMode === PLAYGROUND ? 'tab active' : 'tab'} onClick={() => setSqlMode(PLAYGROUND)}>
                  Playground
                </button>
                <select
                  className={sqlMode !== PLAYGROUND ? 'problem-select active' : 'problem-select'}
                  value={sqlMode !== PLAYGROUND ? sqlMode : ''}
                  onChange={(e) => setSqlMode(e.target.value)}
                  aria-label="SQL problem"
                >
                  {sqlMode === PLAYGROUND && (
                    <option value="" disabled>
                      SQL problems ({SQL_PROBLEMS.length})
                    </option>
                  )}
                  {SQL_TOPICS.map((t) => {
                    const group = SQL_PROBLEMS.filter((p) => p.topic === t.id).sort(
                      (a, b) => DIFFICULTIES.indexOf(a.difficulty) - DIFFICULTIES.indexOf(b.difficulty),
                    )
                    return (
                      <optgroup key={t.id} label={t.label}>
                        {group.map((p) => (
                          <option key={p.id} value={p.id}>
                            {`${solutions.sql[p.id] ? '✓ ' : ''}${p.title} · ${p.difficulty}`}
                          </option>
                        ))}
                      </optgroup>
                    )
                  })}
                </select>
              </nav>
            ) : (
            <nav className="tabs">
              <button className={mode === PLAYGROUND ? 'tab active' : 'tab'} onClick={() => openProblem(PLAYGROUND)}>
                Playground
              </button>
              <select
                className={problem && !problem.track ? 'problem-select active' : 'problem-select'}
                value={problem && !problem.track ? problem.id : ''}
                onChange={(e) => openProblem(e.target.value)}
                aria-label="Problem"
              >
                {(!problem || problem.track) && (
                  <option value="" disabled>
                    Problems ({PROBLEMS.length})
                  </option>
                )}
                {PROBLEM_TOPICS.map((t) => {
                  // Easiest first within a section.
                  const group = PROBLEMS.filter((p) => p.topic === t.id).sort(
                    (a, b) => DIFFICULTIES.indexOf(a.difficulty) - DIFFICULTIES.indexOf(b.difficulty),
                  )
                  return (
                    group.length > 0 && (
                      <optgroup key={t.id} label={t.label}>
                        {group.map((p) => (
                          <option key={p.id} value={p.id}>
                            {`${solutions[language][p.id] ? '✓ ' : ''}${p.title} · ${p.difficulty}`}
                          </option>
                        ))}
                      </optgroup>
                    )
                  )
                })}
              </select>
              <select
                className={problem?.track ? 'problem-select concept-select active' : 'problem-select concept-select'}
                value={problem?.track ? problem.id : ''}
                onChange={(e) => openProblem(e.target.value)}
                aria-label={language === 'python' ? 'Python concept' : 'JavaScript concept'}
                title={
                  language === 'python'
                    ? 'How Python itself behaves, and the built-ins interviews ask you to write yourself'
                    : 'How JavaScript itself behaves: closures, references, array methods'
                }
              >
                {!problem?.track && (
                  <option value="" disabled>
                    {language === 'python' ? 'Python' : 'JS'} concepts ({CONCEPTS[language].length})
                  </option>
                )}
                <ConceptOptions problems={CONCEPTS[language]} solved={solutions[language]} />
              </select>
            </nav>
            )}
            <h1 className="wordmark">Code Language Teacher</h1>
            <div className="top-right">
              <div className="lang-switch" role="group" aria-label="Language">
                {LANGUAGES.map((l) => (
                  <button
                    key={l.id}
                    className={!sqlOn && language === l.id ? 'tab active' : 'tab'}
                    aria-pressed={!sqlOn && language === l.id}
                    onClick={() => setLanguage(l.id)}
                  >
                    {l.label}
                  </button>
                ))}
                <button
                  className={sqlOn ? 'tab active' : 'tab'}
                  aria-pressed={sqlOn}
                  onClick={() => setSqlOn(true)}
                  title="SQL: joins, GROUP BY, window functions and the classic interview questions"
                >
                  SQL
                </button>
              </div>
              <div className="font-size" role="group" aria-label="Text size">
                <button
                  className="icon-btn font-btn"
                  onClick={commands.fontSmaller}
                  disabled={isSmallest(fontScale)}
                  aria-label="Smaller text"
                  title={withShortcut(`Smaller text · now ${Math.round(fontScale * 100)}%`, 'fontSmaller')}
                >
                  A<span aria-hidden="true">−</span>
                </button>
                <button
                  className="icon-btn font-btn font-btn-big"
                  onClick={commands.fontBigger}
                  disabled={isLargest(fontScale)}
                  aria-label="Bigger text"
                  title={withShortcut(`Bigger text · now ${Math.round(fontScale * 100)}%`, 'fontBigger')}
                >
                  A<span aria-hidden="true">+</span>
                </button>
              </div>
              <div className="layout-switch" role="group" aria-label="Layout">
                {LAYOUT_OPTIONS.map(({ mode: m, label, Icon }) => (
                  <button
                    key={m}
                    className={layout.mode === m ? 'icon-btn active' : 'icon-btn'}
                    aria-pressed={layout.mode === m}
                    aria-label={label}
                    title={label}
                    onClick={() => layout.setMode(m)}
                  >
                    <Icon />
                  </button>
                ))}
              </div>
              <button
                className={background === 'daily' ? 'icon-btn bg-btn active' : 'icon-btn bg-btn'}
                aria-pressed={background === 'daily'}
                aria-label="Daily pixel background"
                disabled={look === 'focus' || paper}
                title={
                  paper
                    ? 'The paper design is a printed page, so it has no background picture.'
                    : theme === 'focus'
                    ? 'The focus theme hides the background, so nothing moves at the edge of the screen.'
                    : background === 'daily'
                    ? `Background: ${todaysScene.title}, a new pixel scene each day. Click for the galaxy.`
                    : "Background: the galaxy. Click for today's pixel scene."
                }
                onClick={toggleBackground}
              >
                <PictureIcon />
              </button>
              <button
                className={theme !== 'galaxy' && !paper ? 'icon-btn theme-btn active' : 'icon-btn theme-btn'}
                disabled={paper}
                aria-label={`Theme: ${THEME_NAMES[theme]}. Switch to the ${THEME_NAMES[nextTheme(theme)]} theme`}
                title={
                  paper
                    ? `The paper design has its own colors. Turn it off to get the ${THEME_NAMES[theme]} theme back.`
                    : withShortcut(`Theme: ${THEME_NAMES[theme]}. Click for the ${THEME_NAMES[nextTheme(theme)]}.`, 'toggleTheme')
                }
                onClick={toggleTheme}
              >
                <TerminalIcon />
              </button>
              <button
                className={paper ? 'icon-btn design-btn active' : 'icon-btn design-btn'}
                aria-pressed={paper}
                aria-label="Paper design"
                title={withShortcut(
                  paper
                    ? `Paper design: on. Click to go back to the classic look (${THEME_NAMES[theme]} theme).`
                    : 'Paper design: off. Click for the print look: cream paper, black ink, flat colors.',
                  'toggleDesign',
                )}
                onClick={toggleDesign}
              >
                <PaperIcon />
              </button>
              <button
                className="icon-btn hide-top-btn"
                onClick={toggleTopBar}
                aria-label="Hide the top bar for more room"
                title={withShortcut('Hide the top bar for more room', 'toggleTopBar')}
              >
                <ExpandIcon />
              </button>
              <button
                className="icon-btn keys-btn"
                onClick={commands.showShortcuts}
                aria-label="Keyboard shortcuts"
                title={withShortcut('Keyboard shortcuts', 'showShortcuts')}
              >
                <KeyboardIcon />
              </button>
              {(look === 'focus' || paper) && <ProgressMeter {...progress} subject={sqlOn ? 'SQL' : language === 'python' ? 'Python' : 'JavaScript'} />}
              <span className={`status status-${shownError ? 'error' : shownStatus}`}>{statusText}</span>
            </div>
          </header>
        )}
        {sqlOn ? (
          <SqlWorkspace
            layout={layout}
            mode={sqlMode}
            onOpenProblem={setSqlMode}
            code={sqlCode[sqlMode]}
            setCode={(next) => setSqlCode((c) => ({ ...c, [sqlMode]: next }))}
            solutions={solutions.sql}
            onSolved={(id, solved) => setSolutions((s) => saveSolution(s, 'sql', id, solved))}
            fontScale={fontScale}
            theme={look}
            commandsRef={sqlCommandsRef}
            runCommand={runCommand}
            onStatus={setSqlStatus}
          />
        ) : (
        <main className={layout.panesClass} ref={layout.panesRef} style={layout.panesStyle}>
          <section className={`pane editor-pane${layout.paneClass(0)}`}>
            {problem && (
              <ProblemPanel
                key={problem.id}
                problem={problem}
                language={language}
                tests={resultsFresh ? tests : null}
                caseIndex={caseIndex}
                onSelectCase={setCaseIndex}
                result={resultsFresh ? (trace?.result ?? null) : null}
                call={resultsFresh ? (trace?.call ?? null) : null}
                stale={error?.kind === 'syntax'}
                onOpenConcept={openConcept}
                output={trace && !error ? trace.stdout : null}
                revealed={!covered}
                onReveal={() => setRevealed((r) => new Set(r).add(problem.id))}
                savedAt={solutions[language][problem.id]?.savedAt ?? null}
                onStartOver={() => setCode(problem.starters[language])}
              />
            )}
            <div className="editor-wrap">
            <Editor
              height="100%"
              path={`${language}/${mode}`}
              language={language}
              value={code}
              onChange={(v) => setCode(v ?? '')}
              onMount={onMount}
              theme={editorLook(look).theme}
              options={{
                ...editorFont(fontScale),
                cursorStyle: editorLook(look).cursorStyle,
                fontFamily: editorLook(look).fontFamily,
                padding: { top: 14 },
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                tabSize: language === 'python' ? 4 : 2,
                // Word suggestions only on Ctrl+Space, so they don't pop up (and grab Enter) while typing.
                quickSuggestions: false,
                // Re-measure when a divider drag resizes the pane.
                automaticLayout: true,
              }}
            />
            <CodeHover
              editor={mounted?.editor ?? null}
              monacoApi={mounted?.api ?? null}
              step={covered ? undefined : step}
              stepNumber={shownStep + 1}
              variables={variables}
              language={language}
              onOpenConcept={openConcept}
            />
            </div>
          </section>
          <div {...layout.columnDivider(0)} />
          <section className={`pane viz-pane${layout.paneClass(1)}`} ref={layout.vizRef}>
            <div className="viz-scroll">
            <div className="controls">
              <button
                className="icon-btn"
                onClick={commands.firstStep}
                disabled={!steps.length}
                aria-label="Go to first step"
                title={withShortcut('First step', 'firstStep')}
              >
                <SkipBackIcon />
              </button>
              <button
                className="icon-btn"
                onClick={commands.prevStep}
                disabled={!steps.length}
                aria-label="Previous step"
                title={withShortcut('Previous step', 'prevStep')}
              >
                <StepBackIcon />
              </button>
              <button
                className="icon-btn play-btn"
                onClick={commands.playPause}
                disabled={steps.length < 2}
                aria-label={playing ? 'Pause' : 'Play'}
                title={withShortcut(playing ? 'Pause' : 'Play', 'playPause')}
              >
                {playing ? <PauseIcon /> : <PlayIcon />}
              </button>
              <button
                className="icon-btn"
                onClick={commands.nextStep}
                disabled={!steps.length}
                aria-label="Next step"
                title={withShortcut('Next step', 'nextStep')}
              >
                <StepForwardIcon />
              </button>
              <button
                className="icon-btn"
                onClick={commands.lastStep}
                disabled={!steps.length}
                aria-label="Go to last step"
                title={withShortcut('Last step', 'lastStep')}
              >
                <SkipForwardIcon />
              </button>
              <input
                className="scrubber"
                type="range"
                aria-label="Step"
                min={0}
                max={Math.max(0, steps.length - 1)}
                value={shownStep}
                style={{ '--pct': `${steps.length > 1 ? (shownStep / (steps.length - 1)) * 100 : 0}%` } as CSSProperties}
                onChange={(e) => {
                  setPlaying(false)
                  setStepIndex(Number(e.target.value))
                }}
              />
              <span className="step-count">
                {steps.length ? `${shownStep + 1} / ${steps.length}` : ''}
              </span>
            </div>
            {trace?.truncated && <p className="muted">Stopped early: too many steps.</p>}
            {error && (
              <div className="error">
                {error.line ? `Line ${error.line}: ` : ''}
                {error.message}
                {error.kind === 'syntax' && trace ? ' (showing the last version that ran)' : ''}
              </div>
            )}
            {covered ? (
              <div className="predict-cover">
                <p>Guess what this prints first, in the box under the problem.</p>
                <p className="muted">Then step through it here to see why.</p>
              </div>
            ) : step ? (
              <Visualizer
                step={step}
                prevStep={prevStep}
                pointers={trace!.pointers}
                plans={trace!}
                tick={stepIndex}
                language={trace!.language}
                steps={steps}
                index={shownStep}
                answer={
                  // The answer card sits at the end of a problem's run, next to what the test expected.
                  shownStep === steps.length - 1 && resultsFresh && problem && !problem.track && trace!.result && !trace!.error && !trace!.truncated
                    ? {
                        value: trace!.result,
                        expected: JSON.stringify(problem.tests[caseIndex].expected),
                        passed: tests?.[caseIndex]?.passed,
                      }
                    : null
                }
              />
            ) : (
              <p className="muted">{status === 'loading' && language === 'python' ? 'Starting Python in your browser…' : 'Write some code.'}</p>
            )}
            </div>
            {trace && !covered && <div {...layout.consoleDivider} />}
            {trace && !covered && (
              <div className={`console-dock${layout.consoleCollapsed ? ' collapsed' : ''}`} style={layout.consoleStyle}>
              <ConsolePanel
                entries={trace.console}
                error={error}
                code={trace.code}
                language={language}
                current={shownStep}
                isLast={shownStep === steps.length - 1}
                onJump={(i) => {
                  setPlaying(false)
                  setStepIndex(Math.min(i, steps.length - 1))
                }}
              />
              </div>
            )}
          </section>
          <div {...layout.columnDivider(1)} />
          <section className={`pane syntax-pane${layout.paneClass(2)}`}>
            <div className="side-tabs">
              <button className={sidePanel === 'chat' ? 'tab active' : 'tab'} onClick={() => setSidePanel('chat')}>
                Ask Claude
              </button>
              <button className={sidePanel === 'history' ? 'tab active' : 'tab'} onClick={() => setSidePanel('history')}>
                History
              </button>
              <button className={sidePanel === 'cards' ? 'tab active' : 'tab'} onClick={() => setSidePanel('cards')}>
                Glossary
              </button>
            </div>
            {/* Keep the chat mounted so switching tabs doesn't lose the conversation. */}
            <div hidden={sidePanel !== 'chat'} className="side-body">
              <Chat
                playground={{ code, language }}
                onPlaygroundChange={(next, marks) => {
                  setCode(next.code)
                  setChatMarks(marks)
                }}
                language={language}
                problem={problem?.title ?? null}
                onInsert={insert}
                inputRef={chatInputRef}
                view={view}
                refContext={refContext}
                onPoint={(ref) => setFlash((f) => ({ ref, n: (f?.n ?? 0) + 1 }))}
                onShowMe={(stops, from) => {
                  setFlash(null)
                  setTour({ stops, from, panel: sidePanel })
                }}
              />
            </div>
            {sidePanel === 'history' && (
              <div className="side-body">
              <HistoryPanel
                entries={history}
                current={shownStep}
                code={trace?.code ?? ''}
                onJump={(i) => {
                  setPlaying(false)
                  setStepIndex(i)
                }}
              />
              </div>
            )}
            {sidePanel === 'cards' && (
              <SyntaxHelper
                language={language}
                onInsert={insert}
                focus={glossaryFocus}
                onFocus={setGlossaryFocus}
                onOpenProblem={openProblem}
              />
            )}
          </section>
        </main>
        )}
      </div>
      {flash && <PointerFlash key={flash.n} target={flash.ref} pointing={pointing} onDone={endFlash} />}
      {tour && (
        <PointerTour
          stops={tour.stops}
          origin={tour.from}
          pointing={pointing}
          onClose={() => {
            // Back to the tab the tour started on (the chat), if a stop opened History or the Glossary.
            setSidePanel(tour.panel)
            setTour(null)
          }}
        />
      )}
      <ShortcutsDialog dialogRef={shortcutsRef} />
      <TapTip />
    </div>
  )
}

/** The concept picker's options: in sections when the track has them (Python), one list otherwise. */
function ConceptOptions({ problems, solved }: { problems: Problem[]; solved: Record<string, unknown> }) {
  const option = (p: Problem) => (
    <option key={p.id} value={p.id}>
      {p.kind === 'predict' ? `${p.title} (predict)` : `${solved[p.id] ? '✓ ' : ''}${p.title}`}
    </option>
  )
  if (!problems.some((p) => p.group)) return <>{problems.map(option)}</>
  return (
    <>
      {CONCEPT_GROUPS.map((g) => {
        const group = problems.filter((p) => p.group === g.id)
        return (
          group.length > 0 && (
            <optgroup key={g.id} label={g.label}>
              {group.map(option)}
            </optgroup>
          )
        )
      })}
    </>
  )
}

/**
 * The focus theme's meter: solved problems in this language, as a bar that fills toward the end.
 * The fill is keyed by the count, so it remounts and plays a short glow each time a problem is newly
 * solved: a small reward tied to real progress (styles.css, "Focus theme").
 */
function ProgressMeter({ solved, total, subject }: { solved: number; total: number; subject: string }) {
  const pct = total ? Math.round((solved / total) * 100) : 0
  return (
    <span className="progress-meter" role="img" aria-label={`${solved} of ${total} ${subject} problems solved`} title={`${solved} of ${total} ${subject} problems solved`}>
      <span className="progress-track">
        <span key={solved} className="progress-fill" style={{ width: `${pct}%` }} />
      </span>
      <span className="progress-count">
        {solved}/{total}
      </span>
    </span>
  )
}
