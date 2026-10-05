import { describe, expect, it } from 'vitest'
import { splitFences } from './Chat'

describe('splitFences', () => {
  it('splits prose and closed code blocks', () => {
    expect(splitFences('Use a loop:\n```python\nfor x in xs:\n    print(x)\n```\nDone.')).toEqual([
      { text: 'Use a loop:' },
      { code: 'for x in xs:\n    print(x)', closed: true },
      { text: 'Done.' },
    ])
  })

  it('marks a block still streaming as not closed', () => {
    expect(splitFences('Here:\n```python\nx = 1\n')).toEqual([{ text: 'Here:' }, { code: 'x = 1', closed: false }])
  })
})
