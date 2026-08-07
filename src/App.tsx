import { useState } from 'react'
import { OnboardingView } from '@/pages/onboarding/OnboardingView'
import { ChildShell } from '@/components/ChildShell'
import { ParentShell } from '@/components/ParentShell'

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
        <ParentShell
          family={family}
          onAddMember={member =>
            setFamily(f => f && { ...f, members: [...f.members, member] })
          }
          onRoleToggle={() => setRole('child')}
        />
      )}
    </div>
  )
}
