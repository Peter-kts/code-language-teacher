import { nameAt, type Builtin, type BuiltinHit } from './builtins'

// Short explanations of JavaScript's built-in functions and methods, shown when hovering one in the editor.
// Each links to the JavaScript glossary entry (jsCards.ts) that teaches it in context.

const fn = (name: string, signature: string, summary: string, example: string, card?: string): Builtin => ({
  name,
  signature,
  summary,
  example,
  card,
})

/** Members of the built-in namespaces, like Math.max, keyed by their full name. */
export const JS_STATICS: Builtin[] = [
  fn('console.log', 'console.log(...values)', 'Shows values in the console, separated by spaces. It returns undefined.', 'console.log("total", 42)  // total 42', 'console-log'),
  fn('console.error', 'console.error(...values)', 'Like console.log, for problems: it shows in red.', 'console.error("oops")', 'console-log'),
  fn('console.warn', 'console.warn(...values)', 'Like console.log, for warnings.', 'console.warn("careful")', 'console-log'),
  fn('Math.max', 'Math.max(a, b, ...)', 'The largest of the numbers passed. Spread an array in: Math.max(...nums).', 'Math.max(3, 7)        // 7\nMath.max(...[4, 8])  // 8', 'min-max-sum'),
  fn('Math.min', 'Math.min(a, b, ...)', 'The smallest of the numbers passed. Spread an array in: Math.min(...nums).', 'Math.min(3, 7)  // 3', 'min-max-sum'),
  fn('Math.floor', 'Math.floor(x)', 'Rounds down to a whole number. Math.floor(a / b) is whole-number division.', 'Math.floor(7 / 2)  // 3', 'math'),
  fn('Math.ceil', 'Math.ceil(x)', 'Rounds up to a whole number.', 'Math.ceil(3.2)  // 4', 'math'),
  fn('Math.round', 'Math.round(x)', 'Rounds to the nearest whole number (.5 rounds up).', 'Math.round(2.5)  // 3', 'math'),
  fn('Math.trunc', 'Math.trunc(x)', 'Cuts off the decimals, toward zero.', 'Math.trunc(-3.7)  // -3', 'math'),
  fn('Math.abs', 'Math.abs(x)', 'The distance from zero: negative numbers become positive.', 'Math.abs(-5)  // 5', 'math'),
  fn('Math.sqrt', 'Math.sqrt(x)', 'The square root.', 'Math.sqrt(16)  // 4', 'math'),
  fn('Math.pow', 'Math.pow(base, exp)', 'base to the power of exp, the same as base ** exp.', 'Math.pow(2, 5)  // 32', 'math'),
  fn('Math.random', 'Math.random()', 'A random number from 0 up to (not including) 1.', 'Math.floor(Math.random() * 6) + 1  // a dice roll', 'math'),
  fn('Object.keys', 'Object.keys(obj)', "An array of the object's keys, as strings.", 'Object.keys({ a: 1, b: 2 })  // ["a", "b"]', 'dict-loops'),
  fn('Object.values', 'Object.values(obj)', "An array of the object's values.", 'Object.values({ a: 1, b: 2 })  // [1, 2]', 'dict-loops'),
  fn('Object.entries', 'Object.entries(obj)', 'An array of [key, value] pairs, ready to loop over.', 'for (const [k, v] of Object.entries(obj)) {}', 'dict-loops'),
  fn('Object.fromEntries', 'Object.fromEntries(pairs)', 'An object built from [key, value] pairs, or from a Map.', 'Object.fromEntries([["a", 1]])  // { a: 1 }', 'objects'),
  fn('Object.assign', 'Object.assign(target, ...sources)', 'Copies fields into target, changing it. { ...a, ...b } is usually clearer.', 'Object.assign({}, { a: 1 })  // { a: 1 }', 'spread'),
  fn('Object.freeze', 'Object.freeze(obj)', 'Stops the object being changed (one level deep). Changes then throw an error in strict mode.', 'const p = Object.freeze({ x: 1 })', 'spread-immutable'),
  fn('Array.from', 'Array.from(items, mapFn?)', 'A new array from anything you can loop over, like a string, Set or Map. Array.from({ length: n }, (_, i) => i) counts 0 to n - 1.', 'Array.from("abc")                 // ["a", "b", "c"]\nArray.from({ length: 3 }, (_, i) => i)  // [0, 1, 2]', 'lists'),
  fn('Array.isArray', 'Array.isArray(x)', 'True if x is an array. (typeof says "object" for arrays.)', 'Array.isArray([1])  // true', 'types'),
  fn('Array.of', 'Array.of(...items)', 'A new array of the items passed.', 'Array.of(7)  // [7]', 'lists'),
  fn('JSON.stringify', 'JSON.stringify(value, null, indent?)', 'Turns arrays and objects into JSON text.', 'JSON.stringify({ a: [1] })  // \'{"a":[1]}\'', 'json'),
  fn('JSON.parse', 'JSON.parse(text)', 'Turns JSON text back into arrays and objects.', 'JSON.parse("[1, 2]")  // [1, 2]', 'json'),
  fn('Number.isInteger', 'Number.isInteger(x)', 'True if x is a whole number.', 'Number.isInteger(2.5)  // false', 'types'),
  fn('Number.isNaN', 'Number.isNaN(x)', 'True if x is NaN ("not a number"), the result of bad math like 0 / 0.', 'Number.isNaN(Number("hi"))  // true', 'types'),
  fn('Number.MAX_SAFE_INTEGER', 'Number.MAX_SAFE_INTEGER', 'The biggest whole number JavaScript stores exactly. Infinity is a common starting value for "smallest so far" instead.', 'Number.MAX_SAFE_INTEGER  // 9007199254740991', 'running-best'),
  fn('String.fromCharCode', 'String.fromCharCode(n)', 'The character for a number; the opposite of "a".charCodeAt(0).', 'String.fromCharCode(98)  // "b"', 'strings'),
  fn('Map.groupBy', 'Map.groupBy(items, keyFn)', 'A Map from each key keyFn returns to an array of the items with that key.', 'Map.groupBy([1, 2, 3], (n) => n % 2)  // Map { 1 => [1, 3], 0 => [2] }', 'group-by'),
  fn('Object.groupBy', 'Object.groupBy(items, keyFn)', 'Like Map.groupBy, but gives an object with string keys.', 'Object.groupBy(["ab", "c"], (w) => w.length)', 'group-by'),
]

