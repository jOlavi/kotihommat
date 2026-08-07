import { useState } from 'react'
import { AddChildDialog } from '@/pages/onboarding/AddChildDialog'
import { InviteParentDialog } from '@/pages/onboarding/InviteParentDialog'

interface Member {
  name: string
  role: 'parent' | 'child'
}

interface Props {
  members: Member[]
  onAddChild: (name: string) => void
}

export function FamilyView({ members, onAddChild }: Props) {
  const [addChildOpen, setAddChildOpen] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)

  return (
    <div style={{ padding: 'var(--space-4)' }}>
      <h2 style={{ margin: '0 0 var(--space-4)' }}>Perhe</h2>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-2)',
          marginBottom: 'var(--space-4)',
        }}
      >
        {members.map(m => (
          <div
            key={m.name}
            className="card"
            style={{ flexDirection: 'row', alignItems: 'center', gap: 'var(--space-3)' }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: '50%',
                border: '1.5px solid var(--color-divider)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flex: 'none',
                fontFamily: 'var(--font-heading)',
                fontWeight: 600,
              }}
            >
              {m.name[0].toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 600, fontFamily: 'var(--font-heading)' }}>
                {m.name}
              </div>
              <div style={{ fontSize: 12, opacity: 0.6 }}>
                {m.role === 'parent' ? 'Vanhempi' : 'Lapsi'}
              </div>
            </div>
            <span className="tag tag-accent">
              {m.role === 'parent' ? 'Vanhempi' : 'Lapsi'}
            </span>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        <button
          type="button"
          className="btn btn-primary btn-block"
          onClick={() => setAddChildOpen(true)}
        >
          Lisää lapsi
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-block"
          onClick={() => setInviteOpen(true)}
        >
          Kutsu toinen vanhempi
        </button>
      </div>

      {addChildOpen && (
        <AddChildDialog
          onAdd={name => { onAddChild(name); setAddChildOpen(false) }}
          onClose={() => setAddChildOpen(false)}
        />
      )}
      {inviteOpen && (
        <InviteParentDialog onClose={() => setInviteOpen(false)} />
      )}
    </div>
  )
}
