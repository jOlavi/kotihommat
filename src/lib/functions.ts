import { httpsCallable } from 'firebase/functions'
import { functions } from '@/lib/firebase'

export const createFamilyFn = httpsCallable<
  { firstName: string; familyName: string },
  { familyId: string; familyCode: string }
>(functions, 'createFamily')

export const createChildAccountFn = httpsCallable<
  { firstName: string; pin: string; familyId: string },
  { uid: string; username: string }
>(functions, 'createChildAccount')

export const childLoginFn = httpsCallable<
  { username: string; pin: string },
  { token?: string; error?: 'invalid-credentials' | 'locked'; lockedUntil?: string }
>(functions, 'childLogin')

export const updateChildPinFn = httpsCallable<
  { childUid: string; newPin: string; familyId: string },
  void
>(functions, 'updateChildPin')
