import type { Language } from '../types'
import { codeMask, nameRegex } from './scan'

// Short explanations of Python's built-in functions and common methods, shown when hovering one in the editor.
// Each one links to the glossary entry that teaches it in context, so the longer explanation lives in one place.

export interface Builtin {
  name: string
  /** How it's called, like the first line of help(). */
  signature: string
  /** One or two plain sentences on what it does. */
  summary: string
  /** A tiny example; the comment shows the result. */
  example: string
  /** The glossary entry (src/syntax/cards.ts) that covers it, if there is one. */
  card?: string
}

const fn = (name: string, signature: string, summary: string, example: string, card?: string): Builtin => ({
  name,
  signature,
  summary,
  example,
  card,
})

/** Called on their own, like enumerate(nums). */
export const BUILTIN_FUNCTIONS: Builtin[] = [
  fn('print', 'print(*values, sep=" ", end="\\n")', 'Shows values in the console, separated by spaces. It returns None.', 'print("total", 42)  # total 42', 'print'),
  fn('len', 'len(x)', 'How many items are in a list, string, dict, set or tuple.', 'len([4, 8, 15])  # 3', 'min-max-sum'),
  fn('range', 'range(stop) / range(start, stop, step)', 'The numbers from start up to, but not including, stop. Most often used to loop a set number of times.', 'list(range(2, 8, 2))  # [2, 4, 6]', 'range'),
  fn('enumerate', 'enumerate(items, start=0)', 'Loops over items and hands you each position along with the item, as (index, item) pairs.', 'for i, ch in enumerate("ab"):\n    print(i, ch)  # 0 a, then 1 b', 'for-index'),
  fn('zip', 'zip(a, b, ...)', 'Walks several lists side by side, giving one tuple per position. Stops at the shortest list.', 'list(zip([1, 2], "ab"))  # [(1, "a"), (2, "b")]', 'zip'),
  fn('sum', 'sum(items, start=0)', 'Adds up all the numbers.', 'sum([4, 8, 15])  # 27', 'min-max-sum'),
  fn('min', 'min(items) / min(a, b, ...)', 'The smallest item, or the smallest of the values you pass.', 'min([4, 8, 1])  # 1', 'min-max-sum'),
  fn('max', 'max(items) / max(a, b, ...)', 'The largest item, or the largest of the values you pass.', 'max(3, 7)  # 7', 'min-max-sum'),
  fn('sorted', 'sorted(items, key=None, reverse=False)', 'A new sorted list. The original stays as it was (unlike .sort()).', 'sorted([3, 1, 2])  # [1, 2, 3]', 'sorting'),
  fn('reversed', 'reversed(items)', 'Loops over items from last to first, without copying them.', 'list(reversed([1, 2, 3]))  # [3, 2, 1]', 'slicing'),
  fn('abs', 'abs(x)', 'The distance from zero: negative numbers become positive.', 'abs(-5)  # 5'),
  fn('round', 'round(x, digits=0)', 'Rounds to the nearest whole number, or to that many decimal places.', 'round(3.14159, 2)  # 3.14'),
  fn('pow', 'pow(base, exp)', 'base to the power of exp, the same as base ** exp.', 'pow(2, 5)  # 32', 'math'),
  fn('divmod', 'divmod(a, b)', 'Both the whole-number quotient and the remainder, as a pair.', 'divmod(17, 5)  # (3, 2)', 'math'),
  fn('int', 'int(x)', 'Turns x into a whole number. Text must look like a number; decimals are cut off, not rounded.', 'int("42")  # 42\nint(3.9)   # 3', 'types'),
  fn('float', 'float(x)', 'Turns x into a number with a decimal point.', 'float("2.5")  # 2.5', 'types'),
  fn('str', 'str(x)', 'Turns x into text.', 'str(42) + "!"  # "42!"', 'types'),
  fn('bool', 'bool(x)', 'True or False. Empty things, 0 and None are False; everything else is True.', 'bool([])  # False', 'truthiness'),
  fn('list', 'list(items)', 'A new list with the same items. Also turns a string, range or set into a list.', 'list("abc")  # ["a", "b", "c"]', 'lists'),
  fn('dict', 'dict(pairs)', 'A new dictionary, from key=value arguments or a list of (key, value) pairs.', 'dict(a=1, b=2)  # {"a": 1, "b": 2}', 'dicts'),
  fn('set', 'set(items)', 'A collection with no duplicates, where checking "in" is fast.', 'set([1, 1, 2])  # {1, 2}', 'sets'),
  fn('tuple', 'tuple(items)', 'Like a list, but it can\'t be changed after it\'s made.', 'tuple([1, 2])  # (1, 2)', 'tuples'),
  fn('type', 'type(x)', 'What kind of value x is.', 'type(2.5)  # <class \'float\'>', 'types'),
  fn('isinstance', 'isinstance(x, kind)', 'True if x is that kind of value.', 'isinstance(3, int)  # True', 'types'),
  fn('any', 'any(items)', 'True if at least one item is truthy.', 'any(n > 10 for n in [4, 15])  # True', 'truthiness'),
  fn('all', 'all(items)', 'True if every item is truthy (and True for an empty list).', 'all(n > 0 for n in [4, -1])  # False', 'truthiness'),
  fn('map', 'map(func, items)', 'Calls func on each item. A list comprehension usually reads more clearly.', 'list(map(str, [1, 2]))  # ["1", "2"]', 'list-comprehension'),
  fn('filter', 'filter(func, items)', 'Keeps the items where func returns something truthy.', 'list(filter(None, [0, 3, 0, 5]))  # [3, 5]', 'list-comprehension'),
  fn('ord', 'ord(ch)', 'The number that stands for a character.', 'ord("a")  # 97'),
  fn('chr', 'chr(n)', 'The character for a number; the opposite of ord.', 'chr(98)  # "b"'),
  fn('input', 'input(prompt="")', 'Reads a line of text typed by the user. It always returns a string.', 'name = input("Name? ")'),
  fn('iter', 'iter(items)', 'An iterator: something you can pull items from one at a time with next. A for loop calls it for you.', 'it = iter([1, 2])', 'iterators'),
  fn('next', 'next(iterator, default)', 'The next item from an iterator or generator, or default when it runs out (without a default, it raises StopIteration).', 'next(iter([1, 2]))  # 1', 'iterators'),
  fn('hash', 'hash(x)', 'The number Python uses to find x quickly in a dict or set.', 'hash("hi")  # some big number', 'dict-vs-list-lookup'),
  fn('id', 'id(x)', 'A number unique to this object while it exists. Two names with the same id point at the same thing.', 'a = []\nb = a\nid(a) == id(b)  # True', 'aliasing'),
]

