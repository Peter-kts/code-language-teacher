import type { Language } from '../types'

// Which parts of a line of code are code, and which are inside a string or a comment.
// Hovers and highlights use it so a name written inside "quotes" or after a comment is left alone.

type State = { kind: 'code'; depth: number } | { kind: 'str'; quote: string; interp: boolean }

/**
 * For each position of the line, true when it is code and false inside a string or comment.
 * The {...} parts of a Python f-string and the ${...} parts of a JavaScript template literal count as code.
 * Strings and comments spanning lines aren't tracked.
 */
export function codeMask(line: string, language: Language): boolean[] {
  const mask = new Array<boolean>(line.length).fill(false)
  const python = language === 'python'
  // A stack, because a string can hold code ({...}) that holds another string.
  const stack: State[] = [{ kind: 'code', depth: 0 }]
  for (let j = 0; j < line.length; j++) {
    const top = stack[stack.length - 1]
    const ch = line[j]
    if (top.kind === 'code') {
      // Inside a string's {...}, # is part of a format spec like {n:#x}, not a comment.
      if (stack.length === 1 && (python ? ch === '#' : line.startsWith('//', j))) break
      if (!python && line.startsWith('/*', j)) {
        const end = line.indexOf('*/', j + 2)
        if (end < 0) break
        j = end + 1
      } else if (ch === '"' || ch === "'" || (!python && ch === '`')) {
        const quote = python && line.startsWith(ch.repeat(3), j) ? ch.repeat(3) : ch
        const interp = python ? /(^|[^\w])[rRbB]?[fF][rR]?$/.test(line.slice(0, j)) : ch === '`'
        stack.push({ kind: 'str', quote, interp })
        j += quote.length - 1
      } else if (stack.length > 1 && ch === '}' && top.depth === 0) {
        // The end of a {...} inside a string: back to the string.
        stack.pop()
      } else {
        if (ch === '{') top.depth++
        else if (ch === '}') top.depth--
        mask[j] = true
      }
    } else if (ch === '\\') {
      j++
    } else if (top.interp && python && (ch === '{' || ch === '}') && line[j + 1] === ch) {
      j++ // {{ is a plain brace
    } else if (top.interp && (python ? ch === '{' : line.startsWith('${', j))) {
      if (!python) j++
      stack.push({ kind: 'code', depth: 0 })
    } else if (line.startsWith(top.quote, j)) {
      j += top.quote.length - 1
      stack.pop()
    }
  }
  return mask
}

/** A name: letters, digits and _ (and $ in JavaScript), not starting with a digit or inside a number like 1e5. */
export const nameRegex = (language: Language) =>
  language === 'python' ? /(?<![\w$])[A-Za-z_]\w*/g : /(?<![\w$])[A-Za-z_$][\w$]*/g
