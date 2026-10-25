import { createContext, use } from 'react'
import type { Undo } from '../data/actions.ts'

export const UndoContext = createContext<(message: string, undo: Undo) => void>(() => {})

/** Shows a bar with the last action and a button to take it back. */
export function useUndo() {
  return use(UndoContext)
}