/** Called with a dot after a value, like nums.append(5). */
export const BUILTIN_METHODS: Builtin[] = [
  // Lists (some also on dicts, sets and strings)
  fn('append', 'list.append(x)', 'Adds x to the end of the list. Changes the list and returns None.', 'a = [1, 2]\na.append(3)  # a is [1, 2, 3]', 'lists'),
  fn('extend', 'list.extend(items)', 'Adds every item to the end of the list.', 'a = [1]\na.extend([2, 3])  # a is [1, 2, 3]', 'lists'),
  fn('insert', 'list.insert(i, x)', 'Puts x at position i, shifting the rest right.', 'a = [1, 3]\na.insert(1, 2)  # a is [1, 2, 3]', 'lists'),
  fn('pop', 'list.pop(i=-1) / dict.pop(key)', 'Removes and returns an item: the last one by default, or the one at that index or key.', 'a = [1, 2, 3]\na.pop()  # 3, a is [1, 2]', 'lists'),
  fn('remove', 'list.remove(x)', 'Removes the first item equal to x. Errors if there isn\'t one.', 'a = [1, 2, 1]\na.remove(1)  # a is [2, 1]', 'lists'),
  fn('index', 'list.index(x) / str.index(sub)', 'The position of the first x. Errors if it isn\'t there.', '[4, 8, 15].index(8)  # 1', 'lists'),
  fn('count', 'list.count(x) / str.count(sub)', 'How many times x appears.', '"banana".count("a")  # 3', 'counting'),
  fn('sort', 'list.sort(key=None, reverse=False)', 'Sorts the list in place and returns None. Use sorted() to keep the original.', 'a = [3, 1, 2]\na.sort()  # a is [1, 2, 3]', 'sorting'),
  fn('reverse', 'list.reverse()', 'Flips the list in place and returns None.', 'a = [1, 2, 3]\na.reverse()  # a is [3, 2, 1]', 'lists'),
  fn('copy', 'list.copy() / dict.copy()', 'A new, separate copy, so changing one doesn\'t change the other.', 'b = a.copy()', 'aliasing'),
  fn('clear', 'list.clear() / dict.clear()', 'Empties it in place.', 'a.clear()  # a is []', 'lists'),
  // Dicts
  fn('get', 'dict.get(key, default=None)', 'The value for key, or default if the key is missing, instead of a KeyError.', 'd = {"a": 1}\nd.get("b", 0)  # 0', 'key-error'),
  fn('items', 'dict.items()', 'Each (key, value) pair, ready to loop over.', 'for k, v in d.items():\n    print(k, v)', 'dict-loops'),
  fn('keys', 'dict.keys()', 'All the keys. Looping over a dict gives you these anyway.', 'list({"a": 1}.keys())  # ["a"]', 'dict-loops'),
  fn('values', 'dict.values()', 'All the values, without their keys.', 'sum({"a": 1, "b": 2}.values())  # 3', 'dict-loops'),
  fn('setdefault', 'dict.setdefault(key, default)', 'Returns d[key], first storing default there if the key is missing.', 'd.setdefault("x", []).append(1)', 'defaultdict'),
  fn('update', 'dict.update(other) / set.update(items)', 'Adds everything from other, overwriting keys that are already there.', 'd = {"a": 1}\nd.update(b=2)  # {"a": 1, "b": 2}', 'dicts'),
  // Sets
  fn('add', 'set.add(x)', 'Puts x in the set. Nothing happens if it\'s already there.', 'seen = {1}\nseen.add(2)  # {1, 2}', 'sets'),
  fn('discard', 'set.discard(x)', 'Removes x if it\'s there, with no error if it isn\'t.', 'seen.discard(5)', 'sets'),
  // Strings
  fn('split', 'str.split(sep=None)', 'Breaks the text into a list of pieces: at spaces by default, or at sep.', '"a,b,c".split(",")  # ["a", "b", "c"]', 'string-methods'),
  fn('join', 'sep.join(items)', 'Glues a list of strings together, with the string before the dot between each.', '"-".join(["a", "b"])  # "a-b"', 'string-methods'),
  fn('strip', 'str.strip(chars=None)', 'A copy without spaces (or those chars) at the start and end.', '"  hi  ".strip()  # "hi"', 'string-methods'),
  fn('lower', 'str.lower()', 'A copy in lowercase.', '"Hi".lower()  # "hi"', 'string-methods'),
  fn('upper', 'str.upper()', 'A copy in uppercase.', '"Hi".upper()  # "HI"', 'string-methods'),
  fn('replace', 'str.replace(old, new)', 'A copy with every old swapped for new.', '"cat".replace("c", "b")  # "bat"', 'string-methods'),
  fn('startswith', 'str.startswith(prefix)', 'True if the text begins with prefix.', '"python".startswith("py")  # True', 'strings'),
  fn('endswith', 'str.endswith(suffix)', 'True if the text ends with suffix.', '"code.py".endswith(".py")  # True', 'strings'),
  fn('find', 'str.find(sub)', 'The position of sub in the text, or -1 if it isn\'t there.', '"hello".find("l")  # 2', 'strings'),
  fn('isdigit', 'str.isdigit()', 'True if every character is a digit.', '"123".isdigit()  # True', 'strings'),
  fn('isalpha', 'str.isalpha()', 'True if every character is a letter.', '"abc".isalpha()  # True', 'strings'),
  fn('isalnum', 'str.isalnum()', 'True if every character is a letter or digit.', '"a1".isalnum()  # True', 'strings'),
  // collections
  fn('most_common', 'Counter.most_common(n)', 'The n most frequent items with their counts, most frequent first.', 'Counter("aab").most_common(1)  # [("a", 2)]', 'counter'),
  fn('popleft', 'deque.popleft()', 'Removes and returns the item at the front of the deque, quickly.', 'q = deque([1, 2])\nq.popleft()  # 1', 'deque'),
  fn('appendleft', 'deque.appendleft(x)', 'Adds x to the front of the deque.', 'q.appendleft(0)', 'deque'),
]

