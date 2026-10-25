const maxLength = 32

/** A short name for the Shortcuts API, e.g. "Wasser trinken" → "wasser-trinken". */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLength)
    .replace(/-+$/, '')
}

export function isValidSlug(slug: string): boolean {
  return slug.length <= maxLength && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)
}

/** `base`, or `base-2`, `base-3`, … if that is taken. */
export function uniqueSlug(base: string, taken: Set<string>): string {
  const root = base || 'gewohnheit'
  if (!taken.has(root)) return root
  for (let n = 2; ; n++) {
    const candidate = `${root}-${n}`
    if (!taken.has(candidate)) return candidate
  }
}
