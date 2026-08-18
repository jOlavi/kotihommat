import { useState, useEffect } from 'react'
import { collection, doc, addDoc, updateDoc, onSnapshot, increment } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Member, TaskInstance } from '@/types'
import { PayDialog } from '@/pages/parent/PayDialog'

interface Payment {
  id: string
  amountCents: number
  date: string
}

interface Props {
  familyId: string
  firestoreMembers: Member[]
}

function formatPrice(cents: number): string {
  return (cents / 100).toLocaleString('fi-FI', { minimumFractionDigits: 2 })
}

export function PayView({ familyId, firestoreMembers }: Props) {
  const childMembers = firestoreMembers.filter(m => m.role === 'child')
  const [selectedUid, setSelectedUid] = useState(childMembers[0]?.uid ?? '')
  const [allTaskInstances, setAllTaskInstances] = useState<TaskInstance[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [payOpen, setPayOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (childMembers.length > 0 && !selectedUid) setSelectedUid(childMembers[0].uid)
  }, [firestoreMembers])

  useEffect(() => {
    return onSnapshot(
      collection(db, `families/${familyId}/taskInstances`),
      snap => setAllTaskInstances(snap.docs.map(d => ({ id: d.id, ...d.data() } as TaskInstance)))
    )
  }, [familyId])

  useEffect(() => {
    if (!selectedUid) return
    return onSnapshot(
      collection(db, `families/${familyId}/members/${selectedUid}/payments`),
      snap => setPayments(
        snap.docs
          .map(d => ({ id: d.id, ...d.data() } as Payment))
          .sort((a, b) => b.date.localeCompare(a.date))
      )
    )
  }, [familyId, selectedUid])

  const selectedMember = childMembers.find(m => m.uid === selectedUid)
  const earnedCents = allTaskInstances
    .filter(t => t.memberId === selectedUid && (t.status === 'tehty' || t.status === 'merkitty'))
    .reduce((sum, t) => sum + t.priceCents, 0)
  const paidCents = selectedMember?.paidTotal ?? 0
  const outstandingCents = Math.max(0, earnedCents - paidCents)

  const handlePaySave = async (amountCents: number) => {
    if (!selectedUid) return
    setLoading(true); setError('')
    try {
      await addDoc(
        collection(db, `families/${familyId}/members/${selectedUid}/payments`),
        { amountCents, date: new Date().toISOString() }
      )
      await updateDoc(
        doc(db, `families/${familyId}/members/${selectedUid}`),
        { paidTotal: increment(amountCents) }
      )
      setPayOpen(false)
    } catch {
      setError('Tallennus epäonnistui')
    } finally {
      setLoading(false)
    }
  }

  if (childMembers.length === 0) {
    return (
      <div style={{ padding: 'var(--space-4)' }}>
        <p className="text-muted">Ei lapsia. Lisää lapsia Perhe-välilehdeltä.</p>
      </div>
    )
  }

  return (
    <div style={{ padding: 'var(--space-4)' }}>
      <h2 style={{ margin: '0 0 var(--space-3)' }}>Maksut</h2>

      <div className="seg" style={{ width: '100%', marginBottom: 'var(--space-4)' }}>
        {childMembers.map(m => (
          <label key={m.uid} className="seg-opt" style={{ flex: 1, justifyContent: 'center' }}>
            <input type="radio" name="paytab"
              checked={selectedUid === m.uid} onChange={() => setSelectedUid(m.uid)} />
            {m.firstName}
          </label>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
        {[
          { label: 'Ansaittu', cents: earnedCents, accent: false },
          { label: 'Maksettu', cents: paidCents, accent: false },
          { label: 'Odottaa', cents: outstandingCents, accent: true },
        ].map(({ label, cents, accent }) => (
          <div key={label} className="card" style={{ alignItems: 'center', textAlign: 'center', padding: 'var(--space-2)' }}>
            <div className="card-kicker" style={{ fontSize: 9 }}>{label}</div>
            <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 16, ...(accent ? { color: 'var(--color-accent-700)' } : {}) }}>
              {formatPrice(cents)} €
            </div>
          </div>
        ))}
      </div>

      {error && <p style={{ fontSize: 13, color: 'oklch(50% 0.18 25)', margin: '0 0 var(--space-2)' }}>{error}</p>}

      <button type="button" className="btn btn-primary btn-block"
        style={{ marginBottom: 'var(--space-4)' }}
        disabled={outstandingCents <= 0 || loading}
        onClick={() => setPayOpen(true)}>
        Merkitse maksetuksi
      </button>

      <h5 style={{ margin: '0 0 var(--space-2)' }}>Maksuhistoria</h5>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {payments.length === 0 ? (
          <p style={{ fontSize: 12, opacity: 0.5, margin: 0 }}>Ei maksuja vielä.</p>
        ) : payments.map(p => (
          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 13 }}>
            <span className="tag tag-accent">{formatPrice(p.amountCents)} €</span>
            <span style={{ opacity: 0.7 }}>
              {new Date(p.date).toLocaleDateString('fi-FI', { day: 'numeric', month: 'numeric', year: 'numeric' })}
            </span>
          </div>
        ))}
      </div>

      {payOpen && (
        <PayDialog
          childName={selectedMember?.firstName ?? ''}
          maxCents={outstandingCents}
          onSave={handlePaySave}
          onClose={() => setPayOpen(false)}
        />
      )}
    </div>
  )
}
