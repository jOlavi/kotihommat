import { useEffect, useRef } from 'react'
import { Absence, TaskInstance, TaskStatus } from '@/types'

interface Props {
  tasks: TaskInstance[]
  today: string
  absences: Absence[]
}

function isAbsent(absences: Absence[], dateISO: string): boolean {
  return absences.some(a => a.from <= dateISO && dateISO <= a.to)
}

const DAY_NAMES = [
  'Maanantai', 'Tiistai', 'Keskiviikko', 'Torstai',
  'Perjantai', 'Lauantai', 'Sunnuntai',
]

function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

function getWeekDays(date: Date): Date[] {
  const d = new Date(date)
  const day = d.getDay() || 7
  d.setDate(d.getDate() - day + 1)
  return Array.from({ length: 7 }, (_, i) => {
    const dd = new Date(d)
    dd.setDate(d.getDate() + i)
    return dd
  })
}

function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function formatPrice(cents: number): string {
  return (cents / 100).toLocaleString('fi-FI', { minimumFractionDigits: 2 })
}

const STATUS_TAG: Record<TaskStatus, { className: string; label: string }> = {
  tehty:     { className: 'tag tag-accent',  label: 'Tehty' },
  tekematon: { className: 'tag tag-outline', label: 'Kesken' },
  merkitty:  { className: 'tag tag-neutral', label: 'Maksettu' },
}

export function WeekView({ tasks, today, absences }: Props) {
  const todayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const id = setTimeout(() => {
      todayRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
    return () => clearTimeout(id)
  }, [])

  const now = new Date()
  const weekNumber = getISOWeek(now)
  const weekDays = getWeekDays(now)

  const weekEarned = tasks
    .filter(t => t.status === 'tehty' || t.status === 'merkitty')
    .reduce((sum, t) => sum + t.priceCents, 0)

  return (
    <div style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>Viikko {weekNumber}</h2>
        <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 16, color: 'var(--color-accent-700)' }}>
          {formatPrice(weekEarned)} €
        </span>
      </div>

      {weekDays.map((day, i) => {
        const iso = toISODate(day)
        const isToday = iso === today
        const absent = isAbsent(absences, iso)
        const dayTasks = tasks.filter(t => t.date === iso)
        const dateLabel = day.toLocaleDateString('fi-FI', { day: 'numeric', month: 'numeric' })

        if (isToday) {
          return (
            <div ref={todayRef} key={iso} style={{
              border: '2px solid var(--color-accent)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-accent-100)',
              padding: 'var(--space-2) 8px',
              margin: '0 -8px',
              opacity: absent ? 0.6 : 1,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-accent-800)' }}>{DAY_NAMES[i]} {dateLabel}</span>
                <span className="tag tag-accent" style={{ fontSize: 10 }}>Tänään</span>
                {absent && <span className="tag tag-neutral">Poissa</span>}
              </div>
              {dayTasks.length === 0 ? (
                <p className="text-muted" style={{ fontSize: 13, margin: 0 }}>Ei tehtäviä</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                  {dayTasks.map(task => {
                    const status = task.status ?? 'tekematon'
                    const { className, label } = STATUS_TAG[status]
                    return (
                      <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-1) 0' }}>
                        <span style={{ flex: 1, fontSize: 15 }}>{task.choreName}</span>
                        {task.priceCents > 0 && <span style={{ fontSize: 13, opacity: 0.6 }}>{formatPrice(task.priceCents)} €</span>}
                        <span className={className} style={{ display: 'flex', justifyContent: 'center', width: 64, fontSize: 11 }}>
                          {label}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        }

        return (
          <div key={iso} style={{ opacity: absent ? 0.5 : 1 }}>
            <hr className="hr" style={{ margin: '0 0 var(--space-2)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
              <span style={{ fontSize: 14, fontWeight: 500 }}>{DAY_NAMES[i]} {dateLabel}</span>
              {absent && <span className="tag tag-neutral">Poissa</span>}
            </div>
            {dayTasks.length === 0 ? (
              <p className="text-muted" style={{ fontSize: 13, margin: 0 }}>Ei tehtäviä</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                {dayTasks.map(task => {
                  const status = task.status ?? 'tekematon'
                  const { className, label } = STATUS_TAG[status]
                  return (
                    <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-1) 0' }}>
                      <span style={{ flex: 1, fontSize: 15 }}>{task.choreName}</span>
                      {task.priceCents > 0 && <span style={{ fontSize: 13, opacity: 0.6 }}>{formatPrice(task.priceCents)} €</span>}
                      <span className={className} style={{ display: 'flex', justifyContent: 'center', width: 64, fontSize: 11 }}>
                        {label}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
