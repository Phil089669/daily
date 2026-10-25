import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router'
import type { Undo } from '../data/actions.ts'
import { UndoContext } from './undoContext.ts'

type Entry = { id: number; message: string; undo: Undo; path: string }

const visibleMs = 5_000

export function UndoProvider({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const [entry, setEntry] = useState<Entry | null>(null)

  useEffect(() => {
    if (!entry) return
    const timer = setTimeout(() => setEntry(null), visibleMs)
    return () => clearTimeout(timer)
  }, [entry])

  const show = useCallback(
    (message: string, undo: Undo) => setEntry({ id: Date.now(), message, undo, path: pathname }),
    [pathname],
  )
  // The bar belongs to the page where the action happened.
  const visible = entry !== null && entry.path === pathname

  return (
    <UndoContext value={show}>
      {children}
      <div
        role="status"
        className="pointer-events-none fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+5rem)] z-20 mx-auto max-w-md md:bottom-6"
      >
        {visible && (
          <div
            key={entry.id}
            className="undo-bar pointer-events-auto flex items-center justify-between gap-3 rounded-xl bg-fg py-1 pr-1 pl-4 text-paper"
          >
            <span className="truncate text-small">{entry.message}</span>
            <button
              type="button"
              className="h-11 shrink-0 rounded-lg px-3 font-semibold"
              onClick={() => {
                setEntry(null)
                void entry.undo()
              }}
            >
              Rückgängig
            </button>
          </div>
        )}
      </div>
    </UndoContext>
  )
}
