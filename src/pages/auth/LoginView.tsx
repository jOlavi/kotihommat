import { useState } from 'react'
import { signInWithPopup, GoogleAuthProvider, signInWithCustomToken } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { childLoginFn } from '@/lib/functions'

export function LoginView() {
  const [username, setUsername] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleGoogleLogin = async () => {
    setError('')
    setLoading(true)
    try {
      await signInWithPopup(auth, new GoogleAuthProvider())
    } catch {
      setError('Google-kirjautuminen epäonnistui')
      setLoading(false)
    }
  }

  const handleChildLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim() || pin.length !== 4) return
    setError('')
    setLoading(true)
    try {
      const result = await childLoginFn({ username: username.trim(), pin })
      const data = result.data
      if (data.error === 'locked') {
        const until = data.lockedUntil
          ? new Date(data.lockedUntil).toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit' })
          : ''
        setError(`Tili lukittu 15 minuutiksi${until ? ` — avautuu ${until}` : ''}`)
      } else if (data.error === 'invalid-credentials') {
        setError('Väärä käyttäjätunnus tai PIN')
      } else if (data.token) {
        await signInWithCustomToken(auth, data.token)
      }
    } catch {
      setError('Kirjautuminen epäonnistui')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', justifyContent: 'center',
      alignItems: 'center', height: '100%',
      padding: 'var(--space-8) var(--space-6)', gap: 'var(--space-6)',
    }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{
          fontFamily: '"Bodoni Moda", var(--font-heading)',
          color: 'var(--color-accent)', fontSize: 36, margin: '0 0 var(--space-1)',
        }}>
          Kotihommat
        </h1>
        <p style={{ opacity: 0.6, margin: 0, fontSize: 14 }}>Perheen kotityöt hallintaan</p>
      </div>

      <button
        type="button"
        className="btn btn-secondary btn-block"
        onClick={handleGoogleLogin}
        disabled={loading}
        style={{ maxWidth: 340 }}
      >
        Kirjaudu Google-tilillä
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', width: '100%', maxWidth: 340 }}>
        <div style={{ flex: 1, height: 1, background: 'var(--color-divider)' }} />
        <span style={{ fontSize: 12, opacity: 0.5 }}>tai</span>
        <div style={{ flex: 1, height: 1, background: 'var(--color-divider)' }} />
      </div>

      <form
        onSubmit={handleChildLogin}
        style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', width: '100%', maxWidth: 340 }}
      >
        <div className="field">
          <label htmlFor="login-username">Käyttäjätunnus</label>
          <input
            className="input"
            id="login-username"
            placeholder="esim. aino.ABC123"
            value={username}
            onChange={e => setUsername(e.target.value)}
            autoComplete="username"
            autoCapitalize="none"
            disabled={loading}
          />
        </div>
        <div className="field">
          <label htmlFor="login-pin">PIN-koodi</label>
          <input
            className="input"
            id="login-pin"
            type="password"
            inputMode="numeric"
            maxLength={4}
            placeholder="1234"
            value={pin}
            onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
            autoComplete="current-password"
            disabled={loading}
          />
        </div>
        {error && (
          <p style={{ fontSize: 13, margin: 0, color: 'oklch(50% 0.18 25)' }}>{error}</p>
        )}
        <button
          type="submit"
          className="btn btn-primary btn-block"
          disabled={loading || !username.trim() || pin.length !== 4}
        >
          Kirjaudu
        </button>
      </form>
    </div>
  )
}
