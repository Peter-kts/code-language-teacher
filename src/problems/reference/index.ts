import { ADVANCED } from './advanced'
import { ALGORITHMS } from './algorithms'
import { FIRST } from './first'
import { GRAPHS } from './graphs'
import { LINKED } from './linked'
import { PATTERNS } from './patterns'
import type { References } from './types'

/** Worked answers for every problem, by id (only the tests use them). */
export const REFERENCES: References = { ...FIRST, ...PATTERNS, ...LINKED, ...GRAPHS, ...ADVANCED, ...ALGORITHMS }
