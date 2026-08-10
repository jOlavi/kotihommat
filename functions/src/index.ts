import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { initializeApp } from 'firebase-admin/app'
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'

initializeApp()
const db = getFirestore()
const adminAuth = getAuth()

// Functions implemented in Tasks 2–4
export { adminAuth, db, FieldValue, Timestamp, onCall, HttpsError }
