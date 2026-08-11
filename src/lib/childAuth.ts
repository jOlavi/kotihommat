import { initializeApp, deleteApp } from 'firebase/app'
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updatePassword,
  updateProfile,
} from 'firebase/auth'
import { auth, firebaseConfig } from '@/lib/firebase'

// Firebase Auth requires min 6 chars — PIN is 4 digits, so we append a fixed suffix
const PIN_SUFFIX = '!!kh'

function childEmail(username: string): string {
  return `${username.toLowerCase()}@kotihommat.app`
}

function childPassword(pin: string): string {
  return pin + PIN_SUFFIX
}

export async function signInChildAccount(username: string, pin: string): Promise<void> {
  await signInWithEmailAndPassword(auth, childEmail(username), childPassword(pin))
}

export async function createChildAuthAccount(
  username: string,
  pin: string,
  firstName: string
): Promise<string> {
  const secondaryApp = initializeApp(firebaseConfig, `child-create-${Date.now()}`)
  const secondaryAuth = getAuth(secondaryApp)
  try {
    const result = await createUserWithEmailAndPassword(
      secondaryAuth,
      childEmail(username),
      childPassword(pin)
    )
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
    const result = await signInWithEmailAndPassword(
      secondaryAuth,
      childEmail(username),
      childPassword(currentPin)
    )
    await updatePassword(result.user, childPassword(newPin))
  } finally {
    await deleteApp(secondaryApp)
  }
}
