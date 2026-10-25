import { Outlet } from 'react-router'
import { UndoProvider } from '../components/Undo.tsx'
import { TabBar } from './TabBar'

export function AppShell() {
  return (
    <UndoProvider>
      <div className="grid-paper min-h-dvh md:flex">
        <TabBar />
        <main className="w-full max-w-2xl px-6 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-[calc(env(safe-area-inset-bottom)+6rem)] md:px-12 md:pt-12 md:pb-12">
          <Outlet />
        </main>
      </div>
    </UndoProvider>
  )
}
