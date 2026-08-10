import { useState } from 'react'
import { AddChildDialog } from '@/pages/onboarding/AddChildDialog'
import { InviteParentDialog } from '@/pages/onboarding/InviteParentDialog'
import { createChildAccountFn } from '@/lib/functions'

interface FirestoreMember {
  uid: string
  firstName: string
  role: 'parent' | 'child'
}

interface Props {
  familyId: string
  members: FirestoreMember[]
}

export function FamilyView({ familyId, members }: Props) {
  const [addChildOpen, setAddChildOpen] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleAddChild = async (firstName: string, pin: string) => {
    setLoading(true)
    setError('')
    try {
      await createChildAccountFn({ firstName, pin, familyId })
      setAddChildOpen(false)
    } catch {
      setError('Lapsen lisäys epäonnistui.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: 'var(--space-4)' }}>
      <h2 style={{ margin: '0 0 var(--space-4)' }}>Perhe</h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
        {members.map(m => (
          <div key={m.uid} className="card" style={{ flexDirection: 'row', alignItems: 'center', gap: 'var(--space-3)' }}>
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
            <span className="tag tag-accent">{m.role === 'parent' ? 'Vanhempi' : 'Lapsi'}</span>
          </div>
        ))}
      </div>

      {error && <p style={{ fontSize: 13, color: 'oklch(50% 0.18 25)', margin: '0 0 var(--space-2)' }}>{error}</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        <button type="button" className="btn btn-primary btn-block"
          onClick={() => setAddChildOpen(true)} disabled={loading}>
          Lisää lapsi
        </button>
        <button type="button" className="btn btn-secondary btn-block"
          onClick={() => setInviteOpen(true)} disabled={loading}>
          Kutsu toinen vanhempi
        </button>
      </div>

      {addChildOpen && (
        <AddChildDialog onAdd={handleAddChild} onClose={() => setAddChildOpen(false)} />
      )}
      {inviteOpen && (
        <InviteParentDialog onClose={() => setInviteOpen(false)} />
      )}
    </div>
  )
}