/**
 * From the standard library modules interviews lean on. They're reached both ways:
 * after the module's name (heapq.heappush) or on their own after `from heapq import heappush`.
 */
export const MODULE_FUNCTIONS: Builtin[] = [
  // collections
  fn('Counter', 'collections.Counter(items)', 'A dict that counts: each item maps to how many times it appears. Missing items count as 0.', 'Counter("banana")  # {"a": 3, "n": 2, "b": 1}', 'counter'),
  fn('defaultdict', 'collections.defaultdict(make)', 'A dict that calls make() to create a value the first time a missing key is used, e.g. defaultdict(list) starts each key with [].', 'groups = defaultdict(list)\ngroups["a"].append(1)  # {"a": [1]}', 'defaultdict'),
  fn('deque', 'collections.deque(items, maxlen=None)', 'A list that is fast at both ends: append and popleft are O(1). With maxlen, the oldest items fall off.', 'q = deque([1, 2])\nq.append(3)\nq.popleft()  # 1', 'deque'),
  fn('OrderedDict', 'collections.OrderedDict()', 'A dict with extras for order: move_to_end(key) and popitem(last=False). Plain dicts keep insertion order too.', 'd = OrderedDict(a=1, b=2)\nd.move_to_end("a")  # b, then a', 'dicts'),
  // heapq
  fn('heappush', 'heapq.heappush(heap, item)', 'Adds item to the heap list, keeping the smallest at heap[0]. O(log n).', 'h = []\nheappush(h, 5)\nheappush(h, 2)  # h[0] is 2', 'heapq'),
  fn('heappop', 'heapq.heappop(heap)', 'Removes and returns the smallest item. O(log n). Push tuples like (priority, order, task) to choose what "smallest" means.', 'h = [1, 3, 2]\nheappop(h)  # 1', 'heapq'),
  fn('heapify', 'heapq.heapify(items)', 'Rearranges a list into a heap in place, in O(n). It returns None.', 'h = [5, 1, 8]\nheapify(h)  # h[0] is 1', 'heapq'),
  fn('nlargest', 'heapq.nlargest(k, items, key=None)', 'The k largest items, largest first.', 'nlargest(2, [5, 1, 8, 3])  # [8, 5]', 'heapq'),
  fn('nsmallest', 'heapq.nsmallest(k, items, key=None)', 'The k smallest items, smallest first.', 'nsmallest(2, [5, 1, 8, 3])  # [1, 3]', 'heapq'),
  // itertools
  fn('combinations', 'itertools.combinations(items, r)', 'Every way to pick r items, ignoring order, as tuples.', 'list(combinations("abc", 2))  # [("a", "b"), ("a", "c"), ("b", "c")]', 'itertools'),
  fn('permutations', 'itertools.permutations(items, r=None)', 'Every ordering of r items (all of them by default), as tuples.', 'list(permutations([1, 2]))  # [(1, 2), (2, 1)]', 'itertools'),
  fn('product', 'itertools.product(a, b, ..., repeat=1)', 'Every pairing, like nested for loops.', 'list(product("ab", [0, 1]))  # [("a", 0), ("a", 1), ("b", 0), ("b", 1)]', 'itertools'),
  fn('accumulate', 'itertools.accumulate(items, func=add)', 'Running totals (or running results of func).', 'list(accumulate([1, 2, 3]))  # [1, 3, 6]', 'itertools'),
  fn('chain', 'itertools.chain(a, b, ...)', 'Walks one iterable after another, as if they were joined.', 'list(chain([1], [2, 3]))  # [1, 2, 3]', 'itertools'),
  fn('groupby', 'itertools.groupby(items, key=None)', 'Groups runs of neighbouring equal items into (key, group) pairs. Sort first to group all equal items.', '[(k, len(list(g))) for k, g in groupby("aabba")]  # [("a", 2), ("b", 2), ("a", 1)]', 'itertools'),
  fn('islice', 'itertools.islice(items, stop) / islice(items, start, stop)', 'A slice of any iterable, even a generator, without making a list first.', 'list(islice(count(), 3))  # [0, 1, 2]', 'itertools'),
  // functools
  fn('reduce', 'functools.reduce(func, items, initial)', 'Combines the items into one value: func(func(func(initial, a), b), c)...', 'reduce(lambda a, b: a * b, [1, 2, 3, 4])  # 24', 'functions'),
  fn('wraps', 'functools.wraps(fn)', 'Used as @wraps(fn) on a decorator\'s wrapper, so the wrapper keeps fn\'s name and docstring.', '@wraps(fn)\ndef wrapper(*args, **kwargs):\n    return fn(*args, **kwargs)', 'decorators'),
  fn('lru_cache', 'functools.lru_cache(maxsize=128)', 'A decorator that remembers a function\'s answers by its arguments, dropping the least recently used ones when full.', '@lru_cache(maxsize=None)\ndef fib(n): ...', 'memoization'),
  fn('cache', 'functools.cache', 'A decorator that remembers every answer by its arguments: lru_cache with no limit.', '@cache\ndef fib(n): ...', 'memoization'),
  // copy
  fn('deepcopy', 'copy.deepcopy(x)', 'A copy of x with everything inside copied too, all the way down, so no part is shared.', 'grid2 = deepcopy(grid)', 'copy-deepcopy'),
]

