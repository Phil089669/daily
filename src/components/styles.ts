// Shared class names, so buttons and fields look the same everywhere.

export const primaryButton =
  'inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-fg px-5 font-semibold text-paper disabled:opacity-40'

export const secondaryButton =
  'inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-rule bg-paper px-5 font-semibold text-fg hover:bg-sheet disabled:opacity-40'

export const quietButton =
  'inline-flex h-12 items-center gap-2 rounded-lg px-3 font-semibold text-muted hover:text-fg disabled:opacity-40'

export const iconButton = 'grid size-12 shrink-0 place-items-center rounded-lg text-muted hover:text-fg disabled:opacity-30'

/** Without a width, so each use can set its own. */
export const textInput =
  'h-12 rounded-lg border border-rule bg-paper px-3 text-body text-fg placeholder:text-muted/70 focus-visible:border-fg'

export const fieldLabel = 'mb-2 block text-small font-semibold'

export const sectionTitle = 'mb-3 text-title font-semibold'
