import { RouterProvider } from 'react-router/dom'
import { LoginPage } from '../features/auth/LoginPage.tsx'
import { router } from './router.tsx'
import { useSession } from './sessionContext.ts'

export function Root() {
  const session = useSession()
  if (session.status === 'loading') return null
  if (session.status === 'signedOut') return <LoginPage />
  return <RouterProvider router={router} />
}
