import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { AbsenceDialog } from '@/pages/parent/AbsenceDialog'
import { Chore, Assignment, DayKey, Member } from '@/types'
import { updateChildPinFn } from '@/lib/functions'

export type DayStatus = 'full' | 'partial' | 'future' | 'poissa'

export interface Absence {
  id: string
  type: 'Loma' | 'Sairas'
  range: string
}

export interface Payment {
  id: string
  amountCents: number
  date: string
}

export interface ChildProfile {
  earnedCents: number
  paidCents: number
  weekGrid: DayStatus[]
  absences: Absence[]
  payments: Payment[]
}

const DAY_SHORTS = ['Ma', 'Ti', 'Ke', 'To', 'Pe', 'La', 'Su']

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

function isPast(date: Date): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d < today
}

function isToday(date: Date): boolean {
  const today = new Date()
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  )
}

function formatPrice(cents: number): string {
  return (cents / 100).toLocaleString('fi-FI', { minimumFractionDigits: 2 })
}

const STATUS_META: Record<DayStatus, { tag: string; label: string }> = {
  full:    { tag: 'tag-accent',  label: 'Valmis' },
  partial: { tag: 'tag-outline', label: 'Kesken' },
  future:  { tag: 'tag-neutral', label: '–' },
  poissa:  { tag: 'tag-neutral', label: 'Poissa' },
}

export function makeDefaultProfile(): ChildProfile {
  return {
    earnedCents: 1850,
    paidCents: 1200,
    weekGrid: ['full', 'full', 'partial', 'future', 'future', 'future', 'future'],
    absences: [],
    payments: [{ id: 'p1', amountCents: 1200, date: '1.8.2026' }],
  }
}

interface Props {
  initialChild?: string
  profiles: Record<string, ChildProfile>
  updateProfile: (name: string, fn: (p: ChildProfile) => ChildProfile) => void
  chores: Chore[]
  familyId: string
  firestoreMembers: Member[]
}

