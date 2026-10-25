import { describe, expect, it } from 'vitest'
import { isValidSlug, slugify, uniqueSlug } from './slug.ts'

describe('slugs', () => {
  it('turns German names into short slugs', () => {
    expect(slugify('Wasser trinken')).toBe('wasser-trinken')
    expect(slugify('20 Min. lesen')).toBe('20-min-lesen')
    expect(slugify('Übungen für Füße & Waden')).toBe('uebungen-fuer-fuesse-waden')
    expect(slugify('  Café ')).toBe('cafe')
  })

  it('keeps slugs at most 32 characters without a trailing dash', () => {
    const slug = slugify('Erste Stunde nach dem Aufstehen ohne Handy')
    expect(slug.length).toBeLessThanOrEqual(32)
    expect(slug.endsWith('-')).toBe(false)
    expect(isValidSlug(slug)).toBe(true)
  })

  it('validates slugs', () => {
    expect(isValidSlug('lesen')).toBe(true)
    expect(isValidSlug('lesen-2')).toBe(true)
    expect(isValidSlug('Lesen')).toBe(false)
    expect(isValidSlug('-lesen')).toBe(false)
    expect(isValidSlug('')).toBe(false)
  })

  it('appends a number when a slug is taken', () => {
    expect(uniqueSlug('lesen', new Set())).toBe('lesen')
    expect(uniqueSlug('lesen', new Set(['lesen', 'lesen-2']))).toBe('lesen-3')
    expect(uniqueSlug('', new Set())).toBe('gewohnheit')
  })
})