/** Called on their own, like parseInt(text), or with new, like new Map(). */
export const JS_FUNCTIONS: Builtin[] = [
  fn('parseInt', 'parseInt(text, 10)', 'Reads a whole number from the start of the text. Pass 10 so it always reads decimal.', 'parseInt("42px", 10)  // 42', 'types'),
  fn('parseFloat', 'parseFloat(text)', 'Reads a decimal number from the start of the text.', 'parseFloat("2.5")  // 2.5', 'types'),
  fn('Number', 'Number(x)', 'Turns x into a number, or NaN if it doesn\'t look like one.', 'Number("42")  // 42', 'types'),
  fn('String', 'String(x)', 'Turns x into text.', 'String(42) + "!"  // "42!"', 'types'),
  fn('Boolean', 'Boolean(x)', 'true or false: whether x is truthy.', 'Boolean([])  // true, even empty', 'truthiness'),
  fn('Map', 'new Map(pairs?)', 'A key → value lookup table. Pass [key, value] pairs to start it filled.', 'new Map([["a", 1]])', 'dicts'),
  fn('Set', 'new Set(items?)', 'A collection with no duplicates and a fast has.', 'new Set([1, 1, 2])  // Set {1, 2}', 'sets'),
  fn('Array', 'new Array(n).fill(x)', 'An array of length n. It starts with empty slots, so fill it.', 'new Array(3).fill(0)  // [0, 0, 0]', 'lists'),
  fn('Error', 'new Error(message)', 'An error to throw, with a message saying what went wrong.', 'throw new Error("empty input")', 'type-error'),
  fn('isNaN', 'isNaN(x)', 'True if x is NaN after converting it. Number.isNaN doesn\'t convert, so it surprises less.', 'isNaN("hi")  // true', 'types'),
  fn('structuredClone', 'structuredClone(value)', 'A deep copy: nested arrays and objects are copied too, unlike spread.', 'const copy = structuredClone(state)', 'references-vs-copies'),
]

