import { TriangleAlert } from 'lucide-react'
import { Absence, TaskInstance } from '@/types'

interface Props {
  tasks: TaskInstance[]
  onToggle: (id: string) => void
  absences: Absence[]
  today: string
}

function formatPrice(cents: number): string {
  return (cents / 100).toLocaleString('fi-FI', { minimumFractionDigits: 2 })
}

const DAY_NAMES = ['Sunnuntai', 'Maanantai', 'Tiistai', 'Keskiviikko', 'Torstai', 'Perjantai', 'Lauantai']

export function TodayView({ tasks, onToggle, absences, today }: Props) {
  const isAbsent = absences.some(a => a.from <= today && today <= a.to)

  const now = new Date()
  const dayName = DAY_NAMES[now.getDay()]
  const dateLabel = now.toLocaleDateString('fi-FI', { day: 'numeric', month: 'numeric' })

  const undoneCount = tasks.filter(t => (t.status ?? 'tekematon') === 'tekematon').length
  const allDone = tasks.length > 0 && undoneCount === 0

  return (
    <div style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <p style={{ margin: 0, fontSize: 28, fontFamily: 'var(--font-heading)', fontWeight: 600 }}>Tänään · {dayName} {dateLabel}</p>
      {isAbsent && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
          border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-md)',
          padding: 'var(--space-2) var(--space-3)', background: 'var(--color-surface-alt)',
        }}>
          <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Sinut on merkitty poissaolevaksi tänään.</span>
        </div>
      )}

      {tasks.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: `1px solid var(--color-accent)`, borderRadius: 'var(--radius-md)',
          padding: 'var(--space-2) var(--space-3)', background: 'var(--color-accent-100)',
          gap: 'var(--space-2)',
        }}>
          {allDone ? (
            <span style={{ fontSize: 13, color: 'var(--color-accent-800)', textAlign: 'center' }}>
              Tämän päivän kotityöt on tehty!
            </span>
          ) : (
            <>
              <TriangleAlert size={16} color="var(--color-accent-700)" style={{ flex: 'none' }} />
              <span style={{ fontSize: 13, color: 'var(--color-accent-800)' }}>
                Sinulla on {undoneCount} tekemätöntä tehtävää tänään
              </span>
            </>
          )}
        </div>
      )}

      {tasks.length === 0 && (
        <p style={{ fontSize: 13, opacity: 0.5, margin: 0 }}>Ei tehtäviä tänään.</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        {tasks.map((task) => {
          const status = task.status ?? 'tekematon'
          const done = status === 'tehty' || status === 'merkitty'
          const locked = status === 'merkitty'
          return (
            <div
              key={task.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                padding: 'var(--space-3)',
                border: '1px solid var(--color-divider)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <input
                type="checkbox"
                checked={done}
                disabled={locked}
                onChange={() => !locked && onToggle(task.id)}
                style={{
                  width: 22, height: 22, accentColor: 'var(--color-accent)',
                  cursor: locked ? 'not-allowed' : 'pointer', flex: 'none',
                }}
              />
              <span style={{ flex: 1, fontSize: 15, textDecoration: done ? 'line-through' : 'none', opacity: done ? 0.5 : 1 }}>
                {task.choreName}
              </span>
              {task.priceCents > 0 && (
                <span style={{ fontSize: 14, color: 'var(--color-accent-700)' }}>
                  {formatPrice(task.priceCents)} €
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
