import type { Problem } from './problems'

// JavaScript concept problems: how the language itself behaves, rather than an algorithm.
// They only exist in JavaScript. Their code runs as a whole, example lines included, so the
// visualizer shows closures and shared objects in action; the tests use `run` code instead.
// Ideas and later batches: /mnt/project-files/plans/javascript-concept-problems.md

// `concepts` are JavaScript glossary ids reserved for the JS glossary; their chips show once those cards exist.
const concept = (p: Omit<Problem, 'starters' | 'track'> & { starter: string }): Problem => {
  const { starter, ...rest } = p
  return { ...rest, track: 'js-concepts', starters: { python: '', javascript: starter } }
}

/** A typical React-style state object, fresh for each test. */
const STATE = `{ user: { name: "Ada", friends: ["Grace"], address: { city: "London", zip: "N1" } }, theme: "dark" }`

export const JS_CONCEPTS: Problem[] = [
  concept({
    id: 'js-counter',
    concepts: ['closures'],
    title: 'Make a Counter',
    difficulty: 'Warm-up',
    kind: 'build',
    statement: [
      'makeCounter() returns a function. Each call of that function adds one to a count and returns it: 1, then 2, then 3.',
      'Each counter keeps its own count. The count lives in makeCounter, which has already finished by the time you call the counter. The function it returned still remembers it: that is a closure.',
      'Step through the example at the bottom and watch what each counter remembers.',
    ],
    hints: [
      'The returned function can read and change count, because it was made inside makeCounter.',
      'count += 1 (or count++), then return count.',
      'Calling makeCounter() again runs it again, so the new counter gets a brand-new count of its own.',
    ],
    functionName: 'makeCounter',
    starter: `function makeCounter() {
  let count = 0
  return function increment() {
    // add one to count and return it
  }
}

const counter = makeCounter()
counter()
counter()
const other = makeCounter()
other()
console.log(counter(), other())
`,
    tests: [
      { name: 'the first call returns 1', args: [], run: 'return makeCounter()()', expected: 1 },
      { name: 'three calls return 3', args: [], run: 'const c = makeCounter(); c(); c(); return c()', expected: 3 },
      {
        name: 'two counters count separately',
        args: [],
        run: 'const a = makeCounter(); const b = makeCounter(); a(); a(); return [a(), b()]',
        expected: [3, 1],
      },
    ],
  }),
  concept({
    id: 'js-why-both-changed',
    concepts: ['references-vs-copies', 'spread-immutable'],
    title: 'Why Did Both Change?',
    difficulty: 'Warm-up',
    kind: 'predict',
    statement: [
      'Read the code and guess what the three console.log lines print, one per line. Then check your guess and step through to see why.',
      'Write arrays the way console.log does, like [1, 2].',
    ],
    hints: [
      'const b = a does not copy the array. It makes b point at the same array a points at.',
      '[...a] makes a new array with the same items. { ...user } makes a new object, but only one level deep: its tags is still the old array.',
    ],
    explain: [
      'A variable holds a reference to an object (an arrow pointing at it), not the object itself. b = a copies the arrow, so a and b are the same array, and b.push(4) shows up in a.',
      'Spread makes a new outer array or object, so c and copy are new. That is called a shallow copy: the things inside are not copied. copy.tags and user.tags are still one array, so pushing "code" changes both, while copy.name = "Grace" only replaces copy\'s own name.',
      'React depends on this: it compares objects by reference, so changing an object in place looks like "nothing changed". The visualizer marks names that share one object with a link.',
    ],
    functionName: '',
    starter: `const a = [1, 2, 3]
const b = a
b.push(4)

const c = [...a]
c.push(5)

const user = { name: "Ada", tags: ["math"] }
const copy = { ...user }
copy.name = "Grace"
copy.tags.push("code")

console.log(a)
console.log(c)
console.log(user.name, user.tags)
`,
    tests: [],
  }),
  concept({
    id: 'js-memoize',
    concepts: ['closures'],
    title: 'Memoize',
    difficulty: 'Easy',
    kind: 'build',
    statement: [
      'memoize(fn) returns a faster version of fn that remembers its answers. The first call with some n runs fn(n) and saves the result; later calls with the same n return the saved result without running fn again.',
      'The saved answers live in a Map that only the returned function can reach: another closure. React\'s useMemo and many interview questions use this idea.',
    ],
    hints: [
      'cache.has(n) tells you whether you have an answer for n already; cache.get(n) gives it back.',
      'Otherwise: const answer = fn(n), then cache.set(n, answer), then return answer.',
      'Check with cache.has(n), not if (cache.get(n)): an answer of 0 is falsy but still saved.',
    ],
    functionName: 'memoize',
    starter: `function memoize(fn) {
  const cache = new Map()
  return function remembered(n) {
    // if cache has n, return the saved answer
    // otherwise run fn(n), save the answer in cache, and return it
  }
}

let calls = 0
function slowSquare(n) {
  calls++
  return n * n
}

const fastSquare = memoize(slowSquare)
fastSquare(4)
fastSquare(4)
fastSquare(5)
console.log("slowSquare ran", calls, "times")
`,
    tests: [
      { name: 'returns what fn returns', args: [], run: 'const double = memoize((n) => n * 2); return double(21)', expected: 42 },
      {
        name: 'runs fn once per input',
        args: [],
        run: 'let calls = 0; const sq = memoize((n) => { calls++; return n * n }); return [sq(3), sq(3), sq(4), calls]',
        expected: [9, 9, 16, 2],
      },
      {
        name: 'remembers an answer of 0 too',
        args: [],
        run: 'let calls = 0; const zero = memoize(() => { calls++; return 0 }); zero(1); zero(1); return calls',
        expected: 1,
      },
      {
        name: 'each memoized function has its own cache',
        args: [],
        run: 'const a = memoize((n) => n + 1); const b = memoize((n) => n + 2); a(1); return b(1)',
        expected: 3,
      },
    ],
  }),
  concept({
    id: 'js-stale-closure',
    concepts: ['closures'],
    title: 'Stale Closures',
    difficulty: 'Easy',
    kind: 'predict',
    statement: [
      'Guess the three lines this prints, one per line. Then check your guess and step through to see why.',
      'The second half is a tiny imitation of a React component: each "render" gets its own count and makes a new click handler.',
    ],
    hints: [
      'A closure remembers the variable, not the value it had when the function was made. If the variable changes later, the closure sees the new value.',
      'Each call of render is a new run of the function, with a new count variable. A handler made in one render remembers that render\'s count.',
    ],
    explain: [
      'greet remembers the variable name itself, not a copy of "Ada". name became "Grace" before greet ran, so it prints Hi Grace.',
      'Each render(count) call has its own count. handlers[0] was made while count was 0, and nothing ever changes that count, so it prints count is 0 forever.',
      'This is a "stale closure", a classic React bug: a handler or effect made in an earlier render still sees that render\'s values. The fix is to read fresh values (for example the updater form setCount(c => c + 1)) instead of the remembered ones.',
    ],
    functionName: '',
    starter: `function makeGreeter() {
  let name = "Ada"
  const greet = () => console.log("Hi " + name)
  name = "Grace"
  return greet
}
const greet = makeGreeter()
greet()

const handlers = []
function render(count) {
  handlers.push(() => console.log("count is " + count))
}
render(0)
render(1)
render(2)
handlers[0]()
handlers[2]()
`,
    tests: [],
  }),
  concept({
    id: 'js-group-by',
    concepts: ['reduce'],
    title: 'Group By with reduce',
    difficulty: 'Easy',
    kind: 'build',
    statement: [
      'groupBy(items, keyOf) returns an object whose keys are keyOf(item) and whose values are lists of the items with that key, in their original order.',
      'Use reduce: it walks the list once, handing each item to your function along with the result built so far (the accumulator). Array methods like map, filter and reduce are how React code turns data into lists.',
    ],
    hints: [
      'groups starts as {} (the second argument to reduce) and whatever you return becomes groups for the next item.',
      'If groups[key] doesn\'t exist yet, set it to [] first. Then push the item.',
      'Shorter: (groups[key] ??= []).push(item). ??= sets the value only when it is missing (null or undefined).',
    ],
    functionName: 'groupBy',
    starter: `function groupBy(items, keyOf) {
  return items.reduce((groups, item) => {
    const key = keyOf(item)
    // add item to groups[key], making the list first if needed
    return groups
  }, {})
}

const people = [
  { name: "Ada", city: "London" },
  { name: "Grace", city: "New York" },
  { name: "Alan", city: "London" },
]
console.log(groupBy(people, (p) => p.city))
`,
    tests: [
      {
        name: 'odd and even numbers',
        args: [],
        run: 'return groupBy([1, 2, 3, 4, 5], (n) => (n % 2 ? "odd" : "even"))',
        expected: { odd: [1, 3, 5], even: [2, 4] },
      },
      {
        name: 'words by length, in order',
        args: [],
        run: 'return groupBy(["hi", "yo", "hey", "a"], (w) => w.length)',
        expected: { 1: ['a'], 2: ['hi', 'yo'], 3: ['hey'] },
      },
      { name: 'an empty list gives {}', args: [], run: 'return groupBy([], (x) => x)', expected: {} },
    ],
  }),
  concept({
    id: 'js-update-state',
    concepts: ['spread-immutable', 'references-vs-copies'],
    title: 'Update State Without Mutating',
    difficulty: 'Medium',
    kind: 'build',
    statement: [
      'moveUser(state, city) returns a new state where user.address.city is city. state itself must stay exactly as it was: don\'t change it in place (mutate it).',
      'Make a new object for every level on the way down (state, user, address) and reuse everything else, like user.friends. React only re-renders when it gets a new object, and it trusts that old objects never change. This is how every nested setState should look.',
    ],
    hints: [
      '{ ...state, theme: "light" } is a new object with state\'s properties and one replaced.',
      'Nest it: { ...state, user: { ...state.user, address: { ...state.user.address, city } } }.',
      'Step to the end: the link marks show that next.user.friends is still the same array as state.user.friends. Sharing what didn\'t change is fine, and it is cheap.',
    ],
    functionName: 'moveUser',
    starter: `function moveUser(state, city) {
  // return a new state where state.user.address.city is city
  // leave state exactly as it was
}

const state = {
  user: { name: "Ada", friends: ["Grace"], address: { city: "London", zip: "N1" } },
  theme: "dark",
}
const next = moveUser(state, "Paris")
console.log(state.user.address.city, next?.user?.address?.city)
`,
    tests: [
      {
        name: 'the new state has the new city',
        args: [],
        run: `return moveUser(${STATE}, "Paris")`,
        expected: { user: { name: 'Ada', friends: ['Grace'], address: { city: 'Paris', zip: 'N1' } }, theme: 'dark' },
      },
      {
        name: 'the old state is unchanged',
        args: [],
        run: `const s = ${STATE}; moveUser(s, "Paris"); return s.user.address.city`,
        expected: 'London',
      },
      {
        name: 'new objects on the way down',
        args: [],
        run: `const s = ${STATE}; const n = moveUser(s, "Paris"); return [n !== s, n.user !== s.user, n.user.address !== s.user.address]`,
        expected: [true, true, true],
      },
      {
        name: 'untouched parts are reused',
        args: [],
        run: `const s = ${STATE}; return moveUser(s, "Paris").user.friends === s.user.friends`,
        expected: true,
      },
    ],
  }),
]