/** Called with a dot after a value, like nums.push(5). Several belong to more than one type. */
export const JS_METHODS: Builtin[] = [
  // Arrays
  fn('push', 'array.push(...items)', 'Adds items to the end of the array. Changes it and returns the new length.', 'const a = [1, 2]\na.push(3)  // a is [1, 2, 3]', 'lists'),
  fn('pop', 'array.pop()', 'Removes the last item and returns it (undefined if empty).', 'const a = [1, 2, 3]\na.pop()  // 3, a is [1, 2]', 'stack'),
  fn('shift', 'array.shift()', 'Removes the first item and returns it. Every other item moves down one, so it is O(n).', 'const q = [1, 2]\nq.shift()  // 1, q is [2]', 'deque'),
  fn('unshift', 'array.unshift(...items)', 'Adds items to the front, moving the rest along.', 'const a = [2]\na.unshift(1)  // a is [1, 2]', 'lists'),
  fn('slice', 'array.slice(start, end) / string.slice(start, end)', 'A copy of part of it, from start up to (not including) end. Negative numbers count from the end.', '[1, 2, 3, 4].slice(1, 3)  // [2, 3]\n"hello".slice(-3)        // "llo"', 'slicing'),
  fn('splice', 'array.splice(start, count, ...items)', 'Cuts count items out at start (and puts items in their place), changing the array. Returns what it cut.', 'const a = [1, 2, 3]\na.splice(1, 1)  // [2], a is [1, 3]', 'slicing'),
  fn('concat', 'array.concat(...arrays)', 'A new array with the others added on. [...a, ...b] does the same.', '[1].concat([2, 3])  // [1, 2, 3]', 'spread'),
  fn('map', 'array.map((item, i) => ...)', 'A new array with your function\'s result for each item.', '[1, 2].map((n) => n * 10)  // [10, 20]', 'map-filter'),
  fn('filter', 'array.filter((item, i) => ...)', 'A new array with only the items your function returns true for.', '[1, 2, 3].filter((n) => n > 1)  // [2, 3]', 'map-filter'),
  fn('reduce', 'array.reduce((acc, item) => ..., start)', 'Walks the array carrying one value along: your function returns the next value of acc. Always pass start.', '[4, 8].reduce((sum, n) => sum + n, 0)  // 12', 'reduce'),
  fn('forEach', 'array.forEach((item, i) => ...)', 'Calls your function on each item. Returns undefined; you can\'t break out of it (use for...of for that).', '[1, 2].forEach((n) => console.log(n))', 'for-list'),
  fn('find', 'array.find((item) => ...)', 'The first item your function returns true for, or undefined.', '[4, 15, 8].find((n) => n > 10)  // 15', 'find-some-every'),
  fn('findIndex', 'array.findIndex((item) => ...)', 'The position of the first item your function returns true for, or -1.', '[4, 15].findIndex((n) => n > 10)  // 1', 'find-some-every'),
  fn('findLast', 'array.findLast((item) => ...)', 'Like find, searching from the end.', '[4, 15, 20].findLast((n) => n > 10)  // 20', 'find-some-every'),
  fn('some', 'array.some((item) => ...)', 'True if your function returns true for at least one item.', '[4, 15].some((n) => n > 10)  // true', 'find-some-every'),
  fn('every', 'array.every((item) => ...)', 'True if your function returns true for every item (and for an empty array).', '[4, -1].every((n) => n > 0)  // false', 'find-some-every'),
  fn('includes', 'array.includes(x) / string.includes(sub)', 'True if x is in it. It checks item by item, O(n); a Set\'s has is faster.', '[4, 8].includes(8)   // true\n"hello".includes("ell")  // true', 'membership'),
  fn('indexOf', 'array.indexOf(x) / string.indexOf(sub)', 'The position of the first x, or -1 if it isn\'t there.', '[4, 8, 15].indexOf(8)  // 1', 'lists'),
  fn('lastIndexOf', 'array.lastIndexOf(x)', 'The position of the last x, or -1.', '[1, 2, 1].lastIndexOf(1)  // 2', 'lists'),
  fn('join', 'array.join(separator)', 'Glues the items into one string, with separator between each (a comma if left out).', '["a", "b"].join("-")  // "a-b"', 'string-methods'),
  fn('sort', 'array.sort((a, b) => a - b)', 'Sorts the array itself and returns it. Without a compare function it sorts as text, so 10 comes before 9.', 'const a = [10, 9, 1]\na.sort((x, y) => x - y)  // a is [1, 9, 10]', 'sorting'),
  fn('toSorted', 'array.toSorted((a, b) => a - b)', 'A sorted copy; the original stays as it was.', '[3, 1, 2].toSorted((a, b) => a - b)  // [1, 2, 3]', 'sorting'),
  fn('reverse', 'array.reverse()', 'Flips the array itself and returns it.', 'const a = [1, 2, 3]\na.reverse()  // a is [3, 2, 1]', 'lists'),
  fn('toReversed', 'array.toReversed()', 'A flipped copy; the original stays as it was.', '[1, 2, 3].toReversed()  // [3, 2, 1]', 'lists'),
  fn('fill', 'array.fill(x, start?, end?)', 'Sets every item (or those from start to end) to x, changing the array.', 'new Array(3).fill(0)  // [0, 0, 0]', 'lists'),
  fn('flat', 'array.flat(depth = 1)', 'A new array with nested arrays opened up one level (or depth levels).', '[[1, 2], [3]].flat()  // [1, 2, 3]', 'lists'),
  fn('flatMap', 'array.flatMap((item) => [...])', 'map, then flat one level: each item can turn into zero, one or several.', '[1, 2].flatMap((n) => [n, n])  // [1, 1, 2, 2]', 'map-filter'),
  fn('at', 'array.at(i) / string.at(i)', 'The item at i, where negative i counts from the end: at(-1) is the last.', '[4, 8, 15].at(-1)  // 15', 'lists'),
  fn('entries', 'array.entries() / map.entries()', 'Each [index, item] pair of an array (or [key, value] of a Map), ready for for...of.', 'for (const [i, n] of [4, 8].entries()) {}', 'for-index'),
  fn('keys', 'array.keys() / map.keys()', 'Each index of an array, or each key of a Map or Set.', '[...new Map([["a", 1]]).keys()]  // ["a"]', 'dict-loops'),
  fn('values', 'array.values() / map.values()', 'Each item of an array, or each value of a Map or Set.', '[...new Map([["a", 1]]).values()]  // [1]', 'dict-loops'),
  fn('length', 'array.length / string.length', 'How many items or characters. It\'s a property, not a method: no ().', '[4, 8, 15].length  // 3', 'lists'),
  // Maps and Sets
  fn('get', 'map.get(key)', 'The value stored for key, or undefined if there isn\'t one.', 'const m = new Map([["a", 1]])\nm.get("a")       // 1\nm.get("b") ?? 0  // 0', 'dicts'),
  fn('set', 'map.set(key, value)', 'Stores value under key, replacing any old value. Returns the Map.', 'const m = new Map()\nm.set("a", 1)', 'dicts'),
  fn('has', 'map.has(key) / set.has(x)', 'True if the key (or value) is there. O(1), however big it is.', 'new Set([1, 2]).has(2)  // true', 'membership'),
  fn('add', 'set.add(x)', 'Puts x in the Set. Nothing happens if it\'s already there.', 'const seen = new Set()\nseen.add(1)', 'sets'),
  fn('delete', 'map.delete(key) / set.delete(x)', 'Removes it, and returns whether it was there.', 'const seen = new Set([1])\nseen.delete(1)  // true', 'sets'),
  fn('clear', 'map.clear() / set.clear()', 'Removes everything.', 'seen.clear()', 'sets'),
  fn('size', 'map.size / set.size', 'How many entries. A property, not a method, and not length.', 'new Set([1, 1, 2]).size  // 2', 'sets'),
  // Strings
  fn('split', 'string.split(separator)', 'Breaks the text into an array at each separator. split("") gives every character.', '"a,b,c".split(",")  // ["a", "b", "c"]', 'string-methods'),
  fn('trim', 'string.trim()', 'A copy without spaces at the start and end.', '"  hi  ".trim()  // "hi"', 'string-methods'),
  fn('toLowerCase', 'string.toLowerCase()', 'A copy in lowercase.', '"Hi".toLowerCase()  // "hi"', 'string-methods'),
  fn('toUpperCase', 'string.toUpperCase()', 'A copy in uppercase.', '"Hi".toUpperCase()  // "HI"', 'string-methods'),
  fn('replace', 'string.replace(old, new)', 'A copy with the first old swapped for new. Use replaceAll for every one.', '"aa".replace("a", "b")  // "ba"', 'string-methods'),
  fn('replaceAll', 'string.replaceAll(old, new)', 'A copy with every old swapped for new.', '"aa".replaceAll("a", "b")  // "bb"', 'string-methods'),
  fn('startsWith', 'string.startsWith(prefix)', 'True if the text begins with prefix.', '"script.js".startsWith("script")  // true', 'strings'),
  fn('endsWith', 'string.endsWith(suffix)', 'True if the text ends with suffix.', '"script.js".endsWith(".js")  // true', 'strings'),
  fn('charAt', 'string.charAt(i)', 'The character at i, or "" past the end. Most code writes s[i].', '"hello".charAt(1)  // "e"', 'strings'),
  fn('charCodeAt', 'string.charCodeAt(i)', 'The number that stands for the character at i.', '"a".charCodeAt(0)  // 97', 'strings'),
  fn('padStart', 'string.padStart(length, fill)', 'A copy padded at the front to that length.', '"7".padStart(3, "0")  // "007"', 'string-methods'),
  fn('repeat', 'string.repeat(n)', 'The text n times over.', '"ab".repeat(3)  // "ababab"', 'string-methods'),
  fn('substring', 'string.substring(start, end)', 'The text from start up to (not including) end. Like slice, without negative indexes.', '"hello".substring(1, 3)  // "el"', 'strings'),
  // Numbers
  fn('toFixed', 'number.toFixed(digits)', 'Text with exactly that many decimal places.', '(3.14159).toFixed(2)  // "3.14"', 'math'),
  fn('toString', 'value.toString(base?)', 'Text for the value. For numbers, a base like 2 gives binary.', '(5).toString(2)  // "101"', 'types'),
]

