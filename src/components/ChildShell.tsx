import { useState, useEffect } from 'react'
import { Home, CalendarDays, PiggyBank, Settings } from 'lucide-react'
import { collection, doc, onSnapshot, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { TodayView } from '@/pages/child/TodayView'
import { WeekView } from '@/pages/child/WeekView'
import { BalanceView } from '@/pages/child/BalanceView'
import { SettingsDialog } from '@/components/SettingsDialog'
import { TaskInstance } from '@/types'

type Tab = 'today' | 'week' | 'balance'

interface Props {
  familyId: string
  uid: string
  childName: string
  onSignOut: () => void
}

function getCurrentWeekId(): string {
  const now = new Date()
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const week = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  return `${now.getFullYear()}-W${String(week).padStart(2, '0')}`
}

const WEEK_ID = getCurrentWeekId()
const TODAY = new Date().toISOString().slice(0, 10)

export function ChildShell({ familyId, uid, childName, onSignOut }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('today')
  const [taskInstances, setTaskInstances] = useState<TaskInstance[]>([])
  const [paidTotal, setPaidTotal] = useState(0)
  const [settingsOpen, setSettingsOpen] = useState(false)

  useEffect(() => {
    return onSnapshot(
      collection(db, `families/${familyId}/taskInstances`),
      snap => {
        const all = snap.docs.map(d => ({ id: d.id, ...d.data() } as TaskInstance))
        setTaskInstances(all.filter(t => t.memberId === uid))
      }
    )
  }, [familyId, uid])

  useEffect(() => {
    return onSnapshot(
      doc(db, `families/${familyId}/members/${uid}`),
      snap => {
        if (snap.exists()) setPaidTotal(snap.data().paidTotal ?? 0)
      }
    )
  }, [familyId, uid])

  const todayTasks = taskInstances.filter(t => t.date === TODAY)
  const weekTasks = taskInstances.filter(t => t.isoWeek === WEEK_ID)
  const earnedCents = taskInstances
    .filter(t => t.status === 'tehty' || t.status === 'merkitty')
    .reduce((sum, t) => sum + t.priceCents, 0)

  const handleToggle = async (id: string) => {
    const instance = taskInstances.find(t => t.id === id)
    if (!instance || instance.status === 'merkitty') return
    const newStatus = (instance.status ?? 'tekematon') === 'tehty' ? 'tekematon' : 'tehty'
    await updateDoc(doc(db, `families/${familyId}/taskInstances/${id}`), {
      status: newStatus,
      completedAt: newStatus === 'tehty' ? new Date().toISOString() : null,
    })
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
        <span
          className="tag tag-accent"
          style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 15 }}
        >
          {childName}
        </span>
        <span style={{
          fontFamily: '"Bodoni Moda", var(--font-heading)', fontWeight: 600, fontSize: 22,
          color: 'var(--color-accent)', position: 'absolute', left: '50%', transform: 'translateX(-50%)',
        }}>
          Kotihommat
        </span>
        <button type="button" className="btn btn-ghost btn-icon" aria-label="Asetukset" style={{ marginLeft: 'auto' }}
          onClick={() => setSettingsOpen(true)}>
          <Settings size={18} />
        </button>
      </header>

      <main style={{ flex: 1, overflowY: 'auto' }}>
        {activeTab === 'today' && <TodayView tasks={todayTasks} onToggle={handleToggle} />}
        {activeTab === 'week' && <WeekView tasks={weekTasks} today={TODAY} />}
        {activeTab === 'balance' && <BalanceView earnedCents={earnedCents} paidCents={paidTotal} />}
      </main>

      <nav style={{ display: 'flex', borderTop: '1px solid var(--color-divider)', flex: 'none' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              padding: 'var(--space-2) 0 var(--space-3)', background: 'none', border: 'none',
              cursor: 'pointer', fontSize: 11, fontFamily: 'var(--font-body)',
              color: activeTab === tab.id
                ? 'var(--color-accent)'
                : 'color-mix(in srgb, var(--color-text) 40%, transparent)',
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </nav>

      {settingsOpen && (
        <SettingsDialog
          onSignOut={onSignOut}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  )
}
