import { useNavigate } from 'react-router'

/** Goes back in the app's history, or to `fallback` when the page was opened directly. */
export function useGoBack(fallback: string): () => void {
  const navigate = useNavigate()
  return () => {
    const index = (window.history.state as { idx?: number } | null)?.idx ?? 0
    if (index > 0) void navigate(-1)
    else void navigate(fallback, { replace: true })
  }
}
