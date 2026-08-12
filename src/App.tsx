import { useState, useEffect } from 'react'
import { onAuthStateChanged, signOut, User } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
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
      try {
        const snap = await getDoc(doc(db, `userFamilies/${user.uid}`))
        if (!snap.exists()) {
          setAuthState({ status: 'onboarding', user, familyId: null })
          return
        }
        const { familyId, role } = snap.data() as { familyId: string; role: string }
        setAuthState({
          status: role === 'parent' ? 'parent' : 'child',
          user,
          familyId,
        })
      } catch {
        setAuthState({ status: 'onboarding', user, familyId: null })
      }
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
        uid={user!.uid}
        onSignOut={() => signOut(auth)}
      />
    )
  }

  if (status === 'child' && familyId) {
    return wrapper(
      <ChildShell
        familyId={familyId}
        uid={user!.uid}
        childName={user?.displayName ?? 'Lapsi'}
        onSignOut={() => signOut(auth)}
      />
    )
  }

  return wrapper(<LoginView />)
}