const FUNCTIONS = new Map([...BUILTIN_FUNCTIONS, ...MODULE_FUNCTIONS].map((b) => [b.name, b]))
const METHODS = new Map(BUILTIN_METHODS.map((b) => [b.name, b]))
/** heappush → heapq, read off its signature. */
const MODULE_OF = new Map(MODULE_FUNCTIONS.map((b) => [b.name, b.signature.split('.')[0]]))

/** A name in a line of code, with 0-based start and end (exclusive). */
export interface NameHit {
  name: string
  start: number
  end: number
  /** Written after a dot, like the append in nums.append. */
  afterDot: boolean
}

/** The name under the given 0-based column of a line of code, unless it's inside a string or comment. */
export function nameAt(line: string, column: number, language: Language = 'python'): NameHit | null {
  for (const m of line.matchAll(nameRegex(language))) {
    const start = m.index
    const end = start + m[0].length
    if (column < start) return null
    if (column >= end) continue
    if (!codeMask(line, language)[start]) return null
    return { name: m[0], start, end, afterDot: line.slice(0, start).trimEnd().endsWith('.') }
  }
  return null
}

export interface BuiltinHit {
  builtin: Builtin
  /** 0-based start and end (exclusive) of the name in the line. */
  start: number
  end: number
}

/**
 * The built-in under the given 0-based column of a line of code, if any.
 * A bare name counts only when it's called, so a variable named max or sum doesn't get the tooltip.
 */
export function builtinAt(line: string, column: number): BuiltinHit | null {
  const hit = nameAt(line, column)
  if (!hit) return null
  const { name, start, end } = hit
  if (hit.afterDot) {
    // heapq.heappush, but not self.cache or grid.product: only right after its module's name.
    const module = MODULE_OF.get(name)
    if (module && new RegExp(`(^|[^\\w.])${module}\\s*\\.\\s*$`).test(line.slice(0, start))) return { builtin: FUNCTIONS.get(name)!, start, end }
    const builtin = METHODS.get(name)
    return builtin ? { builtin, start, end } : null
  }
  // def sum(...) or class list: is the learner's own name.
  if (/(^|\W)(def|class)$/.test(line.slice(0, start).trimEnd())) return null
  // Called, or used as a decorator (@cache with no brackets).
  const decorator = /^\s*@$/.test(line.slice(0, start))
  if (!decorator && !/^\s*\(/.test(line.slice(end))) return null
  const builtin = FUNCTIONS.get(name)
  return builtin ? { builtin, start, end } : null
}
