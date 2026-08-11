# Kotityöt Firestoreen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Kytke kotitöiden CRUD ja viikkosuunnittelija Firestore-tietokantaan; korvaa paikallinen React-state reaaliaikaisilla `onSnapshot`-subscriptioilla ja yhtenäistä paikalliset tyypit globaalin `src/types/index.ts`:n kanssa.

**Architecture:** Task 1 tekee kaikkien viiden tiedoston tyypimigraation ja ChoresView:n Firestore-kytkennän samalla commitilla — näin TypeScript kompiloi jokaisen taskin jälkeen. Task 2 lisää `onSnapshot`-subscription WeekView:iin, Task 3 ProfileView:iin.

**Tech Stack:** React + TypeScript, Firebase Firestore (`onSnapshot`, `setDoc`, `updateDoc`, `deleteDoc`, `collection`, `doc`)

## Global Constraints

- Suomenkielinen UI — ei englanninkielisiä stringejä käyttäjälle
- `ChoreType` Firestoressä: `'daily' | 'weekly' | 'once'` (englanti tietokannassa)
- UI-labelit: `{ daily: 'Päivittäin', weekly: 'Viikoittain', once: 'Kerran' }`
- Hinta `priceCents`: kokonaisluku, 50 sentin askelin
- `weekId`-muoto: `"YYYY-WNN"` (ISO-viikko, zero-padded), esim. `"2026-W32"`
- Viikkosuunnittelija käyttää paikallista draft-tilaa; kirjoitetaan Firestoreen vasta "Tallenna"-napilla
- Poistetun kotityön assignment-dokumentit jäävät Firestoreen orvoiksi (v1-hyväksytty)
- TypeScript-tarkistus: `npx tsc --noEmit -p tsconfig.app.json` — 0 virhettä jokaisen taskin jälkeen

---

## File Map

- **Modify:** `src/pages/parent/ChoreDialog.tsx` — poista paikalliset tyypit, importtaa `@/types`, vaihda `childNames → firestoreMembers`
- **Modify:** `src/pages/parent/ChoresView.tsx` — täydellinen uudelleenkirjoitus Firestore-subscriptioilla ja CRUD:lla
- **Modify:** `src/pages/parent/WeekView.tsx` — korjaa importit, propsit, type-vertailut; lisää subscription Task 2:ssa
- **Modify:** `src/pages/parent/ProfileView.tsx` — korjaa importit, poista `weeklyPlans`/`childNames`, UID-pohjainen valinta; lisää subscription Task 3:ssa
- **Modify:** `src/components/ParentShell.tsx` — poista `INITIAL_CHORES` ja `weeklyPlans`, lisää chores-subscription

---

### Task 1: Tyypit + ChoresView Firestore + muiden viiden tiedoston migraatio

Kaikki viisi tiedostoa muutetaan yhdessä commitissa, koska `Chore`-tyypin muutos (`assignedChildNames → assignedMemberIds`, `paivittainen → daily`) hajottaisi TypeScriptin kompilointiin asti kaikissa muissa komponenteissa.

**Files:**
- Modify: `src/pages/parent/ChoreDialog.tsx`
- Modify: `src/pages/parent/ChoresView.tsx`
- Modify: `src/pages/parent/WeekView.tsx`
- Modify: `src/pages/parent/ProfileView.tsx`
- Modify: `src/components/ParentShell.tsx`

**Interfaces:**
- Produces: `ChoresView` exporttaa vain `ChoresView`-funktion (ei enää `WeekAssignment`, `DayKey`)
- Produces: `ChoreDialog` exporttaa vain `ChoreDialog`-funktion ja `ChoreFormData`-tyypin
- Produces: `WeekView` props: `{ chores: Chore[], familyId: string, firestoreMembers: Member[], onChildClick: (uid: string) => void }`
- Produces: `ProfileView` props: `{ initialChild?: string, profiles, updateProfile, chores: Chore[], familyId: string, firestoreMembers: Member[] }` (ei `childNames`, ei `weeklyPlans`)
- `weekAssignments` on `{}` stub WeekView:ssä ja ProfileView:ssä — täytetään Task 2 ja 3:ssa

- [ ] **Step 1: Kirjoita ChoreDialog.tsx uudelleen**

Korvaa koko tiedoston sisältö:

```tsx
import { Chore, ChoreType, Member } from '@/types'

export interface ChoreFormData {
  name: string
  priceCents: number
  type: ChoreType
  assignedMemberIds: string[]
}

const TYPE_LABELS: Record<ChoreType, string> = {
  daily: 'Päivittäin',
  weekly: 'Viikoittain',
  once: 'Kerran',
}

interface Props {
  chore: Chore | null
  firestoreMembers: Member[]
  onSave: (data: ChoreFormData) => void
  onClose: () => void
}

export function ChoreDialog({ chore, firestoreMembers, onSave, onClose }: Props) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const name = (form.elements.namedItem('name') as HTMLInputElement).value.trim()
    const price = parseFloat((form.elements.namedItem('price') as HTMLInputElement).value)
    const type = (form.elements.namedItem('type') as RadioNodeList).value as ChoreType
    const assignedMemberIds = Array.from(
      form.querySelectorAll<HTMLInputElement>('input[name="assign"]:checked')
    ).map(el => el.value)
    onSave({ name, priceCents: Math.round(price * 100), type, assignedMemberIds })
  }

  return (
    <div className="dialog-backdrop">
      <form className="dialog" onSubmit={handleSubmit}>
        <div className="dialog-title">
          {chore ? 'Muokkaa kotityötä' : 'Lisää kotityö'}
        </div>

        <div className="field">
          <label htmlFor="chore-name">Nimi</label>
          <input
            className="input"
            id="chore-name"
            name="name"
            required
            defaultValue={chore?.name ?? ''}
            placeholder="esim. Roskien vienti"
          />
        </div>

        <div className="field">
          <label htmlFor="chore-price">Hinta (€)</label>
          <input
            className="input"
            id="chore-price"
            name="price"
            type="number"
            step="0.5"
            min="0.5"
            required
            defaultValue={chore ? chore.priceCents / 100 : ''}
          />
        </div>

        <div className="field">
          <label>Tyyppi</label>
          <div className="seg" style={{ width: '100%' }}>
            {(['daily', 'weekly', 'once'] as ChoreType[]).map(t => (
              <label key={t} className="seg-opt" style={{ flex: 1, justifyContent: 'center' }}>
                <input
                  type="radio"
                  name="type"
                  value={t}
                  defaultChecked={(chore?.type ?? 'daily') === t}
                />
                {TYPE_LABELS[t]}
              </label>
            ))}
          </div>
        </div>

        {firestoreMembers.length > 0 && (
          <div className="field">
            <label>Kohdista lapselle</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
              {firestoreMembers.map(m => (
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
            </div>
          </div>
        )}

        <div className="dialog-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Peruuta
          </button>
          <button type="submit" className="btn btn-primary">
            Tallenna
          </button>
        </div>
      </form>
    </div>
  )
}
```