const STATICS = new Map(JS_STATICS.map((b) => [b.name, b]))
const FUNCTIONS = new Map(JS_FUNCTIONS.map((b) => [b.name, b]))
const METHODS = new Map(JS_METHODS.map((b) => [b.name, b]))

/**
 * The JavaScript built-in under the given 0-based column of a line of code, if any.
 * Math.max and the like are found from either half. A bare name counts only when it's called
 * (or made with new), so a variable named max doesn't get the tooltip.
 */
export function jsBuiltinAt(line: string, column: number): BuiltinHit | null {
  const hit = nameAt(line, column, 'javascript')
  if (!hit) return null
  const { name, start, end } = hit
  // Math.max: hovering Math or max both explain Math.max.
  const before = /([A-Za-z_$][\w$]*)\s*\.\s*$/.exec(line.slice(0, start))
  const after = /^\s*\.\s*([A-Za-z_$][\w$]*)/.exec(line.slice(end))
  const statik = (before && STATICS.get(`${before[1]}.${name}`)) || (after && STATICS.get(`${name}.${after[1]}`))
  if (statik) return { builtin: statik, start: before ? start - before[0].length : start, end: before ? end : end + after![0].length }
  if (hit.afterDot) {
    const builtin = METHODS.get(name)
    return builtin ? { builtin, start, end } : null
  }
  // function max(...) or class Set is the learner's own name.
  if (/(^|[^\w$])(function|class)$/.test(line.slice(0, start).trimEnd())) return null
  const called = /^\s*\(/.test(line.slice(end)) || /(^|[^\w$])new$/.test(line.slice(0, start).trimEnd())
  const builtin = called ? FUNCTIONS.get(name) : undefined
  return builtin ? { builtin, start, end } : null
}
