import { useState } from 'react'
import { OnboardingView } from '@/pages/onboarding/OnboardingView'

interface FamilyState {
  creatorName: string
  familyName: string
  members: { name: string; role: 'parent' | 'child' }[]
}

export default function App() {
  const [family, setFamily] = useState<FamilyState | null>(null)

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
      ) : (
        <>
          <header className="nav" style={{ padding: 'var(--space-3) var(--space-4)', flex: 'none' }}>
            <span className="nav-brand" style={{ fontSize: 16 }}>Kotihommat</span>
            <button
              className="tag tag-accent"
              style={{ border: 'none', cursor: 'pointer', fontFamily: 'var(--font-heading)', fontWeight: 600 }}
            >
              {family.creatorName}
            </button>
          </header>
          <main style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-4)' }}>
            <p className="text-muted">Tervetuloa, {family.creatorName}! Näkymät tulossa.</p>
          </main>
        </>
      )}
    </div>
  )
}
