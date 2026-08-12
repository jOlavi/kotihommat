import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { collection, doc, onSnapshot, updateDoc, addDoc, setDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { AbsenceDialog } from '@/pages/parent/AbsenceDialog'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Chore, Assignment, DayKey, Member, TaskInstance } from '@/types'

interface FirestoreAbsence {
  id: string
  type: 'Loma' | 'Sairas'
  from: string
  to: string
}

const DAY_KEYS: DayKey[] = ['ma', 'ti', 'ke', 'to', 'pe', 'la', 'su']
const DAY_NAMES: Record<DayKey, string> = {
  ma: 'Maanantai', ti: 'Tiistai', ke: 'Keskiviikko',
  to: 'Torstai', pe: 'Perjantai', la: 'Lauantai', su: 'Sunnuntai',
}

function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

function getWeekId(offsetWeeks: number): string {
  const ref = new Date()
  ref.setDate(ref.getDate() + offsetWeeks * 7)
  return `${ref.getFullYear()}-W${String(getISOWeek(ref)).padStart(2, '0')}`
}

function getWeekDates(offsetWeeks: number): Date[] {
  const ref = new Date()
  ref.setDate(ref.getDate() + offsetWeeks * 7)
  const day = ref.getDay() || 7
  const monday = new Date(ref)
  monday.setDate(ref.getDate() - day + 1)
  return DAY_KEYS.map((_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

function isToday(date: Date): boolean {
  const today = new Date()
  return date.getFullYear() === today.getFullYear()
    && date.getMonth() === today.getMonth()
    && date.getDate() === today.getDate()
}

function formatPrice(cents: number): string {
  return (cents / 100).toLocaleString('fi-FI', { minimumFractionDigits: 2 })
}

function formatAbsenceRange(from: string, to: string): string {
  const fmt = (s: string) => new Date(s).toLocaleDateString('fi-FI', { day: 'numeric', month: 'numeric' })
  const toFull = new Date(to).toLocaleDateString('fi-FI', { day: 'numeric', month: 'numeric', year: 'numeric' })
  return from === to ? toFull : `${fmt(from)}–${toFull}`
}

interface Props {
  chores: Chore[]
  familyId: string
  firestoreMembers: Member[]
}

export function ProfileView({ chores, familyId, firestoreMembers }: Props) {
  const childMembers = firestoreMembers.filter(m => m.role === 'child')

  const [selectedUid, setSelectedUid] = useState(
    () => childMembers[0]?.uid ?? ''
  )
  const [absenceOpen, setAbsenceOpen] = useState(false)
  const [togglePending, setTogglePending] = useState<{ chore: Chore; memberId: string; date: string; instance: TaskInstance | undefined } | null>(null)
  const [weekOffset, setWeekOffset] = useState(0)
  const [weekAssignments, setWeekAssignments] = useState<Record<string, Assignment>>({})
  const [allTaskInstances, setAllTaskInstances] = useState<TaskInstance[]>([])
  const [absences, setAbsences] = useState<FirestoreAbsence[]>([])

  useEffect(() => {
    const weekId = getWeekId(weekOffset)
    return onSnapshot(
      collection(db, `families/${familyId}/weeklyPlans/${weekId}/assignments`),
      snap => {
        const loaded: Record<string, Assignment> = {}
        snap.docs.forEach(d => { loaded[d.id] = d.data() as Assignment })
        setWeekAssignments(loaded)
      }
    )
  }, [familyId, weekOffset])

  useEffect(() => {
    return onSnapshot(
      collection(db, `families/${familyId}/taskInstances`),
      snap => setAllTaskInstances(snap.docs.map(d => ({ id: d.id, ...d.data() } as TaskInstance)))
    )
  }, [familyId])

  useEffect(() => {
    if (!selectedUid) return
    return onSnapshot(
      collection(db, `families/${familyId}/members/${selectedUid}/absences`),
      snap => setAbsences(
        snap.docs
          .map(d => ({ id: d.id, ...d.data() } as FirestoreAbsence))
          .sort((a, b) => b.from.localeCompare(a.from))
      )
    )
  }, [familyId, selectedUid])


  const weekId = getWeekId(weekOffset)
  const weekTaskInstances = allTaskInstances.filter(t => t.memberId === selectedUid && t.isoWeek === weekId)

  const handleToggleStatus = async (chore: Chore, memberId: string, date: string, instance: TaskInstance | undefined) => {
    const instanceId = `${chore.id}_${memberId}_${date}`
    const ref = doc(db, `families/${familyId}/taskInstances/${instanceId}`)
    if (!instance) {
      await setDoc(ref, {
        choreId: chore.id,
        choreName: chore.name,
        memberId,
        date,
        isoWeek: weekId,
        priceCents: chore.priceCents,
        status: 'tehty',
        completedAt: new Date().toISOString(),
      })
    } else {
      const newStatus = instance.status === 'tehty' || instance.status === 'merkitty' ? 'tekematon' : 'tehty'
      await updateDoc(ref, {
        status: newStatus,
        completedAt: newStatus === 'tehty' ? new Date().toISOString() : null,
      })
    }
  }

  const handleAbsenceSave = async (type: 'Loma' | 'Sairas', from: string, to: string) => {
    if (!selectedUid) return
    try {
      await addDoc(collection(db, `families/${familyId}/members/${selectedUid}/absences`), { type, from, to })
    } catch { /* ignore */ }
    setAbsenceOpen(false)
  }

  if (childMembers.length === 0) {
    return (
      <div style={{ padding: 'var(--space-4)' }}>
        <p className="text-muted">Ei lapsia. Lisää lapsia Perhe-välilehdeltä.</p>
      </div>
    )
  }

  const selectedMember = childMembers.find(m => m.uid === selectedUid)

  return (
    <div style={{ padding: 'var(--space-4)' }}>
      <h2 style={{ margin: '0 0 var(--space-3)' }}>Lapsen profiili</h2>

      <div className="seg" style={{ width: '100%', marginBottom: 'var(--space-4)' }}>
        {childMembers.map(m => (
          <label key={m.uid} className="seg-opt" style={{ flex: 1, justifyContent: 'center' }}>
            <input type="radio" name="profiletab"
              checked={selectedUid === m.uid} onChange={() => setSelectedUid(m.uid)} />
            {m.firstName}
          </label>
        ))}
      </div>

      {/* Poissaolot */}
      <h5 style={{ margin: '0 0 var(--space-2)' }}>Poissaolot</h5>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 'var(--space-2)' }}>
        {absences.length === 0 ? (
          <p style={{ fontSize: 12, opacity: 0.5, margin: 0 }}>Ei merkittyjä poissaoloja.</p>
        ) : absences.map(a => (
          <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 13 }}>
            <span className="tag tag-neutral">{a.type}</span>
            <span style={{ opacity: 0.7 }}>{formatAbsenceRange(a.from, a.to)}</span>
          </div>
        ))}
      </div>
      <button type="button" className="btn btn-secondary btn-block" style={{ marginBottom: 'var(--space-4)' }} onClick={() => setAbsenceOpen(true)}>
        Merkitse poissaolo
      </button>

      {/* Viikkoaikataulu */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-1)' }}>
        <button type="button" className="btn btn-ghost btn-icon" aria-label="Edellinen viikko"
          onClick={() => setWeekOffset(o => o - 1)}><ChevronLeft size={15} /></button>
        <h5 style={{ margin: 0 }}>Viikko {getISOWeek((() => { const d = new Date(); d.setDate(d.getDate() + weekOffset * 7); return d })())}</h5>
        <button type="button" className="btn btn-ghost btn-icon" aria-label="Seuraava viikko"
          onClick={() => setWeekOffset(o => o + 1)}><ChevronRight size={15} /></button>
      </div>

      {(() => {
        const weekDates = getWeekDates(weekOffset)
        const plannableChores = chores.filter(c => c.type !== 'once')

        return DAY_KEYS.map((dayKey, i) => {
          const date = weekDates[i]
          const today = isToday(date)
          const iso = date.toISOString().slice(0, 10)
          const childChores = plannableChores.filter(chore => {
            const assignment = weekAssignments[chore.id]
            if (chore.type === 'daily') return assignment?.[dayKey] === selectedUid
            return assignment?.all === selectedUid
          })
          if (childChores.length === 0) return null

          return (
            <div key={dayKey}>
              <div className="hr" />
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', margin: 'var(--space-2) 0 var(--space-1)' }}>
                <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 13 }}>{DAY_NAMES[dayKey]}</span>
                <span style={{ fontSize: 11, opacity: 0.5 }}>{date.toLocaleDateString('fi-FI', { day: 'numeric', month: 'numeric' })}</span>
                {today && <span className="tag tag-outline" style={{ fontSize: 10 }}>Tänään</span>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 'var(--space-3)' }}>
                {childChores.map(chore => {
                  const instance = weekTaskInstances.find(t => t.choreId === chore.id && t.date === iso)
                  const done = instance?.status === 'tehty' || instance?.status === 'merkitty'
                  return (
                    <div key={chore.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 13 }}>
                      <span style={{ flex: 1 }}>{chore.name}</span>
                      <span style={{ fontSize: 12, opacity: 0.55 }}>{formatPrice(chore.priceCents)} €</span>
                      <button
                        type="button"
                        className={`tag ${done ? 'tag-accent' : 'tag-outline'}`}
                        style={{ width: 64, fontSize: 11, justifyContent: 'center' }}
                        onClick={() => setTogglePending({ chore, memberId: selectedUid, date: iso, instance })}
                      >
                        {done ? 'Tehty' : 'Kesken'}
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })
      })()}

      {absenceOpen && (
        <AbsenceDialog
          childName={selectedMember?.firstName ?? ''}
          onSave={handleAbsenceSave}
          onClose={() => setAbsenceOpen(false)}
        />
      )}

      {togglePending && (() => {
        const { chore, memberId, date, instance } = togglePending
        const currentlyDone = instance?.status === 'tehty' || instance?.status === 'merkitty'
        const childName = selectedMember?.firstName ?? ''
        return (
          <ConfirmDialog
            title={currentlyDone ? 'Merkitse tekemättömäksi' : 'Merkitse tehdyksi'}
            message={
              currentlyDone
                ? `Merkitäänkö "${chore.name}" tekemättömäksi ${childName}:lle?`
                : `Merkitäänkö "${chore.name}" tehdyksi ${childName}:lle?`
            }
            confirmLabel={currentlyDone ? 'Merkitse kesken' : 'Merkitse tehty'}
            onConfirm={() => {
              handleToggleStatus(chore, memberId, date, instance)
              setTogglePending(null)
            }}
            onClose={() => setTogglePending(null)}
          />
        )
      })()}
    </div>
  )
}
