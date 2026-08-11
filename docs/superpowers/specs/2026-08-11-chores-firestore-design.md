# Kotityöt Firestoreen — Design Spec

**Goal:** Kytke kotitöiden CRUD ja viikkosuunnittelija Firestore-tietokantaan. Korvaa paikallinen React-state reaaliaikaisilla Firestore-subscriptioilla. Yhtenäistä paikalliset tyypit globaalin `src/types/index.ts`:n kanssa.

**Architecture:** ParentShell subscriboi `chores`-kokoelmaan ja välittää sen alaspäin. ChoresView, WeekView ja ProfileView subscriboivat kukin oman viikko-offsetinsa mukaisen viikkosuunnitelman. ChoresView kirjoittaa kotityö-CRUDin ja viikkosuunnitelman Firestoreen.

**Tech Stack:** React + TypeScript, Firebase Firestore (`onSnapshot`, `setDoc`, `updateDoc`, `deleteDoc`, `collection`, `doc`)

---

## Global Constraints

- Suomenkielinen UI läpi — ei englanninkielisiä stringejä käyttäjälle näkyvissä
- `ChoreType` Firestoressä: `'daily' | 'weekly' | 'once'` (englanti tietokannassa)
- UI-labelit: `{ daily: 'Päivittäin', weekly: 'Viikoittain', once: 'Kerran' }`
- Kotityön hinta: 50 sentin askelin (`priceCents`, kokonaisluku)
- Viikkosuunnitelman assignee: lapsen Firebase UID (ei firstName)
- `weekId`-muoto: `"YYYY-WNN"` esim. `"2026-W32"` (ISO-viikko, zero-padded)
- Viikkosuunnittelija käyttää paikallista draft-tilaa — kirjoitetaan Firestoreen vasta "Tallenna"-napilla
- Ei auto-save
- Poistetun kotityön assignment-dokumentit jäävät Firestoreen orvoiksi (v1-hyväksytty)

---

## Firestore-rakenne

```
families/{familyId}/chores/{choreId}
  name: string
  priceCents: number            // kokonaisluku, esim. 100 = 1,00 €
  type: 'daily' | 'weekly' | 'once'
  assignedMemberIds: string[]   // lapsen Firebase UID:t
  active: boolean               // true aina luodessa; tulevaisuudessa soft delete

families/{familyId}/weeklyPlans/{weekId}/assignments/{choreId}
  // päivittäinen kotityö — päivä → UID tai kenttä puuttuu
  ma?: string    // uid
  ti?: string
  ke?: string
  to?: string
  pe?: string
  la?: string
  su?: string
  // viikoittainen kotityö — yksi vastuuhenkilö koko viikoksi
  all?: string   // uid
```

Assignmentit kirjoitetaan `setDoc(..., { merge: true })` — ylikirjoitetaan vain muuttuneet kentät.

---

## Tyypit (`src/types/index.ts`)

Tiedostoon ei tarvita isoja muutoksia — `ChoreType`, `Chore`, `Assignment` ja `DayKey` ovat jo oikein. Tarkistettava:

- `ChoreType = 'daily' | 'weekly' | 'once'` ✓
- `Chore.assignedMemberIds: string[]` ✓
- `Chore.active: boolean` ✓
- `Assignment = Partial<Record<DayKey, string>> & { all?: string }` ✓ (arvot ovat UID-stringejä)

**Poistetaan** paikalliset tyypit muista tiedostoista:
- `ChoreDialog.tsx`: oma `Chore`, `ChoreFormData`, `ChoreType` → `import { Chore, ChoreType } from '@/types'`
- `ChoresView.tsx`: oma `WeekAssignment`, oma `DayKey` → `import { Assignment, DayKey } from '@/types'`

---

## Komponenttien muutokset

### `src/pages/parent/ChoreDialog.tsx`

**Proppimuutos:**
```tsx
// Ennen
interface Props {
  chore: Chore | null
  childNames: string[]
  onSave: (data: ChoreFormData) => void
  onClose: () => void
}

// Jälkeen
interface Props {
  chore: Chore | null
  firestoreMembers: Member[]    // lapset (role === 'child')
  onSave: (data: ChoreFormData) => void
  onClose: () => void
}
```

