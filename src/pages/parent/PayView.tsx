import { useState } from 'react'
import { ChildProfile, makeDefaultProfile } from '@/pages/parent/ProfileView'
import { PayDialog } from '@/pages/parent/PayDialog'

function formatPrice(cents: number): string {
  return (cents / 100).toLocaleString('fi-FI', { minimumFractionDigits: 2 })
}

interface Props {
  childNames: string[]
  profiles: Record<string, ChildProfile>
  updateProfile: (name: string, fn: (p: ChildProfile) => ChildProfile) => void
}

export function PayView({ childNames, profiles, updateProfile }: Props) {
  const [selectedName, setSelectedName] = useState(childNames[0] ?? '')
  const [payOpen, setPayOpen] = useState(false)

  const handlePaySave = (amountCents: number) => {
    const date = new Date().toLocaleDateString('fi-FI', {
      day: 'numeric', month: 'numeric', year: 'numeric',
    })
    updateProfile(selectedName, p => ({
      ...p,
      paidCents: p.paidCents + amountCents,
      payments: [...p.payments, { id: crypto.randomUUID(), amountCents, date }],
    }))
    setPayOpen(false)
  }

  if (childNames.length === 0) {
    return (
      <div style={{ padding: 'var(--space-4)' }}>
        <p className="text-muted">Ei lapsia. Lisää lapsia Perhe-välilehdeltä.</p>
      </div>
    )
  }

  const profile = profiles[selectedName] ?? makeDefaultProfile()
  const odottaa = profile.earnedCents - profile.paidCents

  return (
    <div style={{ padding: 'var(--space-4)' }}>
      <h2 style={{ margin: '0 0 var(--space-3)' }}>Maksut</h2>

      <div className="seg" style={{ width: '100%', marginBottom: 'var(--space-4)' }}>
        {childNames.map(n => (
          <label key={n} className="seg-opt" style={{ flex: 1, justifyContent: 'center' }}>
            <input type="radio" name="paytab"
              checked={selectedName === n} onChange={() => setSelectedName(n)} />
            {n}
          </label>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
        {[
          { label: 'Ansaittu', cents: profile.earnedCents, accent: false },
          { label: 'Maksettu', cents: profile.paidCents, accent: false },
          { label: 'Odottaa', cents: odottaa, accent: true },
        ].map(({ label, cents, accent }) => (
          <div key={label} className="card" style={{ alignItems: 'center', textAlign: 'center', padding: 'var(--space-2)' }}>
            <div className="card-kicker" style={{ fontSize: 9 }}>{label}</div>
            <div style={{
              fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 16,
              ...(accent ? { color: 'var(--color-accent-700)' } : {}),
            }}>
              {formatPrice(cents)} €
            </div>
          </div>
        ))}
      </div>

      <h5 style={{ margin: '0 0 var(--space-2)' }}>Maksuhistoria</h5>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 'var(--space-4)' }}>
        {profile.payments.length === 0 ? (
          <p style={{ fontSize: 12, opacity: 0.5, margin: 0 }}>Ei maksuja vielä.</p>
        ) : profile.payments.map(p => (
          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 13 }}>
            <span className="tag tag-accent">{formatPrice(p.amountCents)} €</span>
            <span style={{ opacity: 0.7 }}>{p.date}</span>
          </div>
        ))}
      </div>

      <button type="button" className="btn btn-primary btn-block"
        disabled={odottaa <= 0}
        onClick={() => setPayOpen(true)}>
        Merkitse maksetuksi
      </button>

      {payOpen && (
        <PayDialog
          childName={selectedName}
          maxCents={odottaa}
          onSave={handlePaySave}
          onClose={() => setPayOpen(false)}
        />
      )}
    </div>
  )
}
