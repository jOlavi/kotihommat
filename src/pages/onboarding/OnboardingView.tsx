import { useState } from 'react'
import { User } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { createFamilyFn, createChildAccountFn } from '@/lib/functions'
import { AddChildDialog } from './AddChildDialog'

type Step = 'create' | 'manage'

interface ChildEntry {
  firstName: string
  username: string
}

interface Props {
  user: User
  onComplete: (familyId: string) => void
}

export function OnboardingView({ user: _user, onComplete }: Props) {
  const [step, setStep] = useState<Step>('create')
  const [familyId, setFamilyId] = useState('')
  const [familyCode, setFamilyCode] = useState('')
  const [familyName, setFamilyName] = useState('')
  const [children, setChildren] = useState<ChildEntry[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleCreateFamily = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const els = e.currentTarget.elements
    const firstName = (els.namedItem('name') as HTMLInputElement).value.trim()
    const fName = (els.namedItem('family') as HTMLInputElement).value.trim()
    setLoading(true)
    setError('')
    try {
      const result = await createFamilyFn({ firstName, familyName: fName })
      const { familyId: fid, familyCode: code } = result.data
      // Force-refresh token so new familyId claim is available
      await auth.currentUser?.getIdToken(true)
      setFamilyId(fid)
      setFamilyCode(code)
      setFamilyName(fName)
      setStep('manage')
    } catch {
      setError('Perheen luonti epäonnistui. Tarkista verkkoyhteys.')
    } finally {
      setLoading(false)
    }
  }

  const handleAddChild = async (firstName: string, pin: string) => {
    setLoading(true)
    setError('')
    try {
      const result = await createChildAccountFn({ firstName, pin, familyId })
      setChildren(prev => [...prev, { firstName, username: result.data.username }])
      setDialogOpen(false)
    } catch {
      setError('Lapsen lisäys epäonnistui.')
    } finally {
      setLoading(false)
    }
  }

  const displayUsername = (username: string) => {
    const [name, code] = username.split('.')
    return `${name}.${(code ?? '').toUpperCase()}`
  }

  return (
    <div style={{
      position: 'absolute', inset: 0, background: 'var(--color-bg)',
      display: 'flex', flexDirection: 'column',
      padding: 'var(--space-8) var(--space-6)', zIndex: 50, overflowY: 'auto',
    }}>
      {step === 'create' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 'var(--space-6)' }}>
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ fontSize: 28, margin: '0 0 var(--space-2)' }}>Luo perheesi</h1>
            <p style={{ opacity: 0.7, maxWidth: '32ch', margin: '0 auto' }}>
              Aloitetaan lisäämällä sinut ensimmäisenä vanhempana.
            </p>
          </div>
          <form onSubmit={handleCreateFamily} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <div className="field">
              <label htmlFor="setup-name">Oma nimi</label>
              <input className="input" id="setup-name" name="name"
                placeholder="esim. Liisa" required disabled={loading} />
            </div>
            <div className="field">
              <label htmlFor="setup-family">Perheen nimi</label>
              <input className="input" id="setup-family" name="family"
                defaultValue="Virtanen" required disabled={loading} />
            </div>
            {error && <p style={{ fontSize: 13, margin: 0, color: 'oklch(50% 0.18 25)' }}>{error}</p>}
            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
              {loading ? 'Luodaan…' : 'Luo perhe'}
            </button>
          </form>
        </div>
      )}

      {step === 'manage' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div style={{ textAlign: 'center', paddingTop: 'var(--space-4)' }}>
            <span className="tag tag-accent" style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 13 }}>
              Perhe {familyName}
            </span>
            <div style={{ marginTop: 'var(--space-3)', padding: 'var(--space-3)', background: 'var(--color-accent-100)', borderRadius: 'var(--radius-md)' }}>
              <p style={{ fontSize: 11, opacity: 0.7, margin: '0 0 4px' }}>Perheen kirjautumiskoodi</p>
              <p style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 22, margin: 0, color: 'var(--color-accent-800)', letterSpacing: '0.1em' }}>
                {familyCode}
              </p>
              <p style={{ fontSize: 11, opacity: 0.6, margin: '4px 0 0' }}>Tallennettu. Löydät sen myöhemmin Lapset-välilehdeltä.</p>
            </div>
          </div>

          {children.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {children.map(c => (
                <div key={c.username} className="card" style={{ flexDirection: 'row', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-2) var(--space-3)' }}>
                  <div style={{ width: 30, height: 30, borderRadius: '50%', border: '1.5px solid var(--color-divider)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 13 }}>
                    {c.firstName[0].toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14 }}>{c.firstName}</div>
                    <div style={{ fontSize: 11, opacity: 0.55 }}>{displayUsername(c.username)}</div>
                  </div>
                  <span className="tag tag-accent">Lapsi</span>
                </div>
              ))}
            </div>
          )}

          {error && <p style={{ fontSize: 13, margin: 0, color: 'oklch(50% 0.18 25)' }}>{error}</p>}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginTop: 'auto' }}>
            <button type="button" className="btn btn-secondary btn-block"
              onClick={() => setDialogOpen(true)} disabled={loading}>
              Lisää lapsi
            </button>
            <button type="button" className="btn btn-primary btn-block"
              onClick={() => onComplete(familyId)} disabled={loading}>
              Valmis, siirry sovellukseen
            </button>
          </div>
        </div>
      )}

      {dialogOpen && (
        <AddChildDialog
          onAdd={handleAddChild}
          onClose={() => setDialogOpen(false)}
        />
      )}
    </div>
  )
}
