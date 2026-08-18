import { useState } from 'react'
import { ChevronLeft, Pencil } from 'lucide-react'
import { doc, setDoc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { createChildAuthAccount, updateChildAuthPin } from '@/lib/childAuth'
import { AddChildDialog } from '@/pages/onboarding/AddChildDialog'
import { Member } from '@/types'

interface Props {
  familyId: string
  familyCode: string
  members: Member[]
  onBack?: () => void
}

function generateUsername(firstName: string, familyCode: string): string {
  const name = firstName.toLowerCase().replace(/\s+/g, '')
  return `${name}.${familyCode.toLowerCase()}`
}

function displayUsername(username: string): string {
  const [name, code] = username.split('.')
  return `${name}.${(code ?? '').toUpperCase()}`
}

export function FamilyView({ familyId, familyCode, members, onBack }: Props) {
  const [addChildOpen, setAddChildOpen] = useState(false)
  const [addParentOpen, setAddParentOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [renamingMember, setRenamingMember] = useState<Member | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [renameLoading, setRenameLoading] = useState(false)
  const [pinEditingUid, setPinEditingUid] = useState('')
  const [newPin, setNewPin] = useState('')
  const [pinLoading, setPinLoading] = useState(false)
  const [pinError, setPinError] = useState('')

  const handleAddParent = async (firstName: string, pin: string) => {
    setLoading(true); setError('')
    try {
      const username = generateUsername(firstName, familyCode)
      const uid = await createChildAuthAccount(username, pin, firstName)
      await setDoc(doc(db, `families/${familyId}/members/${uid}`), {
        role: 'parent', firstName, familyId, username, pin,
      })
      await setDoc(doc(db, `userFamilies/${uid}`), { familyId, role: 'parent' })
      setAddParentOpen(false)
    } catch {
      setError('Vanhemman lisäys epäonnistui.')
    } finally {
      setLoading(false)
    }
  }

  const handleAddChild = async (firstName: string, pin: string) => {
    setLoading(true); setError('')
    try {
      const username = generateUsername(firstName, familyCode)
      const uid = await createChildAuthAccount(username, pin, firstName)
      await setDoc(doc(db, `families/${familyId}/members/${uid}`), {
        role: 'child', firstName, familyId, username, pin, paidTotal: 0,
      })
      await setDoc(doc(db, `userFamilies/${uid}`), { familyId, role: 'child' })
      setAddChildOpen(false)
    } catch {
      setError('Lapsen lisäys epäonnistui.')
    } finally {
      setLoading(false)
    }
  }

  const handleRenameOpen = (m: Member) => {
    setRenamingMember(m)
    setRenameValue(m.firstName)
  }

  const handleRenameSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!renamingMember || !renameValue.trim()) return
    setRenameLoading(true)
    try {
      await updateDoc(doc(db, `families/${familyId}/members/${renamingMember.uid}`), {
        firstName: renameValue.trim(),
      })
      setRenamingMember(null)
    } finally {
      setRenameLoading(false)
    }
  }

  const handlePinSave = async (m: Member) => {
    if (!/^\d{4}$/.test(newPin)) { setPinError('PIN tulee olla 4 numeroa'); return }
    if (!m.username || !m.pin) { setPinError('Käyttäjätiedot puuttuvat'); return }
    setPinLoading(true); setPinError('')
    try {
      await updateChildAuthPin(m.username, m.pin, newPin)
      await updateDoc(doc(db, `families/${familyId}/members/${m.uid}`), { pin: newPin })
      setPinEditingUid(''); setNewPin('')
    } catch {
      setPinError('PIN:n vaihto epäonnistui')
    } finally {
      setPinLoading(false)
    }
  }

  return (
    <div style={{ padding: 'var(--space-4)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
        {onBack && (
          <button type="button" className="btn btn-ghost btn-icon" onClick={onBack} aria-label="Takaisin">
            <ChevronLeft size={18} />
          </button>
        )}
        <h2 style={{ margin: 0 }}>Perhe</h2>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
        {members.map(m => (
          <div key={m.uid} className="card" style={{ flexDirection: 'column', gap: 'var(--space-2)' }}>
            {/* Yläosa: avatar + nimi + kynä */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <div style={{
                width: 38, height: 38, borderRadius: '50%',
                border: '1.5px solid var(--color-divider)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
                fontFamily: 'var(--font-heading)', fontWeight: 600,
              }}>
                {m.firstName[0].toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 600, fontFamily: 'var(--font-heading)' }}>{m.firstName}</div>
                <div style={{ fontSize: 12, opacity: 0.6 }}>{m.role === 'parent' ? 'Vanhempi' : 'Lapsi'}</div>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-icon"
                aria-label="Muokkaa nimeä"
                onClick={() => handleRenameOpen(m)}
              >
                <Pencil size={15} />
              </button>
            </div>

            {/* Kirjautumistiedot — vain käyttäjille joilla on username */}
            {m.username && (
              <div style={{ borderTop: '1px solid var(--color-divider)', paddingTop: 'var(--space-2)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 12 }}>
                  <span style={{ opacity: 0.55, width: 60 }}>Tunnus</span>
                  <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontVariantNumeric: 'lining-nums' }}>
                    {displayUsername(m.username)}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 12 }}>
                  <span style={{ opacity: 0.55, width: 60 }}>PIN</span>
                  {pinEditingUid === m.uid ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                      <input
                        className="input"
                        type="password"
                        inputMode="numeric"
                        maxLength={4}
                        placeholder="1234"
                        value={newPin}
                        onChange={e => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        style={{ width: 80, padding: '2px 8px', fontSize: 13 }}
                        autoFocus
                      />
                      <button type="button" className="btn btn-primary" style={{ padding: '2px 10px', fontSize: 12 }}
                        onClick={() => handlePinSave(m)} disabled={pinLoading || newPin.length !== 4}>
                        Tallenna
                      </button>
                      <button type="button" className="btn btn-ghost" style={{ padding: '2px 8px', fontSize: 12 }}
                        onClick={() => { setPinEditingUid(''); setNewPin(''); setPinError('') }}>
                        Peruuta
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                      <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, letterSpacing: '0.1em' }}>
                        {m.pin ?? '••••'}
                      </span>
                      <button type="button" className="btn btn-ghost" style={{ padding: '2px 8px', fontSize: 12 }}
                        onClick={() => { setPinEditingUid(m.uid); setNewPin(''); setPinError('') }}>
                        Vaihda
                      </button>
                    </div>
                  )}
                </div>
                {pinEditingUid === m.uid && pinError && (
                  <p style={{ fontSize: 12, color: 'oklch(50% 0.18 25)', margin: 0 }}>{pinError}</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {error && <p style={{ fontSize: 13, color: 'oklch(50% 0.18 25)', margin: '0 0 var(--space-2)' }}>{error}</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        <button type="button" className="btn btn-primary btn-block"
          onClick={() => setAddChildOpen(true)} disabled={loading}>
          {loading ? 'Lisätään…' : 'Lisää lapsi'}
        </button>
        <button type="button" className="btn btn-secondary btn-block"
          onClick={() => setAddParentOpen(true)} disabled={loading}>
          Lisää vanhempi
        </button>
      </div>

      {addChildOpen && (
        <AddChildDialog onAdd={handleAddChild} onClose={() => setAddChildOpen(false)} />
      )}
      {addParentOpen && (
        <AddChildDialog role="parent" onAdd={handleAddParent} onClose={() => setAddParentOpen(false)} />
      )}

      {renamingMember && (
        <div className="dialog-backdrop">
          <form className="dialog" onSubmit={handleRenameSave}>
            <div className="dialog-title">Muokkaa nimeä</div>
            <div className="field">
              <label htmlFor="rename-input">Nimi</label>
              <input
                className="input"
                id="rename-input"
                value={renameValue}
                onChange={e => setRenameValue(e.target.value)}
                autoFocus
                required
              />
            </div>
            <div className="dialog-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setRenamingMember(null)}>
                Peruuta
              </button>
              <button type="submit" className="btn btn-primary" disabled={renameLoading}>
                {renameLoading ? 'Tallennetaan…' : 'Tallenna'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
