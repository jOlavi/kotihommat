import { useState } from 'react'
import { OnboardingView } from '@/pages/onboarding/OnboardingView'
import { ChildShell } from '@/components/ChildShell'

interface FamilyState {
  creatorName: string
  familyName: string
  members: { name: string; role: 'parent' | 'child' }[]
}

type Role = 'parent' | 'child'

export default function App() {
  const [family, setFamily] = useState<FamilyState | null>(null)
  const [role, setRole] = useState<Role>('child')

  const childName = family?.members.find(m => m.role === 'child')?.name ?? 'Lapsi'

  return (
    <div
      style={{
        width: 'min(480px, 100vw)',
        height: 'min(900px, 100dvh)',
        background: 'var(--color-bg)',
        overflow: 'hidden',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: 'var(--shadow-lg)',
      }}
    >
      {family === null ? (
        <OnboardingView
          onComplete={(creatorName, familyName, members) =>
            setFamily({ creatorName, familyName, members })
          }
        />
      ) : role === 'child' ? (
        <ChildShell
          childName={childName}
          onRoleToggle={() => setRole('parent')}
        />
      ) : (
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
              onClick={() => setRole('child')}
            >
              {family.creatorName}
            </button>
          </header>
          <main style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-4)' }}>
            <p className="text-muted">Vanhempanäkymä tulossa.</p>
          </main>
        </div>
      )}
    </div>
  )
}
