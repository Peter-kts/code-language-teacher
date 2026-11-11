import type { ConceptGroup, Problem } from './problems'

// Python concept problems: how Python itself behaves, and the built-ins interviews ask you to
// write yourself. The twin of the JavaScript track in concepts.ts, and they only exist in Python.
// Like that track, their code runs as a whole, example lines included, so the visualizer shows
// closures and shared objects in action; the tests use `run` code instead (a function body
// that can use everything the learner's code defines).

// `concepts` are ids in the Python glossary (src/syntax/cards.ts).
const concept = (
  p: Omit<Problem, 'starters' | 'track' | 'concepts' | 'group'> & { starter: string; concepts: string[]; group: ConceptGroup },
): Problem => {
  const { starter, concepts, ...rest } = p
  return { ...rest, track: 'py-concepts', concepts: { python: concepts, javascript: [] }, starters: { python: starter, javascript: '' } }
}

/** A test's `run` code, one argument per line, so it can hold a def or a with block. */
const py = (...lines: string[]) => lines.join('\n')

export const PY_CONCEPTS: Problem[] = [
  // ---------- Gotchas: predict the output ----------
  concept({
    id: 'py-mutable-default',
    group: 'predict',
    concepts: ['mutable-default', 'default-params', 'is-vs-equals'],
    title: 'The Mutable Default Trap',
    difficulty: 'Warm-up',
    kind: 'predict',
    statement: [
      'Guess the four lines this prints, one per line. Then check your guess and step through to see why.',
      'This is the most famous Python interview gotcha. Write lists the way print does, like [\'a\', \'b\'].',
    ],
    hints: [
      'A default value is made once, when the def line runs, not each time the function is called.',
      'So every call of add_item that leaves out items gets the very same list.',
    ],
    explain: [
      'items=[] is worked out once, when Python runs the def line, and that one list is kept with the function. Each call that leaves out items appends to that same list, so first and second are two names for one list, holding both fruits.',
      'first is second is True: is asks "the very same object?", not "the same contents?". The visualizer links names that share one object.',
      'The fix is items=None and making a new list inside the function, as add_safe does. Each call then gets its own list. Interviewers ask this to check you know that default values are shared.',
    ],
    functionName: '',
    starter: `def add_item(item, items=[]):
    items.append(item)
    return items

first = add_item("apple")
second = add_item("pear")
print(first)
print(second)
print(first is second)

def add_safe(item, items=None):
    if items is None:
        items = []
    items.append(item)
    return items

print(add_safe("apple"), add_safe("pear"))
`,
    tests: [],
  }),
  concept({
    id: 'py-why-both-changed',
    group: 'predict',
    concepts: ['aliasing', 'copy-deepcopy', 'is-vs-equals'],
    title: 'Why Did Both Change?',
    difficulty: 'Warm-up',
    kind: 'predict',
    statement: [
      'Guess the four lines this prints, one per line. Then check your guess and step through to see why.',
      'Write lists and booleans the way print does, like [1, 2] and True.',
    ],
    hints: [
      'b = a does not copy the list. It makes b a second name for the same list.',
      'a[:] and user.copy() make a new outer list or dict, but only one level deep: copy["tags"] is still the old list.',
    ],
    explain: [
      'A variable holds a reference to an object (think of an arrow pointing at it), not the object itself. b = a copies the arrow, so a and b are one list, and b.append(4) shows up in a.',
      'a[:] makes a new list with the same items, so c is separate. user.copy() makes a new dict, but its values are not copied: copy["tags"] and user["tags"] are still one list, so appending "code" changes both, while copy["name"] = "Grace" only replaces copy\'s own name. That is a shallow copy; copy.deepcopy copies all the way down.',
      'The last line: a is b is True (one list), a == b is True (same items), and a is c is False (c is a different list, even though it started with the same items).',
    ],
    functionName: '',
    starter: `a = [1, 2, 3]
b = a
b.append(4)

c = a[:]
c.append(5)

user = {"name": "Ada", "tags": ["math"]}
copy = user.copy()
copy["name"] = "Grace"
copy["tags"].append("code")

print(a)
print(c)
print(user["name"], user["tags"])
print(a is b, a == b, a is c)
`,
    tests: [],
  }),
  concept({
    id: 'py-grid-trap',
    group: 'predict',
    concepts: ['aliasing', 'list-comprehension', 'copy-deepcopy'],
    title: 'The [[0] * 3] * 3 Grid Trap',
    difficulty: 'Easy',
    kind: 'predict',
    statement: [
      'Guess the three lines this prints, one per line. Then check your guess and step through to see why.',
      'This one bites people in grid and dynamic programming problems, where you need a table of zeros.',
    ],
    hints: [
      '[row] * 3 makes a list holding row three times. Not three copies of row: the same list three times.',
      'Numbers can\'t be changed in place, so nums[0] = 1 puts a new number in one box and the others keep theirs.',
    ],
    explain: [
      '* on a list repeats the references, not the objects. grid holds the same row list three times, so changing grid[0][0] changes "every" row: there is only one row. The visualizer marks grid\'s rows as the same list as row.',
      'The list comprehension runs [0] * 3 once per pass, so good gets three separate rows. This is the safe way to make a table: [[0] * cols for _ in range(rows)].',
      '[0] * 3 is fine: it repeats the number 0, and nums[0] = 1 replaces what box 0 points at instead of changing the 0 itself.',
    ],
    functionName: '',
    starter: `row = [0] * 3
grid = [row] * 3
grid[0][0] = 1
print(grid)

good = [[0] * 3 for _ in range(3)]
good[0][0] = 1
print(good)

nums = [0] * 3
nums[0] = 1
print(nums)
`,
    tests: [],
  }),
  concept({
    id: 'py-slicing',
    group: 'predict',
    concepts: ['slicing', 'strings'],
    title: 'Slicing',
    difficulty: 'Easy',
    kind: 'predict',
    statement: [
      'Guess the three lines this prints, one per line. Then check your guess and step through to see why.',
      'A slice is seq[start:stop:step]. Write strings without quotes, the way print shows them.',
    ],
    hints: [
      'start is included and stop is not. A missing start means "from the beginning"; a missing stop means "to the end". Negative numbers count from the end: -1 is the last item.',
      'A step of -1 walks backwards, so [::-1] reverses. A slice never raises an IndexError: stops past the end are cut to fit, and an empty range gives an empty list.',
    ],
    explain: [
      's[1:4] is the letters at 1, 2 and 3: "yth". s[-2:] is the last two. s[::-1] walks backwards over all of it: the classic way to reverse a string in Python.',
      'nums[::2] takes every second item. nums[4:100] doesn\'t fail even though there is no index 100: slices clip to the list. nums[5:2] is empty, because with the usual step of 1 you can\'t get from 5 to 2.',
      'nums[-3:-1] is the third-last and second-last (the stop, -1, is left out). + joins two lists into a new one.',
    ],
    functionName: '',
    starter: `s = "python"
nums = [0, 1, 2, 3, 4, 5]
print(s[1:4], s[-2:], s[::-1])
print(nums[::2], nums[4:100], nums[5:2])
print(nums[-3:-1], nums[:2] + nums[-2:])
`,
    tests: [],
  }),
  // ---------- Closures, decorators, *args ----------
  concept({
    id: 'py-counter',
    group: 'functions',
    concepts: ['closures', 'scope'],
    title: 'Make a Counter (closures)',
    difficulty: 'Warm-up',
    kind: 'build',
    statement: [
      'make_counter() returns a function. Each call of that function adds one to a count and returns it: 1, then 2, then 3.',
      'The count lives in make_counter, which has already finished by the time you call the counter. The function it returned still remembers it: that is a closure. Each counter keeps its own count.',
      'Step through the example at the bottom and watch what each counter remembers.',
    ],
    hints: [
      'Try count += 1 first and read the error: Python sees an assignment to count and decides count is a new local variable of increment, which has no value yet.',
      'Write nonlocal count as the first line of increment. It tells Python "count is the one from the function around me".',
      'Calling make_counter() again runs it again, so the new counter gets a brand-new count of its own.',
    ],
    functionName: 'make_counter',
    starter: `def make_counter():
    count = 0
    def increment():
        # add one to count and return it
        pass
    return increment

counter = make_counter()
counter()
counter()
other = make_counter()
other()
print(counter(), other())
`,
    tests: [
      { name: 'the first call returns 1', args: [], run: 'return make_counter()()', expected: 1 },
      { name: 'three calls return 3', args: [], run: py('c = make_counter()', 'c()', 'c()', 'return c()'), expected: 3 },
      {
        name: 'two counters count separately',
        args: [],
        run: py('a = make_counter()', 'b = make_counter()', 'a()', 'a()', 'return [a(), b()]'),
        expected: [3, 1],
      },
    ],
  }),
  concept({
    id: 'py-late-binding',
    group: 'functions',
    kind: 'predict',
    concepts: ['closures', 'lambda', 'default-params'],
    title: 'Lambdas in a Loop',
    difficulty: 'Easy',
    statement: [
      'Guess the three lines this prints, one per line. Then check your guess and step through to see why.',
      'This is the "late binding" question: when does a lambda look up the variables it uses?',
    ],
    hints: [
      'A closure remembers the variable, not the value it had when the function was made. It looks the value up when it is called.',
      'All three lambdas in make_funcs share one i. What is i once the loop has finished?',
      'A default value (i=i) is worked out when the lambda is made, so each lambda keeps its own copy.',
    ],
    explain: [
      'The three lambdas all remember the same variable i from make_funcs. They only read it when called, after the loop has finished and i is 2, so all three return 2. The visualizer shows each one remembering i: 2.',
      'lambda i=i: i gives each lambda a parameter whose default is the value of i right then: 0, 1 and 2.',
      'make_adder works because each call of make_adder is a new run with its own n, so each adder remembers a different n. That is the usual fix in real code: make the function in a function.',
    ],
    functionName: '',
    starter: `def make_funcs():
    funcs = []
    for i in range(3):
        funcs.append(lambda: i)
    return funcs

print([f() for f in make_funcs()])

fixed = []
for i in range(3):
    fixed.append(lambda i=i: i)
print([f() for f in fixed])

def make_adder(n):
    return lambda x: x + n

adders = [make_adder(n) for n in range(3)]
print([add(10) for add in adders])
`,
    tests: [],
  }),
  concept({
    id: 'py-scope',
    group: 'functions',
    kind: 'predict',
    concepts: ['scope', 'closures'],
    title: 'Scope: local, nonlocal, global',
    difficulty: 'Easy',
    statement: [
      'Guess the three lines this prints, one per line. Then check your guess and step through to see why.',
      'Python looks a name up in this order: Local (the function), Enclosing (functions around it), Global (the file), Built-in. People call it LEGB.',
    ],
    hints: [
      'Reading a name finds the nearest one. Assigning to a name inside a function makes a new local one, unless the function says global or nonlocal.',
      'shadow makes its own x and leaves the global one alone. change says global x, so its assignment changes the global one.',
    ],
    explain: [
      'read has no x of its own, so it finds the global one. shadow assigns x, which makes a new local x that disappears when shadow returns; the global x is still "global".',
      'change says global x, so x = "changed" replaces the global x itself.',
      'bump says nonlocal count, so count += 1 changes counter\'s count (two bumps make 2). Without nonlocal, count += 1 would raise UnboundLocalError: the assignment makes count local to bump, and a local has no value before its first assignment.',
    ],
    functionName: '',
    starter: `x = "global"

def read():
    return x

def shadow():
    x = "local"
    return x

def change():
    global x
    x = "changed"

def counter():
    count = 0
    def bump():
        nonlocal count
        count += 1
    bump()
    bump()
    return count

print(read(), shadow(), x)
change()
print(x)
print(counter())
`,
    tests: [],
  }),
  concept({
    id: 'py-args-kwargs',
    group: 'functions',
    kind: 'predict',
    concepts: ['args-kwargs', 'default-params', 'tuples', 'dicts'],
    title: '*args and **kwargs',
    difficulty: 'Easy',
    statement: [
      'Guess the four lines this prints, one per line. Then check your guess and step through to see why.',
      'print shows a tuple like (6, 7), an empty tuple as () and a dict like {\'d\': 4}.',
    ],
    hints: [
      'Arguments fill a, then b, by position. Any extra positional ones go into the tuple args. c comes after *args, so it can only be passed by name.',
      'Named arguments that match no parameter go into the dict kwargs. In a call, *nums spreads a list into positional arguments and **opts spreads a dict into named ones.',
    ],
    explain: [
      'show(1): a is 1 and everything else keeps its default. show(1, 5, 6, 7): b takes 5 and the extras 6 and 7 are collected into args.',
      'show(1, c=9, d=4): c is a parameter, so it takes 9; d isn\'t, so it lands in kwargs.',
      'show(*nums, **opts) is the same as show(10, 20, c=30, e=50). This pair of tricks is how decorators pass "whatever arguments I got" on to the function they wrap: def wrapper(*args, **kwargs): return fn(*args, **kwargs).',
    ],
    functionName: '',
    starter: `def show(a, b=2, *args, c=3, **kwargs):
    print(a, b, args, c, kwargs)

show(1)
show(1, 5, 6, 7)
show(1, c=9, d=4)
nums = [10, 20]
opts = {"c": 30, "e": 50}
show(*nums, **opts)
`,
    tests: [],
  }),
  concept({
    id: 'py-memoize',
    group: 'functions',
    concepts: ['decorators', 'closures', 'memoization', 'args-kwargs'],
    title: 'Memoize Decorator',
    difficulty: 'Easy',
    kind: 'build',
    statement: [
      'memoize(fn) returns a faster version of fn that remembers its answers. The first call with some arguments runs fn and saves the result in cache; later calls with the same arguments return the saved result without running fn again.',
      'Writing @memoize above a def is short for slow_square = memoize(slow_square): the name now points at wrapper, which remembers fn and cache. That is a decorator. Python\'s own version is functools.cache (or lru_cache).',
      'It should work for any number of arguments, so key the cache by args, the tuple of them all.',
    ],
    hints: [
      'if args in cache: return cache[args]. A tuple can be a dict key; a list can\'t.',
      'Otherwise: answer = fn(*args), then cache[args] = answer, then return answer. fn(*args) spreads the tuple back out into separate arguments.',
      'Check with in, not if cache.get(args): an answer of 0 is falsy but still saved.',
    ],
    functionName: 'memoize',
    starter: `def memoize(fn):
    cache = {}
    def wrapper(*args):
        # if args is in cache, return the saved answer
        # otherwise call fn(*args), save the answer in cache, and return it
        pass
    return wrapper

calls = 0

@memoize
def slow_square(n):
    global calls
    calls += 1
    return n * n

slow_square(4)
slow_square(4)
slow_square(5)
print("slow_square ran", calls, "times")
`,
    tests: [
      { name: 'returns what fn returns', args: [], run: py('double = memoize(lambda n: n * 2)', 'return double(21)'), expected: 42 },
      {
        name: 'runs fn once per input',
        args: [],
        run: py(
          'calls = []',
          'def square(n):',
          '    calls.append(n)',
          '    return n * n',
          'sq = memoize(square)',
          'return [sq(3), sq(3), sq(4), len(calls)]',
        ),
        expected: [9, 9, 16, 2],
      },
      {
        name: 'works with two arguments',
        args: [],
        run: py('add = memoize(lambda a, b: a + b)', 'return [add(1, 2), add(2, 1), add(1, 2)]'),
        expected: [3, 3, 3],
      },
      {
        name: 'remembers an answer of 0 too',
        args: [],
        run: py('calls = []', 'def zero(n):', '    calls.append(n)', '    return 0', 'z = memoize(zero)', 'z(1)', 'z(1)', 'return len(calls)'),
        expected: 1,
      },
      {
        name: 'makes a recursive @memoize fib fast',
        args: [],
        run: py(
          'calls = []',
          '@memoize',
          'def fib(n):',
          '    calls.append(n)',
          '    return n if n < 2 else fib(n - 1) + fib(n - 2)',
          'return [fib(30), len(calls)]',
        ),
        expected: [832040, 31],
      },
    ],
  }),
  concept({
    id: 'py-count-calls',
    group: 'functions',
    concepts: ['decorators', 'args-kwargs'],
    title: 'Count Calls (functools.wraps)',
    difficulty: 'Easy',
    kind: 'build',
    statement: [
      'Write a decorator count_calls. The decorated function works exactly as before, with any arguments, positional or named, and it keeps a count of how often it was called in an attribute: greet.calls.',
      'A wrapper hides the original function, so greet.__name__ would say "wrapper". Put @wraps(fn) (from functools) on the wrapper to copy fn\'s name and docstring onto it. Interviewers like to see it.',
    ],
    hints: [
      'def wrapper(*args, **kwargs) accepts anything, and fn(*args, **kwargs) passes it all on unchanged.',
      'Functions are objects, so they can have attributes: wrapper.calls += 1 inside the wrapper works, because by the time it runs, wrapper.calls = 0 has been set.',
      'Put @wraps(fn) on the line above def wrapper.',
    ],
    functionName: 'count_calls',
    starter: `from functools import wraps

def count_calls(fn):
    # put @wraps(fn) above wrapper so it keeps fn's name
    def wrapper(*args, **kwargs):
        # add one to wrapper.calls, then call fn with the same arguments and return its answer
        pass
    wrapper.calls = 0
    return wrapper

@count_calls
def greet(name, greeting="Hi"):
    return greeting + " " + name

greet("Ada")
greet("Grace", greeting="Hello")
print(greet.__name__, greet.calls)
`,
    tests: [
      {
        name: 'returns what the function returns',
        args: [],
        run: py('@count_calls', 'def add(a, b):', '    return a + b', 'return add(2, 3)'),
        expected: 5,
      },
      {
        name: 'counts every call',
        args: [],
        run: py('@count_calls', 'def hi():', '    return "hi"', 'hi()', 'hi()', 'hi()', 'return hi.calls'),
        expected: 3,
      },
      {
        name: 'passes named arguments on',
        args: [],
        run: py('@count_calls', 'def greet(name, greeting="Hi"):', '    return greeting + " " + name', 'return greet("Ada", greeting="Yo")'),
        expected: 'Yo Ada',
      },
      {
        name: 'keeps the name (functools.wraps)',
        args: [],
        run: py('@count_calls', 'def area(w, h):', '    return w * h', 'return area.__name__'),
        expected: 'area',
      },
    ],
  }),
  concept({
    id: 'py-repeat',
    group: 'functions',
    concepts: ['decorators', 'closures', 'args-kwargs'],
    title: 'Decorator with Arguments',
    difficulty: 'Medium',
    kind: 'build',
    statement: [
      '@repeat(3) above a function makes each call run it 3 times and return a list of the 3 answers.',
      'A decorator with arguments is one more layer: repeat(3) runs first and must return a decorator, which then gets the function and returns the wrapper. So there are three functions, one inside the other: repeat(times) → decorator(fn) → wrapper(*args, **kwargs).',
    ],
    hints: [
      '@repeat(3) above def roll means roll = repeat(3)(roll).',
      'Inside repeat, def decorator(fn):, and inside that, def wrapper(*args, **kwargs): that calls fn times times. Return wrapper from decorator, and decorator from repeat.',
      'return [fn(*args, **kwargs) for _ in range(times)]',
    ],
    functionName: 'repeat',
    starter: `def repeat(times):
    def decorator(fn):
        # make a wrapper that calls fn times times and returns the list of answers
        return fn
    return decorator

rolls = iter([4, 2, 6, 1, 3])

@repeat(3)
def roll():
    return next(rolls)

print(roll())
`,
    tests: [
      {
        name: 'runs the function times times',
        args: [],
        run: py('seen = []', '@repeat(3)', 'def ping():', '    seen.append(1)', '    return len(seen)', 'return ping()'),
        expected: [1, 2, 3],
      },
      {
        name: 'passes arguments on',
        args: [],
        run: py('@repeat(2)', 'def greet(name, punct="!"):', '    return "hi " + name + punct', 'return greet("Ada", punct="?")'),
        expected: ['hi Ada?', 'hi Ada?'],
      },
      {
        name: 'repeat(0) gives an empty list',
        args: [],
        run: py('@repeat(0)', 'def never():', '    return 1', 'return never()'),
        expected: [],
      },
    ],
  }),
  // ---------- Write the built-ins yourself ----------
  concept({
    id: 'py-map-filter',
    group: 'builtins',
    concepts: ['list-comprehension', 'functions', 'truthiness'],
    title: 'Write map and filter',
    difficulty: 'Warm-up',
    kind: 'build',
    statement: [
      'Write my_map(fn, items), which returns a list of fn(item) for each item, and my_filter(fn, items), which returns a list of the items where fn(item) is truthy. Don\'t use the built-in map or filter.',
      'Like the built-in filter, my_filter(None, items) keeps the items that are truthy themselves (not 0, "", None, [] or False).',
      'A plain loop works. A list comprehension does each in one line: [fn(x) for x in items] and [x for x in items if fn(x)].',
    ],
    hints: [
      'my_map: out = [], then out.append(fn(item)) in a loop, then return out.',
      'my_filter: keep item when fn(item) is truthy. When fn is None, test the item itself: if fn is None, use if item.',
    ],
    functionName: 'my_map',
    starter: `def my_map(fn, items):
    out = []
    # add fn(item) to out for each item
    return out

def my_filter(fn, items):
    out = []
    # add each item where fn(item) is truthy (or the item itself, when fn is None)
    return out

print(my_map(lambda n: n * n, [1, 2, 3]))
print(my_filter(lambda n: n % 2 == 0, [1, 2, 3, 4]))
`,
    tests: [
      { name: 'my_map squares', args: [], run: 'return my_map(lambda n: n * n, [1, 2, 3])', expected: [1, 4, 9] },
      { name: 'my_map with a built-in function', args: [], run: 'return my_map(len, ["a", "bcd", ""])', expected: [1, 3, 0] },
      { name: 'my_filter keeps the evens', args: [], run: 'return my_filter(lambda n: n % 2 == 0, [1, 2, 3, 4])', expected: [2, 4] },
      { name: 'my_filter(None, ...) keeps truthy items', args: [], run: 'return my_filter(None, [0, 1, "", "a", None, [], [2]])', expected: [1, 'a', [2]] },
      { name: 'empty in, empty out', args: [], run: 'return [my_map(str, []), my_filter(None, [])]', expected: [[], []] },
    ],
  }),
  concept({
    id: 'py-zip-enumerate',
    group: 'builtins',
    concepts: ['generators', 'iterators', 'args-kwargs', 'zip'],
    title: 'Write zip and enumerate',
    difficulty: 'Medium',
    kind: 'build',
    statement: [
      'Write my_enumerate(items, start=0), which yields (index, item) pairs, and my_zip(*iterables), which yields tuples of the first items of each, then the second items, and so on, stopping as soon as any of them runs out. Use yield, so they are generators like the real ones.',
      '*iterables collects however many arguments are passed into a tuple. They might not be lists (a string, a generator), so walk them with iter() and next() instead of indexes.',
    ],
    hints: [
      'my_enumerate: keep a counter i = start, and for each item: yield i, item, then i += 1.',
      'my_zip: its = [iter(x) for x in iterables]. Then loop: build a tuple of next(it) for each it, and yield it.',
      'next() raises StopIteration when an iterator runs out. Inside a generator, a StopIteration that escapes is turned into a RuntimeError, so catch it with try/except StopIteration and return.',
      'my_zip() with nothing passed should yield nothing: check if not iterables: return first.',
    ],
    functionName: 'my_zip',
    starter: `def my_enumerate(items, start=0):
    # replace this line: use yield to hand out (index, item) pairs
    return iter([])

def my_zip(*iterables):
    # replace this line: use yield to hand out tuples
    return iter([])

for i, letter in my_enumerate("ab", start=1):
    print(i, letter)
print(list(my_zip([1, 2, 3], "ab")))
`,
    tests: [
      { name: 'my_enumerate counts from 0', args: [], run: 'return list(my_enumerate(["a", "b"]))', expected: [[0, 'a'], [1, 'b']] },
      { name: 'my_enumerate with start', args: [], run: 'return list(my_enumerate("xyz", start=5))', expected: [[5, 'x'], [6, 'y'], [7, 'z']] },
      { name: 'my_zip pairs items up', args: [], run: 'return list(my_zip([1, 2], ["a", "b"]))', expected: [[1, 'a'], [2, 'b']] },
      { name: 'my_zip stops at the shortest', args: [], run: 'return list(my_zip([1, 2, 3], "ab", (True, False, None)))', expected: [[1, 'a', true], [2, 'b', false]] },
      { name: 'my_zip works on generators', args: [], run: 'return list(my_zip((n * n for n in range(3)), range(10)))', expected: [[0, 0], [1, 1], [4, 2]] },
      { name: 'my_zip() yields nothing', args: [], run: 'return list(my_zip())', expected: [] },
      {
        name: 'both are generators',
        args: [],
        run: py('import inspect', 'return [inspect.isgenerator(my_zip([1])), inspect.isgenerator(my_enumerate([1]))]'),
        expected: [true, true],
      },
    ],
  }),
  concept({
    id: 'py-reduce',
    group: 'builtins',
    concepts: ['functions', 'default-params', 'is-vs-equals'],
    title: 'Write reduce',
    difficulty: 'Medium',
    kind: 'build',
    statement: [
      'Write my_reduce(fn, items, initial), like functools.reduce. It walks the items keeping one running result (the accumulator): result = fn(result, item) for each item, and returns it at the end. my_reduce(lambda a, b: a + b, [1, 2, 3]) is ((1 + 2) + 3) = 6.',
      'initial is optional. When it is given, the result starts from it. When it isn\'t, the result starts from the first item. An empty list with no initial raises TypeError, the way functools.reduce does.',
      'The catch: you can\'t use initial=None to mean "not given", because None might be a real starting value. Use a sentinel: a unique object made just for this, like _MISSING = object(), and check initial is _MISSING.',
    ],
    hints: [
      'it = iter(items). If initial is _MISSING, result = next(it) (catch StopIteration and raise TypeError instead). Otherwise result = initial.',
      'Then for item in it: result = fn(result, item). The loop carries on from where next() left off.',
    ],
    functionName: 'my_reduce',
    starter: `_MISSING = object()

def my_reduce(fn, items, initial=_MISSING):
    pass

print(my_reduce(lambda total, n: total + n, [1, 2, 3, 4]))
print(my_reduce(lambda best, n: n if n > best else best, [3, 9, 2]))
`,
    tests: [
      { name: 'adds up a list', args: [], run: 'return my_reduce(lambda a, b: a + b, [1, 2, 3, 4])', expected: 10 },
      { name: 'goes left to right', args: [], run: 'return my_reduce(lambda a, b: a - b, [10, 3, 2])', expected: 5 },
      { name: 'starts from initial when given', args: [], run: 'return my_reduce(lambda a, b: a + [b * 2], [1, 2], [])', expected: [2, 4] },
      { name: 'an initial of None counts as given', args: [], run: 'return my_reduce(lambda a, b: b if a is None else a, [7, 8], None)', expected: 7 },
      { name: 'empty list with initial returns initial', args: [], run: 'return my_reduce(lambda a, b: a + b, [], 0)', expected: 0 },
      {
        name: 'empty list without initial raises TypeError',
        args: [],
        run: py('try:', '    my_reduce(lambda a, b: a + b, [])', 'except TypeError:', '    return "TypeError"', 'return "no error"'),
        expected: 'TypeError',
      },
      { name: 'works on any iterable', args: [], run: 'return my_reduce(lambda a, b: a * b, range(1, 6))', expected: 120 },
    ],
  }),
  concept({
    id: 'py-flatten',
    group: 'builtins',
    concepts: ['recursion', 'generators'],
    title: 'Flatten a Nested List',
    difficulty: 'Medium',
    kind: 'build',
    statement: [
      'flatten(nested) yields every item of a list that may hold lists inside lists, to any depth, in order: [1, [2, [3, [4]]], 5] gives 1, 2, 3, 4, 5.',
      'Lists and tuples are opened up; anything else, strings included, is yielded as it is.',
      'Recursion fits: a list inside is a smaller version of the same problem. In a generator, yield from flatten(item) hands on everything the inner call yields.',
    ],
    hints: [
      'for item in nested: if isinstance(item, (list, tuple)), the item needs flattening too; otherwise yield item.',
      'yield from flatten(item) is short for: for x in flatten(item): yield x.',
      'Why not open strings? A one-letter string holds itself ("a"[0] is "a"), so a recursion over strings would never end.',
    ],
    functionName: 'flatten',
    starter: `def flatten(nested):
    # replace this line: yield each item, and yield from flatten(...) for a list inside
    return iter([])

print(list(flatten([1, [2, [3, [4]]], 5])))
`,
    tests: [
      { name: 'any depth', args: [], run: 'return list(flatten([1, [2, [3, [4]]], 5]))', expected: [1, 2, 3, 4, 5] },
      { name: 'already flat', args: [], run: 'return list(flatten([1, 2, 3]))', expected: [1, 2, 3] },
      { name: 'empty lists inside', args: [], run: 'return list(flatten([[], [[]], [1, []]]))', expected: [1] },
      { name: 'tuples open, strings stay whole', args: [], run: 'return list(flatten(["ab", ("cd", ["e"])]))', expected: ['ab', 'cd', 'e'] },
      { name: 'is a generator', args: [], run: py('import inspect', 'return inspect.isgenerator(flatten([]))'), expected: true },
    ],
  }),
  concept({
    id: 'py-deep-copy',
    group: 'builtins',
    concepts: ['copy-deepcopy', 'recursion', 'aliasing'],
    title: 'Write deepcopy',
    difficulty: 'Medium',
    kind: 'build',
    statement: [
      'deep_copy(value) returns a copy of value where every list, dict, set and tuple inside is new too, all the way down. Changing the copy must never change the original. Don\'t use the copy module.',
      'Numbers, strings, booleans and None can\'t be changed in place, so they can be shared as they are.',
      'Step through the example: the link marks show which parts of a shallow copy are still shared with the original, and that a deep copy shares nothing.',
    ],
    hints: [
      'Check the type with isinstance and copy each kind: a list becomes [deep_copy(x) for x in value].',
      'A dict: {k: deep_copy(v) for k, v in value.items()}. Keys can\'t be lists, so they can stay. Tuples and sets: tuple(...) and set(...) of the copied items.',
      'Anything else: return value itself.',
    ],
    functionName: 'deep_copy',
    starter: `def deep_copy(value):
    pass

grid = [[1, 2], [3, 4]]
shallow = grid.copy()
deep = deep_copy(grid)
grid[0].append(99)
print(shallow)
print(deep)
`,
    tests: [
      { name: 'equal to the original', args: [], run: 'return deep_copy({"a": [1, {"b": (2, 3)}], "c": "x"})', expected: { a: [1, { b: [2, 3] }], c: 'x' } },
      {
        name: 'nested lists are new',
        args: [],
        run: py('grid = [[1, 2], [3, 4]]', 'copied = deep_copy(grid)', 'copied[0].append(9)', 'return [grid, copied[0] is grid[0]]'),
        expected: [
          [
            [1, 2],
            [3, 4],
          ],
          false,
        ],
      },
      {
        name: 'lists inside dicts are new',
        args: [],
        run: py('user = {"tags": ["math"], "pets": {"cat": ["Tom"]}}', 'c = deep_copy(user)', 'c["pets"]["cat"].append("Kit")', 'return user'),
        expected: { tags: ['math'], pets: { cat: ['Tom'] } },
      },
      {
        name: 'keeps tuples and sets as tuples and sets',
        args: [],
        run: py('c = deep_copy([(1, [2]), {3}])', 'return [type(c[0]).__name__, type(c[1]).__name__]'),
        expected: ['tuple', 'set'],
      },
      { name: 'plain values come back as they are', args: [], run: 'return [deep_copy(5), deep_copy("hi"), deep_copy(None)]', expected: [5, 'hi', null] },
    ],
  }),
  // ---------- Generators and iterators ----------
  concept({
    id: 'py-generator-order',
    group: 'iteration',
    kind: 'predict',
    concepts: ['generators', 'iterators'],
    title: 'When Does a Generator Run?',
    difficulty: 'Easy',
    statement: [
      'Guess the lines this prints, one per line. Then check your guess and step through to see why.',
      'numbers has yield in it, which makes it a generator function. Watch exactly when its print lines run.',
    ],
    hints: [
      'Calling numbers() runs none of its code. It only makes a generator object, paused before the first line.',
      'Each next() runs the generator until the next yield, hands out that value and pauses again. A for loop calls next() until the generator finishes.',
    ],
    explain: [
      'gen = numbers() prints nothing: a generator is lazy, it does no work until asked. So "made gen" comes first.',
      'The first next(gen) runs up to yield 1, printing "start" on the way. The second carries on from where it paused, printing "after 1", and stops at yield 2. gen never runs again, so its "end" is never printed.',
      'The for loop makes a fresh generator and calls next() until it finishes, so this time "end" prints, after "got 2". That is how a generator can walk a huge file or an endless sequence while holding only one item at a time.',
    ],
    functionName: '',
    starter: `def numbers():
    print("start")
    yield 1
    print("after 1")
    yield 2
    print("end")

gen = numbers()
print("made gen")
print(next(gen))
print(next(gen))
for n in numbers():
    print("got", n)
`,
    tests: [],
  }),
  concept({
    id: 'py-range',
    group: 'iteration',
    concepts: ['generators', 'range', 'default-params'],
    title: 'Write range',
    difficulty: 'Easy',
    kind: 'build',
    statement: [
      'my_range works like range, as a generator: my_range(stop) yields 0 up to stop, my_range(start, stop) from start, and my_range(start, stop, step) counts by step, which can be negative. The stop number is never included.',
      'A step of 0 would loop forever, so raise ValueError for it, like range does.',
    ],
    hints: [
      'With one argument, the number given is the stop: if stop is None: start, stop = 0, start.',
      'Counting up: while i < stop: yield i, then i += step. Counting down (step < 0) the test is i > stop instead.',
      'if step == 0: raise ValueError("step must not be zero")',
    ],
    functionName: 'my_range',
    starter: `def my_range(start, stop=None, step=1):
    # replace this line: yield each number
    return iter([])

print(list(my_range(4)))
print(list(my_range(10, 0, -3)))
`,
    tests: [
      { name: 'one argument counts from 0', args: [], run: 'return list(my_range(4))', expected: [0, 1, 2, 3] },
      { name: 'start and stop', args: [], run: 'return list(my_range(2, 5))', expected: [2, 3, 4] },
      { name: 'a step', args: [], run: 'return list(my_range(0, 10, 3))', expected: [0, 3, 6, 9] },
      { name: 'counting down', args: [], run: 'return list(my_range(10, 0, -3))', expected: [10, 7, 4, 1] },
      { name: 'nothing to count', args: [], run: 'return [list(my_range(0)), list(my_range(5, 2))]', expected: [[], []] },
      {
        name: 'a step of 0 raises ValueError',
        args: [],
        run: py('try:', '    list(my_range(1, 5, 0))', 'except ValueError:', '    return "ValueError"', 'return "no error"'),
        expected: 'ValueError',
      },
      { name: 'is a generator', args: [], run: py('import inspect', 'return inspect.isgenerator(my_range(3))'), expected: true },
    ],
  }),
  concept({
    id: 'py-chunks',
    group: 'iteration',
    concepts: ['generators', 'slicing'],
    title: 'Split into Chunks',
    difficulty: 'Easy',
    kind: 'build',
    statement: [
      'chunks(items, size) yields lists of size items each, in order; the last one holds whatever is left. chunks([1, 2, 3, 4, 5], 2) gives [1, 2], [3, 4], [5]. (Python 3.12 added this as itertools.batched.)',
      'Make it work on any iterable, even a generator, which can\'t be sliced: collect items into a list and yield it each time it gets full.',
    ],
    hints: [
      'Simplest, for lists only: for i in range(0, len(items), size): yield items[i:i + size].',
      'For any iterable: batch = [], append each item, and when len(batch) == size, yield batch and start a new []. After the loop, yield what is left if it isn\'t empty.',
    ],
    functionName: 'chunks',
    starter: `def chunks(items, size):
    # replace this line: yield each chunk as a list
    return iter([])

print(list(chunks([1, 2, 3, 4, 5], 2)))
`,
    tests: [
      { name: 'the last chunk is shorter', args: [], run: 'return list(chunks([1, 2, 3, 4, 5], 2))', expected: [[1, 2], [3, 4], [5]] },
      { name: 'fits exactly', args: [], run: 'return list(chunks("abcdef", 3))', expected: [['a', 'b', 'c'], ['d', 'e', 'f']] },
      { name: 'empty in, nothing out', args: [], run: 'return list(chunks([], 4))', expected: [] },
      { name: 'works on a generator', args: [], run: 'return list(chunks((n * 10 for n in range(5)), 4))', expected: [[0, 10, 20, 30], [40]] },
    ],
  }),
  concept({
    id: 'py-countdown',
    group: 'iteration',
    concepts: ['iterators', 'classes', 'dunder-methods'],
    title: 'A Class You Can Loop Over',
    difficulty: 'Medium',
    kind: 'build',
    statement: [
      'Countdown(n) can be used in a for loop and gives n, n - 1, ... down to 1.',
      'This is the iterator protocol, the rules every for loop follows: it calls iter(obj), which calls obj.__iter__(), and then next() on what that returned, which calls __next__(), until __next__ raises StopIteration. Here Countdown is its own iterator, so __iter__ returns self.',
      'A generator does all of this for you. Writing it out once shows what for really does.',
    ],
    hints: [
      '__init__ keeps the current number: self.current = n.',
      '__next__: if self.current <= 0, raise StopIteration. Otherwise remember the value, take one off self.current, and return the remembered value.',
      'Because __iter__ returns self, a Countdown can only be walked once; a second loop finds it already at 0. range(3) can be looped again because its __iter__ makes a fresh iterator each time.',
    ],
    functionName: 'Countdown',
    starter: `class Countdown:
    def __init__(self, n):
        self.current = n

    def __iter__(self):
        return self

    def __next__(self):
        # raise StopIteration when done, otherwise return the next number
        raise StopIteration

for n in Countdown(3):
    print(n)
`,
    tests: [
      { name: 'counts down to 1', args: [], run: 'return list(Countdown(3))', expected: [3, 2, 1] },
      { name: 'Countdown(0) gives nothing', args: [], run: 'return list(Countdown(0))', expected: [] },
      { name: 'next() works too', args: [], run: py('c = Countdown(5)', 'return [next(c), next(c)]'), expected: [5, 4] },
      {
        name: 'raises StopIteration at the end',
        args: [],
        run: py('c = Countdown(1)', 'next(c)', 'try:', '    next(c)', 'except StopIteration:', '    return "stopped"', 'return "kept going"'),
        expected: 'stopped',
      },
    ],
  }),
  concept({
    id: 'py-itertools',
    group: 'iteration',
    kind: 'predict',
    concepts: ['itertools', 'tuples'],
    title: 'What Does itertools Give?',
    difficulty: 'Medium',
    statement: [
      'Guess the six lines this prints, one per line. Then check your guess.',
      'These itertools functions come up in interviews as shortcuts for nested loops and running totals. print shows a tuple like (\'a\', \'b\').',
    ],
    hints: [
      'combinations picks without caring about order, so (a, b) and (b, a) are one pick. permutations cares about order. product is every pairing, like two nested for loops.',
      'accumulate gives running totals. chain walks one iterable after another. groupby only groups neighbours that are equal, so a letter that comes back later starts a new group.',
    ],
    explain: [
      'combinations("abc", 2) has 3 picks. permutations([1, 2, 3], 2) has 6 ordered pairs; [:3] keeps the first three, which all start with 1.',
      'product("ab", [0, 1]) is the same as for x in "ab": for y in [0, 1]: (x, y). accumulate keeps a running sum. chain treats "ab" as its letters.',
      'groupby("aaabccaa") gives a new group every time the letter changes, so "a" shows up twice. To group all equal items together, sort first.',
    ],
    functionName: '',
    starter: `from itertools import accumulate, chain, combinations, groupby, permutations, product

print(list(combinations("abc", 2)))
print(list(permutations([1, 2, 3], 2))[:3])
print(list(product("ab", [0, 1])))
print(list(accumulate([1, 2, 3, 4])))
print(list(chain([1, 2], "ab")))
print([(letter, len(list(run))) for letter, run in groupby("aaabccaa")])
`,
    tests: [],
  }),
  // ---------- Collections and sorting ----------
  concept({
    id: 'py-comprehensions',
    group: 'collections',
    concepts: ['list-comprehension', 'dict-comprehension', 'zip'],
    title: 'Comprehension One-Liners',
    difficulty: 'Warm-up',
    kind: 'build',
    statement: [
      'Write each of these three in one line with a comprehension (a loop written inside [ ] or { }).',
      'squares_of_evens(nums): the squares of the even numbers, in order. invert(d): a dict with keys and values swapped. transpose(matrix): rows become columns, so [[1, 2, 3], [4, 5, 6]] becomes [[1, 4], [2, 5], [3, 6]].',
    ],
    hints: [
      '[n * n for n in nums if n % 2 == 0]: what to keep, then the loop, then the condition.',
      '{v: k for k, v in d.items()} builds a dict the same way.',
      'transpose: [[row[c] for row in matrix] for c in range(len(matrix[0]))]. Or the famous trick: [list(col) for col in zip(*matrix)]. *matrix passes each row as its own argument, and zip pairs up their first items, then their second items...',
    ],
    functionName: 'squares_of_evens',
    starter: `def squares_of_evens(nums):
    pass

def invert(d):
    pass

def transpose(matrix):
    pass

print(squares_of_evens([1, 2, 3, 4]))
print(invert({"a": 1, "b": 2}))
print(transpose([[1, 2, 3], [4, 5, 6]]))
`,
    tests: [
      { name: 'squares of the evens', args: [], run: 'return squares_of_evens([1, 2, 3, 4, 5, 6])', expected: [4, 16, 36] },
      { name: 'no evens', args: [], run: 'return squares_of_evens([1, 3])', expected: [] },
      { name: 'invert swaps keys and values', args: [], run: 'return invert({"a": "x", "b": "y"})', expected: { x: 'a', y: 'b' } },
      {
        name: 'transpose a 2 × 3 grid',
        args: [],
        run: 'return transpose([[1, 2, 3], [4, 5, 6]])',
        expected: [
          [1, 4],
          [2, 5],
          [3, 6],
        ],
      },
      { name: 'transpose gives lists', args: [], run: 'return type(transpose([[1]])[0]).__name__', expected: 'list' },
    ],
  }),
  concept({
    id: 'py-sorting',
    group: 'collections',
    kind: 'predict',
    concepts: ['sorting', 'lambda', 'tuples'],
    title: 'sort, sorted and key=',
    difficulty: 'Easy',
    statement: [
      'Guess the five lines this prints, one per line. Then check your guess and step through to see why.',
      'Sorting by a key is in almost every Python interview, usually as a one-liner with a lambda.',
    ],
    hints: [
      'list.sort() sorts the list in place and returns None. sorted(...) returns a new list and leaves the old one alone.',
      'Strings sort by character code, and every capital letter comes before every lowercase one. key= says what to compare instead of the items themselves.',
      'Python\'s sort is stable: items that tie keep their original order. A tuple key compares its first parts, then its second parts on a tie; a minus sign flips a number to sort it largest first.',
    ],
    explain: [
      'nums.sort() changed nums and returned None, so result is None. Writing nums = nums.sort() is a classic bug that throws your list away.',
      'Plain sorted puts "Cherry" first, because capital C comes before all lowercase letters. key=str.lower compares lowercase copies, so it is alphabetical. key=len with reverse=True puts the 6-letter words first; "banana" and "Cherry" tie on length, and stability keeps them in their original order.',
      'key=lambda p: (-p[1], p[0]) sorts by age, oldest first (minus flips it), and breaks ties by name A to Z. That "count down, then name up" pattern is how you sort words by how often they appear.',
    ],
    functionName: '',
    starter: `nums = [3, 1, 2]
result = nums.sort()
print(result, nums)

words = ["banana", "apple", "Cherry"]
print(sorted(words))
print(sorted(words, key=str.lower))
print(sorted(words, key=len, reverse=True))

people = [("Ada", 36), ("Alan", 41), ("Grace", 36)]
print(sorted(people, key=lambda p: (-p[1], p[0])))
`,
    tests: [],
  }),
  concept({
    id: 'py-top-words',
    group: 'collections',
    concepts: ['counter', 'sorting', 'lambda', 'string-methods'],
    title: 'Most Common Words (Counter)',
    difficulty: 'Easy',
    kind: 'build',
    statement: [
      'top_words(text, k) returns the k most common words in text, most common first. Words are split on spaces and compared in lowercase. Words with the same count go in alphabetical order.',
      'collections.Counter counts for you: Counter(words) is a dict from each word to how often it appears. Then sort with a key, the pattern from "sort, sorted and key=".',
    ],
    hints: [
      'words = text.lower().split(), then counts = Counter(words).',
      'sorted(counts, key=lambda w: (-counts[w], w)) puts the biggest counts first and breaks ties alphabetically. Then slice off the first k.',
      'Counter has most_common(k), but on a tie it keeps the order words first appeared, not alphabetical, so it fails the tie test.',
    ],
    functionName: 'top_words',
    starter: `from collections import Counter

def top_words(text, k):
    words = text.lower().split()
    counts = Counter(words)
    # return the k most common words, ties in alphabetical order
    return []

print(top_words("the cat and the hat and the bat", 2))
`,
    tests: [
      { name: 'the most common first', args: [], run: 'return top_words("the cat and the hat and the bat", 2)', expected: ['the', 'and'] },
      { name: 'case does not matter', args: [], run: 'return top_words("Go go GO stop", 1)', expected: ['go'] },
      { name: 'ties go alphabetically', args: [], run: 'return top_words("pear fig apple fig pear apple kiwi", 3)', expected: ['apple', 'fig', 'pear'] },
      { name: 'k bigger than the number of words', args: [], run: 'return top_words("one two", 5)', expected: ['one', 'two'] },
    ],
  }),
  concept({
    id: 'py-group-by',
    group: 'collections',
    concepts: ['defaultdict', 'dicts', 'functions'],
    title: 'Group By (defaultdict)',
    difficulty: 'Easy',
    kind: 'build',
    statement: [
      'group_by(items, key) returns a dict whose keys are key(item) and whose values are lists of the items with that key, in their original order.',
      'collections.defaultdict(list) is a dict that makes an empty list the first time you look up a missing key, so groups[k].append(item) just works, with no "if k not in groups" check. It is still a dict, so you can return it as it is.',
    ],
    hints: [
      'groups = defaultdict(list), then for item in items: groups[key(item)].append(item).',
      'Without defaultdict: groups.setdefault(k, []).append(item) does the same with a plain dict.',
    ],
    functionName: 'group_by',
    starter: `from collections import defaultdict

def group_by(items, key):
    groups = defaultdict(list)
    # add each item to the list for its key
    return groups

people = [("Ada", "London"), ("Grace", "New York"), ("Alan", "London")]
print(dict(group_by(people, lambda p: p[1])))
`,
    tests: [
      {
        name: 'odd and even numbers',
        args: [],
        run: 'return group_by([1, 2, 3, 4, 5], lambda n: "odd" if n % 2 else "even")',
        expected: { odd: [1, 3, 5], even: [2, 4] },
      },
      {
        name: 'words by length, in order',
        args: [],
        run: 'return sorted(group_by(["hi", "yo", "hey", "a"], len).items())',
        expected: [
          [1, ['a']],
          [2, ['hi', 'yo']],
          [3, ['hey']],
        ],
      },
      { name: 'an empty list gives {}', args: [], run: 'return dict(group_by([], len))', expected: {} },
    ],
  }),
  concept({
    id: 'py-moving-average',
    group: 'collections',
    concepts: ['deque', 'sliding-window'],
    title: 'Moving Average (deque)',
    difficulty: 'Easy',
    kind: 'build',
    statement: [
      'moving_averages(nums, k) returns the average of every window of k numbers in a row: for [1, 2, 3, 4] and k = 2 that is [1.5, 2.5, 3.5].',
      'Keep the current window in a collections.deque, a list that is fast at both ends, with a running total. Each new number goes in at the right; once the window is too big, the oldest comes off the left with popleft(), which (unlike list.pop(0)) doesn\'t shift everything along.',
    ],
    hints: [
      'window = deque() and total = 0. For each n: window.append(n) and total += n.',
      'If len(window) > k: total -= window.popleft(). Once len(window) == k, append total / k to the answer.',
      'deque(maxlen=k) drops the oldest item by itself, but then you can\'t see which number fell off, so the running total is easier with popleft().',
    ],
    functionName: 'moving_averages',
    starter: `from collections import deque

def moving_averages(nums, k):
    window = deque()
    total = 0
    out = []
    # add each number to the window, drop the oldest when it gets too big
    return out

print(moving_averages([1, 2, 3, 4], 2))
`,
    tests: [
      { name: 'windows of 2', args: [], run: 'return moving_averages([1, 2, 3, 4], 2)', expected: [1.5, 2.5, 3.5] },
      { name: 'windows of 3', args: [], run: 'return moving_averages([3, 3, 6, 0, 9], 3)', expected: [4.0, 3.0, 5.0] },
      { name: 'one window', args: [], run: 'return moving_averages([2, 4], 2)', expected: [3.0] },
      { name: 'not enough numbers', args: [], run: 'return moving_averages([5], 3)', expected: [] },
    ],
  }),
  concept({
    id: 'py-task-queue',
    group: 'collections',
    concepts: ['heapq', 'tuples', 'heap'],
    title: 'Priority Queue (heapq)',
    difficulty: 'Medium',
    kind: 'build',
    statement: [
      'by_priority(tasks) gets a list of tasks, each a dict like {"name": "email", "priority": 2}, and returns their names in the order a priority queue would hand them out: lowest priority number first, and on a tie, the task that came first.',
      'Use heapq. A heap keeps its smallest item ready to pop, and Python compares tuples part by part, so push tuples whose first part is the priority.',
      'The catch, and the reason this is an interview favourite: pushing (priority, task) crashes on a tie, because Python then compares the two dicts, and dicts can\'t be compared with <. Put a tie-breaker in the middle: (priority, order, task), where order counts up as tasks arrive.',
    ],
    hints: [
      'for order, task in enumerate(tasks): heapq.heappush(heap, (task["priority"], order, task)).',
      'Then while heap: pop with heapq.heappop(heap) and keep the task\'s name.',
      'Try it without order first and read the TypeError, so you know it when you see it.',
    ],
    functionName: 'by_priority',
    starter: `import heapq

def by_priority(tasks):
    heap = []
    # push each task with its priority, then pop them all
    return []

tasks = [
    {"name": "email", "priority": 2},
    {"name": "deploy", "priority": 1},
    {"name": "lunch", "priority": 2},
]
print(by_priority(tasks))
`,
    tests: [
      {
        name: 'lowest priority number first',
        args: [],
        run: 'return by_priority([{"name": "b", "priority": 3}, {"name": "a", "priority": 1}, {"name": "c", "priority": 2}])',
        expected: ['a', 'c', 'b'],
      },
      {
        name: 'ties keep the order they came in',
        args: [],
        run: 'return by_priority([{"name": "email", "priority": 2}, {"name": "deploy", "priority": 1}, {"name": "lunch", "priority": 2}])',
        expected: ['deploy', 'email', 'lunch'],
      },
      { name: 'no tasks', args: [], run: 'return by_priority([])', expected: [] },
    ],
  }),
  // ---------- Classes and dunder methods ----------
  concept({
    id: 'py-vector',
    group: 'classes',
    concepts: ['dunder-methods', 'classes', 'is-vs-equals'],
    title: 'Vector with Dunder Methods',
    difficulty: 'Easy',
    kind: 'build',
    statement: [
      'Make a Vector class that works with Python\'s own syntax: Vector(1, 2) + Vector(3, 4) is Vector(4, 6), Vector(1, 2) * 3 is Vector(3, 6), == compares x and y, and printing one shows Vector(1, 2).',
      'Python turns syntax into method calls with double-underscore ("dunder") names: a + b calls a.__add__(b), a * 3 calls a.__mul__(3), a == b calls a.__eq__(b), and repr(a) and print call a.__repr__().',
    ],
    hints: [
      '__add__(self, other) returns a new Vector: Vector(self.x + other.x, self.y + other.y). Don\'t change self.',
      '__eq__(self, other): return self.x == other.x and self.y == other.y. Without it, == falls back to is, so two equal-looking vectors are not ==.',
      '__repr__ returns a string: f"Vector({self.x}, {self.y})".',
    ],
    functionName: 'Vector',
    starter: `class Vector:
    def __init__(self, x, y):
        self.x = x
        self.y = y

    def __add__(self, other):
        pass  # return a new Vector

    def __mul__(self, k):
        pass  # return a new Vector

    def __eq__(self, other):
        return self is other  # compare x and y instead

    def __repr__(self):
        return "Vector(?)"  # show x and y

a = Vector(1, 2)
b = Vector(3, 4)
print(a + b, a * 3, a == Vector(1, 2))
`,
    tests: [
      { name: 'repr shows Vector(x, y)', args: [], run: 'return repr(Vector(1, 2))', expected: 'Vector(1, 2)' },
      { name: '== compares x and y', args: [], run: 'return [Vector(1, 2) == Vector(1, 2), Vector(1, 2) == Vector(2, 1)]', expected: [true, false] },
      { name: '+ adds', args: [], run: 'return repr(Vector(1, 2) + Vector(3, 4))', expected: 'Vector(4, 6)' },
      { name: '* scales', args: [], run: 'return repr(Vector(1, -2) * 3)', expected: 'Vector(3, -6)' },
      {
        name: '+ leaves both vectors alone',
        args: [],
        run: py('a = Vector(1, 1)', 'b = Vector(2, 2)', 'c = a + b', 'return [repr(a), repr(b), c is a]'),
        expected: ['Vector(1, 1)', 'Vector(2, 2)', false],
      },
    ],
  }),
  concept({
    id: 'py-lru-cache',
    group: 'classes',
    concepts: ['classes', 'dicts', 'memoization'],
    title: 'LRU Cache',
    difficulty: 'Medium',
    kind: 'build',
    statement: [
      'LRUCache(capacity) stores up to capacity key-value pairs. get(key) returns the value, or -1 if the key isn\'t there. put(key, value) adds or updates a pair. When a put makes it too full, it throws out the least recently used key: the one that was read or written longest ago.',
      'Both should be O(1) (they take the same time however full the cache is). A Python dict remembers the order keys were added, which is all you need: keep the most recently used key at the end.',
      'This is one of the most asked interview questions. functools.lru_cache is Python\'s ready-made decorator version.',
    ],
    hints: [
      'To mark a key as just used, take it out and put it back: value = self.data.pop(key), then self.data[key] = value. It is now last.',
      'The least recently used key is the first one: next(iter(self.data)). del self.data[that key] when len(self.data) > self.capacity.',
      'collections.OrderedDict has move_to_end(key) and popitem(last=False), which say the same thing more clearly.',
    ],
    functionName: 'LRUCache',
    starter: `class LRUCache:
    def __init__(self, capacity):
        pass

    def get(self, key):
        pass

    def put(self, key, value):
        pass

cache = LRUCache(2)
cache.put("a", 1)
cache.put("b", 2)
cache.get("a")
cache.put("c", 3)
print(cache.get("a"), cache.get("b"), cache.get("c"))
`,
    tests: [
      {
        name: 'get returns what put stored',
        args: [],
        run: py('c = LRUCache(2)', 'c.put(1, 10)', 'return [c.get(1), c.get(2)]'),
        expected: [10, -1],
      },
      {
        name: 'throws out the least recently used',
        args: [],
        run: py('c = LRUCache(2)', 'c.put(1, 1)', 'c.put(2, 2)', 'c.get(1)', 'c.put(3, 3)', 'return [c.get(1), c.get(2), c.get(3)]'),
        expected: [1, -1, 3],
      },
      {
        name: 'put on an existing key updates it and counts as a use',
        args: [],
        run: py('c = LRUCache(2)', 'c.put(1, 1)', 'c.put(2, 2)', 'c.put(1, 100)', 'c.put(3, 3)', 'return [c.get(1), c.get(2), c.get(3)]'),
        expected: [100, -1, 3],
      },
      {
        name: 'capacity 1',
        args: [],
        run: py('c = LRUCache(1)', 'c.put("x", 1)', 'c.put("y", 2)', 'return [c.get("x"), c.get("y")]'),
        expected: [-1, 2],
      },
    ],
  }),
]
