import type { Language } from '../../types'
import type { ConceptGroup, Difficulty, Problem, TestCase, Text } from '../problems'

// The object-oriented track: from a first class up to a design interview question (a port
// that loads and unloads container ships). Unlike the concept tracks, every problem exists in
// both languages. Like them, the code runs as a whole (example lines included), so the
// visualizer draws the objects as cards, and the tests use `run` code: a function body that
// makes objects, calls methods and returns what it saw. Plan: /mnt/project-files/plans/oop-section.md
//
// Starters and worked answers are real .py and .js files in ./code, loaded as text.

const files = import.meta.glob<string>('./code/**/*', { query: '?raw', import: 'default', eager: true })

/** The text of ./code/<name>; a missing file is a mistake in this module, so it throws. */
const file = (name: string): string => {
  const text = files[`./code/${name}`]
  if (text === undefined) throw new Error(`oop: no file code/${name}`)
  return text
}
const both = (name: string): Record<Language, string> => ({ python: file(`${name}.py`), javascript: file(`${name}.js`) })

/** A check written for each language: a function body that returns what to compare. */
const check = (name: string, python: string, javascript: string, expected: unknown): TestCase => ({ name, args: [], run: { python, javascript }, expected })

/**
 * A check that something is refused: runs `setup`, tries `act`, and gives back "error" or
 * "no error" as `err`. `then` (default `return err`) can also look at what changed.
 */
const refused = (
  name: string,
  python: { setup: string; act: string; then?: string },
  javascript: { setup: string; act: string; then?: string },
  expected: unknown = 'error',
): TestCase =>
  check(
    name,
    `${python.setup}\ntry:\n    ${python.act}\n    err = "no error"\nexcept Exception:\n    err = "error"\n${python.then ?? 'return err'}`,
    `${javascript.setup}\nlet err = "no error"\ntry {\n  ${javascript.act}\n} catch (e) {\n  err = "error"\n}\n${javascript.then ?? 'return err'}`,
    expected,
  )

type OopInput = Omit<Problem, 'track' | 'starters' | 'answer' | 'concepts' | 'functionName' | 'group' | 'difficulty'> & {
  /** The classes the tests use, comma-separated (the same names in both languages). */
  classes: string
  starters: Record<Language, string>
  answer?: Record<Language, string>
  concepts: Record<Language, string[]>
}

const make = (group: ConceptGroup, difficulty: Difficulty) => (p: OopInput): Problem => {
  const { classes, ...rest } = p
  return { ...rest, group, difficulty, track: 'oop', functionName: classes, kind: p.kind ?? 'build' }
}
const warmup = make('oop-warmup', 'Warm-up')
const easy = make('oop-easy', 'Easy')
const medium = make('oop-medium', 'Medium')
const port = make('oop-port', 'Medium')

/** A Python and a JavaScript version of a sentence (camelCase names, true and null...). */
const t = (python: string, javascript: string): Text => ({ python, javascript })

// ---------- The port capstone's pieces, built up one step at a time ----------

type Piece = 'container' | 'yard' | 'ship' | 'crane' | 'port'
const ext = { python: 'py', javascript: 'js' } as const
/** Blank lines between classes: two in Python (its style guide), one in JavaScript. */
const gap = { python: '\n\n\n', javascript: '\n\n' } as const
/** The worked pieces (given), then `stub` to write (if any), then the step's example lines. */
const portCode = (language: Language, given: Piece[], stub: string | null, example: string) =>
  [...given.map((p) => file(`port/${p}.${ext[language]}`)), ...(stub ? [file(`port/${stub}.stub.${ext[language]}`)] : [])]
    .map((s) => s.trimEnd())
    .join(gap[language]) +
  '\n' +
  file(`port/${example}.example.${ext[language]}`)
const portStep = (given: Piece[], stub: string, example: string): Record<Language, string> => ({
  python: portCode('python', given, stub, example),
  javascript: portCode('javascript', given, stub, example),
})
const portAnswer = (upTo: Piece[], example: string): Record<Language, string> => ({
  python: portCode('python', upTo, null, example),
  javascript: portCode('javascript', upTo, null, example),
})

/** Run code that sets up a port with an unloading ship Atlas (C1, C2) and a loading ship Borealis (C2). */
const PY_TWO_SHIPS =
  'port = Port(); a = Ship("Atlas", "unload", ["C1", "C2"], [Container("C1", 10), Container("C2", 12)]); b = Ship("Borealis", "load", ["C2"])'
const JS_TWO_SHIPS =
  'const port = new Port(); const a = new Ship("Atlas", "unload", ["C1", "C2"], [new Container("C1", 10), new Container("C2", 12)]); const b = new Ship("Borealis", "load", ["C2"])'

/** The checks a full port passes: step 5 and the from-scratch problem share them. */
const PORT_CHECKS: TestCase[] = [
  check(
    'an unloading ship moves its containers into the yard',
    `${PY_TWO_SHIPS}\nport.arrive(a)\nmoved = port.process("Atlas")\nreturn [moved, port.yard.codes(), a.done()]`,
    `${JS_TWO_SHIPS}\nport.arrive(a)\nconst moved = port.process("Atlas")\nreturn [moved, port.yard.codes(), a.done()]`,
    [2, ['C1', 'C2'], true],
  ),
  check(
    'a loading ship takes its containers from the yard',
    'port = Port()\nfor code in ["C3", "C4", "C5"]: port.yard.add(Container(code, 5))\nb = Ship("Borealis", "load", ["C3", "C5"])\nport.arrive(b)\nmoved = port.process("Borealis")\nreturn [moved, port.yard.codes(), b.remaining()]',
    'const port = new Port()\nfor (const code of ["C3", "C4", "C5"]) port.yard.add(new Container(code, 5))\nconst b = new Ship("Borealis", "load", ["C3", "C5"])\nport.arrive(b)\nconst moved = port.process("Borealis")\nreturn [moved, port.yard.codes(), b.remaining()]',
    [2, ['C4'], []],
  ),
  check(
    'two ships at once: what one unloads, the other loads',
    `${PY_TWO_SHIPS}\nport.arrive(a); port.arrive(b)\nport.process("Atlas"); port.process("Borealis")\nport.depart("Atlas")\nreturn [port.yard.codes(), b.done(), port.docked()]`,
    `${JS_TWO_SHIPS}\nport.arrive(a); port.arrive(b)\nport.process("Atlas"); port.process("Borealis")\nport.depart("Atlas")\nreturn [port.yard.codes(), b.done(), port.docked()]`,
    [['C1'], true, ['Borealis']],
  ),
  check(
    'the log tells the story in order',
    `${PY_TWO_SHIPS}\nport.arrive(a)\nport.process("Atlas")\nport.depart("Atlas")\nreturn port.log`,
    `${JS_TWO_SHIPS}\nport.arrive(a)\nport.process("Atlas")\nport.depart("Atlas")\nreturn port.log`,
    ['Atlas arrived to unload', 'unloaded C1 from Atlas', 'unloaded C2 from Atlas', 'Atlas departed'],
  ),
  refused(
    "a ship can't leave with work left, and stays docked",
    { setup: `${PY_TWO_SHIPS}\nport.arrive(a)`, act: 'port.depart("Atlas")', then: 'return [err, port.docked()]' },
    { setup: `${JS_TWO_SHIPS}\nport.arrive(a)`, act: 'port.depart("Atlas")', then: 'return [err, port.docked()]' },
    ['error', ['Atlas']],
  ),
  refused(
    'a missing container stops the loading before anything moves',
    {
      setup: 'port = Port(); port.yard.add(Container("C3", 5)); b = Ship("Borealis", "load", ["C3", "C7"]); port.arrive(b)',
      act: 'port.process("Borealis")',
      then: 'return [err, port.yard.codes(), b.remaining()]',
    },
    {
      setup: 'const port = new Port(); port.yard.add(new Container("C3", 5)); const b = new Ship("Borealis", "load", ["C3", "C7"]); port.arrive(b)',
      act: 'port.process("Borealis")',
      then: 'return [err, port.yard.codes(), b.remaining()]',
    },
    ['error', ['C3'], ['C3', 'C7']],
  ),
  refused(
    "the same ship can't dock twice",
    { setup: `${PY_TWO_SHIPS}\nport.arrive(a)`, act: 'port.arrive(a)' },
    { setup: `${JS_TWO_SHIPS}\nport.arrive(a)`, act: 'port.arrive(a)' },
  ),
  refused(
    "processing a ship that isn't docked is refused",
    { setup: 'port = Port()', act: 'port.process("Ghost")' },
    { setup: 'const port = new Port()', act: 'port.process("Ghost")' },
  ),
  check(
    'every ship keeps its own manifest',
    'a = Ship("Atlas", "load", ["C1"]); b = Ship("Borealis", "load", ["C2"])\nreturn [a.manifest, b.manifest]',
    'const a = new Ship("Atlas", "load", ["C1"]); const b = new Ship("Borealis", "load", ["C2"])\nreturn [a.manifest, b.manifest]',
    [['C1'], ['C2']],
  ),
  check(
    'an empty manifest is done straight away',
    'port = Port(); s = Ship("Calm", "load", [])\nport.arrive(s)\nmoved = port.process("Calm")\nport.depart("Calm")\nreturn [moved, port.docked()]',
    'const port = new Port(); const s = new Ship("Calm", "load", [])\nport.arrive(s)\nconst moved = port.process("Calm")\nport.depart("Calm")\nreturn [moved, port.docked()]',
    [0, []],
  ),
  check(
    'the crane counts every move',
    `${PY_TWO_SHIPS}\nport.arrive(a); port.arrive(b)\nport.process("Atlas"); port.process("Borealis")\nreturn port.crane.moves`,
    `${JS_TWO_SHIPS}\nport.arrive(a); port.arrive(b)\nport.process("Atlas"); port.process("Borealis")\nreturn port.crane.moves`,
    3,
  ),
  refused(
    'a ship must come to unload or to load',
    { setup: '', act: 'Ship("Odd", "repair", [])' },
    { setup: '', act: 'new Ship("Odd", "repair", [])' },
  ),
]

