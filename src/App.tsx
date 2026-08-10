import { useState, useEffect } from 'react'
import { onAuthStateChanged, signOut, User } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { LoginView } from '@/pages/auth/LoginView'
import { OnboardingView } from '@/pages/onboarding/OnboardingView'
import { ChildShell } from '@/components/ChildShell'
import { ParentShell } from '@/components/ParentShell'

type AuthStatus = 'loading' | 'unauthenticated' | 'onboarding' | 'parent' | 'child'

interface AuthState {
  status: AuthStatus
  user: User | null
  familyId: string | null
}

export default function App() {
  const [authState, setAuthState] = useState<AuthState>({
    status: 'loading',
    user: null,
    familyId: null,
  })

  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setAuthState({ status: 'unauthenticated', user: null, familyId: null })
        return
      }
      const token = await user.getIdTokenResult()
      const familyId = token.claims.familyId as string | undefined
      const role = token.claims.role as string | undefined

      if (!familyId || !role) {
        setAuthState({ status: 'onboarding', user, familyId: null })
        return
      }

      setAuthState({
        status: role === 'parent' ? 'parent' : 'child',
        user,
        familyId,
      })
    })
  }, [])

  const wrapper = (children: React.ReactNode) => (
    <div style={{
      width: 'min(480px, 100vw)',
      height: 'min(900px, 100dvh)',
      background: 'var(--color-bg)',
      overflow: 'hidden',
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      boxShadow: 'var(--shadow-lg)',
    }}>
      {children}
    </div>
  )

  const { status, user, familyId } = authState

  if (status === 'loading') {
    return wrapper(
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <span style={{ opacity: 0.4, fontSize: 14 }}>Ladataan…</span>
      </div>
    )
  }

  if (status === 'unauthenticated') return wrapper(<LoginView />)

  if (status === 'onboarding' && user) {
    return wrapper(
      <OnboardingView
        user={user}
        onComplete={(newFamilyId) => {
          setAuthState({ status: 'parent', user, familyId: newFamilyId })
        }}
      />
    )
  }

  if (status === 'parent' && familyId) {
    return wrapper(
      <ParentShell
        familyId={familyId}
        creatorName={user?.displayName ?? 'Vanhempi'}
        onSignOut={() => signOut(auth)}
      />
    )
  }

  if (status === 'child' && familyId) {
    return wrapper(
      <ChildShell
        familyId={familyId}
        childName={user?.displayName ?? 'Lapsi'}
        onSignOut={() => signOut(auth)}
      />
    )
  }

  return wrapper(<LoginView />)
}
