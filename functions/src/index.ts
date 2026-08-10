import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'

initializeApp()
const db = getFirestore()
const adminAuth = getAuth()

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

async function generateFamilyCode(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const code = Array.from({ length: 6 }, () =>
      CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
    ).join('')
    const snap = await db.collection('families')
      .where('familyCode', '==', code).limit(1).get()
    if (snap.empty) return code
  }
  throw new HttpsError('internal', 'Perhekoodin luonti epäonnistui')
}

export const createFamily = onCall(
  { region: 'europe-west1' },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Kirjautuminen vaaditaan')
    const { firstName, familyName } = request.data as { firstName: string; familyName: string }
    if (!firstName?.trim()) throw new HttpsError('invalid-argument', 'Nimi vaaditaan')
    if (!familyName?.trim()) throw new HttpsError('invalid-argument', 'Perheen nimi vaaditaan')

    const familyCode = await generateFamilyCode()
    const familyRef = db.collection('families').doc()
    const familyId = familyRef.id
    const uid = request.auth.uid

    await familyRef.set({ familyCode, familyName: familyName.trim(), creatorUid: uid })
    await db.doc(`families/${familyId}/members/${uid}`).set({
      firstName: firstName.trim(), role: 'parent', familyId,
    })
    await adminAuth.setCustomUserClaims(uid, { familyId, role: 'parent' })

    return { familyId, familyCode }
  }
)

export const createChildAccount = onCall(
  { region: 'europe-west1' },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Kirjautuminen vaaditaan')
    const { firstName, pin, familyId } = request.data as {
      firstName: string; pin: string; familyId: string
    }
    if (!firstName?.trim()) throw new HttpsError('invalid-argument', 'Nimi vaaditaan')
    if (!/^\d{4}$/.test(pin)) throw new HttpsError('invalid-argument', 'PIN tulee olla 4 numeroa')

    const callerDoc = await db.doc(`families/${familyId}/members/${request.auth.uid}`).get()
    if (!callerDoc.exists || callerDoc.data()?.role !== 'parent') {
      throw new HttpsError('permission-denied', 'Vain vanhempi voi lisätä lapsia')
    }

    const familyDoc = await db.doc(`families/${familyId}`).get()
    const familyCode = familyDoc.data()?.familyCode as string
    const username = `${firstName.trim().toLowerCase()}.${familyCode.toLowerCase()}`
    const email = `${username}@kotihommat.app`

    const userRecord = await adminAuth.createUser({ email, displayName: firstName.trim() })
    await adminAuth.setCustomUserClaims(userRecord.uid, { familyId, role: 'child' })
    await db.doc(`families/${familyId}/members/${userRecord.uid}`).set({
      firstName: firstName.trim(), role: 'child', username, pin, familyId,
    })

    return { uid: userRecord.uid, username }
  }
)

// childLogin and updateChildPin added in Tasks 3–4