export const OOP_PROBLEMS: Problem[] = [
  // ---------- Warm-ups: the parts of a class ----------
  warmup({
    id: 'oop-first-class',
    title: 'Your First Class',
    classes: 'Dog',
    concepts: { python: ['classes', 'constructor'], javascript: ['classes', 'constructor'] },
    statement: [
      'A class is a blueprint, and each object made from it is one thing built from that blueprint, with its own data. Dog is the blueprint; Rex and Fido are two dogs.',
      t(
        'Write the Dog class: Dog("Rex") makes a dog whose name is "Rex", and its speak() method returns "Rex says woof".',
        'Write the Dog class: new Dog("Rex") makes a dog whose name is "Rex", and its speak() method returns "Rex says woof".',
      ),
      'Run it and watch the visualizer: each dog is a card, and the name you save shows up inside it.',
    ],
    hints: [
      t(
        '__init__ runs when you write Dog("Rex"). Its first parameter, self, is the new dog being set up.',
        'The constructor runs when you write new Dog("Rex"). Inside it, this is the new dog being set up.',
      ),
      t('self.name = name saves the name on this dog, so other methods can read self.name.', 'this.name = name saves the name on this dog, so other methods can read this.name.'),
      t('return f"{self.name} says woof"', 'return `${this.name} says woof`'),
    ],
    starters: both('first-class.starter'),
    answer: both('first-class.answer'),
    design: [
      t(
        'Data that belongs to one dog goes on self in __init__. Methods read it back through self, which is why every method takes self first: Python passes the dog you called it on.',
        'Data that belongs to one dog goes on this in the constructor. Methods read it back through this: the dog you called the method on.',
      ),
    ],
    tests: [
      check('the dog keeps its name', 'return Dog("Rex").name', 'return new Dog("Rex").name', 'Rex'),
      check('speak uses the name', 'return Dog("Rex").speak()', 'return new Dog("Rex").speak()', 'Rex says woof'),
      check(
        'two dogs keep their own names',
        'a = Dog("Rex"); b = Dog("Fido")\nreturn [a.speak(), b.speak()]',
        'const a = new Dog("Rex"); const b = new Dog("Fido")\nreturn [a.speak(), b.speak()]',
        ['Rex says woof', 'Fido says woof'],
      ),
    ],
  }),
  warmup({
    id: 'oop-counter',
    title: 'Methods That Change the Object',
    classes: 'Counter',
    concepts: { python: ['classes', 'constructor'], javascript: ['classes', 'constructor'] },
    statement: [
      'Objects remember. A method can change the object it was called on, and the change is still there the next time you look. That remembered data is the object\'s state.',
      'Write Counter: count starts at 0. increment() adds 1 and returns the new count, add(n) adds n and returns the new count, and reset() puts it back to 0.',
      'Step through the example and watch the green field: that is the line changing the object.',
    ],
    hints: [
      t('In __init__, self.count = 0.', 'In the constructor, this.count = 0.'),
      t('self.count += 1, then return self.count.', 'this.count += 1, then return this.count.'),
      'Two counters are two objects, each with its own count, so changing one leaves the other alone.',
    ],
    starters: both('counter.starter'),
    answer: both('counter.answer'),
    tests: [
      check('a new counter is at 0', 'return Counter().count', 'return new Counter().count', 0),
      check('increment returns the new count', 'c = Counter(); c.increment()\nreturn [c.increment(), c.count]', 'const c = new Counter(); c.increment()\nreturn [c.increment(), c.count]', [2, 2]),
      check('add adds n', 'c = Counter(); c.add(5)\nreturn c.increment()', 'const c = new Counter(); c.add(5)\nreturn c.increment()', 6),
      check('reset goes back to 0', 'c = Counter(); c.add(3); c.reset()\nreturn c.count', 'const c = new Counter(); c.add(3); c.reset()\nreturn c.count', 0),
      check(
        'two counters count separately',
        'a = Counter(); b = Counter(); a.add(4)\nreturn [a.count, b.count]',
        'const a = new Counter(); const b = new Counter(); a.add(4)\nreturn [a.count, b.count]',
        [4, 0],
      ),
    ],
  }),
  warmup({
    id: 'oop-shared-manifest',
    title: 'The Shared Manifest',
    classes: '',
    kind: 'predict',
    concepts: { python: ['instance-vs-class', 'mutable-default'], javascript: ['instance-vs-class', 'references-vs-copies'] },
    statement: [
      t(
        'This is the starter from the port interview question: class Ship: manifest = []. Guess the three lines it prints, one per line, then check your guess and step through.',
        'The port interview question started with a Python class that kept one manifest on the class. Here is the same mistake in JavaScript, next to a class that gets it right. Guess the three lines it prints, one per line, then check your guess and step through.',
      ),
      t("Write lists the way print does, like ['a'] and True.", 'Write arrays the way console.log does, like ["a"] and true.'),
    ],
    hints: [
      t(
        'manifest = [] sits in the class body, not in __init__. That line runs once, when Python reads the class.',
        'static manifest = [] belongs to the class Ship itself, not to each ship. Ship.manifest is one array.',
      ),
      t('self.load = [] in __init__ runs every time a Truck is made.', 'load = [] without static is a class field: it runs again for every new Truck.'),
    ],
    explain: [
      t(
        'manifest = [] in the class body makes ONE list that belongs to the class. self.manifest finds it there, because the ship has no manifest of its own, so Atlas and Borealis append to and read the very same list. That is why Borealis shows C1, and why is says True: one list, two names.',
        'static manifest = [] makes ONE array that belongs to the class, and both ships push to and read Ship.manifest. That is why Borealis shows C1, and === says true: one array.',
      ),
      t(
        'self.load = [] inside __init__ runs once per truck, so each truck gets a new empty list: t2.load is still []. That is the fix for the interview starter: make the manifest in __init__.',
        'load = [] without static is a class field, and class fields run once per object, like lines at the top of the constructor. So each truck gets its own empty array and t2.load is still []. Careful: in Python the same-looking line in a class body would be shared.',
      ),
      'The visualizer shows data kept on the class in its own amber section of each card, and marks the two names of one list with a link.',
    ],
    starters: both('shared-manifest.starter'),
    tests: [],
  }),
  warmup({
    id: 'oop-fix-manifest',
    title: 'Fix the Shared Manifest',
    classes: 'Ship',
    concepts: { python: ['instance-vs-class', 'constructor'], javascript: ['instance-vs-class', 'constructor'] },
    statement: [
      'Every Ship here shares one manifest, so loading one ship loads them all. Fix it so each ship has a manifest of its own, reached as ship.manifest.',
      'add(container) puts a container code on this ship\'s manifest, and count() says how many it has.',
    ],
    hints: [
      t('Data each object needs its own copy of is made in __init__, on self.', 'Data each object needs its own copy of is made in the constructor, on this.'),
      t('Move the list into __init__ as self.manifest = [] and delete the class-level line.', 'Drop static and use this.manifest, made in the constructor (or as a plain class field: manifest = []).'),
    ],
    starters: both('fix-manifest.starter'),
    answer: both('fix-manifest.answer'),
    design: [
      t(
        'Rule of thumb: anything that differs from one object to the next is made in __init__ and stored on self. The class body is for things that really are the same for every object, like a constant.',
        'Rule of thumb: anything that differs from one object to the next is made in the constructor and stored on this. static is for things that really belong to the class as a whole, like a count of how many were made.',
      ),
    ],
    tests: [
      check(
        'two ships keep separate manifests',
        'a = Ship("A"); b = Ship("B"); a.add("C1")\nreturn [a.manifest, b.manifest]',
        'const a = new Ship("A"); const b = new Ship("B"); a.add("C1")\nreturn [a.manifest, b.manifest]',
        [['C1'], []],
      ),
      check(
        'a new ship starts empty, even after others were loaded',
        'Ship("A").add("C1")\nreturn Ship("B").count()',
        'new Ship("A").add("C1")\nreturn new Ship("B").count()',
        0,
      ),
      check('count counts this ship\'s containers', 's = Ship("A"); s.add("C1"); s.add("C2")\nreturn s.count()', 'const s = new Ship("A"); s.add("C1"); s.add("C2")\nreturn s.count()', 2),
    ],
  }),
  warmup({
    id: 'oop-class-data',
    title: 'Class Data on Purpose',
    classes: 'Ship',
    concepts: { python: ['instance-vs-class'], javascript: ['instance-vs-class'] },
    statement: [
      'Sometimes one value really should be shared by every object: how many ships have been built, say. That belongs on the class.',
      t(
        'Ship.built counts the ships made so far. Each new ship adds 1 to it and gets its own number: the first ship made is number 1, the next 2, and so on.',
        'Ship.built (a static field) counts the ships made so far. Each new ship adds 1 to it and gets its own number: the first ship made is number 1, the next 2, and so on.',
      ),
    ],
    hints: [
      t(
        'Write Ship.built += 1, not self.built += 1. The second one reads the class\'s number but saves the result on this ship, as a new number of its own.',
        'Write Ship.built += 1. this.built would be a new field on this one ship.',
      ),
      t('Then self.number = Ship.built.', 'Then this.number = Ship.built.'),
    ],
    starters: both('class-data.starter'),
    answer: both('class-data.answer'),
    design: [
      t(
        'self.x reads the object first and the class second, but self.x = ... always writes on the object. That is why the shared list in the interview starter "worked" with append (it changes the class\'s list) but self.built += 1 would not (it writes a new number on the ship).',
        'In JavaScript a static field is only reachable through the class name, Ship.built, so there is no mixing it up with this.built by accident.',
      ),
    ],
    tests: [
      check(
        'each new ship adds 1',
        'start = Ship.built; Ship("A"); Ship("B")\nreturn Ship.built - start',
        'const start = Ship.built; new Ship("A"); new Ship("B")\nreturn Ship.built - start',
        2,
      ),
      check(
        'ships are numbered in the order they were made',
        'a = Ship("A"); b = Ship("B")\nreturn [a.number == Ship.built - 1, b.number == Ship.built]',
        'const a = new Ship("A"); const b = new Ship("B")\nreturn [a.number === Ship.built - 1, b.number === Ship.built]',
        [true, true],
      ),
      check(
        'the count lives on the class, not on each ship',
        'a = Ship("A")\nreturn ["built" in vars(Ship), "built" in vars(a)]',
        'const a = new Ship("A")\nreturn [Object.hasOwn(Ship, "built"), Object.hasOwn(a, "built")]',
        [true, false],
      ),
    ],
  }),
  warmup({
    id: 'oop-composition',
    title: 'Objects Inside Objects',
    classes: 'Container,Truck',
    concepts: { python: ['composition', 'classes'], javascript: ['composition', 'classes'] },
    statement: [
      'A truck has containers. When one object holds others like this, it is called composition: you build bigger things out of smaller objects, the way a ship holds a manifest and a port holds a yard.',
      t(
        'Truck(capacity) keeps a list of Container objects. total_weight() adds up their weights. load(container) adds it and returns True if the total stays within capacity, and otherwise changes nothing and returns False. codes() lists the codes on board, in loading order.',
        'new Truck(capacity) keeps an array of Container objects. totalWeight() adds up their weights. load(container) adds it and returns true if the total stays within capacity, and otherwise changes nothing and returns false. codes() lists the codes on board, in loading order.',
      ),
    ],
    hints: [
      t('sum(c.weight for c in self.containers)', 'this.containers.reduce((sum, c) => sum + c.weight, 0)'),
      t('Check first: if self.total_weight() + container.weight > self.capacity, return False before appending.', 'Check first: if this.totalWeight() + container.weight > this.capacity, return false before pushing.'),
      'The truck asks each container for its weight, rather than keeping a copy of the numbers: one place holds each fact.',
    ],
    starters: both('composition.starter'),
    answer: both('composition.answer'),
    tests: [
      check(
        'loading adds containers in order',
        't = Truck(30); t.load(Container("C1", 10)); t.load(Container("C2", 5))\nreturn t.codes()',
        'const t = new Truck(30); t.load(new Container("C1", 10)); t.load(new Container("C2", 5))\nreturn t.codes()',
        ['C1', 'C2'],
      ),
      check('total weight adds up', 't = Truck(30); t.load(Container("C1", 10)); t.load(Container("C2", 5))\nreturn t.total_weight()', 'const t = new Truck(30); t.load(new Container("C1", 10)); t.load(new Container("C2", 5))\nreturn t.totalWeight()', 15),
      check(
        "a container that doesn't fit is refused and left off",
        't = Truck(20); t.load(Container("C1", 15))\nok = t.load(Container("C2", 10))\nreturn [ok, t.codes()]',
        'const t = new Truck(20); t.load(new Container("C1", 15))\nconst ok = t.load(new Container("C2", 10))\nreturn [ok, t.codes()]',
        [false, ['C1']],
      ),
      check('filling it exactly is fine', 't = Truck(20)\nreturn [t.load(Container("C1", 12)), t.load(Container("C2", 8))]', 'const t = new Truck(20)\nreturn [t.load(new Container("C1", 12)), t.load(new Container("C2", 8))]', [true, true]),
      check('an empty truck weighs 0', 'return Truck(10).total_weight()', 'return new Truck(10).totalWeight()', 0),
      check(
        'the truck holds the very same container objects',
        'c = Container("C1", 10); t = Truck(30); t.load(c)\nreturn t.containers[0] is c',
        'const c = new Container("C1", 10); const t = new Truck(30); t.load(c)\nreturn t.containers[0] === c',
        true,
      ),
    ],
  }),
  warmup({
    id: 'oop-printing',
    title: 'Printing and Comparing Objects',
    classes: 'Container',
    concepts: { python: ['dunder-methods', 'is-vs-equals'], javascript: ['to-string', 'references-vs-copies'] },
    statement: [
      t(
        'By default an object prints as something like <__main__.Container object at 0x10...>, and two containers with the same code are not ==, because == falls back to "is it the very same object?".',
        'By default an object turns into the text "[object Object]", and two containers with the same code are not ===, because === asks "is it the very same object?".',
      ),
      t(
        'Give Container a __repr__ so it prints as Container(C1, 10t), and an __eq__ so two containers with the same code are ==.',
        'Give Container a toString() so it turns into the text Container(C1, 10t), and an equals(other) method that is true when the codes match.',
      ),
    ],
    hints: [
      t('def __repr__(self): return f"Container({self.code}, {self.weight}t)"', 'toString() { return `Container(${this.code}, ${this.weight}t)` }'),
      t('def __eq__(self, other): return isinstance(other, Container) and self.code == other.code', 'equals(other) { return other instanceof Container && this.code === other.code }'),
      t('print uses __repr__ when there is no __str__, and "in" on a list uses ==.', '`${c}` and String(c) both call toString(). === can\'t be changed: it always compares identity.'),
    ],
    starters: both('printing.starter'),
    answer: both('printing.answer'),
    tests: [
      check('it prints nicely', 'return repr(Container("C1", 10))', 'return String(new Container("C1", 10))', 'Container(C1, 10t)'),
      check('in text too', "return f'got {Container(\"C2\", 7)}'", 'return `got ${new Container("C2", 7)}`', 'got Container(C2, 7t)'),
      check('same code means equal', 'return Container("C1", 10) == Container("C1", 12)', 'return new Container("C1", 10).equals(new Container("C1", 12))', true),
      check('different codes are not equal', 'return Container("C1", 10) == Container("C2", 10)', 'return new Container("C1", 10).equals(new Container("C2", 10))', false),
      check(
        'finding a container in a list by its code',
        'boxes = [Container("C1", 5), Container("C2", 6)]\nreturn Container("C2", 0) in boxes',
        'const boxes = [new Container("C1", 5), new Container("C2", 6)]\nreturn boxes.some((b) => b.equals(new Container("C2", 0)))',
        true,
      ),
    ],
  }),

  // ---------- Easies: one small model each ----------
  easy({
    id: 'oop-bank-account',
    title: 'Bank Account',
    classes: 'BankAccount',
    concepts: { python: ['raise-errors', 'encapsulation'], javascript: ['raise-errors', 'encapsulation'] },
    statement: [
      'The classic first model. An account has an owner, a balance and a history, and its methods are the only way the balance changes, so they can check every change. Keeping the rules inside the object like this is called encapsulation.',
      t(
        'deposit(amount) and withdraw(amount) return the new balance and note "deposit 50" or "withdraw 20" in history. Raise a ValueError for an amount of 0 or less, or a withdrawal bigger than the balance. A refused action changes nothing.',
        'deposit(amount) and withdraw(amount) return the new balance and note "deposit 50" or "withdraw 20" in history. Throw an Error for an amount of 0 or less, or a withdrawal bigger than the balance. A refused action changes nothing.',
      ),
    ],
    hints: [
      t('raise ValueError("not enough money") stops the method right there, before anything changes.', 'throw new Error("not enough money") stops the method right there, before anything changes.'),
      'Check first, then change: do every check at the top of the method, and only then touch the balance and the history.',
      t('self.history.append(f"withdraw {amount}")', 'this.history.push(`withdraw ${amount}`)'),
    ],
    starters: both('bank.starter'),
    answer: both('bank.answer'),
    design: [
      'Refusing bad input with an error, instead of returning False or quietly doing nothing, means a mistake can\'t be missed: the code that asked for the impossible finds out straight away. Interviewers look for this.',
    ],
    tests: [
      check('starts with the opening balance', 'return [BankAccount("Ada", 100).balance, BankAccount("Bo").balance]', 'return [new BankAccount("Ada", 100).balance, new BankAccount("Bo").balance]', [100, 0]),
      check('deposit adds and returns the balance', 'return BankAccount("Ada", 100).deposit(50)', 'return new BankAccount("Ada", 100).deposit(50)', 150),
      check('withdraw takes money out', 'a = BankAccount("Ada", 100)\nreturn [a.withdraw(30), a.balance]', 'const a = new BankAccount("Ada", 100)\nreturn [a.withdraw(30), a.balance]', [70, 70]),
      refused(
        "can't take out more than the balance, and nothing changes",
        { setup: 'a = BankAccount("Ada", 100)', act: 'a.withdraw(500)', then: 'return [err, a.balance, a.history]' },
        { setup: 'const a = new BankAccount("Ada", 100)', act: 'a.withdraw(500)', then: 'return [err, a.balance, a.history]' },
        ['error', 100, []],
      ),
      refused('deposits must be more than 0', { setup: 'a = BankAccount("Ada")', act: 'a.deposit(0)' }, { setup: 'const a = new BankAccount("Ada")', act: 'a.deposit(0)' }),
      refused('withdrawals must be more than 0', { setup: 'a = BankAccount("Ada", 10)', act: 'a.withdraw(-5)' }, { setup: 'const a = new BankAccount("Ada", 10)', act: 'a.withdraw(-5)' }),
      check(
        'history lists every change in order',
        'a = BankAccount("Ada"); a.deposit(50); a.withdraw(20)\nreturn a.history',
        'const a = new BankAccount("Ada"); a.deposit(50); a.withdraw(20)\nreturn a.history',
        ['deposit 50', 'withdraw 20'],
      ),
      check(
        'two accounts are separate',
        'a = BankAccount("Ada"); b = BankAccount("Bo"); a.deposit(5)\nreturn [b.balance, b.history]',
        'const a = new BankAccount("Ada"); const b = new BankAccount("Bo"); a.deposit(5)\nreturn [b.balance, b.history]',
        [0, []],
      ),
    ],
  }),
  easy({
    id: 'oop-library',
    title: 'Library Checkout',
    classes: 'Book,Library',
    concepts: { python: ['composition', 'raise-errors'], javascript: ['composition', 'raise-errors'] },
    statement: [
      'Two classes working together: Book holds one book\'s data, and Library holds the books and the rules for lending them.',
      t(
        'add(book) puts a Book in the library. checkout(title) lends it: raise a KeyError if there is no such book and a ValueError if it is already out. return_book(title) brings it back (a ValueError if it isn\'t out). available() lists the titles on the shelf, A to Z.',
        'add(book) puts a Book in the library. checkout(title) lends it: throw an Error if there is no such book or it is already out. returnBook(title) brings it back (an Error if it isn\'t out). available() lists the titles on the shelf, A to Z.',
      ),
    ],
    hints: [
      t('self.books[book.title] = book: a dict by title finds a book in one step.', 'this.books.set(book.title, book): a Map by title finds a book in one step.'),
      t('Lending flips book.checked_out. The library looks the book up, the book remembers its state.', 'Lending flips book.checkedOut. The library looks the book up, the book remembers its state.'),
      t('sorted(t for t, b in self.books.items() if not b.checked_out)', '[...this.books.values()].filter((b) => !b.checkedOut).map((b) => b.title).sort()'),
    ],
    starters: both('library.starter'),
    answer: both('library.answer'),
    tests: [
      check(
        'checking out takes a book off the shelf',
        'lib = Library(); lib.add(Book("Dune", "Herbert")); lib.add(Book("Emma", "Austen")); lib.checkout("Dune")\nreturn lib.available()',
        'const lib = new Library(); lib.add(new Book("Dune", "Herbert")); lib.add(new Book("Emma", "Austen")); lib.checkout("Dune")\nreturn lib.available()',
        ['Emma'],
      ),
      check(
        'available is in A to Z order',
        'lib = Library()\nfor title in ["Zorba", "Anna", "Moby"]: lib.add(Book(title, "?"))\nreturn lib.available()',
        'const lib = new Library()\nfor (const title of ["Zorba", "Anna", "Moby"]) lib.add(new Book(title, "?"))\nreturn lib.available()',
        ['Anna', 'Moby', 'Zorba'],
      ),
      refused(
        "a book that's out can't be checked out again",
        { setup: 'lib = Library(); lib.add(Book("Dune", "Herbert")); lib.checkout("Dune")', act: 'lib.checkout("Dune")' },
        { setup: 'const lib = new Library(); lib.add(new Book("Dune", "Herbert")); lib.checkout("Dune")', act: 'lib.checkout("Dune")' },
      ),
      refused("a book the library doesn't have can't be checked out", { setup: 'lib = Library()', act: 'lib.checkout("Ghost")' }, { setup: 'const lib = new Library()', act: 'lib.checkout("Ghost")' }),
      check(
        'returning puts it back',
        'lib = Library(); lib.add(Book("Dune", "Herbert")); lib.checkout("Dune"); lib.return_book("Dune")\nreturn lib.available()',
        'const lib = new Library(); lib.add(new Book("Dune", "Herbert")); lib.checkout("Dune"); lib.returnBook("Dune")\nreturn lib.available()',
        ['Dune'],
      ),
      refused(
        "a book that isn't out can't be returned",
        { setup: 'lib = Library(); lib.add(Book("Dune", "Herbert"))', act: 'lib.return_book("Dune")' },
        { setup: 'const lib = new Library(); lib.add(new Book("Dune", "Herbert"))', act: 'lib.returnBook("Dune")' },
      ),
      check(
        'the book object itself knows it is out',
        'b = Book("Dune", "Herbert"); lib = Library(); lib.add(b); lib.checkout("Dune")\nreturn b.checked_out',
        'const b = new Book("Dune", "Herbert"); const lib = new Library(); lib.add(b); lib.checkout("Dune")\nreturn b.checkedOut',
        true,
      ),
    ],
  }),
  easy({
    id: 'oop-parking-lot',
    title: 'Parking Lot',
    classes: 'ParkingLot',
    concepts: { python: ['raise-errors', 'dicts'], javascript: ['raise-errors', 'map-vs-object'] },
    statement: [
      'A favorite interview model. ParkingLot(size) has spots numbered 1 to size.',
      t(
        'park(plate) puts the car in the lowest-numbered free spot and returns it; raise a ValueError if the lot is full or that car is already parked. leave(plate) frees the spot and returns its number (a KeyError if the car isn\'t here). where(plate) gives the car\'s spot or None. free() says how many spots are free.',
        'park(plate) puts the car in the lowest-numbered free spot and returns it; throw an Error if the lot is full or that car is already parked. leave(plate) frees the spot and returns its number (an Error if the car isn\'t here). where(plate) gives the car\'s spot or null. free() says how many spots are free.',
      ),
    ],
    hints: [
      t('Keep self.spots as plate -> spot number: it answers where(plate) in one step.', 'Keep this.spots as a Map of plate -> spot number: it answers where(plate) in one step.'),
      'To find the lowest free spot, collect the taken numbers in a set and try 1, 2, 3... until one isn\'t taken.',
      'A spot freed by leave is free again, so the next car can get a lower number than the last one did.',
    ],
    starters: both('parking.starter'),
    answer: both('parking.answer'),
    tests: [
      check('cars fill the lowest spots first', 'lot = ParkingLot(3)\nreturn [lot.park("A"), lot.park("B")]', 'const lot = new ParkingLot(3)\nreturn [lot.park("A"), lot.park("B")]', [1, 2]),
      check(
        'a freed spot is used again',
        'lot = ParkingLot(3); lot.park("A"); lot.park("B")\nleft = lot.leave("A")\nreturn [left, lot.park("C")]',
        'const lot = new ParkingLot(3); lot.park("A"); lot.park("B")\nconst left = lot.leave("A")\nreturn [left, lot.park("C")]',
        [1, 1],
      ),
      refused('a full lot refuses cars', { setup: 'lot = ParkingLot(1); lot.park("A")', act: 'lot.park("B")' }, { setup: 'const lot = new ParkingLot(1); lot.park("A")', act: 'lot.park("B")' }),
      refused("a car can't park twice", { setup: 'lot = ParkingLot(3); lot.park("A")', act: 'lot.park("A")' }, { setup: 'const lot = new ParkingLot(3); lot.park("A")', act: 'lot.park("A")' }),
      refused("a car that isn't here can't leave", { setup: 'lot = ParkingLot(3)', act: 'lot.leave("Z")' }, { setup: 'const lot = new ParkingLot(3)', act: 'lot.leave("Z")' }),
      check('where finds a car, or says it isn\'t here', 'lot = ParkingLot(3); lot.park("A"); lot.park("B")\nreturn [lot.where("B"), lot.where("Z")]', 'const lot = new ParkingLot(3); lot.park("A"); lot.park("B")\nreturn [lot.where("B"), lot.where("Z")]', [2, null]),
      check('free counts the empty spots', 'lot = ParkingLot(4); lot.park("A"); lot.park("B"); lot.leave("A")\nreturn lot.free()', 'const lot = new ParkingLot(4); lot.park("A"); lot.park("B"); lot.leave("A")\nreturn lot.free()', 3),
    ],
  }),
  easy({
    id: 'oop-warehouse',
    title: 'Warehouse Stock',
    classes: 'Warehouse',
    concepts: { python: ['raise-errors', 'dicts'], javascript: ['raise-errors', 'map-vs-object'] },
    statement: [
      'A store of things by name, with counts. This is a little container yard in disguise, and the shape comes back in the port capstone.',
      t(
        'add(item, count) adds stock (a ValueError unless count is more than 0). remove(item, count) takes it away: raise a ValueError if there aren\'t that many, and change nothing. An item that reaches 0 is gone from the stock. count(item) says how many (0 if none) and items() lists what\'s in stock, A to Z.',
        'add(item, count) adds stock (an Error unless count is more than 0). remove(item, count) takes it away: throw an Error if there aren\'t that many, and change nothing. An item that reaches 0 is gone from the stock. count(item) says how many (0 if none) and items() lists what\'s in stock, A to Z.',
      ),
    ],
    hints: [
      t('self.stock.get(item, 0) gives 0 for an item that was never added.', 'this.stock.get(item) ?? 0 gives 0 for an item that was never added.'),
      t('When a count reaches 0, del self.stock[item], so items() only lists what\'s really there.', 'When a count reaches 0, this.stock.delete(item), so items() only lists what\'s really there.'),
      'Methods can use each other: remove can call self.count(item) instead of repeating the lookup.',
    ],
    starters: both('stock.starter'),
    answer: both('stock.answer'),
    tests: [
      check('adding adds up', 'w = Warehouse(); w.add("bolts", 3); w.add("bolts", 4)\nreturn w.count("bolts")', 'const w = new Warehouse(); w.add("bolts", 3); w.add("bolts", 4)\nreturn w.count("bolts")', 7),
      check('an unknown item has 0', 'return Warehouse().count("gears")', 'return new Warehouse().count("gears")', 0),
      check('removing takes away', 'w = Warehouse(); w.add("bolts", 5); w.remove("bolts", 2)\nreturn w.count("bolts")', 'const w = new Warehouse(); w.add("bolts", 5); w.remove("bolts", 2)\nreturn w.count("bolts")', 3),
      check(
        'an item at 0 is no longer listed',
        'w = Warehouse(); w.add("nuts", 2); w.add("bolts", 1); w.remove("nuts", 2)\nreturn w.items()',
        'const w = new Warehouse(); w.add("nuts", 2); w.add("bolts", 1); w.remove("nuts", 2)\nreturn w.items()',
        ['bolts'],
      ),
      refused(
        "can't remove more than there is, and nothing changes",
        { setup: 'w = Warehouse(); w.add("nuts", 2)', act: 'w.remove("nuts", 5)', then: 'return [err, w.count("nuts")]' },
        { setup: 'const w = new Warehouse(); w.add("nuts", 2)', act: 'w.remove("nuts", 5)', then: 'return [err, w.count("nuts")]' },
        ['error', 2],
      ),
      refused('adding needs a count above 0', { setup: 'w = Warehouse()', act: 'w.add("nuts", 0)' }, { setup: 'const w = new Warehouse()', act: 'w.add("nuts", 0)' }),
      check(
        'items are listed A to Z',
        'w = Warehouse()\nfor item in ["washers", "bolts", "nuts"]: w.add(item, 1)\nreturn w.items()',
        'const w = new Warehouse()\nfor (const item of ["washers", "bolts", "nuts"]) w.add(item, 1)\nreturn w.items()',
        ['bolts', 'nuts', 'washers'],
      ),
    ],
  }),
  easy({
    id: 'oop-shapes',
    title: 'Shapes: Inheritance',
    classes: 'Shape,Circle,Rectangle,Square',
    concepts: { python: ['inheritance', 'classes'], javascript: ['inheritance', 'classes'] },
    statement: [
      'Inheritance: a class can be a special kind of another class. A Circle is a Shape, so it gets everything Shape has (like describe) and adds what makes it different (its own area). A Square is a Rectangle with equal sides.',
      t(
        'Give Circle its area (math.pi × radius²). Write Rectangle(width, height), named "rectangle", with its area. Write Square(side) as a Rectangle with both sides equal, named "square". Shape.describe() already works for all of them.',
        'Give Circle its area (Math.PI × radius²). Write Rectangle(width, height), named "rectangle", with its area. Write Square(side) as a Rectangle with both sides equal, named "square". Shape\'s describe() already works for all of them.',
      ),
      'describe() calling self.area() and getting the right one for each shape is called polymorphism: one call, a different behavior per class.',
    ],
    hints: [
      t('class Rectangle(Shape): its __init__ calls super().__init__("rectangle") to let Shape set the name, then saves width and height.', 'class Rectangle extends Shape: its constructor calls super("rectangle") to let Shape set the name, then saves width and height.'),
      t('class Square(Rectangle): def __init__(self, side): super().__init__(side, side), then self.name = "square".', 'class Square extends Rectangle: constructor(side) { super(side, side); this.name = "square" }'),
      'Square needs no area of its own: it inherits Rectangle\'s, and width × height is right for a square too.',
    ],
    starters: both('shapes.starter'),
    answer: both('shapes.answer'),
    design: [
      'Inheritance fits when one thing really "is a" kind of another. When one thing just "has" another (a ship has containers), use composition instead: hold the other object in a field. In design interviews, reaching for composition first is usually the safer choice.',
    ],
    tests: [
      check('a circle\'s area', 'return round(Circle(1).area(), 2)', 'return Math.round(new Circle(1).area() * 100) / 100', 3.14),
      check('a rectangle\'s area', 'return Rectangle(3, 4).area()', 'return new Rectangle(3, 4).area()', 12),
      check('a square is a 2 by 2 rectangle', 's = Square(2)\nreturn [s.area(), s.width, s.height]', 'const s = new Square(2)\nreturn [s.area(), s.width, s.height]', [4, 2, 2]),
      check(
        'describe works for every shape',
        'return [s.describe() for s in [Circle(1), Rectangle(3, 4), Square(2)]]',
        'return [new Circle(1), new Rectangle(3, 4), new Square(2)].map((s) => s.describe())',
        ['circle with area 3.14', 'rectangle with area 12', 'square with area 4'],
      ),
      check(
        'a square is a rectangle and a shape',
        's = Square(1)\nreturn [isinstance(s, Rectangle), isinstance(s, Shape), isinstance(Circle(1), Rectangle)]',
        'const s = new Square(1)\nreturn [s instanceof Rectangle, s instanceof Shape, new Circle(1) instanceof Rectangle]',
        [true, true, false],
      ),
      refused("a plain Shape has no area", { setup: 's = Shape("blob")', act: 's.area()' }, { setup: 'const s = new Shape("blob")', act: 's.area()' }),
    ],
  }),

  // ---------- Mediums: a manager class coordinating several objects ----------
  medium({
    id: 'oop-hotel',
    title: 'Hotel Bookings',
    classes: 'Hotel',
    concepts: { python: ['composition', 'single-responsibility', 'intervals'], javascript: ['composition', 'single-responsibility', 'intervals'] },
    statement: [
      'A manager class: Hotel keeps the rooms and the bookings, and enforces the rule that a room can\'t be booked twice for the same night. The starter only lists what the tests use; the classes inside are up to you.',
      'Days are whole numbers. A stay from check-in to check-out covers the nights check-in up to the night before check-out, so one guest can check out on the day the next checks in.',
    ],
    hints: [
      'Nouns: hotel, room, guest, booking. A Booking class (guest, room, check-in, check-out) is worth it, because it can answer questions about itself: covers(day) and overlaps(start, end).',
      'Two stays clash when each starts before the other ends: a_start < b_end and b_start < a_end.',
      t('Keep bookings in a dict by id, and give out ids from a counter (self.next_id).', 'Keep bookings in a Map by id, and give out ids from a counter (this.nextId).'),
    ],
    starters: both('hotel.starter'),
    answer: both('hotel.answer'),
    design: [
      'The Booking object does the date math (covers, overlaps), and the Hotel does the bookkeeping. Each class has one job, so each is short and easy to test on its own. That idea is called the single responsibility principle.',
    ],
    tests: [
      check('bookings get ids 1, 2, 3...', 'h = Hotel([101, 102])\nreturn [h.book("Ada", 101, 1, 3), h.book("Bo", 102, 1, 3)]', 'const h = new Hotel([101, 102])\nreturn [h.book("Ada", 101, 1, 3), h.book("Bo", 102, 1, 3)]', [1, 2]),
      refused(
        "a room can't be booked twice for the same night",
        { setup: 'h = Hotel([101]); h.book("Ada", 101, 1, 4)', act: 'h.book("Bo", 101, 3, 5)' },
        { setup: 'const h = new Hotel([101]); h.book("Ada", 101, 1, 4)', act: 'h.book("Bo", 101, 3, 5)' },
      ),
      check(
        'checking in on the day the last guest leaves is fine',
        'h = Hotel([101]); h.book("Ada", 101, 1, 3)\nreturn h.book("Bo", 101, 3, 5)',
        'const h = new Hotel([101]); h.book("Ada", 101, 1, 3)\nreturn h.book("Bo", 101, 3, 5)',
        2,
      ),
      refused(
        'a stay inside another one clashes too',
        { setup: 'h = Hotel([101]); h.book("Ada", 101, 1, 10)', act: 'h.book("Bo", 101, 4, 5)' },
        { setup: 'const h = new Hotel([101]); h.book("Ada", 101, 1, 10)', act: 'h.book("Bo", 101, 4, 5)' },
      ),
      refused('check-out must be after check-in', { setup: 'h = Hotel([101])', act: 'h.book("Ada", 101, 3, 3)' }, { setup: 'const h = new Hotel([101])', act: 'h.book("Ada", 101, 3, 3)' }),
      refused("rooms that don't exist can't be booked", { setup: 'h = Hotel([101])', act: 'h.book("Ada", 999, 1, 2)' }, { setup: 'const h = new Hotel([101])', act: 'h.book("Ada", 999, 1, 2)' }),
      check(
        'free rooms on a night, smallest first',
        'h = Hotel([102, 101, 103]); h.book("Ada", 101, 1, 3); h.book("Bo", 103, 2, 4)\nreturn [h.free_rooms(1), h.free_rooms(2), h.free_rooms(3)]',
        'const h = new Hotel([102, 101, 103]); h.book("Ada", 101, 1, 3); h.book("Bo", 103, 2, 4)\nreturn [h.freeRooms(1), h.freeRooms(2), h.freeRooms(3)]',
        [
          [102, 103],
          [102],
          [101, 102],
        ],
      ),
      check(
        'cancelling frees the room',
        'h = Hotel([101]); first = h.book("Ada", 101, 1, 3); h.cancel(first)\nreturn [h.free_rooms(1), h.book("Bo", 101, 1, 3)]',
        'const h = new Hotel([101]); const first = h.book("Ada", 101, 1, 3); h.cancel(first)\nreturn [h.freeRooms(1), h.book("Bo", 101, 1, 3)]',
        [[101], 2],
      ),
      refused('cancelling an unknown booking is refused', { setup: 'h = Hotel([101])', act: 'h.cancel(42)' }, { setup: 'const h = new Hotel([101])', act: 'h.cancel(42)' }),
      check(
        "a guest's bookings, in the order they booked",
        'h = Hotel([101, 102]); h.book("Ada", 102, 1, 2); h.book("Bo", 101, 1, 2); h.book("Ada", 101, 5, 6)\nreturn h.bookings_for("Ada")',
        'const h = new Hotel([101, 102]); h.book("Ada", 102, 1, 2); h.book("Bo", 101, 1, 2); h.book("Ada", 101, 5, 6)\nreturn h.bookingsFor("Ada")',
        [102, 101],
      ),
    ],
  }),
  medium({
    id: 'oop-vending',
    title: 'Vending Machine',
    classes: 'VendingMachine',
    concepts: { python: ['raise-errors', 'encapsulation'], javascript: ['raise-errors', 'encapsulation'] },
    statement: [
      'A machine with state: what\'s in each slot, and how much money has been put in. Every method either changes that state by the rules or refuses. The starter lists what the tests use.',
    ],
    hints: [
      'A small Slot class (price, count) per item keeps the two facts about an item together.',
      'In buy, do all three checks (unknown item, sold out, not enough money) before changing anything, so a refused buy leaves the money in for another try.',
      'Change is balance minus price; after a sale the balance goes back to 0.',
    ],
    starters: both('vending.starter'),
    answer: both('vending.answer'),
    tests: [
      check('a sale gives change', 'm = VendingMachine(); m.stock("chips", 150, 2); m.insert(200)\nreturn [m.buy("chips"), m.balance]', 'const m = new VendingMachine(); m.stock("chips", 150, 2); m.insert(200)\nreturn [m.buy("chips"), m.balance]', [50, 0]),
      check('exact money gives 0 change', 'm = VendingMachine(); m.stock("gum", 75, 1); m.insert(50); m.insert(25)\nreturn m.buy("gum")', 'const m = new VendingMachine(); m.stock("gum", 75, 1); m.insert(50); m.insert(25)\nreturn m.buy("gum")', 0),
      refused(
        'not enough money keeps the balance for another try',
        { setup: 'm = VendingMachine(); m.stock("chips", 150, 2); m.insert(100)', act: 'm.buy("chips")', then: 'return [err, m.balance]' },
        { setup: 'const m = new VendingMachine(); m.stock("chips", 150, 2); m.insert(100)', act: 'm.buy("chips")', then: 'return [err, m.balance]' },
        ['error', 100],
      ),
      refused(
        'a sold-out item is refused',
        { setup: 'm = VendingMachine(); m.stock("gum", 50, 1); m.insert(50); m.buy("gum"); m.insert(50)', act: 'm.buy("gum")' },
        { setup: 'const m = new VendingMachine(); m.stock("gum", 50, 1); m.insert(50); m.buy("gum"); m.insert(50)', act: 'm.buy("gum")' },
      ),
      refused('an unknown item is refused', { setup: 'm = VendingMachine(); m.insert(100)', act: 'm.buy("caviar")' }, { setup: 'const m = new VendingMachine(); m.insert(100)', act: 'm.buy("caviar")' }),
      refused('inserting needs more than 0', { setup: 'm = VendingMachine()', act: 'm.insert(0)' }, { setup: 'const m = new VendingMachine()', act: 'm.insert(0)' }),
      check('cancel gives the money back', 'm = VendingMachine(); m.insert(30); m.insert(20)\nreturn [m.cancel(), m.balance]', 'const m = new VendingMachine(); m.insert(30); m.insert(20)\nreturn [m.cancel(), m.balance]', [50, 0]),
      check(
        'restocking adds to the count and updates the price',
        'm = VendingMachine(); m.stock("gum", 50, 1); m.stock("gum", 60, 1); m.insert(120)\nreturn [m.buy("gum"), m.balance]',
        'const m = new VendingMachine(); m.stock("gum", 50, 1); m.stock("gum", 60, 1); m.insert(120)\nreturn [m.buy("gum"), m.balance]',
        [60, 0],
      ),
    ],
  }),
  medium({
    id: 'oop-cart',
    title: 'Shopping Cart',
    classes: 'Cart',
    concepts: { python: ['composition', 'single-responsibility'], javascript: ['composition', 'single-responsibility'] },
    statement: [
      'A cart with lines (item, price, quantity), a bulk discount and a coupon. The rules are small, but they interact, which is where a good split into objects pays off. The starter lists what the tests use.',
    ],
    hints: [
      'A Line object (name, price, qty) can work out its own cost, discount included. Then the cart\'s total is the sum of its lines\' costs, minus the coupon.',
      t('Round down to whole cents with //: full * 90 // 100.', 'Round down to whole cents with Math.floor: Math.floor(full * 90 / 100).'),
      t('A dict keeps the order keys were added, so lines() can just walk it.', 'A Map keeps the order keys were added, so lines() can just walk it.'),
    ],
    starters: both('cart.starter'),
    answer: both('cart.answer'),
    tests: [
      check('the total adds up the lines', 'c = Cart(); c.add("apple", 50, 2); c.add("bread", 300)\nreturn c.total()', 'const c = new Cart(); c.add("apple", 50, 2); c.add("bread", 300)\nreturn c.total()', 400),
      check('3 or more of an item gets 10% off that line', 'c = Cart(); c.add("apple", 55, 3); c.add("bread", 300)\nreturn c.total()', 'const c = new Cart(); c.add("apple", 55, 3); c.add("bread", 300)\nreturn c.total()', 448),
      check('adding the same item again adds to its line', 'c = Cart(); c.add("apple", 50); c.add("apple", 50, 2)\nreturn c.lines()', 'const c = new Cart(); c.add("apple", 50); c.add("apple", 50, 2)\nreturn c.lines()', [['apple', 3]]),
      check(
        'removing to 0 drops the line',
        'c = Cart(); c.add("apple", 50, 2); c.add("pear", 80); c.remove("apple", 2)\nreturn c.lines()',
        'const c = new Cart(); c.add("apple", 50, 2); c.add("pear", 80); c.remove("apple", 2)\nreturn c.lines()',
        [['pear', 1]],
      ),
      refused("can't remove more than is in the cart", { setup: 'c = Cart(); c.add("apple", 50)', act: 'c.remove("apple", 2)' }, { setup: 'const c = new Cart(); c.add("apple", 50)', act: 'c.remove("apple", 2)' }),
      check('a coupon comes off after the line discounts', 'c = Cart(); c.add("apple", 50, 3); c.add("bread", 300); c.apply_coupon(20)\nreturn c.total()', 'const c = new Cart(); c.add("apple", 50, 3); c.add("bread", 300); c.applyCoupon(20)\nreturn c.total()', 348),
      refused('only one coupon per cart', { setup: 'c = Cart(); c.apply_coupon(10)', act: 'c.apply_coupon(50)' }, { setup: 'const c = new Cart(); c.applyCoupon(10)', act: 'c.applyCoupon(50)' }),
      refused('quantities must be more than 0', { setup: 'c = Cart()', act: 'c.add("apple", 50, 0)' }, { setup: 'const c = new Cart()', act: 'c.add("apple", 50, 0)' }),
      check('an empty cart costs 0', 'return Cart().total()', 'return new Cart().total()', 0),
    ],
  }),
  medium({
    id: 'oop-scheduler',
    title: 'Task Scheduler',
    classes: 'TaskScheduler',
    concepts: { python: ['composition', 'raise-errors'], javascript: ['composition', 'raise-errors'] },
    statement: [
      'Tasks wait with a priority, and the scheduler always hands out the most important one next, oldest first among equals. The starter lists what the tests use.',
    ],
    hints: [
      'A Task object can carry its name, its priority and the order it was added in, which settles ties.',
      t('max(self.tasks, key=lambda t: (t.priority, -t.order)) picks the highest priority, then the earliest added.', 'Walk the tasks keeping the best so far: higher priority wins, and on a tie the smaller order wins.'),
      'Scanning the list is O(n) per task. With many tasks a heap makes it O(log n), and the class\'s methods would stay exactly the same: that is the point of hiding how it stores them.',
    ],
    starters: both('scheduler.starter'),
    answer: both('scheduler.answer'),
    tests: [
      check(
        'highest priority first',
        's = TaskScheduler(); s.add("email", 1); s.add("deploy", 5); s.add("lunch", 3)\nreturn [s.next_task(), s.next_task(), s.next_task()]',
        'const s = new TaskScheduler(); s.add("email", 1); s.add("deploy", 5); s.add("lunch", 3)\nreturn [s.nextTask(), s.nextTask(), s.nextTask()]',
        ['deploy', 'lunch', 'email'],
      ),
      check(
        'equal priorities go in the order they were added',
        's = TaskScheduler(); s.add("a", 2); s.add("b", 2); s.add("c", 2)\nreturn [s.next_task(), s.next_task()]',
        'const s = new TaskScheduler(); s.add("a", 2); s.add("b", 2); s.add("c", 2)\nreturn [s.nextTask(), s.nextTask()]',
        ['a', 'b'],
      ),
      check('peek looks without taking', 's = TaskScheduler(); s.add("a", 1); s.add("b", 9)\nreturn [s.peek(), s.size()]', 'const s = new TaskScheduler(); s.add("a", 1); s.add("b", 9)\nreturn [s.peek(), s.size()]', ['b', 2]),
      check('an empty scheduler gives nothing', 's = TaskScheduler()\nreturn [s.next_task(), s.peek(), s.size()]', 'const s = new TaskScheduler()\nreturn [s.nextTask(), s.peek(), s.size()]', [null, null, 0]),
      refused("a waiting task can't be added twice", { setup: 's = TaskScheduler(); s.add("a", 1)', act: 's.add("a", 5)' }, { setup: 'const s = new TaskScheduler(); s.add("a", 1)', act: 's.add("a", 5)' }),
      check(
        'a finished task can be added again',
        's = TaskScheduler(); s.add("a", 1); s.next_task(); s.add("a", 2)\nreturn s.size()',
        'const s = new TaskScheduler(); s.add("a", 1); s.nextTask(); s.add("a", 2)\nreturn s.size()',
        1,
      ),
    ],
  }),

  // ---------- Capstone: the port, one step at a time ----------
  port({
    id: 'oop-port-1-nouns',
    title: 'Port 1: Nouns and Verbs',
    classes: 'Container,Yard,Ship,Crane,Port',
    concepts: { python: ['nouns-and-verbs', 'classes'], javascript: ['nouns-and-verbs', 'classes'] },
    statement: [
      'The interview question: "You manage a port for container ships. A ship has a manifest specifying the containers to load or unload at your port. A cargo ship comes into port and only unloads containers into the container yard by crane. A cargo ship comes into port and only loads containers from the container yard by crane. All data is kept in memory."',
      'Don\'t write logic yet. First, read the story and underline the nouns: port, ship, manifest, container, yard, crane. Nouns that hold data or do things become classes. Then the verbs: comes into port, loads, unloads. Verbs become methods, on the class that owns the data they change.',
      'This step: write the five classes with empty methods, so the shape is agreed before the details. The starter\'s comments list them.',
    ],
    hints: [
      'Say the design out loud before typing, the way you would in the interview: "A Port has a Yard and a Crane, and ships dock at it. A Ship has a manifest. The Crane moves Containers between a Ship and the Yard."',
      t('An empty method is def take(self, code): pass.', 'An empty method is take(code) {}.'),
      'Manifest is a noun but not a class: it\'s only a list of container codes, with no behavior of its own. A plain list is enough.',
    ],
    starters: { python: file('port/nouns.starter.py'), javascript: file('port/nouns.starter.js') },
    answer: { python: file('port/nouns.answer.py'), javascript: file('port/nouns.answer.js') },
    design: [
      'Port is the coordinator: it\'s what the rest of the program talks to (ships arrive, get processed, depart), and it owns the yard, the crane and the docked ships.',
      'Crane could have been a method on Port. Giving it its own class keeps Port short, gives the move rules one home, and makes "the port gets a second crane" an easy change later. In an interview, say a trade-off like this out loud; there\'s rarely one right answer.',
      'Ship knows its own manifest and cargo, so questions like "what\'s left to move?" are its methods. The yard looks containers up by code, so it\'s a dict (Map) from code to Container. "All data in memory" just means plain objects, lists and dicts: no database.',
    ],
    tests: [
      check(
        'there is a class for each noun',
        'return [isinstance(c, type) for c in [Container, Yard, Ship, Crane, Port]]',
        'return [Container, Yard, Ship, Crane, Port].map((c) => typeof c === "function")',
        [true, true, true, true, true],
      ),
      check(
        'the yard can add and take',
        'return [callable(getattr(Yard, m, None)) for m in ["add", "take"]]',
        'return ["add", "take"].map((m) => typeof Yard.prototype[m] === "function")',
        [true, true],
      ),
      check(
        'a ship can take off, put on, and say what remains',
        'return [callable(getattr(Ship, m, None)) for m in ["take_off", "put_on", "remaining"]]',
        'return ["takeOff", "putOn", "remaining"].map((m) => typeof Ship.prototype[m] === "function")',
        [true, true, true],
      ),
      check(
        'the crane can unload and load',
        'return [callable(getattr(Crane, m, None)) for m in ["unload", "load"]]',
        'return ["unload", "load"].map((m) => typeof Crane.prototype[m] === "function")',
        [true, true],
      ),
      check(
        'the port can take arrivals, process and departures',
        'return [callable(getattr(Port, m, None)) for m in ["arrive", "process", "depart"]]',
        'return ["arrive", "process", "depart"].map((m) => typeof Port.prototype[m] === "function")',
        [true, true, true],
      ),
    ],
  }),
  port({
    id: 'oop-port-2-yard',
    title: 'Port 2: Container and Yard',
    classes: 'Container,Yard',
    concepts: { python: ['composition', 'raise-errors'], javascript: ['composition', 'raise-errors'] },
    statement: [
      'Start with the smallest pieces, the ones that depend on nothing else. Container is just data: a code like "C1" and a weight. Yard is where containers wait on land.',
      t(
        'add(container) stores it (a ValueError if that code is already there). take(code) removes and returns the container (a KeyError if it isn\'t there). has(code) says whether it\'s there, and codes() lists every code, A to Z.',
        'add(container) stores it (an Error if that code is already there). take(code) removes and returns the container (an Error if it isn\'t there). has(code) says whether it\'s there, and codes() lists every code, A to Z.',
      ),
    ],
    hints: [
      t('The yard keeps self.containers as code -> Container, so take and has are one dict lookup each.', 'The yard keeps this.containers as a Map of code -> Container, so take and has are one lookup each.'),
      t('self.containers.pop(code) removes the entry and gives you the container in one go.', 'Get the container, delete the entry, then return what you got.'),
    ],
    starters: portStep([], 'yard', 'yard'),
    answer: portAnswer(['container', 'yard'], 'yard'),
    design: [
      'Build from the bottom up: pieces that depend on nothing (Container, Yard) first, then the ones that use them. Each step can be tested before the next one leans on it.',
      'Why a dict by code, not a list? The crane asks for containers by code, and a dict answers that in one step however full the yard gets, where a list would be searched one container at a time.',
    ],
    tests: [
      check('a container keeps its code and weight', 'c = Container("C1", 10)\nreturn [c.code, c.weight]', 'const c = new Container("C1", 10)\nreturn [c.code, c.weight]', ['C1', 10]),
      check(
        'added containers are in the yard, listed A to Z',
        'y = Yard(); y.add(Container("C2", 5)); y.add(Container("C1", 7))\nreturn [y.codes(), y.has("C1"), y.has("C9")]',
        'const y = new Yard(); y.add(new Container("C2", 5)); y.add(new Container("C1", 7))\nreturn [y.codes(), y.has("C1"), y.has("C9")]',
        [['C1', 'C2'], true, false],
      ),
      check(
        'take gives back the very same container and removes it',
        'c = Container("C1", 10); y = Yard(); y.add(c)\ngot = y.take("C1")\nreturn [got is c, y.has("C1")]',
        'const c = new Container("C1", 10); const y = new Yard(); y.add(c)\nconst got = y.take("C1")\nreturn [got === c, y.has("C1")]',
        [true, false],
      ),
      refused("taking a container that isn't there is refused", { setup: 'y = Yard()', act: 'y.take("C1")' }, { setup: 'const y = new Yard()', act: 'y.take("C1")' }),
      refused(
        "the same code can't be in the yard twice",
        { setup: 'y = Yard(); y.add(Container("C1", 10))', act: 'y.add(Container("C1", 3))', then: 'return [err, y.codes()]' },
        { setup: 'const y = new Yard(); y.add(new Container("C1", 10))', act: 'y.add(new Container("C1", 3))', then: 'return [err, y.codes()]' },
        ['error', ['C1']],
      ),
      check(
        'two yards are separate',
        'a = Yard(); b = Yard(); a.add(Container("C1", 1))\nreturn b.codes()',
        'const a = new Yard(); const b = new Yard(); a.add(new Container("C1", 1))\nreturn b.codes()',
        [],
      ),
    ],
  }),
  port({
    id: 'oop-port-3-ship',
    title: 'Port 3: Ship',
    classes: 'Container,Ship',
    concepts: { python: ['instance-vs-class', 'raise-errors'], javascript: ['instance-vs-class', 'raise-errors'] },
    statement: [
      'A ship comes in either to unload or to load, never both, so it keeps a mode: "unload" or "load". Its manifest is a list of container codes. An unloading ship arrives with cargo: the Container objects to take off.',
      t(
        'remaining() lists the manifest codes still waiting, in manifest order: for an unloading ship the ones still on board, for a loading ship the ones not on board yet. done() is True when nothing is waiting. take_off(code) (unloading ships only) removes and returns a container; put_on(container) (loading ships only) puts one on board. Refuse anything else with a ValueError, including a mode that isn\'t "unload" or "load".',
        'remaining() lists the manifest codes still waiting, in manifest order: for an unloading ship the ones still on board, for a loading ship the ones not on board yet. done() is true when nothing is waiting. takeOff(code) (unloading ships only) removes and returns a container; putOn(container) (loading ships only) puts one on board. Refuse anything else with an Error, including a mode that isn\'t "unload" or "load".',
      ),
      'Container is given (from step 2). Watch out for the interview starter\'s trap: each ship needs a manifest of its own.',
    ],
    hints: [
      t('self.manifest = list(manifest) makes the ship\'s own copy, so the caller changing their list later can\'t change the ship.', 'this.manifest = [...manifest] makes the ship\'s own copy, so the caller changing their array later can\'t change the ship.'),
      t('Keep cargo as a dict code -> Container, filled from the cargo list in __init__. Use cargo=None and "cargo or []", never cargo=[] (the shared default trap).', 'Keep cargo as a Map of code -> Container, filled from the cargo array in the constructor. (A default of cargo = [] is fine in JavaScript: it\'s made fresh on each call.)'),
      'remaining() does the real thinking, and take_off and put_on can both check "is this code in remaining()?" before they change anything.',
    ],
    starters: portStep(['container'], 'ship', 'ship'),
    answer: portAnswer(['container', 'ship'], 'ship'),
    design: [
      'One Ship class with a mode, rather than an UnloadingShip and a LoadingShip, keeps things simple: the only difference is which way containers move, and remaining() handles both in two lines. Two subclasses would also be a fine answer; say why you picked yours.',
      'The ship copies the manifest it\'s given. That\'s called a defensive copy: if the caller later changes their list, the ship\'s manifest doesn\'t silently change too. It\'s the same sharing problem as the interview starter, coming from outside the class.',
    ],
    tests: [
      check(
        'the ship keeps its own copy of the manifest',
        'codes = ["C1"]; s = Ship("Atlas", "load", codes); codes.append("C2")\nreturn [s.name, s.mode, s.manifest]',
        'const codes = ["C1"]; const s = new Ship("Atlas", "load", codes); codes.push("C2")\nreturn [s.name, s.mode, s.manifest]',
        ['Atlas', 'load', ['C1']],
      ),
      check(
        "an unloading ship's remaining work is what's still on board",
        's = Ship("Atlas", "unload", ["C2", "C1"], [Container("C1", 1), Container("C2", 2)])\nreturn [s.remaining(), s.done()]',
        'const s = new Ship("Atlas", "unload", ["C2", "C1"], [new Container("C1", 1), new Container("C2", 2)])\nreturn [s.remaining(), s.done()]',
        [['C2', 'C1'], false],
      ),
      check(
        'taking off returns the container, then the ship is done',
        'c = Container("C1", 1); s = Ship("Atlas", "unload", ["C1"], [c])\ngot = s.take_off("C1")\nreturn [got is c, s.remaining(), s.done()]',
        'const c = new Container("C1", 1); const s = new Ship("Atlas", "unload", ["C1"], [c])\nconst got = s.takeOff("C1")\nreturn [got === c, s.remaining(), s.done()]',
        [true, [], true],
      ),
      check(
        'a loading ship fills up from its manifest',
        's = Ship("Borealis", "load", ["C1", "C2"]); before = s.remaining()\ns.put_on(Container("C1", 1))\nreturn [before, s.remaining()]',
        'const s = new Ship("Borealis", "load", ["C1", "C2"]); const before = s.remaining()\ns.putOn(new Container("C1", 1))\nreturn [before, s.remaining()]',
        [['C1', 'C2'], ['C2']],
      ),
      refused(
        "a container that isn't on the manifest can't go on",
        { setup: 's = Ship("Borealis", "load", ["C1"])', act: 's.put_on(Container("C9", 1))', then: 'return [err, s.remaining()]' },
        { setup: 'const s = new Ship("Borealis", "load", ["C1"])', act: 's.putOn(new Container("C9", 1))', then: 'return [err, s.remaining()]' },
        ['error', ['C1']],
      ),
      refused(
        'a loading ship never unloads',
        { setup: 's = Ship("Borealis", "load", ["C1"]); s.put_on(Container("C1", 1))', act: 's.take_off("C1")' },
        { setup: 'const s = new Ship("Borealis", "load", ["C1"]); s.putOn(new Container("C1", 1))', act: 's.takeOff("C1")' },
      ),
      refused(
        "taking off a container that isn't waiting is refused",
        { setup: 's = Ship("Atlas", "unload", ["C1"], [Container("C1", 1)])', act: 's.take_off("C7")' },
        { setup: 'const s = new Ship("Atlas", "unload", ["C1"], [new Container("C1", 1)])', act: 's.takeOff("C7")' },
      ),
      refused('the mode must be unload or load', { setup: '', act: 'Ship("Odd", "repair", [])' }, { setup: '', act: 'new Ship("Odd", "repair", [])' }),
      check(
        'ships keep separate manifests',
        'a = Ship("A", "load", ["C1"]); b = Ship("B", "load", ["C2"])\nreturn [a.manifest, b.manifest]',
        'const a = new Ship("A", "load", ["C1"]); const b = new Ship("B", "load", ["C2"])\nreturn [a.manifest, b.manifest]',
        [['C1'], ['C2']],
      ),
    ],
  }),
  port({
    id: 'oop-port-4-crane',
    title: 'Port 4: Crane',
    classes: 'Container,Yard,Ship,Crane',
    concepts: { python: ['single-responsibility', 'raise-errors'], javascript: ['single-responsibility', 'raise-errors'] },
    statement: [
      'The crane moves one container at a time: unload(ship, yard, code) from a ship into the yard, load(ship, yard, code) from the yard onto a ship. It counts its moves.',
      'The rule that matters: a refused move changes nothing. If the crane takes a container off a ship and only then finds the yard won\'t accept it, the container is lost. So check everything that could go wrong first, then move.',
      'Container, Yard and Ship are given (steps 2 and 3).',
    ],
    hints: [
      'unload: if the yard already has that code, refuse before touching the ship. Then take it off the ship (the ship refuses if it isn\'t waiting) and add it to the yard.',
      t('load: check the ship wants it (mode is "load" and the code is in ship.remaining()) before taking it from the yard. yard.take raises on its own if the yard doesn\'t have it, and by then nothing has changed.', 'load: check the ship wants it (mode is "load" and the code is in ship.remaining()) before taking it from the yard. yard.take throws on its own if the yard doesn\'t have it, and by then nothing has changed.'),
      'Only count a move once it has fully happened: moves += 1 goes last.',
    ],
    starters: portStep(['container', 'yard', 'ship'], 'crane', 'crane'),
    answer: portAnswer(['container', 'yard', 'ship', 'crane'], 'crane'),
    design: [
      'The crane asks the ship and the yard to do their own parts (take_off, add, take, put_on) instead of reaching into their dicts. Each class guards its own data, so the rules live in one place each, and the crane only has to get the order right.',
      'Check, then change: the same habit as the bank account, now across three objects. In an interview, saying "a failed move must leave everything as it was" shows you\'re thinking about edge cases.',
    ],
    tests: [
      check(
        'unloading moves a container from the ship into the yard',
        'y = Yard(); k = Crane(); s = Ship("Atlas", "unload", ["C1"], [Container("C1", 10)])\nk.unload(s, y, "C1")\nreturn [y.codes(), s.done(), k.moves]',
        'const y = new Yard(); const k = new Crane(); const s = new Ship("Atlas", "unload", ["C1"], [new Container("C1", 10)])\nk.unload(s, y, "C1")\nreturn [y.codes(), s.done(), k.moves]',
        [['C1'], true, 1],
      ),
      check(
        'loading moves a container from the yard onto the ship',
        'y = Yard(); y.add(Container("C2", 4)); k = Crane(); s = Ship("Borealis", "load", ["C2"])\nk.load(s, y, "C2")\nreturn [y.codes(), s.done(), k.moves]',
        'const y = new Yard(); y.add(new Container("C2", 4)); const k = new Crane(); const s = new Ship("Borealis", "load", ["C2"])\nk.load(s, y, "C2")\nreturn [y.codes(), s.done(), k.moves]',
        [[], true, 1],
      ),
      refused(
        "loading a container the yard doesn't have changes nothing",
        { setup: 'y = Yard(); k = Crane(); s = Ship("Borealis", "load", ["C2"])', act: 'k.load(s, y, "C2")', then: 'return [err, s.remaining(), k.moves]' },
        { setup: 'const y = new Yard(); const k = new Crane(); const s = new Ship("Borealis", "load", ["C2"])', act: 'k.load(s, y, "C2")', then: 'return [err, s.remaining(), k.moves]' },
        ['error', ['C2'], 0],
      ),
      refused(
        "loading a container the ship doesn't want leaves it in the yard",
        { setup: 'y = Yard(); y.add(Container("C9", 1)); k = Crane(); s = Ship("Borealis", "load", ["C2"])', act: 'k.load(s, y, "C9")', then: 'return [err, y.codes()]' },
        { setup: 'const y = new Yard(); y.add(new Container("C9", 1)); const k = new Crane(); const s = new Ship("Borealis", "load", ["C2"])', act: 'k.load(s, y, "C9")', then: 'return [err, y.codes()]' },
        ['error', ['C9']],
      ),
      refused(
        'unloading into a yard that already has that code leaves it on the ship',
        { setup: 'y = Yard(); y.add(Container("C1", 1)); k = Crane(); s = Ship("Atlas", "unload", ["C1"], [Container("C1", 10)])', act: 'k.unload(s, y, "C1")', then: 'return [err, s.remaining()]' },
        {
          setup: 'const y = new Yard(); y.add(new Container("C1", 1)); const k = new Crane(); const s = new Ship("Atlas", "unload", ["C1"], [new Container("C1", 10)])',
          act: 'k.unload(s, y, "C1")',
          then: 'return [err, s.remaining()]',
        },
        ['error', ['C1']],
      ),
      refused(
        'the crane never loads onto an unloading ship',
        { setup: 'y = Yard(); y.add(Container("C1", 1)); k = Crane(); s = Ship("Atlas", "unload", ["C1"], [Container("C1", 10)])', act: 'k.load(s, y, "C1")', then: 'return [err, y.codes()]' },
        {
          setup: 'const y = new Yard(); y.add(new Container("C1", 1)); const k = new Crane(); const s = new Ship("Atlas", "unload", ["C1"], [new Container("C1", 10)])',
          act: 'k.load(s, y, "C1")',
          then: 'return [err, y.codes()]',
        },
        ['error', ['C1']],
      ),
      check(
        'the crane carries the very same container object',
        'c = Container("C1", 10); y = Yard(); k = Crane(); s = Ship("Atlas", "unload", ["C1"], [c])\nk.unload(s, y, "C1")\nreturn y.take("C1") is c',
        'const c = new Container("C1", 10); const y = new Yard(); const k = new Crane(); const s = new Ship("Atlas", "unload", ["C1"], [c])\nk.unload(s, y, "C1")\nreturn y.take("C1") === c',
        true,
      ),
    ],
  }),
  port({
    id: 'oop-port-5-port',
    title: 'Port 5: The Port',
    classes: 'Container,Yard,Ship,Crane,Port',
    concepts: { python: ['single-responsibility', 'composition'], javascript: ['single-responsibility', 'composition'] },
    statement: [
      'The last piece is the coordinator. A Port has a yard, a crane, the ships docked now (by name), and a log of what happened.',
      t(
        'arrive(ship) docks it and logs "Atlas arrived to unload". process(name) has the crane move everything still waiting on that ship, logging "unloaded C1 from Atlas" or "loaded C1 onto Atlas" for each, and returns how many moved; check first and refuse without moving anything if any of them can\'t be moved. depart(name) refuses while the ship still has work, otherwise undocks it and logs "Atlas departed". docked() lists the docked ships A to Z.',
        'arrive(ship) docks it and logs "Atlas arrived to unload". process(name) has the crane move everything still waiting on that ship, logging "unloaded C1 from Atlas" or "loaded C1 onto Atlas" for each, and returns how many moved; check first and throw without moving anything if any of them can\'t be moved. depart(name) refuses while the ship still has work, otherwise undocks it and logs "Atlas departed". docked() lists the docked ships A to Z.',
      ),
      'Everything else is given (steps 2 to 4). Notice how short Port can be when the other classes do their own jobs.',
    ],
    hints: [
      t('A small helper, def _ship(self, name), that finds a docked ship or raises, saves repeating that check in process and depart. The leading _ means "only for this class".', 'A small helper that finds a docked ship or throws saves repeating that check in process and depart. Writing it as #ship(name) makes it private: only the class\'s own methods can call it.'),
      'In process, take codes = ship.remaining() once, check every code against the yard, and only then loop and move.',
      'Unloading checks that the yard doesn\'t already hold those codes; loading checks that it does.',
    ],
    starters: portStep(['container', 'yard', 'ship', 'crane'], 'port', 'port'),
    answer: portAnswer(['container', 'yard', 'ship', 'crane', 'port'], 'port'),
    design: [
      'Port reads like the story: ships arrive, get processed, depart. It doesn\'t know how a yard stores containers or how a ship tracks its cargo; it only asks. That\'s what makes the design easy to explain and to change.',
      'Checking every container before moving any makes process all-or-nothing, so a ship is never left half done because the yard was missing one box. In an interview, also mention what you\'d add next: several cranes, a limit on docked ships, or the yard\'s capacity.',
    ],
    tests: PORT_CHECKS,
  }),
  make('oop-port', 'Hard')({
    id: 'oop-port-full',
    title: 'The Port, From Scratch',
    classes: 'Container,Ship,Port',
    concepts: { python: ['nouns-and-verbs', 'single-responsibility', 'instance-vs-class'], javascript: ['nouns-and-verbs', 'single-responsibility', 'instance-vs-class'] },
    statement: [
      'The interview question, as asked, from the blank starter. This time nothing is given: plan the classes, then build and test them. The comments say which names the tests use, the way an interviewer would agree them with you.',
      'Try it without looking back at steps 1 to 5. Talk through the nouns and verbs first, fix the shared manifest, check before you change, and keep each class to one job.',
    ],
    hints: [
      'Nouns → classes: Container, Yard, Ship, Crane, Port. Verbs → methods: arrive, process, depart on Port; take off and put on on Ship; add and take on Yard.',
      t('First fix the trap in the starter: the manifest goes in __init__ (self.manifest = list(manifest)), not in the class body.', 'First fix the trap in the starter: the manifest belongs to each ship (this.manifest = [...manifest]), not to the class.'),
      'Build bottom-up (Container, Yard, Ship, Crane, Port) and run the tests as you go: the early ones only need Ship.',
    ],
    starters: { python: file('port/full.starter.py'), javascript: file('port/full.starter.js') },
    answer: portAnswer(['container', 'yard', 'ship', 'crane', 'port'], 'port'),
    design: [
      'This is the same design as steps 1 to 5. In the interview, the order matters as much as the code: restate the problem, list the nouns and verbs, sketch the classes and what each one owns, point out the shared manifest bug, then write the code bottom-up and walk through an example (one ship unloading, one loading).',
      'Good questions to ask the interviewer: can a ship both load and unload? (The question says no.) What happens if the yard is missing a container? Can two ships share a name? Do we need more than one crane? Each answer becomes a check or a test.',
    ],
    tests: [
      check('a container keeps its code and weight', 'c = Container("C1", 10)\nreturn [c.code, c.weight]', 'const c = new Container("C1", 10)\nreturn [c.code, c.weight]', ['C1', 10]),
      ...PORT_CHECKS,
    ],
  }),
]
