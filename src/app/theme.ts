export type ThemeChoice = 'dark' | 'light' | 'system'

const storageKey = 'daily.theme'

export function readTheme(): ThemeChoice {
  try {
    const stored = localStorage.getItem(storageKey)
    return stored === 'light' || stored === 'system' ? stored : 'dark'
  } catch {
    return 'dark'
  }
}

/** Applies a theme and remembers it on this device. */
export function applyTheme(choice: ThemeChoice) {
  const root = document.documentElement
  if (choice === 'dark') delete root.dataset.theme
  else root.dataset.theme = choice
  try {
    localStorage.setItem(storageKey, choice)
  } catch {
    // Storage can be unavailable (private mode); the theme still applies for this visit.
  }
  const paper = getComputedStyle(root).getPropertyValue('--paper').trim()
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', paper)
}
