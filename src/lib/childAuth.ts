import { initializeApp, deleteApp } from 'firebase/app'
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updatePassword,
  updateProfile,
} from 'firebase/auth'
import { firebaseConfig } from '@/lib/firebase'

function childEmail(username: string): string {
  return `${username.toLowerCase()}@kotihommat.app`
}

export async function createChildAuthAccount(
  username: string,
  pin: string,
  firstName: string
): Promise<string> {
  const secondaryApp = initializeApp(firebaseConfig, `child-create-${Date.now()}`)
  const secondaryAuth = getAuth(secondaryApp)
  try {
    const result = await createUserWithEmailAndPassword(secondaryAuth, childEmail(username), pin)
    await updateProfile(result.user, { displayName: firstName })
    return result.user.uid
  } finally {
    await deleteApp(secondaryApp)
  }
}

export async function updateChildAuthPin(
  username: string,
  currentPin: string,
  newPin: string
): Promise<void> {
  const secondaryApp = initializeApp(firebaseConfig, `child-pin-${Date.now()}`)
  const secondaryAuth = getAuth(secondaryApp)
  try {
    const result = await signInWithEmailAndPassword(secondaryAuth, childEmail(username), currentPin)
    await updatePassword(result.user, newPin)
  } finally {
    await deleteApp(secondaryApp)
  }
}