**ChoreFormData** (paikallinen lomaketyyppi tiedostossa):
```tsx
interface ChoreFormData {
  name: string
  priceCents: number
  type: ChoreType
  assignedMemberIds: string[]
}
```

**Checkbox-lista** käyttää `member.uid` arvona ja `member.firstName` labelina:
```tsx
{firestoreMembers.filter(m => m.role === 'child').map(m => (
  <label key={m.uid} className="radio">
    <input
      type="checkbox"
      name="assign"
      value={m.uid}
      defaultChecked={chore?.assignedMemberIds.includes(m.uid) ?? false}
    />
    <span className="dot" />
    {m.firstName}
  </label>
))}
```

**TYPE_LABELS:**
```tsx
const TYPE_LABELS: Record<ChoreType, string> = {
  daily: 'Päivittäin',
  weekly: 'Viikoittain',
  once: 'Kerran',
}
```

---

### `src/pages/parent/ChoresView.tsx`

**Proppimuutos:**
```tsx
// Ennen
interface Props {
  childNames: string[]
  chores: Chore[]
  setChores: React.Dispatch<React.SetStateAction<Chore[]>>
  weeklyPlans: Record<string, WeekAssignment[]>
  setWeekPlans: React.Dispatch<React.SetStateAction<Record<string, WeekAssignment[]>>>
}

// Jälkeen
interface Props {
  familyId: string
  firestoreMembers: Member[]
}
```

**Chores-subscription** (pysyvä, koko komponentin elinajan):
```tsx
useEffect(() => {
  return onSnapshot(collection(db, `families/${familyId}/chores`), snap => {
    setChores(snap.docs.map(d => ({ id: d.id, ...d.data() } as Chore)))
  })
}, [familyId])
```

**Viikkosuunnitelma-subscription** (vaihtuu weekOffset mukana):
```tsx
useEffect(() => {
  const weekId = getWeekId(weekOffset)
  return onSnapshot(
    collection(db, `families/${familyId}/weeklyPlans/${weekId}/assignments`),
    snap => {
      const loaded: Record<string, Assignment> = {}
      snap.docs.forEach(d => { loaded[d.id] = d.data() as Assignment })
      // Muodostetaan plannerDraft chores-listan pohjalta
      setPlannerDraft(
        chores.filter(c => c.type !== 'once').map(c => ({
          choreId: c.id,
          assignment: loaded[c.id] ?? {}
        }))
      )
    }
  )
}, [familyId, weekOffset, chores])
```

**Chore CRUD Firestoreen:**
```tsx
// Lisää
const ref = doc(collection(db, `families/${familyId}/chores`))
await setDoc(ref, { name, priceCents, type, assignedMemberIds, active: true })

// Muokkaa
await updateDoc(doc(db, `families/${familyId}/chores/${id}`), { name, priceCents, type, assignedMemberIds })

// Poista
await deleteDoc(doc(db, `families/${familyId}/chores/${id}`))
```

**Tallenna viikkosuunnitelma:**
```tsx
const handleSavePlan = async () => {
  const weekId = getWeekId(weekOffset)
  await Promise.all(
    plannerDraft.map(({ choreId, assignment }) =>
      setDoc(
        doc(db, `families/${familyId}/weeklyPlans/${weekId}/assignments/${choreId}`),
        assignment,
        { merge: true }
      )
    )
  )
  setPlannerSaved(true)
  setTimeout(() => setPlannerSaved(false), 1500)
}
```

**plannerDraft-rakenne:**
```tsx
interface PlannerEntry {
  choreId: string
  assignment: Assignment  // { ma?: uid, ti?: uid, ..., all?: uid }
}
```

**Assignee-display** viikkosuunnittelussa: select-dropdown arvoina UID:t, labelina firstName:
```tsx
<select value={entry.assignment[day] ?? ''} onChange={...}>
  <option value="">–</option>
  {firestoreMembers.filter(m => m.role === 'child').map(m => (
    <option key={m.uid} value={m.uid}>{m.firstName}</option>
  ))}
</select>
```

**Kotityölistaus** (`assignedMemberIds` → firstName):
```tsx
const memberName = (uid: string) =>
  firestoreMembers.find(m => m.uid === uid)?.firstName ?? '–'

// Listaus:
{c.assignedMemberIds.length > 0
  ? c.assignedMemberIds.map(memberName).join(', ')
  : 'Ei kohdistettu'}
```

