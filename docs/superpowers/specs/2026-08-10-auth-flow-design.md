# Auth Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Firebase Auth for both parent (Google Sign-In) and child (username + PIN via Custom Token), replacing the current mock role-toggle with real authentication.

**Architecture:** Parent authenticates with Google Sign-In directly through Firebase Auth. Child authenticates via a Cloud Function (`childLogin`) that verifies a plain-text PIN stored in Firestore and returns a Firebase Custom Token. App.tsx listens to `onAuthStateChanged` and routes to the correct shell based on Firestore role.

**Tech Stack:** Firebase Auth (Google provider + Custom Tokens), Firestore, Firebase Cloud Functions (Admin SDK), React + TypeScript

---

## Global Constraints

- Finnish UI copy throughout — no English strings visible to users
- Family code: 6 chars, uppercase A-Z and digits 2-9 (exclude O, 0, I, 1 to avoid confusion)
- Child username format: `firstname.familycode` — both lowercased internally, e.g. `aino.abc123`
- Display format shown to parent: `aino.ABC123` (familyCode uppercased for readability) — generated from stored values at display time
- `firstName` stored as typed (e.g. `Aino`) for display; `username` stored fully lowercase and generated automatically
- PIN: 4 digits, stored plain text in Firestore so parent can view and reset it
- Rate limiting on `childLogin`: max 5 failed attempts per username per 15 minutes, then temporary lockout
- Child accounts created via Admin SDK in Cloud Function only — never `createUserWithEmailAndPassword` on client
- Internal email format for child Firebase Auth accounts: `username@kotihommat.app` (e.g. `aino.abc123@kotihommat.app`)
- No parent approval step for completed chores (existing constraint)

---

## Firestore Structure

```
families/{familyId}
  familyCode: string          // e.g. 'ABC123', unique across all families
  familyName: string          // e.g. 'Virtanen'
  creatorUid: string          // Firebase Auth uid of creating parent

  /members/{uid}
    firstName: string         // display name, e.g. 'Aino'
    role: 'parent' | 'child'
    familyId: string          // denormalized for Cloud Function lookups
    username?: string         // child only: 'aino.abc123' (fully lowercase)
    pin?: string              // child only: '1234', plain text

  /loginAttempts/{username}   // rate limiting collection
    count: number
    firstAttemptAt: Timestamp
    lockedUntil?: Timestamp
```

---

## Auth Flows

### Parent
1. App opens → `LoginView`
2. Tap "Kirjaudu Google-tilillä" → Firebase Google Sign-In popup
3. `onAuthStateChanged` fires → fetch `members/{uid}` from Firestore
4. If no Firestore record → `OnboardingView` (new family setup)
5. If role = `parent` → `ParentShell`

### Child
1. App opens → `LoginView`
2. Enter `aino.ABC123` + PIN `1234` → call `childLogin` Cloud Function
3. Function verifies rate limit → fetches member by username → checks PIN
4. Returns Custom Token → client calls `signInWithCustomToken`
5. `onAuthStateChanged` fires → fetch `members/{uid}` → role = `child` → `ChildShell`

### New family (onboarding)
1. Parent completes Google Sign-In, no Firestore record found
2. `OnboardingView` shown: enter own name + family name → call `createFamily`
3. `createFamily` generates unique family code, writes `families/{familyId}` and `members/{uid}`
4. Family code shown to parent immediately after creation
5. Parent adds children via "Lisää lapsi" → calls `createChildAccount`

---

## Cloud Functions

### `createFamily` (callable)
- Auth required (parent's Firebase uid)
- Generates unique 6-char family code (retry on collision)
- Writes `families/{familyId}` with `familyCode`, `familyName`, `creatorUid`
- Writes `members/{uid}` with `firstName`, `role: 'parent'`, `familyId`
- Returns `{ familyId, familyCode }`

### `createChildAccount` (callable)
- Auth required, caller must be `parent` in a family
- Accepts `{ firstName, pin, familyId }`
- Generates `username = firstName.toLowerCase() + '.' + familyCode`
- Admin SDK: creates Firebase Auth user with email `username@kotihommat.app`
- Writes `members/{uid}` with `firstName`, `role: 'child'`, `username`, `pin`, `familyId`
- Returns `{ uid, username }`

### `childLogin` (callable, no auth required)
- Accepts `{ username, pin }`
- Normalizes username to lowercase
- Checks `loginAttempts/{username}`: if `lockedUntil` > now → return `{ error: 'locked', lockedUntil }`
- Fetches member document by `username` field
- If not found or PIN mismatch:
  - Increment `loginAttempts/{username}.count`
  - If count >= 5: set `lockedUntil = now + 15min`
  - Return `{ error: 'invalid-credentials' }`
- On success: reset `loginAttempts/{username}`, mint Custom Token via Admin SDK
- Returns `{ token }`

### `updateChildPin` (callable)
- Auth required, caller must be `parent` in same family as child
- Accepts `{ childUid, newPin }`
- Validates PIN is 4 digits
- Updates `members/{childUid}.pin`

---

## Frontend Components

### New: `src/pages/auth/LoginView.tsx`
Two-section layout on one screen:
- **Parent section**: "Kirjaudu Google-tilillä" button (Google icon)
- **Divider**: "tai"
- **Child section**: text input for username (`aino.ABC123`) + 4-digit PIN input (numeric keyboard) + "Kirjaudu" button
- Error states: "Väärä käyttäjätunnus tai PIN" / "Tili lukittu 15 minuutiksi"
- No registration link — child accounts are created by parents only

### Modified: `src/App.tsx`
Replace mock state machine with Firebase auth listener:
```
onAuthStateChanged:
  no user        → <LoginView>
  user, no doc   → <OnboardingView>   (new parent)
  role=parent    → <ParentShell>
  role=child     → <ChildShell>
```
Loading state shown while Firestore fetch is in progress.

### Modified: `src/pages/onboarding/OnboardingView.tsx`
- Step 1 unchanged (name + family name form), but submit calls `createFamily` Cloud Function
- After creation: show family code prominently ("Perheen koodi: **ABC123**") with copy button
- "Lisää lapsi" calls `createChildAccount` Cloud Function (replaces current mock)
- Remove mock `InviteParentDialog` for now (parent invite is out of v1 scope)

### Modified: `src/pages/parent/ProfileView.tsx`
Add credentials section per child:
- Show `username` (e.g. `aino.ABC123`) and `pin` (e.g. `1234`)
- "Vaihda PIN" button → inline 4-digit input + confirm → calls `updateChildPin`

---

## Security Rules (summary)

```
families/{familyId}:
  read: member of this family
  write: parent of this family

families/{familyId}/members/{uid}:
  read: parent of family OR uid == request.auth.uid
  write: parent of family only (pin, username fields included)

families/{familyId}/taskInstances/{id}:
  read: member of family
  write status only: child where memberId == request.auth.uid

loginAttempts/{username}:
  read/write: Cloud Functions only (Admin SDK bypasses rules)
```

---

## Out of scope (v1)

- Second parent invite flow (existing `InviteParentDialog` stub remains but is non-functional)
- Email verification for parents
- Password reset for parents (Google handles this)
- Push notifications / FCM
- Child PIN hashing (plain text is acceptable trade-off for parent visibility)
