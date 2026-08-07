import { useState } from 'react'
import { Home, CalendarDays, PiggyBank, Settings } from 'lucide-react'
import { TodayView } from '@/pages/child/TodayView'

type Tab = 'today' | 'week' | 'balance'

interface Props {
  childName: string
  onRoleToggle: () => void
}

export function ChildShell({ childName, onRoleToggle }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('today')

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'today', label: 'Tänään', icon: <Home size={20} /> },
    { id: 'week', label: 'Viikko', icon: <CalendarDays size={20} /> },
    { id: 'balance', label: 'Oma saldo', icon: <PiggyBank size={20} /> },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <header className="nav" style={{ padding: 'var(--space-3) var(--space-4)', flex: 'none' }}>
        <span className="nav-brand" style={{ fontSize: 16 }}>Kotihommat</span>
        <button
          type="button"
          className="tag tag-accent"
          style={{
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'var(--font-heading)',
            fontWeight: 600,
            marginLeft: 'var(--space-2)',
          }}
          onClick={onRoleToggle}
        >
          {childName}
        </button>
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
        {activeTab === 'today' && <TodayView />}
        {activeTab === 'week' && (
          <div style={{ padding: 'var(--space-4)' }}>
            <p className="text-muted">Viikkonäkymä tulossa.</p>
          </div>
        )}
        {activeTab === 'balance' && (
          <div style={{ padding: 'var(--space-4)' }}>
            <p className="text-muted">Oma saldo tulossa.</p>
          </div>
        )}
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