- [ ] **Step 2: Kirjoita ChoresView.tsx uudelleen**

Korvaa koko tiedoston sisältö:

```tsx
import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { collection, doc, onSnapshot, setDoc, updateDoc, deleteDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { ChoreDialog, ChoreFormData } from '@/pages/parent/ChoreDialog'
import { Chore, Assignment, DayKey, Member } from '@/types'

const DAY_KEYS: DayKey[] = ['ma', 'ti', 'ke', 'to', 'pe', 'la', 'su']
const DAY_SHORTS: Record<DayKey, string> = {
  ma: 'Ma', ti: 'Ti', ke: 'Ke', to: 'To', pe: 'Pe', la: 'La', su: 'Su',
}
const TYPE_LABELS: Record<string, string> = {
  daily: 'Päivittäin',
  weekly: 'Viikoittain',
  once: 'Kerran',
}

interface PlannerEntry {
  choreId: string
  assignment: Assignment
}

interface Props {
  familyId: string
  firestoreMembers: Member[]
}

function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

function getWeekId(offsetWeeks: number): string {
  const ref = new Date()
  ref.setDate(ref.getDate() + offsetWeeks * 7)
  return `${ref.getFullYear()}-W${String(getISOWeek(ref)).padStart(2, '0')}`
}

function formatPrice(cents: number): string {
  return (cents / 100).toLocaleString('fi-FI', { minimumFractionDigits: 2 })
}

export function ChoresView({ familyId, firestoreMembers }: Props) {
  const [view, setView] = useState<'lista' | 'suunnittelu'>('lista')
  const [weekOffset, setWeekOffset] = useState(0)
  const [chores, setChores] = useState<Chore[]>([])
  const [choresLoading, setChoresLoading] = useState(true)
  const [savedAssignments, setSavedAssignments] = useState<Record<string, Assignment>>({})
  const [plannerDraft, setPlannerDraft] = useState<PlannerEntry[]>([])
  const [plannerSaved, setPlannerSaved] = useState(false)
  const [plannerError, setPlannerError] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingChore, setEditingChore] = useState<Chore | null>(null)
  const [choreError, setChoreError] = useState('')

  useEffect(() => {
    return onSnapshot(collection(db, `families/${familyId}/chores`), snap => {
      setChores(snap.docs.map(d => ({ id: d.id, ...d.data() } as Chore)))
      setChoresLoading(false)
    })
  }, [familyId])

  useEffect(() => {
    const weekId = getWeekId(weekOffset)
    return onSnapshot(
      collection(db, `families/${familyId}/weeklyPlans/${weekId}/assignments`),
      snap => {
        const loaded: Record<string, Assignment> = {}
        snap.docs.forEach(d => { loaded[d.id] = d.data() as Assignment })
        setSavedAssignments(loaded)
      }
    )
  }, [familyId, weekOffset])

  useEffect(() => {
    setPlannerDraft(
      chores.filter(c => c.type !== 'once').map(c => ({
        choreId: c.id,
        assignment: savedAssignments[c.id] ?? {},
      }))
    )
  }, [chores, savedAssignments])

  const childMembers = firestoreMembers.filter(m => m.role === 'child')
  const memberName = (uid: string) => firestoreMembers.find(m => m.uid === uid)?.firstName ?? '–'

  const handleSave = async (data: ChoreFormData) => {
    setChoreError('')
    try {
      if (editingChore) {
        await updateDoc(doc(db, `families/${familyId}/chores/${editingChore.id}`), {
          name: data.name,
          priceCents: data.priceCents,
          type: data.type,
          assignedMemberIds: data.assignedMemberIds,
        })
      } else {
        const ref = doc(collection(db, `families/${familyId}/chores`))
        await setDoc(ref, {
          name: data.name,
          priceCents: data.priceCents,
          type: data.type,
          assignedMemberIds: data.assignedMemberIds,
          active: true,
        })
      }
      setDialogOpen(false)
      setEditingChore(null)
    } catch {
      setChoreError('Tallennus epäonnistui')
    }
  }

  const handleDelete = async (id: string) => {
    setChoreError('')
    try {
      await deleteDoc(doc(db, `families/${familyId}/chores/${id}`))
    } catch {
      setChoreError('Poisto epäonnistui')
    }
  }

  const openAdd = () => { setEditingChore(null); setDialogOpen(true) }
  const openEdit = (chore: Chore) => { setEditingChore(chore); setDialogOpen(true) }

  const updateDay = (choreId: string, day: DayKey, uid: string) =>
    setPlannerDraft(prev => prev.map(e =>
      e.choreId === choreId ? { ...e, assignment: { ...e.assignment, [day]: uid } } : e
    ))

  const updateAll = (choreId: string, uid: string) =>
    setPlannerDraft(prev => prev.map(e =>
      e.choreId === choreId ? { ...e, assignment: { ...e.assignment, all: uid } } : e
    ))

  const handleSavePlan = async () => {
    setPlannerError('')
    const weekId = getWeekId(weekOffset)
    try {
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
    } catch {
      setPlannerError('Tallennus epäonnistui')
    }
  }

  const currentWeekNum = getISOWeek((() => { const d = new Date(); d.setDate(d.getDate() + weekOffset * 7); return d })())

  return (
    <div style={{ padding: 'var(--space-4)' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
        <h2 style={{ margin: 0 }}>Kotityöt</h2>
        {view === 'lista' && (
          <button type="button" className="btn btn-primary" onClick={openAdd}>
            <Plus size={14} /> Lisää
          </button>
        )}
      </div>

      <div className="seg" style={{ width: '100%', marginBottom: 'var(--space-4)' }}>
        <label className="seg-opt" style={{ flex: 1, justifyContent: 'center' }}>
          <input type="radio" name="choresview" checked={view === 'lista'} onChange={() => setView('lista')} />
          Lista
        </label>
        <label className="seg-opt" style={{ flex: 1, justifyContent: 'center' }}>
          <input type="radio" name="choresview" checked={view === 'suunnittelu'} onChange={() => setView('suunnittelu')} />
          Viikkosuunnittelu
        </label>
      </div>

      {view === 'lista' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {choresLoading ? (
            <p style={{ fontSize: 12, opacity: 0.5 }}>Ladataan...</p>
          ) : chores.map(c => (
            <div key={c.id} className="card">
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-2)' }}>
                <div style={{ flex: 1 }}>
                  <div className="card-title">{c.name}</div>
                  <div className="card-meta" style={{ marginTop: 4 }}>
                    <span className="tag tag-outline">{TYPE_LABELS[c.type]}</span>
                    <span>
                      {c.assignedMemberIds.length > 0
                        ? c.assignedMemberIds.map(memberName).join(', ')
                        : 'Ei kohdistettu'}
                    </span>
                  </div>
                </div>
                <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, color: 'var(--color-accent-700)' }}>
                  {formatPrice(c.priceCents)} €
                </span>
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => openEdit(c)}>
                  <Pencil size={13} /> Muokkaa
                </button>
                <button type="button" className="btn btn-secondary" style={{ flex: 1, color: 'var(--color-accent-800)' }} onClick={() => handleDelete(c.id)}>
                  <Trash2 size={13} /> Poista
                </button>
              </div>
            </div>
          ))}
          {choreError && <p style={{ fontSize: 12, color: 'oklch(50% 0.18 25)', margin: 0 }}>{choreError}</p>}
        </div>
      )}

      {view === 'suunnittelu' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-1)' }}>
            <button type="button" className="btn btn-ghost btn-icon" aria-label="Edellinen viikko" onClick={() => setWeekOffset(o => o - 1)}>
              <ChevronLeft size={15} />
            </button>
            <h5 style={{ margin: 0, fontSize: 15 }}>Suunnittele Viikko {currentWeekNum}</h5>
            <button type="button" className="btn btn-ghost btn-icon" aria-label="Seuraava viikko" onClick={() => setWeekOffset(o => o + 1)}>
              <ChevronRight size={15} />
            </button>
          </div>
          <p style={{ fontSize: 12, opacity: 0.55, margin: '0 0 var(--space-4)' }}>
            Aseta kuka hoitaa minkäkin kotityön kunakin päivänä.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {chores.filter(c => c.type !== 'once').map(c => {
              const entry = plannerDraft.find(e => e.choreId === c.id)
              return (
                <div key={c.id} className="card">
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                    <div className="card-title">{c.name}</div>
                    <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, color: 'var(--color-accent-700)', fontSize: 13 }}>
                      {formatPrice(c.priceCents)} €
                    </span>
                  </div>

                  {c.type === 'daily' && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
                      {DAY_KEYS.map(day => (
                        <div key={day} style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center' }}>
                          <span style={{ fontSize: '9.5px', opacity: 0.55 }}>{DAY_SHORTS[day]}</span>
                          <select
                            className="input"
                            style={{ padding: '3px 2px', fontSize: '10.5px', minHeight: 'auto', textAlign: 'center' }}
                            value={entry?.assignment[day] ?? ''}
                            onChange={e => updateDay(c.id, day, e.target.value)}
                          >
                            <option value="">–</option>
                            {childMembers.map(m => <option key={m.uid} value={m.uid}>{m.firstName}</option>)}
                          </select>
                        </div>
                      ))}
                    </div>
                  )}

                  {c.type === 'weekly' && (
                    <div className="field" style={{ margin: 0 }}>
                      <label style={{ fontSize: 11 }}>Vastuuhenkilö tällä viikolla</label>
                      <select
                        className="input"
                        value={entry?.assignment.all ?? ''}
                        onChange={e => updateAll(c.id, e.target.value)}
                      >
                        <option value="">–</option>
                        {childMembers.map(m => <option key={m.uid} value={m.uid}>{m.firstName}</option>)}
                      </select>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {plannerError && <p style={{ fontSize: 12, color: 'oklch(50% 0.18 25)', margin: 'var(--space-2) 0 0' }}>{plannerError}</p>}

          <button
            type="button"
            className="btn btn-primary btn-block"
            style={{ marginTop: 'var(--space-4)' }}
            onClick={handleSavePlan}
          >
            {plannerSaved ? 'Tallennettu!' : 'Tallenna viikkosuunnitelma'}
          </button>
        </>
      )}

      {dialogOpen && (
        <ChoreDialog
          chore={editingChore}
          firestoreMembers={childMembers}
          onSave={handleSave}
          onClose={() => { setDialogOpen(false); setEditingChore(null) }}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 3: Päivitä WeekView.tsx**

Korvaa koko tiedoston sisältö. Apufunktiot (getISOWeek, getWeekId, getWeekDates, isPast, isToday, formatPrice) säilytetään ennallaan. Muutokset: importit, propsit, `getAssigneeUid`, `buildChildSummaries`, `weekAssignments` stub, `onChildClick(uid)`.

```tsx
import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Chore, Assignment, DayKey, Member } from '@/types'

