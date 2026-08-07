import { useState } from 'react'
import { TriangleAlert, X, Bell } from 'lucide-react'

interface Task {
  id: string
  name: string
  priceCents: number
  done: boolean
}

const INITIAL_TASKS: Task[] = [
  { id: '1', name: 'Astianpesukoneen tyhjennys', priceCents: 50, done: false },
  { id: '2', name: 'Koiran ulkoilutus', priceCents: 100, done: false },
  { id: '3', name: 'Roskat ulos', priceCents: 50, done: true },
]

function formatPrice(cents: number): string {
  return (cents / 100).toLocaleString('fi-FI', { minimumFractionDigits: 2 })
}

export function TodayView() {
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS)
  const [bannerDismissed, setBannerDismissed] = useState(false)
  const reminderTime: string | null = null

  const undoneCount = tasks.filter(t => !t.done).length
  const showBanner = !bannerDismissed && undoneCount > 0

  const toggleTask = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t))
  }

  return (
    <div style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      {showBanner && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            border: '1px solid var(--color-accent)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-2) var(--space-3)',
            background: 'var(--color-accent-100)',
          }}
        >
          <TriangleAlert size={16} color="var(--color-accent-700)" style={{ flex: 'none' }} />
          <span style={{ fontSize: 13, flex: 1, color: 'var(--color-accent-800)' }}>
            Sinulla on {undoneCount} tekemätöntä tehtävää tänään
          </span>
          <button
            type="button"
            className="btn btn-ghost btn-icon"
            style={{ width: 24, height: 24 }}
            aria-label="Sulje"
            onClick={() => setBannerDismissed(true)}
          >
            <X size={13} />
          </button>
        </div>
      )}

      {reminderTime !== null && (
        <p style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, opacity: 0.6, margin: 0 }}>
          <Bell size={12} />
          Muistutus klo {reminderTime}
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {tasks.map((task, i) => (
          <div
            key={task.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-3)',
              padding: 'var(--space-3) 0',
              borderBottom: i < tasks.length - 1 ? '1px solid var(--color-divider)' : 'none',
            }}
          >
            <input
              type="checkbox"
              checked={task.done}
              onChange={() => toggleTask(task.id)}
              style={{
                width: 22,
                height: 22,
                accentColor: 'var(--color-accent)',
                cursor: 'pointer',
                flex: 'none',
              }}
            />
            <span
              style={{
                flex: 1,
                fontSize: 15,
                textDecoration: task.done ? 'line-through' : 'none',
                opacity: task.done ? 0.5 : 1,
              }}
            >
              {task.name}
            </span>
            <span style={{ fontSize: 14, color: 'var(--color-accent-700)' }}>
              {formatPrice(task.priceCents)} €
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
