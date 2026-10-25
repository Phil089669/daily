import { createHashRouter } from 'react-router'
import { TodayPage } from '../features/today/TodayPage.tsx'
import { AppShell } from './AppShell'

// Heute loads with the app; other pages load on first visit (the service worker caches all of them for offline use).
const page = (load: () => Promise<{ default: React.ComponentType }>) => async () => ({ Component: (await load()).default })

// Hash routing: GitHub Pages has no fallback for client-side routes.
export const router = createHashRouter([
  {
    element: <AppShell />,
    children: [
      { index: true, element: <TodayPage /> },
      { path: 'gewohnheiten', lazy: page(() => import('../features/habits/HabitsPage.tsx').then((m) => ({ default: m.HabitsPage }))) },
      { path: 'gewohnheiten/neu', lazy: page(() => import('../features/habits/HabitFormPage.tsx').then((m) => ({ default: m.HabitFormPage }))) },
      { path: 'gewohnheiten/:id', lazy: page(() => import('../features/habits/HabitFormPage.tsx').then((m) => ({ default: m.HabitFormPage }))) },
      { path: 'kategorien', lazy: page(() => import('../features/habits/CategoriesPage.tsx').then((m) => ({ default: m.CategoriesPage }))) },
      { path: 'sport', lazy: page(() => import('../features/sport/SportPage.tsx').then((m) => ({ default: m.SportPage }))) },
      { path: 'denken', lazy: page(() => import('../features/think/ThinkPage.tsx').then((m) => ({ default: m.ThinkPage }))) },
      { path: 'fokus', lazy: page(() => import('../features/focus/FocusPage.tsx').then((m) => ({ default: m.FocusPage }))) },
      { path: 'statistik', lazy: page(() => import('../features/stats/StatsPage.tsx').then((m) => ({ default: m.StatsPage }))) },
      { path: 'statistik/:id', lazy: page(() => import('../features/stats/HabitStatsPage.tsx').then((m) => ({ default: m.HabitStatsPage }))) },
      { path: 'einstellungen', lazy: page(() => import('../features/settings/SettingsPage.tsx').then((m) => ({ default: m.SettingsPage }))) },
    ],
  },
])