---

### `src/pages/parent/WeekView.tsx`

**Proppimuutos:**
```tsx
// Ennen
interface Props {
  childNames: string[]
  chores: Chore[]
  weeklyPlans: Record<string, WeekAssignment[]>
  onChildClick: (name: string) => void
}

// Jälkeen
interface Props {
  chores: Chore[]
  familyId: string
  firestoreMembers: Member[]
  onChildClick: (uid: string) => void  // uid eikä name
}
```

**Viikkosuunnitelma-subscription** (sama rakenne kuin ChoresView):
```tsx
const [weekAssignments, setWeekAssignments] = useState<Record<string, Assignment>>({})

useEffect(() => {
  const weekId = getWeekId(overviewWeek)
  return onSnapshot(
    collection(db, `families/${familyId}/weeklyPlans/${weekId}/assignments`),
    snap => {
      const loaded: Record<string, Assignment> = {}
      snap.docs.forEach(d => { loaded[d.id] = d.data() as Assignment })
      setWeekAssignments(loaded)
    }
  )
}, [familyId, overviewWeek])
```

**Assignee lookup:** `uid → firstName` käyttäen `firestoreMembers`.

**`onChildClick`** välittää lapsen UID:n (ParentShell käyttää sitä `profileChildId`-statena → ProfileView valitsee oikean lapsen).

---

### `src/pages/parent/ProfileView.tsx`

**Proppimuutos:**
```tsx
// Poistetaan: weeklyPlans: Record<string, WeekAssignment[]>
// Lisätään (jos ei jo): familyId on jo olemassa
```

**Viikkosuunnitelma-subscription** (sama rakenne kuin WeekView):
```tsx
useEffect(() => {
  return onSnapshot(
    collection(db, `families/${familyId}/weeklyPlans/${getWeekId(weekOffset)}/assignments`),
    snap => { /* sama kuin WeekView */ }
  )
}, [familyId, weekOffset])
```

**Lapsen tunnistus** siirtyy UID-pohjaiseksi: `initialChild` ja `selectedName` sisäisesti voivat olla `uid` tai `firstName` — valinta tehdään implementoinnissa. Yksinkertaisin: `selectedUid` statena, display käyttää `member.firstName`.

---

### `src/components/ParentShell.tsx`

**Poistetaan:**
- `INITIAL_CHORES` vakio
- `chores` ja `setChores` state
- `weeklyPlans` ja `setWeekPlans` state
- `weeklyPlans`/`setWeekPlans` propsit ChoresView'lle, WeekView'lle ja ProfileView'lle

**Lisätään:**
- `chores: Chore[]` state + `onSnapshot(families/${familyId}/chores)`
- `firestoreMembers` välitetään ChoresView'lle ja WeekView'lle (jo olemassa statena)

**ChoresView-kutsu:**
```tsx
<ChoresView familyId={familyId} firestoreMembers={firestoreMembers} />
```

**WeekView-kutsu:**
```tsx
<WeekView
  chores={chores}
  familyId={familyId}
  firestoreMembers={firestoreMembers}
  onChildClick={(uid) => { setProfileChildId(uid); setActiveTab('lapset') }}
/>
```

**ProfileView** saa `chores={chores}` muttei enää `weeklyPlans`.

---

## Virhetilanteet

- Firestore-kirjoitus epäonnistuu: näytetään suomenkielinen virheilmoitus (`'Tallennus epäonnistui'`), tila palautetaan
- Lataus-tila: `loading`-boolean kotityölistalle ja viikkosuunnitelmalle, näytetään lyhyt "Ladataan..." teksti

---

## Scope (v1 rajaukset)

- `active`-kenttä asetetaan aina `true`:ksi — soft delete / arkistointi myöhemmin
- Poistetun kotityön vanhat assignment-dokumentit jäävät Firestoreen (siivotaan myöhemmin)
- `taskInstances`-generointi (tehtävien tilahistoria) on erillinen tuleva ominaisuus
- `kertaluontoinen`-tyypin kotityöt eivät näy viikkosuunnittelussa (sama kuin nyt)
