import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { initializeApp } from 'firebase-admin/app'
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore'
import { getAuth, UserRecord } from 'firebase-admin/auth'

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
    // Set displayName on the Auth user (best-effort, does not affect family creation)
    await adminAuth.updateUser(uid, { displayName: firstName.trim() }).catch(() => undefined)

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
    if (!familyId) throw new HttpsError('invalid-argument', 'Perheen tunniste vaaditaan')
    if (!firstName?.trim()) throw new HttpsError('invalid-argument', 'Nimi vaaditaan')
    if (!/^\d{4}$/.test(pin)) throw new HttpsError('invalid-argument', 'PIN tulee olla 4 numeroa')

    const callerDoc = await db.doc(`families/${familyId}/members/${request.auth.uid}`).get()
    if (!callerDoc.exists || callerDoc.data()?.role !== 'parent') {
      throw new HttpsError('permission-denied', 'Vain vanhempi voi lisätä lapsia')
    }

    const familyDoc = await db.doc(`families/${familyId}`).get()
    if (!familyDoc.exists) throw new HttpsError('not-found', 'Perhettä ei löydy')
    const familyCode = familyDoc.data()!.familyCode as string
    if (!familyCode) throw new HttpsError('internal', 'Perhekoodi puuttuu')
    const username = `${firstName.trim().toLowerCase()}.${familyCode.toLowerCase()}`
    const email = `${username}@kotihommat.app`

    // Fix 2: Detect duplicate child name and surface a clear error
    let userRecord: UserRecord
    try {
      userRecord = await adminAuth.createUser({ email, displayName: firstName.trim() })
    } catch (createError: unknown) {
      const code = (createError as { code?: string }).code
      if (code === 'auth/email-already-exists') {
        throw new HttpsError('already-exists', 'Tällä nimellä on jo lapsi tässä perheessä')
      }
      throw createError
    }
    try {
      await adminAuth.setCustomUserClaims(userRecord.uid, { familyId, role: 'child' })
      await db.doc(`families/${familyId}/members/${userRecord.uid}`).set({
        firstName: firstName.trim(), role: 'child', username, pin, familyId,
      })
    } catch (_err) {
      await adminAuth.deleteUser(userRecord.uid).catch(() => undefined)
      throw new HttpsError('internal', 'Lapsen tilin luonti epäonnistui')
    }
    return { uid: userRecord.uid, username }
  }
)

export const childLogin = onCall(
  { region: 'europe-west1' },
  async (request) => {
    const { username, pin } = request.data as { username: string; pin: string }

    // Fix 1: Input validation guard
    if (typeof username !== 'string' || typeof pin !== 'string') {
      throw new HttpsError('invalid-argument', 'Käyttäjätunnus ja PIN vaaditaan')
    }

    const normalizedUsername = username.toLowerCase().trim()

    // Fix 3: Wrap rate-limit counter mutation in a Firestore transaction
    const attemptRef = db.doc(`loginAttempts/${normalizedUsername}`)

    const rateLimitResult = await db.runTransaction(async (t) => {
      const attemptDoc = await t.get(attemptRef)

      if (attemptDoc.exists) {
        const data = attemptDoc.data()!
        const lockedUntil = data.lockedUntil as Timestamp | undefined
        if (lockedUntil && lockedUntil.toDate() > new Date()) {
          return { locked: true, lockedUntil: lockedUntil.toDate().toISOString() }
        }
      }

      // Not currently locked — increment count for a failed attempt optimistically;
      // the caller will reset on success, so we pre-increment here and roll back
      // if the PIN check passes (by deleting the doc on success).
      // Actually: we only want to increment on failure — so we record current state
      // and return it; the increment will be done after PIN check if needed.
      const data = attemptDoc.exists ? attemptDoc.data()! : null
      const previousLockExpired = data?.lockedUntil &&
        (data.lockedUntil as Timestamp).toDate() <= new Date()
      const currentCount = (data && !previousLockExpired) ? ((data.count as number) ?? 0) : 0

      return { locked: false, currentCount, previousLockExpired: Boolean(previousLockExpired), attemptDocExists: attemptDoc.exists }
    })

    if (rateLimitResult.locked) {
      throw new HttpsError('resource-exhausted', `Tili lukittu. Yritä uudelleen myöhemmin. Lukitus vanhenee: ${rateLimitResult.lockedUntil}`)
    }

    // Find member across all families by username
    const memberSnap = await db.collectionGroup('members')
      .where('username', '==', normalizedUsername)
      .where('role', '==', 'child')
      .limit(1)
      .get()

    if (memberSnap.empty || memberSnap.docs[0].data().pin !== pin) {
      // PIN check failed — atomically increment the attempt counter
      await db.runTransaction(async (t) => {
        const attemptDoc = await t.get(attemptRef)
        const data = attemptDoc.exists ? attemptDoc.data()! : null
        const previousLockExpired = data?.lockedUntil &&
          (data.lockedUntil as Timestamp).toDate() <= new Date()
        const currentCount = (data && !previousLockExpired) ? ((data.count as number) ?? 0) : 0
        const newCount = currentCount + 1
        const update: Record<string, unknown> = { count: newCount }
        if (!attemptDoc.exists || previousLockExpired) {
          update.firstAttemptAt = FieldValue.serverTimestamp()
          update.lockedUntil = FieldValue.delete()  // clear any stale lock
        }
        if (newCount >= 5) {
          update.lockedUntil = Timestamp.fromDate(new Date(Date.now() + 15 * 60 * 1000))
        }
        t.set(attemptRef, update, { merge: true })
      })
      return { error: 'invalid-credentials' }
    }

    // Success: reset attempts and return custom token
    await attemptRef.delete()
    const uid = memberSnap.docs[0].id
    const token = await adminAuth.createCustomToken(uid)
    return { token }
  }
)

export const updateChildPin = onCall(
  { region: 'europe-west1' },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Kirjautuminen vaaditaan')
    const { childUid, newPin, familyId } = request.data as {
      childUid: string; newPin: string; familyId: string
    }
    if (!/^\d{4}$/.test(newPin)) throw new HttpsError('invalid-argument', 'PIN tulee olla 4 numeroa')

    const callerDoc = await db.doc(`families/${familyId}/members/${request.auth.uid}`).get()
    if (!callerDoc.exists || callerDoc.data()?.role !== 'parent') {
      throw new HttpsError('permission-denied', 'Vain vanhempi voi vaihtaa PIN-koodin')
    }

    await db.doc(`families/${familyId}/members/${childUid}`).update({ pin: newPin })
  }
)
