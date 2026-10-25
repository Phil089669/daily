import type { AuthError } from '@supabase/supabase-js'
import { useState, type FormEvent } from 'react'
import { primaryButton, quietButton, textInput } from '../../components/styles.ts'
import { supabase } from '../../data/supabase.ts'

const emailKey = 'daily.email'

function rememberedEmail(): string {
  try {
    return localStorage.getItem(emailKey) ?? ''
  } catch {
    return ''
  }
}

function sendError(error: AuthError): string {
  if (error.status === 429) return 'Zu viele Versuche. Warte ein paar Minuten und fordere dann einen neuen Code an.'
  if (error.code === 'signup_disabled' || error.code === 'otp_disabled') return 'Für diese E-Mail-Adresse gibt es kein Konto.'
  if (!navigator.onLine) return 'Keine Verbindung. Für die Anmeldung brauchst du Internet.'
  return `Der Code konnte nicht gesendet werden: ${error.message}`
}

/** Sign-in with a one-time code from an email. A code works inside the home-screen app; a link would open Safari. */
export function LoginPage() {
  const [email, setEmail] = useState(rememberedEmail)
  const [code, setCode] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function sendCode(event: FormEvent) {
    event.preventDefault()
    if (!supabase) return
    setBusy(true)
    setError(null)
    const { error: sendFailed } = await supabase.auth.signInWithOtp({ email: email.trim() })
    setBusy(false)
    if (sendFailed) {
      setError(sendError(sendFailed))
      return
    }
    try {
      localStorage.setItem(emailKey, email.trim())
    } catch {
      // Remembering the address is only a convenience.
    }
    setCodeSent(true)
  }

  async function signIn(event: FormEvent) {
    event.preventDefault()
    if (!supabase) return
    setBusy(true)
    setError(null)
    const { error: verifyFailed } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'email' })
    setBusy(false)
    if (verifyFailed) setError('Der Code stimmt nicht oder ist abgelaufen. Fordere einen neuen an.')
  }

  return (
    <main className="grid-paper min-h-dvh px-6 pt-[calc(env(safe-area-inset-top)+4rem)] pb-12">
      <div className="max-w-sm">
        <h1 className="text-display font-bold tracking-tight">Daily</h1>
        {codeSent ? (
          <form onSubmit={signIn} className="mt-8">
            <p className="mb-6 text-muted">Wir haben dir einen Code an {email.trim()} geschickt.</p>
            <label htmlFor="code" className="mb-2 block text-small font-semibold">
              Code aus der E-Mail
            </label>
            <input
              id="code"
              className={`${textInput} w-full text-title tracking-[0.3em]`}
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]*"
              maxLength={10}
              required
              autoFocus
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
            />
            {error && <p className="mt-3 text-small">{error}</p>}
            <button type="submit" className={`${primaryButton} mt-6 w-full`} disabled={busy || code.length < 6}>
              Anmelden
            </button>
            <button type="button" className={`${quietButton} mt-2`} onClick={() => setCodeSent(false)}>
              Neuen Code anfordern
            </button>
          </form>
        ) : (
          <form onSubmit={sendCode} className="mt-8">
            <p className="mb-6 text-muted">Melde dich mit deiner E-Mail-Adresse an. Du bekommst einen Code per Mail.</p>
            <label htmlFor="email" className="mb-2 block text-small font-semibold">
              E-Mail-Adresse
            </label>
            <input
              id="email"
              className={`${textInput} w-full`}
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            {error && <p className="mt-3 text-small">{error}</p>}
            <button type="submit" className={`${primaryButton} mt-6 w-full`} disabled={busy}>
              Code senden
            </button>
          </form>
        )}
      </div>
    </main>
  )
}
