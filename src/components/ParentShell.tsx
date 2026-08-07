import { useState } from 'react'
import { ListChecks, Users, UserCircle, Settings } from 'lucide-react'
import { FamilyView } from '@/pages/parent/FamilyView'
import { ChoresView } from '@/pages/parent/ChoresView'
import { ProfileView } from '@/pages/parent/ProfileView'

interface Family {
  creatorName: string
  familyName: string
  members: { name: string; role: 'parent' | 'child' }[]
}

interface Props {
  family: Family
  onAddMember: (member: { name: string; role: 'parent' | 'child' }) => void
  onRoleToggle: () => void
}

type Tab = 'chores' | 'family' | 'profile'

export function ParentShell({ family, onAddMember, onRoleToggle }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('chores')

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'chores', label: 'Kotityöt', icon: <ListChecks size={20} /> },
    { id: 'family', label: 'Perhe', icon: <Users size={20} /> },
    { id: 'profile', label: 'Lapsen profiili', icon: <UserCircle size={20} /> },
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
          {family.creatorName}
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
        {activeTab === 'chores' && (
          <ChoresView
            childNames={family.members.filter(m => m.role === 'child').map(m => m.name)}
          />
        )}
        {activeTab === 'family' && (
          <FamilyView
            members={family.members}
            onAddChild={name => onAddMember({ name, role: 'child' })}
          />
        )}
        {activeTab === 'profile' && (
          <ProfileView
            childNames={family.members.filter(m => m.role === 'child').map(m => m.name)}
          />
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