export function ProfileView({
  initialChild, profiles, updateProfile, chores, familyId, firestoreMembers
}: Props) {
  const childMembers = firestoreMembers.filter(m => m.role === 'child')

  const [selectedUid, setSelectedUid] = useState(
    () => (initialChild && childMembers.some(m => m.uid === initialChild))
      ? initialChild
      : (childMembers[0]?.uid ?? '')
  )
  const [absenceOpen, setAbsenceOpen] = useState(false)
  const [weekOffset, setWeekOffset] = useState(0)
  const [pinEditing, setPinEditing] = useState(false)
  const [newPin, setNewPin] = useState('')
  const [pinLoading, setPinLoading] = useState(false)
  const [pinError, setPinError] = useState('')
  const [weekAssignments, setWeekAssignments] = useState<Record<string, Assignment>>({})

  useEffect(() => {
    const ref = new Date()
    ref.setDate(ref.getDate() + weekOffset * 7)
    const d2 = new Date(Date.UTC(ref.getFullYear(), ref.getMonth(), ref.getDate()))
    const dayNum = d2.getUTCDay() || 7
    d2.setUTCDate(d2.getUTCDate() + 4 - dayNum)
    const yearStart = new Date(Date.UTC(d2.getUTCFullYear(), 0, 1))
    const week = Math.ceil((((d2.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
    const weekId = `${ref.getFullYear()}-W${String(week).padStart(2, '0')}`
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
    setPinEditing(false)
    setNewPin('')
    setPinError('')
  }, [selectedUid])

  const handleAbsenceSave = (type: 'Loma' | 'Sairas', from: string, to: string) => {
    const fmt = (s: string) =>
      new Date(s).toLocaleDateString('fi-FI', { day: 'numeric', month: 'numeric' })
    const toFull = new Date(to).toLocaleDateString('fi-FI', {
      day: 'numeric', month: 'numeric', year: 'numeric',
    })
    const range = from === to ? toFull : `${fmt(from)}–${toFull}`
    const memberForProfile = childMembers.find(m => m.uid === selectedUid)
    if (memberForProfile) {
      updateProfile(memberForProfile.firstName, p => ({
        ...p,
        absences: [...p.absences, { id: crypto.randomUUID(), type, range }],
      }))
    }
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
  const profile = profiles[selectedMember?.firstName ?? ''] ?? makeDefaultProfile()

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

      {/* Kirjautumistiedot */}
      {(() => {
        const member = firestoreMembers.find(m => m.uid === selectedUid)
        if (!member) return null
        const displayUsername = member.username
          ? (() => { const [n, c] = member.username!.split('.'); return `${n}.${(c ?? '').toUpperCase()}` })()
          : '–'

        const handleSavePin = async () => {
          if (!/^\d{4}$/.test(newPin)) { setPinError('PIN tulee olla 4 numeroa'); return }
          setPinLoading(true)
          setPinError('')
          try {
            await updateChildPinFn({ childUid: member.uid, newPin, familyId })
            setPinEditing(false)
            setNewPin('')
          } catch {
            setPinError('PIN:n vaihto epäonnistui')
          } finally {
            setPinLoading(false)
          }
        }

        return (
          <div className="card" style={{ marginBottom: 'var(--space-4)', gap: 'var(--space-2)' }}>
            <div className="card-kicker">Kirjautumistiedot</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 13 }}>
                <span style={{ opacity: 0.6, width: 80 }}>Tunnus</span>
                <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 600 }}>{displayUsername}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 13 }}>
                <span style={{ opacity: 0.6, width: 80 }}>PIN</span>
                {pinEditing ? (
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
                      onClick={handleSavePin} disabled={pinLoading || newPin.length !== 4}>
                      Tallenna
                    </button>
                    <button type="button" className="btn btn-ghost" style={{ padding: '2px 8px', fontSize: 12 }}
                      onClick={() => { setPinEditing(false); setNewPin(''); setPinError('') }}>
                      Peruuta
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, letterSpacing: '0.1em' }}>
                      {member.pin ?? '••••'}
                    </span>
                    <button type="button" className="btn btn-ghost" style={{ padding: '2px 8px', fontSize: 12 }}
                      onClick={() => setPinEditing(true)}>
                      Vaihda
                    </button>
                  </div>
                )}
              </div>
              {pinError && <p style={{ fontSize: 12, color: 'oklch(50% 0.18 25)', margin: 0 }}>{pinError}</p>}
            </div>
          </div>
        )
      })()}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 'var(--space-4)' }}>
        {profile.weekGrid.map((status, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <span style={{ fontSize: 10, opacity: 0.55 }}>{DAY_SHORTS[i]}</span>
            <span className={`tag ${STATUS_META[status].tag}`} style={{ fontSize: 9, padding: '2px 5px' }}>
              {STATUS_META[status].label}
            </span>
          </div>
        ))}
      </div>

      {/* Viikkoaikataulu */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-1)' }}>
        <button
          type="button"
          className="btn btn-ghost btn-icon"
          aria-label="Edellinen viikko"
          onClick={() => setWeekOffset(o => o - 1)}
        >
          <ChevronLeft size={15} />
        </button>
        <h5 style={{ margin: 0 }}>Viikko {getISOWeek((() => { const d = new Date(); d.setDate(d.getDate() + weekOffset * 7); return d })())}</h5>
        <button
          type="button"
          className="btn btn-ghost btn-icon"
          aria-label="Seuraava viikko"
          onClick={() => setWeekOffset(o => o + 1)}
        >
          <ChevronRight size={15} />
        </button>
      </div>

      {(() => {
        const weekDates = getWeekDates(weekOffset)
        const plannableChores = chores.filter(c => c.type !== 'once')

        return DAY_KEYS.map((dayKey, i) => {
          const date = weekDates[i]
          const past = isPast(date)
          const today = isToday(date)
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
                <span style={{ fontSize: 11, opacity: 0.5 }}>
                  {date.toLocaleDateString('fi-FI', { day: 'numeric', month: 'numeric' })}
                </span>
                {today && <span className="tag tag-outline" style={{ fontSize: 10 }}>Tänään</span>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 'var(--space-3)' }}>
                {childChores.map(chore => (
                  <div key={chore.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 13 }}>
                    <span style={{ flex: 1 }}>{chore.name}</span>
                    <span style={{ fontSize: 12, opacity: 0.55 }}>{formatPrice(chore.priceCents)} €</span>
                    <span
                      className={`tag ${past ? 'tag-accent' : 'tag-outline'}`}
                      style={{ width: 64, textAlign: 'center', fontSize: 11 }}
                    >
                      {past ? 'Tehty' : 'Kesken'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )
        })
      })()}

      {/* Poissaolot */}
      <div className="hr" />
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

      <button type="button" className="btn btn-secondary btn-block"
        onClick={() => setAbsenceOpen(true)}>
        Merkitse poissaolo
      </button>

      {absenceOpen && (
        <AbsenceDialog
          childName={selectedMember?.firstName ?? ''}
          onSave={handleAbsenceSave}
          onClose={() => setAbsenceOpen(false)}
        />
      )}
    </div>
  )
}
