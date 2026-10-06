import { describe, expect, it } from 'vitest'
import { combosFor, comboText, commandFor, SHORTCUT_SECTIONS, withShortcut, type KeyPress } from './shortcuts'

const press = (key: string, mods: Partial<KeyPress> = {}, code = ''): KeyPress => ({
  key,
  code,
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  shiftKey: false,
  ...mods,
})

describe('commandFor', () => {
  it('steps with plain keys when nothing is being typed', () => {
    expect(commandFor(press(' '), 'other', 'win')).toBe('playPause')
    expect(commandFor(press('ArrowRight'), 'other', 'win')).toBe('nextStep')
    expect(commandFor(press('ArrowLeft'), 'button', 'win')).toBe('prevStep')
    expect(commandFor(press('Home'), 'other', 'win')).toBe('firstStep')
    expect(commandFor(press('End'), 'other', 'win')).toBe('lastStep')
    expect(commandFor(press('?', { shiftKey: true }), 'other', 'win')).toBe('showShortcuts')
  })

  it('leaves plain keys to text boxes, and to the editor', () => {
    for (const where of ['text', 'sideText', 'editor'] as const) {
      expect(commandFor(press(' '), where, 'win')).toBeNull()
      expect(commandFor(press('ArrowRight'), where, 'win')).toBeNull()
      expect(commandFor(press('?', { shiftKey: true }), where, 'win')).toBeNull()
    }
  })

  it('lets Space press a focused button and the slider handle its own keys', () => {
    expect(commandFor(press(' '), 'button', 'win')).toBeNull()
    expect(commandFor(press(' '), 'range', 'win')).toBe('playPause')
    expect(commandFor(press('ArrowRight'), 'range', 'win')).toBeNull()
    expect(commandFor(press('End'), 'range', 'win')).toBeNull()
  })

  it('steps with Alt+, and Alt+. by physical key, also as ⌥ on a Mac', () => {
    expect(commandFor(press('.', { altKey: true }, 'Period'), 'other', 'win')).toBe('nextStep')
    expect(commandFor(press(',', { altKey: true }, 'Comma'), 'other', 'win')).toBe('prevStep')
    expect(commandFor(press('>', { altKey: true, shiftKey: true }, 'Period'), 'other', 'win')).toBe('lastStep')
    expect(commandFor(press('<', { altKey: true, shiftKey: true }, 'Comma'), 'other', 'win')).toBe('firstStep')
    expect(commandFor(press('≥', { altKey: true }, 'Period'), 'other', 'mac')).toBe('nextStep')
    // Option+, types ≤ in a text box.
    expect(commandFor(press('≤', { altKey: true }, 'Comma'), 'sideText', 'mac')).toBeNull()
  })

  it('uses Ctrl on Windows and Linux, ⌘ on a Mac', () => {
    expect(commandFor(press('Enter', { ctrlKey: true }), 'other', 'win')).toBe('playPause')
    expect(commandFor(press('Enter', { metaKey: true }), 'other', 'win')).toBeNull()
    expect(commandFor(press('Enter', { metaKey: true }), 'other', 'mac')).toBe('playPause')
    expect(commandFor(press('Enter', { ctrlKey: true }), 'other', 'mac')).toBeNull()
    expect(commandFor(press('i', { ctrlKey: true }, 'KeyI'), 'sideText', 'linux')).toBe('askClaude')
  })

  it('keeps Ctrl+Enter for text boxes, since the chat box sends on Enter', () => {
    expect(commandFor(press('Enter', { ctrlKey: true }), 'sideText', 'win')).toBeNull()
  })

  it('follows the letter typed for Ctrl+I, and the physical key for non-Latin layouts', () => {
    // Dvorak: the key typing "i" is where QWERTY has G.
    expect(commandFor(press('i', { ctrlKey: true }, 'KeyG'), 'other', 'win')).toBe('askClaude')
    expect(commandFor(press('c', { ctrlKey: true }, 'KeyI'), 'other', 'win')).toBeNull()
    // Russian: the physical I key types ш.
    expect(commandFor(press('ш', { ctrlKey: true }, 'KeyI'), 'other', 'win')).toBe('askClaude')
  })

  it('blocks the Save Page dialog everywhere, even in the editor', () => {
    for (const where of ['editor', 'text', 'other'] as const) {
      expect(commandFor(press('s', { ctrlKey: true }, 'KeyS'), where, 'win')).toBe('save')
    }
    expect(commandFor(press('s', { metaKey: true }, 'KeyS'), 'editor', 'mac')).toBe('save')
  })

  it('leaves the editor to its own key bindings', () => {
    expect(commandFor(press('Enter', { ctrlKey: true }), 'editor', 'win')).toBeNull()
    expect(commandFor(press('i', { ctrlKey: true }, 'KeyI'), 'editor', 'win')).toBeNull()
    expect(commandFor(press('.', { altKey: true }, 'Period'), 'editor', 'win')).toBeNull()
  })

  it('sends Esc in the side panel back to the code', () => {
    expect(commandFor(press('Escape'), 'sideText', 'win')).toBe('focusEditor')
    expect(commandFor(press('Escape'), 'other', 'win')).toBeNull()
  })

  it('ignores combos that belong to the browser or the OS', () => {
    expect(commandFor(press('Enter', { ctrlKey: true, shiftKey: true }), 'other', 'win')).toBeNull()
    expect(commandFor(press('ArrowRight', { shiftKey: true }), 'other', 'win')).toBeNull()
    expect(commandFor(press('ArrowLeft', { altKey: true }, 'ArrowLeft'), 'other', 'win')).toBeNull()
  })
})

describe('shortcut labels', () => {
  it('prints Ctrl combos on Windows and symbols in VS Code order on a Mac', () => {
    expect(comboText('Mod+Shift+K', 'win')).toBe('Ctrl+Shift+K')
    expect(comboText('Mod+Shift+K', 'mac')).toBe('⇧⌘K')
    expect(comboText('Mod+Alt+F', 'mac')).toBe('⌥⌘F')
    expect(comboText('Ctrl+Shift+Alt+↓', 'linux')).toBe('Ctrl+Shift+Alt+↓')
  })

  it('picks the per-platform keys, with pc covering Windows and Linux', () => {
    const row = SHORTCUT_SECTIONS.flatMap((s) => s.rows).find((r) => r.label === 'Find / replace')!
    expect(combosFor(row.keys, 'linux')).toEqual(['Ctrl+F', 'Ctrl+H'])
    expect(combosFor(row.keys, 'mac')).toEqual(['Mod+F', 'Mod+Alt+F'])
  })

  it('adds the keys to a tooltip', () => {
    expect(withShortcut('Next step', 'nextStep', 'win')).toBe('Next step (Alt+. or →)')
    expect(withShortcut('Play', 'playPause', 'mac')).toBe('Play (⌘Enter or Space)')
  })
})
