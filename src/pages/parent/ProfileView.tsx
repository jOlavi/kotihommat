import { useState } from 'react'
import { AbsenceDialog } from '@/pages/parent/AbsenceDialog'
import { PayDialog } from '@/pages/parent/PayDialog'

type DayStatus = 'full' | 'partial' | 'future' | 'poissa'

interface Absence {
  id: string
  type: 'Loma' | 'Sairas'
  range: string
}

interface Payment {
  id: string
  amountCents: number
  date: string
}

interface ChildProfile {
  earnedCents: number
  paidCents: number
  weekGrid: DayStatus[]
  absences: Absence[]
  payments: Payment[]
}

const DAY_SHORTS = ['Ma', 'Ti', 'Ke', 'To', 'Pe', 'La', 'Su']

const STATUS_META: Record<DayStatus, { tag: string; label: string }> = {
  full:    { tag: 'tag-accent',  label: 'Valmis' },
  partial: { tag: 'tag-outline', label: 'Kesken' },
  future:  { tag: 'tag-neutral', label: '–' },
  poissa:  { tag: 'tag-neutral', label: 'Poissa' },
}

function formatPrice(cents: number): string {
  return (cents / 100).toLocaleString('fi-FI', { minimumFractionDigits: 2 })
}

function makeDefaultProfile(): ChildProfile {
  return {
    earnedCents: 1850,
    paidCents: 1200,
    weekGrid: ['full', 'full', 'partial', 'future', 'future', 'future', 'future'],
    absences: [],
    payments: [{ id: 'p1', amountCents: 1200, date: '1.8.2026' }],
  }
}

interface Props {
  childNames: string[]
}

export function ProfileView({ childNames }: Props) {
  const [selectedName, setSelectedName] = useState(childNames[0] ?? '')
  const [profiles, setProfiles] = useState<Record<string, ChildProfile>>(() =>
    Object.fromEntries(childNames.map(n => [n, makeDefaultProfile()]))
  )
  const [absenceOpen, setAbsenceOpen] = useState(false)
  const [payOpen, setPayOpen] = useState(false)

  const updateProfile = (name: string, fn: (p: ChildProfile) => ChildProfile) =>
    setProfiles(prev => ({ ...prev, [name]: fn(prev[name] ?? makeDefaultProfile()) }))

  const handleAbsenceSave = (type: 'Loma' | 'Sairas', from: string, to: string) => {
    const fmt = (s: string) =>
      new Date(s).toLocaleDateString('fi-FI', { day: 'numeric', month: 'numeric' })
    const toFull = new Date(to).toLocaleDateString('fi-FI', {
      day: 'numeric', month: 'numeric', year: 'numeric',
    })
    const range = from === to ? toFull : `${fmt(from)}–${toFull}`
    updateProfile(selectedName, p => ({
      ...p,
      absences: [...p.absences, { id: crypto.randomUUID(), type, range }],
    }))
    setAbsenceOpen(false)
  }

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

  return (
    <div style={{ padding: 'var(--space-4)' }}>
      <h2 style={{ margin: '0 0 var(--space-3)' }}>Lapsen profiili</h2>

      {/* Child selector */}
      <div className="seg" style={{ width: '100%', marginBottom: 'var(--space-4)' }}>
        {childNames.map(n => (
          <label key={n} className="seg-opt" style={{ flex: 1, justifyContent: 'center' }}>
            <input type="radio" name="profiletab"
              checked={selectedName === n} onChange={() => setSelectedName(n)} />
            {n}
          </label>
        ))}
      </div>

      {/* 7-day mini-calendar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 'var(--space-4)' }}>
        {profile.weekGrid.map((status, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <span style={{ fontSize: 10, opacity: 0.55 }}>{DAY_SHORTS[i]}</span>
            <span
              className={`tag ${STATUS_META[status].tag}`}
              style={{ fontSize: 9, padding: '2px 5px' }}
            >
              {STATUS_META[status].label}
            </span>
          </div>
        ))}
      </div>

      {/* 3 stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
        {[
          { label: 'Ansaittu', cents: profile.earnedCents, accent: false },
          { label: 'Maksettu', cents: profile.paidCents, accent: false },
          { label: 'Odottaa', cents: profile.earnedCents - profile.paidCents, accent: true },
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

      {/* Absences */}
      <h5 style={{ margin: '0 0 var(--space-2)' }}>Poissaolot</h5>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 'var(--space-4)' }}>
        {profile.absences.length === 0 ? (
          <p style={{ fontSize: 12, opacity: 0.5, margin: 0 }}>Ei merkittyjä poissaoloja.</p>
        ) : profile.absences.map(a => (
          <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 13 }}>
            <span className="tag tag-neutral">{a.type}</span>
            <span style={{ opacity: 0.7 }}>{a.range}</span>
          </div>
        ))}
      </div>

      {/* Payment history */}
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

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
        <button type="button" className="btn btn-secondary" style={{ flex: 1 }}
          onClick={() => setAbsenceOpen(true)}>
          Merkitse poissaolo
        </button>
        <button type="button" className="btn btn-primary" style={{ flex: 1 }}
          disabled={profile.earnedCents - profile.paidCents <= 0}
          onClick={() => setPayOpen(true)}>
          Merkitse maksetuksi
        </button>
      </div>

      {absenceOpen && (
        <AbsenceDialog
          childName={selectedName}
          onSave={handleAbsenceSave}
          onClose={() => setAbsenceOpen(false)}
        />
      )}
      {payOpen && (
        <PayDialog
          childName={selectedName}
          maxCents={profile.earnedCents - profile.paidCents}
          onSave={handlePaySave}
          onClose={() => setPayOpen(false)}
        />
      )}
    </div>
  )
}