interface Props {
  chores: Chore[]
  familyId: string
  firestoreMembers: Member[]
  onChildClick: (uid: string) => void
}

const DAY_KEYS: DayKey[] = ['ma', 'ti', 'ke', 'to', 'pe', 'la', 'su']
const DAY_NAMES: Record<DayKey, string> = {
  ma: 'Maanantai', ti: 'Tiistai', ke: 'Keskiviikko',
  to: 'Torstai', pe: 'Perjantai', la: 'Lauantai', su: 'Sunnuntai',
}

function getWeekDate(offset: number): Date {
  const d = new Date()
  d.setDate(d.getDate() + offset * 7)
  return d
}

function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

function getWeekDates(offset: number): Date[] {
  const ref = getWeekDate(offset)
  const day = ref.getDay() || 7
  const monday = new Date(ref)
  monday.setDate(ref.getDate() - day + 1)
  return DAY_KEYS.map((_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

function isPast(date: Date): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d < today
}

function isToday(date: Date): boolean {
  const today = new Date()
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  )
}

function formatPrice(cents: number): string {
  return (cents / 100).toLocaleString('fi-FI', { minimumFractionDigits: 2 })
}

function getAssigneeUid(assignment: Assignment | undefined, chore: Chore, dayKey: DayKey): string {
  if (chore.type === 'daily') return assignment?.[dayKey] ?? ''
  return assignment?.all ?? ''
}

interface ChildSummary {
  uid: string
  firstName: string
  doneCount: number
  totalCount: number
  earnedCents: number
}

function buildChildSummaries(
  childMembers: Member[],
  chores: Chore[],
  weekAssignments: Record<string, Assignment>,
  weekDates: Date[]
): ChildSummary[] {
  return childMembers.map(member => {
    let doneCount = 0
    let totalCount = 0
    let earnedCents = 0

    chores.filter(c => c.type !== 'once').forEach(chore => {
      const assignment = weekAssignments[chore.id]
      if (chore.type === 'daily') {
        DAY_KEYS.forEach((dayKey, i) => {
          if (getAssigneeUid(assignment, chore, dayKey) !== member.uid) return
          totalCount++
          if (isPast(weekDates[i])) { doneCount++; earnedCents += chore.priceCents }
        })
      } else {
        if (assignment?.all !== member.uid) return
        totalCount++
        if (weekDates.some(d => isPast(d))) { doneCount++; earnedCents += chore.priceCents }
      }
    })

    return { uid: member.uid, firstName: member.firstName, doneCount, totalCount, earnedCents }
  })
}

export function WeekView({ chores, familyId: _familyId, firestoreMembers, onChildClick }: Props) {
  const [overviewWeek, setOverviewWeek] = useState(0)
  const [weekAssignments, setWeekAssignments] = useState<Record<string, Assignment>>({})
  // subscription lisätään Task 2:ssa — _familyId ja setWeekAssignments käytössä silloin
  void setWeekAssignments

  const weekDates = getWeekDates(overviewWeek)
  const childMembers = firestoreMembers.filter(m => m.role === 'child')
  const plannableChores = chores.filter(c => c.type !== 'once')
  const childSummaries = buildChildSummaries(childMembers, chores, weekAssignments, weekDates)

  return (
    <div style={{ padding: 'var(--space-4)' }}>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-1)' }}>
        <button
          type="button"
          className="btn btn-ghost btn-icon"
          aria-label="Edellinen viikko"
          onClick={() => setOverviewWeek(o => o - 1)}
        >
          <ChevronLeft size={15} />
        </button>
        <h2 style={{ margin: 0, fontSize: 18 }}>
          Viikko {getISOWeek(getWeekDate(overviewWeek))}
        </h2>
        <button
          type="button"
          className="btn btn-ghost btn-icon"
          aria-label="Seuraava viikko"
          onClick={() => setOverviewWeek(o => o + 1)}
        >
          <ChevronRight size={15} />
        </button>
      </div>
      <p style={{ fontSize: 12, opacity: 0.55, margin: '0 0 var(--space-4)', textAlign: 'center' }}>
        Yleiskuva viikon kotitöistä ja kunkin lapsen tilanteesta.
      </p>

      {DAY_KEYS.map((dayKey, i) => {
        const date = weekDates[i]
        const past = isPast(date)
        const today = isToday(date)

        return (
          <div key={dayKey}>
            <div className="hr" />
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', margin: 'var(--space-2) 0 var(--space-1)' }}>
              <h5 style={{ margin: 0 }}>{DAY_NAMES[dayKey]}</h5>
              <span style={{ fontSize: 11, opacity: 0.5 }}>
                {date.toLocaleDateString('fi-FI', { day: 'numeric', month: 'numeric' })}
              </span>
              {today && (
                <span className="tag tag-outline" style={{ fontSize: 10 }}>Tänään</span>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 'var(--space-3)' }}>
              {plannableChores.length === 0 ? (
                <p style={{ fontSize: 12, opacity: 0.4, margin: 0 }}>Ei kotitöitä.</p>
              ) : plannableChores.map(chore => {
                const assigneeUid = getAssigneeUid(weekAssignments[chore.id], chore, dayKey)
                const assigneeName = firestoreMembers.find(m => m.uid === assigneeUid)?.firstName ?? '–'

                return (
                  <div
                    key={chore.id}
                    style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 13 }}
                  >
                    <span style={{ flex: 1 }}>{chore.name}</span>
                    <span style={{ fontSize: 12, opacity: 0.6 }}>{assigneeName}</span>
                    <span
                      className={`tag ${past ? 'tag-accent' : 'tag-outline'}`}
                      style={{ width: 64, textAlign: 'center', fontSize: 11 }}
                    >
                      {past ? 'Tehty' : 'Kesken'}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {childMembers.length > 0 && (
        <>
          <h5 style={{ margin: 'var(--space-4) 0 var(--space-2)' }}>Lapset tällä viikolla</h5>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {childSummaries.map(({ uid, firstName, doneCount, totalCount, earnedCents }) => (
              <button
                key={uid}
                type="button"
                className="card"
                style={{
                  display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                  width: '100%', textAlign: 'left', cursor: 'pointer',
                  background: 'none', border: 'none', padding: 'var(--space-3)',
                }}
                onClick={() => onChildClick(uid)}
              >
                <div style={{
                  width: 34, height: 34, borderRadius: '50%',
                  background: 'var(--color-accent-100)', color: 'var(--color-accent-700)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 15, flexShrink: 0,
                }}>
                  {firstName[0]?.toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 14 }}>
                    {firstName}
                  </div>
                  <div style={{ fontSize: 11.5, opacity: 0.6 }}>
                    {doneCount}/{totalCount} tehty · Ansaittu {formatPrice(earnedCents)} €
                  </div>
                </div>
                <ChevronRight size={16} style={{ opacity: 0.4, flexShrink: 0 }} />
              </button>
            ))}
          </div>
        </>
      )}

    </div>
  )
}
```

- [ ] **Step 4: Päivitä ProfileView.tsx**

Korvaa koko tiedoston sisältö. Apufunktiot (getISOWeek, getWeekDates, getWeekId, isPast, isToday, formatPrice) säilytetään ennallaan. Muutokset: importit, propsit (poistetaan `childNames` ja `weeklyPlans`), `selectedUid`, `weekAssignments` stub, child-tabsit uid:lla.

```tsx
import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { AbsenceDialog } from '@/pages/parent/AbsenceDialog'
import { Chore, Assignment, DayKey, Member } from '@/types'
import { updateChildPinFn } from '@/lib/functions'

export type DayStatus = 'full' | 'partial' | 'future' | 'poissa'

export interface Absence {
  id: string
  type: 'Loma' | 'Sairas'
  range: string
}

export interface Payment {
  id: string
  amountCents: number
  date: string
}

export interface ChildProfile {
  earnedCents: number
  paidCents: number
  weekGrid: DayStatus[]
  absences: Absence[]
  payments: Payment[]
}

const DAY_SHORTS = ['Ma', 'Ti', 'Ke', 'To', 'Pe', 'La', 'Su']

const DAY_KEYS: DayKey[] = ['ma', 'ti', 'ke', 'to', 'pe', 'la', 'su']
const DAY_NAMES: Record<DayKey, string> = {
  ma: 'Maanantai', ti: 'Tiistai', ke: 'Keskiviikko',
  to: 'Torstai', pe: 'Perjantai', la: 'Lauantai', su: 'Sunnuntai',
}

function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

function getWeekDates(offsetWeeks: number): Date[] {
  const ref = new Date()
  ref.setDate(ref.getDate() + offsetWeeks * 7)
  const day = ref.getDay() || 7
  const monday = new Date(ref)
  monday.setDate(ref.getDate() - day + 1)
  return DAY_KEYS.map((_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

function isPast(date: Date): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d < today
}

function isToday(date: Date): boolean {
  const today = new Date()
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  )
}

function formatPrice(cents: number): string {
  return (cents / 100).toLocaleString('fi-FI', { minimumFractionDigits: 2 })
}

const STATUS_META: Record<DayStatus, { tag: string; label: string }> = {
  full:    { tag: 'tag-accent',  label: 'Valmis' },
  partial: { tag: 'tag-outline', label: 'Kesken' },
  future:  { tag: 'tag-neutral', label: '–' },
  poissa:  { tag: 'tag-neutral', label: 'Poissa' },
}

export function makeDefaultProfile(): ChildProfile {
  return {
    earnedCents: 1850,
    paidCents: 1200,
    weekGrid: ['full', 'full', 'partial', 'future', 'future', 'future', 'future'],
    absences: [],
    payments: [{ id: 'p1', amountCents: 1200, date: '1.8.2026' }],
  }
}

interface Props {
  initialChild?: string
  profiles: Record<string, ChildProfile>
  updateProfile: (name: string, fn: (p: ChildProfile) => ChildProfile) => void
  chores: Chore[]
  familyId: string
  firestoreMembers: Member[]
}

export function ProfileView({
  initialChild, profiles, updateProfile, chores, familyId, firestoreMembers
}: Props) {
  const childMembers = firestoreMembers.filter(m => m.role === 'child')

  const [selectedUid, setSelectedUid] = useState(
    () => (initialChild && childMembers.some(m => m.uid === initialChild))
      ? initialChild
      : (childMembers[0]?.uid ?? '')
  )
  const [absenceOpen, setAbsenceOpen] = useState(false)
  const [weekOffset, setWeekOffset] = useState(0)
  const [pinEditing, setPinEditing] = useState(false)
  const [newPin, setNewPin] = useState('')
  const [pinLoading, setPinLoading] = useState(false)
  const [pinError, setPinError] = useState('')
  const [weekAssignments, setWeekAssignments] = useState<Record<string, Assignment>>({})
  // subscription lisätään Task 3:ssa — familyId, weekOffset ja setWeekAssignments käytössä silloin
  void setWeekAssignments

  useEffect(() => {
    setPinEditing(false)
    setNewPin('')
    setPinError('')
  }, [selectedUid])

  const handleAbsenceSave = (type: 'Loma' | 'Sairas', from: string, to: string) => {
    const fmt = (s: string) =>
      new Date(s).toLocaleDateString('fi-FI', { day: 'numeric', month: 'numeric' })
    const toFull = new Date(to).toLocaleDateString('fi-FI', {
      day: 'numeric', month: 'numeric', year: 'numeric',
    })
    const range = from === to ? toFull : `${fmt(from)}–${toFull}`
    const memberForProfile = childMembers.find(m => m.uid === selectedUid)
    if (memberForProfile) {
      updateProfile(memberForProfile.firstName, p => ({
        ...p,
        absences: [...p.absences, { id: crypto.randomUUID(), type, range }],
      }))
    }
    setAbsenceOpen(false)
  }

  if (childMembers.length === 0) {
    return (
      <div style={{ padding: 'var(--space-4)' }}>
        <p className="text-muted">Ei lapsia. Lisää lapsia Perhe-välilehdeltä.</p>
      </div>
    )
  }

  const selectedMember = childMembers.find(m => m.uid === selectedUid)
  const profile = profiles[selectedMember?.firstName ?? ''] ?? makeDefaultProfile()

  return (
    <div style={{ padding: 'var(--space-4)' }}>
      <h2 style={{ margin: '0 0 var(--space-3)' }}>Lapsen profiili</h2>

      <div className="seg" style={{ width: '100%', marginBottom: 'var(--space-4)' }}>
        {childMembers.map(m => (
          <label key={m.uid} className="seg-opt" style={{ flex: 1, justifyContent: 'center' }}>
            <input type="radio" name="profiletab"
              checked={selectedUid === m.uid} onChange={() => setSelectedUid(m.uid)} />
            {m.firstName}
          </label>
        ))}
      </div>

      {/* Kirjautumistiedot */}
      {(() => {
        const member = firestoreMembers.find(m => m.uid === selectedUid)
        if (!member) return null
        const displayUsername = member.username
          ? (() => { const [n, c] = member.username!.split('.'); return `${n}.${(c ?? '').toUpperCase()}` })()
          : '–'

        const handleSavePin = async () => {
          if (!/^\d{4}$/.test(newPin)) { setPinError('PIN tulee olla 4 numeroa'); return }
          setPinLoading(true)
          setPinError('')
          try {
            await updateChildPinFn({ childUid: member.uid, newPin, familyId })
            setPinEditing(false)
            setNewPin('')
          } catch {
            setPinError('PIN:n vaihto epäonnistui')
          } finally {
            setPinLoading(false)
          }
        }

        return (
          <div className="card" style={{ marginBottom: 'var(--space-4)', gap: 'var(--space-2)' }}>
            <div className="card-kicker">Kirjautumistiedot</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 13 }}>
                <span style={{ opacity: 0.6, width: 80 }}>Tunnus</span>
                <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 600 }}>{displayUsername}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 13 }}>
                <span style={{ opacity: 0.6, width: 80 }}>PIN</span>
                {pinEditing ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <input
                      className="input"
                      type="password"
                      inputMode="numeric"
                      maxLength={4}
                      placeholder="1234"
                      value={newPin}
                      onChange={e => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      style={{ width: 80, padding: '2px 8px', fontSize: 13 }}
                      autoFocus
                    />
                    <button type="button" className="btn btn-primary" style={{ padding: '2px 10px', fontSize: 12 }}
                      onClick={handleSavePin} disabled={pinLoading || newPin.length !== 4}>
                      Tallenna
                    </button>
                    <button type="button" className="btn btn-ghost" style={{ padding: '2px 8px', fontSize: 12 }}
                      onClick={() => { setPinEditing(false); setNewPin(''); setPinError('') }}>
                      Peruuta
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, letterSpacing: '0.1em' }}>
                      {member.pin ?? '••••'}
                    </span>
                    <button type="button" className="btn btn-ghost" style={{ padding: '2px 8px', fontSize: 12 }}
                      onClick={() => setPinEditing(true)}>
                      Vaihda
                    </button>
                  </div>
                )}
              </div>
              {pinError && <p style={{ fontSize: 12, color: 'oklch(50% 0.18 25)', margin: 0 }}>{pinError}</p>}
            </div>
          </div>
        )
      })()}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 'var(--space-4)' }}>
        {profile.weekGrid.map((status, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <span style={{ fontSize: 10, opacity: 0.55 }}>{DAY_SHORTS[i]}</span>
            <span className={`tag ${STATUS_META[status].tag}`} style={{ fontSize: 9, padding: '2px 5px' }}>
              {STATUS_META[status].label}
            </span>
          </div>
        ))}
      </div>

      {/* Viikkoaikataulu */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-1)' }}>
        <button
          type="button"
          className="btn btn-ghost btn-icon"
          aria-label="Edellinen viikko"
          onClick={() => setWeekOffset(o => o - 1)}
        >
          <ChevronLeft size={15} />
        </button>
        <h5 style={{ margin: 0 }}>Viikko {getISOWeek((() => { const d = new Date(); d.setDate(d.getDate() + weekOffset * 7); return d })())}</h5>
        <button
          type="button"
          className="btn btn-ghost btn-icon"
          aria-label="Seuraava viikko"
          onClick={() => setWeekOffset(o => o + 1)}
        >
          <ChevronRight size={15} />
        </button>
      </div>

      {(() => {
        const weekDates = getWeekDates(weekOffset)
        const plannableChores = chores.filter(c => c.type !== 'once')

        return DAY_KEYS.map((dayKey, i) => {
          const date = weekDates[i]
          const past = isPast(date)
          const today = isToday(date)
          const childChores = plannableChores.filter(chore => {
            const assignment = weekAssignments[chore.id]
            if (chore.type === 'daily') return assignment?.[dayKey] === selectedUid
            return assignment?.all === selectedUid
          })
          if (childChores.length === 0) return null

          return (
            <div key={dayKey}>
              <div className="hr" />
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', margin: 'var(--space-2) 0 var(--space-1)' }}>
                <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 13 }}>{DAY_NAMES[dayKey]}</span>
                <span style={{ fontSize: 11, opacity: 0.5 }}>
                  {date.toLocaleDateString('fi-FI', { day: 'numeric', month: 'numeric' })}
                </span>
                {today && <span className="tag tag-outline" style={{ fontSize: 10 }}>Tänään</span>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 'var(--space-3)' }}>
                {childChores.map(chore => (
                  <div key={chore.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 13 }}>
                    <span style={{ flex: 1 }}>{chore.name}</span>
                    <span style={{ fontSize: 12, opacity: 0.55 }}>{formatPrice(chore.priceCents)} €</span>
                    <span
                      className={`tag ${past ? 'tag-accent' : 'tag-outline'}`}
                      style={{ width: 64, textAlign: 'center', fontSize: 11 }}
                    >
                      {past ? 'Tehty' : 'Kesken'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )
        })
      })()}

      {/* Poissaolot */}
      <div className="hr" />
      <h5 style={{ margin: '0 0 var(--space-2)' }}>Poissaolot</h5>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 'var(--space-4)' }}>
        {profile.absences.length === 0 ? (
          <p style={{ fontSize: 12, opacity: 0.5, margin: 0 }}>Ei merkittyjä poissaoloja.</p>
        ) : profile.absences.map(a => (
          <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 13 }}>
            <span className="tag tag-neutral">{a.type}</span>
            <span style={{ opacity: 0.7 }}>{a.range}</span>
          </div>
        ))}
      </div>

      <button type="button" className="btn btn-secondary btn-block"
        onClick={() => setAbsenceOpen(true)}>
        Merkitse poissaolo
      </button>

      {absenceOpen && (
        <AbsenceDialog
          childName={selectedMember?.firstName ?? ''}
          onSave={handleAbsenceSave}
          onClose={() => setAbsenceOpen(false)}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 5: Päivitä ParentShell.tsx**

Korvaa koko tiedoston sisältö. Muutokset: poistetaan `INITIAL_CHORES`, lisätään chores-subscription, poistetaan `weeklyPlans`, päivitetään ChoresView/WeekView/ProfileView-kutsut.

```tsx
import { useState, useEffect } from "react";
import {
  ListChecks,
  Calendar,
  Users,
  UserCircle,
  Wallet,
  Settings,
} from "lucide-react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { FamilyView } from "@/pages/parent/FamilyView";
import { ChoresView } from "@/pages/parent/ChoresView";
import { WeekView } from "@/pages/parent/WeekView";
import {
  ProfileView,
  ChildProfile,
  makeDefaultProfile,
} from "@/pages/parent/ProfileView";
import { PayView } from "@/pages/parent/PayView";
import { Chore, Member } from "@/types"

interface Props {
  familyId: string
  creatorName: string
  onSignOut: () => void
}

type Tab = "chores" | "viikko" | "family" | "lapset" | "maksut";

export function ParentShell({ familyId, creatorName, onSignOut }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("chores");
  const [chores, setChores] = useState<Chore[]>([]);
  const [profileChildId, setProfileChildId] = useState("");
  const [profiles, setProfiles] = useState<Record<string, ChildProfile>>({});
  const [firestoreMembers, setFirestoreMembers] = useState<Member[]>([]);

  useEffect(() => {
    return onSnapshot(collection(db, `families/${familyId}/chores`), snap => {
      setChores(snap.docs.map(d => ({ id: d.id, ...d.data() } as Chore)))
    })
  }, [familyId])

  useEffect(() => {
    return onSnapshot(collection(db, `families/${familyId}/members`), (snap) => {
      const members = snap.docs.map(d => ({ uid: d.id, ...d.data() } as Member));
      setFirestoreMembers(members);
      setProfiles(prev => {
        const next = { ...prev };
        members.filter(m => m.role === 'child').forEach(m => {
          if (!next[m.firstName]) next[m.firstName] = makeDefaultProfile();
        });
        return next;
      });
    });
  }, [familyId]);

  const updateProfile = (name: string, fn: (p: ChildProfile) => ChildProfile) =>
    setProfiles((prev) => ({
      ...prev,
      [name]: fn(prev[name] ?? makeDefaultProfile()),
    }));

  const childNames = firestoreMembers
    .filter(m => m.role === 'child')
    .map(m => m.firstName);

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "chores", label: "Kotityöt", icon: <ListChecks size={20} /> },
    { id: "viikko", label: "Viikko", icon: <Calendar size={20} /> },
    { id: "family", label: "Perhe", icon: <Users size={20} /> },
    { id: "lapset", label: "Lapset", icon: <UserCircle size={20} /> },
    { id: "maksut", label: "Maksut", icon: <Wallet size={20} /> },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <header
        className="nav"
        style={{
          padding: "var(--space-3) var(--space-4)",
          flex: "none",
          position: "relative",
        }}
      >
        <button
          type="button"
          className="tag tag-accent"
          style={{
            border: "none",
            cursor: "pointer",
            fontFamily: "var(--font-heading)",
            fontWeight: 600,
            fontSize: 15,
          }}
          onClick={onSignOut}
        >
          {creatorName}
        </button>
        <span style={{
          fontFamily: '"Bodoni Moda", var(--font-heading)',
          fontWeight: 600,
          fontSize: 22,
          color: '#b68235',
          position: 'absolute',
          left: '50%',
          transform: 'translateX(-50%)',
        }}>Kotihommat</span>
        <button
          type="button"
          className="btn btn-ghost btn-icon"
          aria-label="Asetukset"
          style={{ marginLeft: "auto" }}
        >
          <Settings size={18} />
        </button>
      </header>

      <main style={{ flex: 1, overflowY: "auto" }}>
        {activeTab === "chores" && (
          <ChoresView
            familyId={familyId}
            firestoreMembers={firestoreMembers}
          />
        )}
        {activeTab === "viikko" && (
          <WeekView
            chores={chores}
            familyId={familyId}
            firestoreMembers={firestoreMembers}
            onChildClick={(uid) => {
              setProfileChildId(uid);
              setActiveTab("lapset");
            }}
          />
        )}
        {activeTab === "family" && (
          <FamilyView
            familyId={familyId}
            members={firestoreMembers}
          />
        )}
        {activeTab === "lapset" && (
          <ProfileView
            initialChild={profileChildId}
            profiles={profiles}
            updateProfile={updateProfile}
            chores={chores}
            familyId={familyId}
            firestoreMembers={firestoreMembers}
          />
        )}
        {activeTab === "maksut" && (
          <PayView
            childNames={childNames}
            profiles={profiles}
            updateProfile={updateProfile}
          />
        )}
      </main>

      <nav
        style={{
          display: "flex",
          borderTop: "1px solid var(--color-divider)",
          flex: "none",
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
              padding: "var(--space-2) 0 var(--space-3)",
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 11,
              color:
                activeTab === tab.id
                  ? "var(--color-accent)"
                  : "color-mix(in srgb, var(--color-text) 40%, transparent)",
              fontFamily: "var(--font-body)",
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
```

- [ ] **Step 6: Tarkista TypeScript**

```bash
npx tsc --noEmit -p tsconfig.app.json
```

Odotettu tulos: 0 virhettä. Jos virheitä: korjaa ennen commitia.

- [ ] **Step 7: Commit**

```bash
git add src/pages/parent/ChoreDialog.tsx src/pages/parent/ChoresView.tsx src/pages/parent/WeekView.tsx src/pages/parent/ProfileView.tsx src/components/ParentShell.tsx
git commit -m "feat: wire chores CRUD to Firestore, migrate types to @/types"
```

---

### Task 2: WeekView — viikkosuunnitelma-subscription

WeekView näyttää kotityöt päivittäin. Lisätään `onSnapshot` joka lataa `assignments`-kokoelman valitun viikon mukaan.

**Files:**
- Modify: `src/pages/parent/WeekView.tsx`

**Interfaces:**
- Consumes: Task 1:n WeekView, jossa `weekAssignments = {}` stub ja `_familyId` destrukturoinnissa
- Produces: WeekView-funktio, jossa oikea `onSnapshot`-subscription ja `familyId` destrukturoinnissa (ei underscore)

- [ ] **Step 1: Lisää subscription WeekView.tsx:ään**

Muokkaa `WeekView`-funktion alkupäätä:

Ennen (Task 1:stä):
```tsx
export function WeekView({ chores, familyId: _familyId, firestoreMembers, onChildClick }: Props) {
  const [overviewWeek, setOverviewWeek] = useState(0)
  const [weekAssignments, setWeekAssignments] = useState<Record<string, Assignment>>({})
  // subscription lisätään Task 2:ssa — _familyId ja setWeekAssignments käytössä silloin
  void setWeekAssignments
```

Jälkeen:
```tsx
export function WeekView({ chores, familyId, firestoreMembers, onChildClick }: Props) {
  const [overviewWeek, setOverviewWeek] = useState(0)
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

Lisää myös tarvittavat importit tiedoston alkuun (lisää Task 1:n importteihin):
```tsx
import { useEffect } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
```

Huom: `import { useState } from 'react'` muuttuu `import { useState, useEffect } from 'react'`.

- [ ] **Step 2: Tarkista TypeScript**

```bash
npx tsc --noEmit -p tsconfig.app.json
```

Odotettu tulos: 0 virhettä.

- [ ] **Step 3: Commit**

```bash
git add src/pages/parent/WeekView.tsx
git commit -m "feat: add weekly plan Firestore subscription to WeekView"
```

---

### Task 3: ProfileView — viikkosuunnitelma-subscription

ProfileView näyttää lapsen omat kotityöt valitulla viikolla. Lisätään `onSnapshot` joka lataa `assignments`-kokoelman valitun viikon mukaan.

**Files:**
- Modify: `src/pages/parent/ProfileView.tsx`

**Interfaces:**
- Consumes: Task 1:n ProfileView, jossa `weekAssignments = {}` stub ja `void setWeekAssignments`
- Produces: ProfileView-funktio, jossa oikea `onSnapshot`-subscription

- [ ] **Step 1: Lisää subscription ProfileView.tsx:ään**

Muokkaa `ProfileView`-funktion hookeja. Etsi tämä kohta (Task 1:stä):
```tsx
  const [weekAssignments, setWeekAssignments] = useState<Record<string, Assignment>>({})
  // subscription lisätään Task 3:ssa — familyId, weekOffset ja setWeekAssignments käytössä silloin
  void setWeekAssignments
```

Korvaa se:
```tsx
  const [weekAssignments, setWeekAssignments] = useState<Record<string, Assignment>>({})

  useEffect(() => {
    const ref = new Date()
    ref.setDate(ref.getDate() + weekOffset * 7)
    const year = ref.getFullYear()
    const d2 = new Date(Date.UTC(ref.getFullYear(), ref.getMonth(), ref.getDate()))
    const dayNum = d2.getUTCDay() || 7
    d2.setUTCDate(d2.getUTCDate() + 4 - dayNum)
    const yearStart = new Date(Date.UTC(d2.getUTCFullYear(), 0, 1))
    const week = Math.ceil((((d2.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
    const weekId = `${year}-W${String(week).padStart(2, '0')}`
    return onSnapshot(
      collection(db, `families/${familyId}/weeklyPlans/${weekId}/assignments`),
      snap => {
        const loaded: Record<string, Assignment> = {}
        snap.docs.forEach(d => { loaded[d.id] = d.data() as Assignment })
        setWeekAssignments(loaded)
      }
    )
  }, [familyId, weekOffset])
```

Lisää myös tarvittavat importit tiedoston alkuun (lisää Task 1:n importteihin):
```tsx
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
```

- [ ] **Step 2: Tarkista TypeScript**

```bash
npx tsc --noEmit -p tsconfig.app.json
```

Odotettu tulos: 0 virhettä.

- [ ] **Step 3: Commit**

```bash
git add src/pages/parent/ProfileView.tsx
git commit -m "feat: add weekly plan Firestore subscription to ProfileView"
```

---

## Self-Review

**Spec coverage:**
- ✓ `ChoreType` Firestoressä englanninkieliset arvot, UI-labelit suomeksi
- ✓ `assignedMemberIds` (uid-lista) korvaa `assignedChildNames`
- ✓ Chore CRUD: `setDoc` (lisäys), `updateDoc` (muokkaus), `deleteDoc` (poisto) — kaikki `async/await` virhekäsittelyllä
- ✓ `active: true` aina luodessa
- ✓ Viikkosuunnittelija käyttää draft-tilaa, kirjoitetaan vasta "Tallenna"-napilla
- ✓ Assignmentit kirjoitetaan `setDoc(..., { merge: true })`
- ✓ `weekId`-muoto `"YYYY-WNN"` (zero-padded)
- ✓ `plannerDraft` derivoidaan `chores + savedAssignments` -muutoksista (`useEffect`)
- ✓ `onSnapshot`-subscriptiot palauttavat unsubscribe-funktion `useEffect`:ista
- ✓ Lataus-tila: `choresLoading` boolean, näyttää "Ladataan..."
- ✓ Virhetilanteet: suomenkieliset virheilmoitukset ("Tallennus epäonnistui", "Poisto epäonnistui")
- ✓ `once`-tyypin kotityöt eivät näy viikkosuunnittelussa (filtteröidään `c.type !== 'once'`)
- ✓ Paikalliset tyypit poistettu: `ChoreDialog` ei enää exporttaa `Chore`, `ChoreType`; `ChoresView` ei enää exporttaa `WeekAssignment`, `DayKey`
- ✓ `onChildClick(uid)` WeekView:ssä → ProfileView avautuu oikealle lapselle UID:n perusteella
- ✓ WeekView ja ProfileView subscription-stubit Task 1:ssä, oikeat subscriptiot Task 2 ja 3:ssa

**Placeholder scan:** Ei TBD:tä, ei TODO:ta. Kaikki koodilohkot täynnä.

**Type consistency:**
- `Assignment = Partial<Record<DayKey, string>> & { all?: string }` — käytetty konsistentisti ChoresView, WeekView, ProfileView
- `Chore.assignedMemberIds: string[]` — käytetty ChoreDialog, ChoresView, ParentShell
- `Member.uid` — käytetty assignee-arvona kaikkialla, `firstName` vain displayssä
