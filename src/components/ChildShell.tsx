import { useState } from 'react'
import { Home, CalendarDays, PiggyBank, Settings } from 'lucide-react'
import { TodayView, Task } from '@/pages/child/TodayView'
import { WeekView } from '@/pages/child/WeekView'
import { BalanceView } from '@/pages/child/BalanceView'

type Tab = 'today' | 'week' | 'balance'

interface Props {
  childName: string
  /** Firebase family ID (wired up in a future task) */
  familyId?: string
  /** Called when user signs out (new App.tsx shape) */
  onSignOut?: () => void
  /** Legacy toggle callback */
  onRoleToggle?: () => void
}

function dateOffset(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

const TODAY = new Date().toISOString().slice(0, 10)

const INITIAL_WEEK_TASKS: Task[] = [
  // Eilen — kaikki tehty
  { id: 'y1', name: 'Astianpesukoneen tyhjennys', priceCents: 50, date: dateOffset(-1), status: 'tehty' },
  { id: 'y2', name: 'Koiran ulkoilutus', priceCents: 100, date: dateOffset(-1), status: 'tehty' },
  // Tänään
  { id: 't1', name: 'Astianpesukoneen tyhjennys', priceCents: 50, date: TODAY, status: 'tekematon' },
  { id: 't2', name: 'Koiran ulkoilutus', priceCents: 100, date: TODAY, status: 'tekematon' },
  { id: 't3', name: 'Roskat ulos', priceCents: 50, date: TODAY, status: 'tehty' },
  // Ylihuomenna — poissa
  { id: 'a1', name: 'Koiran ulkoilutus', priceCents: 100, date: dateOffset(2), status: 'poissa' },
  { id: 'a2', name: 'Astianpesukoneen tyhjennys', priceCents: 50, date: dateOffset(2), status: 'poissa' },
  // +3 päivää
  { id: 'b1', name: 'Roskat ulos', priceCents: 50, date: dateOffset(3), status: 'tekematon' },
  { id: 'b2', name: 'Koiran ulkoilutus', priceCents: 100, date: dateOffset(3), status: 'tekematon' },
]

export function ChildShell({ childName, familyId: _familyId, onSignOut, onRoleToggle }: Props) {
  const resolvedOnRoleToggle = onRoleToggle ?? onSignOut ?? (() => undefined)
  const [activeTab, setActiveTab] = useState<Tab>('today')
  const [tasks, setTasks] = useState<Task[]>(INITIAL_WEEK_TASKS)

  const todayTasks = tasks.filter(t => t.date === TODAY)

  const handleToggle = (id: string) => {
    setTasks(prev =>
      prev.map(t =>
        t.id === id
          ? { ...t, status: t.status === 'tehty' ? 'tekematon' : 'tehty' }
          : t
      )
    )
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'today', label: 'Tänään', icon: <Home size={20} /> },
    { id: 'week', label: 'Viikko', icon: <CalendarDays size={20} /> },
    { id: 'balance', label: 'Oma saldo', icon: <PiggyBank size={20} /> },
  ]

  const childTheme: React.CSSProperties = {
    '--color-accent':     'oklch(58% 0.11 220)',
    '--color-accent-100': 'oklch(96% 0.015 220)',
    '--color-accent-200': 'oklch(91% 0.03 220)',
    '--color-accent-300': 'oklch(84% 0.05 220)',
    '--color-accent-400': 'oklch(74% 0.08 220)',
    '--color-accent-500': 'oklch(64% 0.10 220)',
    '--color-accent-600': 'oklch(55% 0.11 220)',
    '--color-accent-700': 'oklch(45% 0.10 220)',
    '--color-accent-800': 'oklch(34% 0.08 220)',
    '--color-accent-900': 'oklch(24% 0.06 220)',
  } as React.CSSProperties

  return (
    <div style={{ ...childTheme, display: 'flex', flexDirection: 'column', height: '100%' }}>
      <header className="nav" style={{ padding: 'var(--space-3) var(--space-4)', flex: 'none', position: 'relative' }}>
        <button
          type="button"
          className="tag tag-accent"
          style={{
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'var(--font-heading)',
            fontWeight: 600,
            fontSize: 15,
          }}
          onClick={resolvedOnRoleToggle}
        >
          {childName}
        </button>
        <span style={{
          fontFamily: '"Bodoni Moda", var(--font-heading)',
          fontWeight: 600,
          fontSize: 22,
          color: 'var(--color-accent)',
          position: 'absolute',
          left: '50%',
          transform: 'translateX(-50%)',
        }}>Kotihommat</span>
        <button
          type="button"
          className="btn btn-ghost btn-icon"
          aria-label="Asetukset"
          style={{ marginLeft: 'auto' }}
        >
          <Settings size={18} />
        </button>
      </header>

      <main style={{ flex: 1, overflowY: 'auto' }}>
        {activeTab === 'today' && <TodayView tasks={todayTasks} onToggle={handleToggle} />}
        {activeTab === 'week' && <WeekView tasks={tasks} today={TODAY} />}
        {activeTab === 'balance' && <BalanceView />}
      </main>

      <nav style={{ display: 'flex', borderTop: '1px solid var(--color-divider)', flex: 'none' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              padding: 'var(--space-2) 0 var(--space-3)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 11,
              color: activeTab === tab.id
                ? 'var(--color-accent)'
                : 'color-mix(in srgb, var(--color-text) 40%, transparent)',
              fontFamily: 'var(--font-body)',
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  )
}
