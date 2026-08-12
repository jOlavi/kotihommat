import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Absence, Chore, Assignment, DayKey, Member, TaskInstance } from '@/types'

interface Props {
  chores: Chore[]
  familyId: string
  firestoreMembers: Member[]
}

const DAY_KEYS: DayKey[] = ['ma', 'ti', 'ke', 'to', 'pe', 'la', 'su']
const DAY_NAMES: Record<DayKey, string> = {
  ma: 'Maanantai', ti: 'Tiistai', ke: 'Keskiviikko',
  to: 'Torstai', pe: 'Perjantai', la: 'Lauantai', su: 'Sunnuntai',
}

function getWeekDate(offset: number): Date {
  const d = new Date()
  d.setDate(d.getDate() + offset * 7)
  return d
}

function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

function getWeekDates(offset: number): Date[] {
  const ref = getWeekDate(offset)
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
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  )
}

function isAbsent(absences: Absence[], dateISO: string): boolean {
  return absences.some(a => a.from <= dateISO && dateISO <= a.to)
}

function getAssigneeUid(assignment: Assignment | undefined, chore: Chore, dayKey: DayKey): string {
  if (chore.type === 'daily') return assignment?.[dayKey] ?? ''
  return assignment?.all ?? ''
}

function getWeekId(offset: number): string {
  const d = new Date()
  d.setDate(d.getDate() + offset * 7)
  const d2 = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dayNum = d2.getUTCDay() || 7
  d2.setUTCDate(d2.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d2.getUTCFullYear(), 0, 1))
  const week = Math.ceil((((d2.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`
}


export function WeekView({ chores, familyId, firestoreMembers }: Props) {
  const [overviewWeek, setOverviewWeek] = useState(0)
  const [weekAssignments, setWeekAssignments] = useState<Record<string, Assignment>>({})
  const [taskInstances, setTaskInstances] = useState<TaskInstance[]>([])
  const [memberAbsences, setMemberAbsences] = useState<Record<string, Absence[]>>({})

  useEffect(() => {
    const weekId = getWeekId(overviewWeek)
    return onSnapshot(
      collection(db, `families/${familyId}/weeklyPlans/${weekId}/assignments`),
      snap => {
        const loaded: Record<string, Assignment> = {}
        snap.docs.forEach(d => { loaded[d.id] = d.data() as Assignment })
        setWeekAssignments(loaded)
      }
    )
  }, [familyId, overviewWeek])

  useEffect(() => {
    return onSnapshot(
      collection(db, `families/${familyId}/taskInstances`),
      snap => setTaskInstances(snap.docs.map(d => ({ id: d.id, ...d.data() } as TaskInstance)))
    )
  }, [familyId])

  useEffect(() => {
    const unsubs = firestoreMembers.map(m =>
      onSnapshot(
        collection(db, `families/${familyId}/members/${m.uid}/absences`),
        snap => {
          const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Absence))
          setMemberAbsences(prev => ({ ...prev, [m.uid]: list }))
        }
      )
    )
    return () => unsubs.forEach(u => u())
  }, [familyId, firestoreMembers])

  const weekId = getWeekId(overviewWeek)
  const weekDates = getWeekDates(overviewWeek)
  const plannableChores = chores.filter(c => c.type !== 'once')
  const weekTaskInstances = taskInstances.filter(t => t.isoWeek === weekId)

  return (
    <div style={{ padding: 'var(--space-4)' }}>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-1)' }}>
        <button
          type="button"
          className="btn btn-ghost btn-icon"
          aria-label="Edellinen viikko"
          onClick={() => setOverviewWeek(o => o - 1)}
        >
          <ChevronLeft size={15} />
        </button>
        <h2 style={{ margin: 0, fontSize: 18 }}>
          Viikko {getISOWeek(getWeekDate(overviewWeek))}
        </h2>
        <button
          type="button"
          className="btn btn-ghost btn-icon"
          aria-label="Seuraava viikko"
          onClick={() => setOverviewWeek(o => o + 1)}
        >
          <ChevronRight size={15} />
        </button>
      </div>
      <p style={{ fontSize: 12, opacity: 0.55, margin: '0 0 var(--space-4)', textAlign: 'center' }}>
        Yleiskuva viikon kotitöistä ja kunkin lapsen tilanteesta.
      </p>

      {DAY_KEYS.map((dayKey, i) => {
        const date = weekDates[i]
        const today = isToday(date)
        const iso = date.toISOString().slice(0, 10)

        const header = (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-1)' }}>
            <h5 style={{ margin: 0, color: today ? 'var(--color-accent-800)' : undefined }}>{DAY_NAMES[dayKey]}</h5>
            <span style={{ fontSize: 11, opacity: 0.5 }}>
              {date.toLocaleDateString('fi-FI', { day: 'numeric', month: 'numeric' })}
            </span>
            {today && <span className="tag tag-accent" style={{ fontSize: 10 }}>Tänään</span>}
          </div>
        )

        const rows = (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {plannableChores.length === 0 ? (
              <p style={{ fontSize: 12, opacity: 0.4, margin: 0 }}>Ei kotitöitä.</p>
            ) : plannableChores.map(chore => {
              const assigneeUid = getAssigneeUid(weekAssignments[chore.id], chore, dayKey)
              if (!assigneeUid) return null
              const assigneeName = firestoreMembers.find(m => m.uid === assigneeUid)?.firstName ?? '–'
              const inst = weekTaskInstances.find(t => t.choreId === chore.id && t.memberId === assigneeUid && t.date === iso)
              const done = inst?.status === 'tehty' || inst?.status === 'merkitty'
              const absent = isAbsent(memberAbsences[assigneeUid] ?? [], iso)
              return (
                <div key={chore.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 13, opacity: absent ? 0.5 : 1 }}>
                  <span style={{ flex: 1 }}>{chore.name}</span>
                  <span style={{ fontSize: 12, opacity: 0.6 }}>{assigneeName}</span>
                  <span
                    className={`tag ${absent ? 'tag-neutral' : done ? 'tag-accent' : 'tag-outline'}`}
                    style={{ width: 64, fontSize: 11, display: 'flex', justifyContent: 'center' }}
                  >
                    {absent ? 'Poissa' : done ? 'Tehty' : 'Kesken'}
                  </span>
                </div>
              )
            })}
          </div>
        )

        if (today) {
          return (
            <div key={dayKey} style={{
              border: '2px solid var(--color-accent)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-accent-100)',
              padding: 'var(--space-2) 8px',
              margin: '0 -8px',
            }}>
              {header}
              {rows}
            </div>
          )
        }

        return (
          <div key={dayKey}>
            <div className="hr" />
            <div style={{ margin: 'var(--space-2) 0 var(--space-3)' }}>
              {header}
              {rows}
            </div>
          </div>
        )
      })}


    </div>
  )
}
