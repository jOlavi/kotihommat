import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Chore, Assignment, DayKey, Member, TaskInstance } from '@/types'

interface Props {
  chores: Chore[]
  familyId: string
  firestoreMembers: Member[]
  onChildClick: (uid: string) => void
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

function getAssigneeUid(assignment: Assignment | undefined, chore: Chore, dayKey: DayKey): string {
  if (chore.type === 'daily') return assignment?.[dayKey] ?? ''
  return assignment?.all ?? ''
}

interface ChildSummary {
  uid: string
  firstName: string
  doneCount: number
  totalCount: number
  earnedCents: number
}

function buildChildSummaries(
  childMembers: Member[],
  chores: Chore[],
  weekAssignments: Record<string, Assignment>,
  weekDates: Date[],
  taskInstances: TaskInstance[],
  weekId: string,
): ChildSummary[] {
  return childMembers.map(member => {
    let doneCount = 0
    let totalCount = 0
    let earnedCents = 0

    chores.filter(c => c.type !== 'once').forEach(chore => {
      const assignment = weekAssignments[chore.id]
      if (chore.type === 'daily') {
        DAY_KEYS.forEach((dayKey, i) => {
          if (getAssigneeUid(assignment, chore, dayKey) !== member.uid) return
          totalCount++
          const iso = weekDates[i].toISOString().slice(0, 10)
          const inst = taskInstances.find(t => t.choreId === chore.id && t.memberId === member.uid && t.date === iso)
          if (inst?.status === 'tehty' || inst?.status === 'merkitty') {
            doneCount++; earnedCents += chore.priceCents
          }
        })
      } else {
        if (assignment?.all !== member.uid) return
        totalCount++
        const inst = taskInstances.find(t => t.choreId === chore.id && t.memberId === member.uid && t.isoWeek === weekId)
        if (inst?.status === 'tehty' || inst?.status === 'merkitty') {
          doneCount++; earnedCents += chore.priceCents
        }
      }
    })

    return { uid: member.uid, firstName: member.firstName, doneCount, totalCount, earnedCents }
  })
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

export function WeekView({ chores, familyId, firestoreMembers, onChildClick }: Props) {
  const [overviewWeek, setOverviewWeek] = useState(0)
  const [weekAssignments, setWeekAssignments] = useState<Record<string, Assignment>>({})
  const [taskInstances, setTaskInstances] = useState<TaskInstance[]>([])

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

  const weekId = getWeekId(overviewWeek)
  const weekDates = getWeekDates(overviewWeek)
  const childMembers = firestoreMembers.filter(m => m.role === 'child')
  const plannableChores = chores.filter(c => c.type !== 'once')
  const weekTaskInstances = taskInstances.filter(t => t.isoWeek === weekId)
  const childSummaries = buildChildSummaries(childMembers, chores, weekAssignments, weekDates, weekTaskInstances, weekId)

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
        const past = isPast(date)
        const today = isToday(date)

        return (
          <div key={dayKey}>
            <div className="hr" />
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', margin: 'var(--space-2) 0 var(--space-1)' }}>
              <h5 style={{ margin: 0 }}>{DAY_NAMES[dayKey]}</h5>
              <span style={{ fontSize: 11, opacity: 0.5 }}>
                {date.toLocaleDateString('fi-FI', { day: 'numeric', month: 'numeric' })}
              </span>
              {today && (
                <span className="tag tag-outline" style={{ fontSize: 10 }}>Tänään</span>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 'var(--space-3)' }}>
              {plannableChores.length === 0 ? (
                <p style={{ fontSize: 12, opacity: 0.4, margin: 0 }}>Ei kotitöitä.</p>
              ) : plannableChores.map(chore => {
                const assigneeUid = getAssigneeUid(weekAssignments[chore.id], chore, dayKey)
                if (!assigneeUid) return null
                const assigneeName = firestoreMembers.find(m => m.uid === assigneeUid)?.firstName ?? '–'
                const iso = date.toISOString().slice(0, 10)
                const inst = weekTaskInstances.find(t => t.choreId === chore.id && t.memberId === assigneeUid && t.date === iso)
                const done = inst?.status === 'tehty' || inst?.status === 'merkitty'

                return (
                  <div key={chore.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 13 }}>
                    <span style={{ flex: 1 }}>{chore.name}</span>
                    <span style={{ fontSize: 12, opacity: 0.6 }}>{assigneeName}</span>
                    <span
                      className={`tag ${done ? 'tag-accent' : 'tag-outline'}`}
                      style={{ width: 64, textAlign: 'center', fontSize: 11 }}
                    >
                      {done ? 'Tehty' : past ? 'Tekemättä' : 'Kesken'}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {childMembers.length > 0 && (
        <>
          <h5 style={{ margin: 'var(--space-4) 0 var(--space-2)' }}>Lapset tällä viikolla</h5>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {childSummaries.map(({ uid, firstName, doneCount, totalCount, earnedCents }) => (
              <button
                key={uid}
                type="button"
                className="card"
                style={{
                  display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                  width: '100%', textAlign: 'left', cursor: 'pointer',
                  background: 'none', border: 'none', padding: 'var(--space-3)',
                }}
                onClick={() => onChildClick(uid)}
              >
                <div style={{
                  width: 34, height: 34, borderRadius: '50%',
                  background: 'var(--color-accent-100)', color: 'var(--color-accent-700)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 15, flexShrink: 0,
                }}>
                  {firstName[0]?.toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 14 }}>
                    {firstName}
                  </div>
                  <div style={{ fontSize: 11.5, opacity: 0.6 }}>
                    {doneCount}/{totalCount} tehty · Ansaittu {formatPrice(earnedCents)} €
                  </div>
                </div>
                <ChevronRight size={16} style={{ opacity: 0.4, flexShrink: 0 }} />
              </button>
            ))}
          </div>
        </>
      )}

    </div>
  )
}
