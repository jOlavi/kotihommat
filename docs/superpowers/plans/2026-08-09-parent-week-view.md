# Vanhemman Viikko-näkymä Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Viikko" tab to the parent shell showing a full-week chore overview and child summaries, while expanding ParentShell to 5 tabs and lifting shared chore/plan state up from ChoresView.

**Architecture:** `chores` and `weeklyPlans` state move from ChoresView into ParentShell so both ChoresView and the new WeekView share the same data. ParentShell gains `profileChildId` for cross-tab navigation from WeekView → Lapset tab. Four files change; one is created.

**Tech Stack:** React 18, TypeScript, lucide-react icons, CSS classes from `src/styles.css`.

## Global Constraints

- UI-layer only — no Firebase, no persistence across page reloads
- All CSS classes from `src/styles.css` verbatim: `.btn`, `.btn-ghost`, `.btn-icon`, `.card`, `.tag`, `.tag-accent`, `.tag-outline`, `.hr`, `.text-muted`
- Finnish copy exactly as in spec — no English strings in UI
- Icons from `lucide-react` only (`Calendar`, `Wallet`, `ChevronLeft`, `ChevronRight`, `ListChecks`, `Users`, `UserCircle`)
- Price formatting: `(cents / 100).toLocaleString('fi-FI', { minimumFractionDigits: 2 })`
- TypeScript must pass `npx tsc --noEmit` with zero errors after every task

---

### Task 1: Refactor ChoresView — export types and accept shared state as props

**Files:**
- Modify: `src/pages/parent/ChoresView.tsx`

**Interfaces:**
- Consumes: nothing new
- Produces (for later tasks to import):
  ```ts
  export type DayKey = 'ma' | 'ti' | 'ke' | 'to' | 'pe' | 'la' | 'su'
  export interface WeekAssignment { choreId: string; days: Record<DayKey, string>; all: string }
  ```

- [ ] **Step 1: Replace ChoresView.tsx with refactored version**

Write the complete file (changes: `export` on `DayKey`+`WeekAssignment`, new Props, remove two `useState` lines, rename `weekPlans` → `weeklyPlans` in the function body, remove `INITIAL_CHORES`):

```tsx
import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { ChoreDialog, Chore, ChoreFormData, ChoreType } from '@/pages/parent/ChoreDialog'

export type DayKey = 'ma' | 'ti' | 'ke' | 'to' | 'pe' | 'la' | 'su'

const DAY_KEYS: DayKey[] = ['ma', 'ti', 'ke', 'to', 'pe', 'la', 'su']
const DAY_SHORTS: Record<DayKey, string> = {
  ma: 'Ma', ti: 'Ti', ke: 'Ke', to: 'To', pe: 'Pe', la: 'La', su: 'Su',
}
const TYPE_LABELS: Record<ChoreType, string> = {
  paivittainen: 'Päivittäin',
  viikoittainen: 'Viikoittain',
  kertaluontoinen: 'Kerran',
}

export interface WeekAssignment {
  choreId: string
  days: Record<DayKey, string>
  all: string
}

interface Props {
  childNames: string[]
  chores: Chore[]
  setChores: React.Dispatch<React.SetStateAction<Chore[]>>
  weeklyPlans: Record<string, WeekAssignment[]>
  setWeekPlans: React.Dispatch<React.SetStateAction<Record<string, WeekAssignment[]>>>
}

function emptyDays(): Record<DayKey, string> {
  return { ma: '', ti: '', ke: '', to: '', pe: '', la: '', su: '' }
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

function getWeekId(offset: number): string {
  const d = getWeekDate(offset)
  return `${d.getFullYear()}-W${String(getISOWeek(d)).padStart(2, '0')}`
}

function formatPrice(cents: number): string {
  return (cents / 100).toLocaleString('fi-FI', { minimumFractionDigits: 2 })
}

export function ChoresView({ childNames, chores, setChores, weeklyPlans, setWeekPlans }: Props) {
  const [view, setView] = useState<'lista' | 'suunnittelu'>('lista')
  const [weekOffset, setWeekOffset] = useState(0)
  const [plannerDraft, setPlannerDraft] = useState<WeekAssignment[]>([])
  const [plannerSaved, setPlannerSaved] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingChore, setEditingChore] = useState<Chore | null>(null)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const saved = weeklyPlans[getWeekId(weekOffset)]
    const plannerChores = chores.filter(c => c.type !== 'kertaluontoinen')
    setPlannerDraft(
      plannerChores.map(c => {
        const existing = saved?.find(a => a.choreId === c.id)
        return existing ?? { choreId: c.id, days: emptyDays(), all: '' }
      })
    )
  }, [weekOffset])

  const handleSave = (data: ChoreFormData) => {
    if (editingChore) {
      setChores(prev => prev.map(c => c.id === editingChore.id ? { ...c, ...data } : c))
    } else {
      setChores(prev => [...prev, { ...data, id: crypto.randomUUID() }])
    }
    setDialogOpen(false)
    setEditingChore(null)
  }

  const handleDelete = (id: string) => {
    setChores(prev => prev.filter(c => c.id !== id))
  }

  const openAdd = () => { setEditingChore(null); setDialogOpen(true) }
  const openEdit = (chore: Chore) => { setEditingChore(chore); setDialogOpen(true) }

  const updateDay = (choreId: string, day: DayKey, name: string) =>
    setPlannerDraft(prev => prev.map(a =>
      a.choreId === choreId ? { ...a, days: { ...a.days, [day]: name } } : a
    ))

  const updateAll = (choreId: string, name: string) =>
    setPlannerDraft(prev => prev.map(a =>
      a.choreId === choreId ? { ...a, all: name } : a
    ))

  const handleSavePlan = () => {
    setWeekPlans(prev => ({ ...prev, [getWeekId(weekOffset)]: plannerDraft }))
    setPlannerSaved(true)
    setTimeout(() => setPlannerSaved(false), 1500)
  }

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
          {chores.map(c => (
            <div key={c.id} className="card">
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-2)' }}>
                <div style={{ flex: 1 }}>
                  <div className="card-title">{c.name}</div>
                  <div className="card-meta" style={{ marginTop: 4 }}>
                    <span className="tag tag-outline">{TYPE_LABELS[c.type]}</span>
                    <span>
                      {c.assignedChildNames.length > 0
                        ? c.assignedChildNames.join(', ')
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
        </div>
      )}

      {view === 'suunnittelu' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-1)' }}>
            <button type="button" className="btn btn-ghost btn-icon" aria-label="Edellinen viikko" onClick={() => setWeekOffset(o => o - 1)}>
              <ChevronLeft size={15} />
            </button>
            <h5 style={{ margin: 0, fontSize: 15 }}>
              Suunnittele Viikko {getISOWeek(getWeekDate(weekOffset))}
            </h5>
            <button type="button" className="btn btn-ghost btn-icon" aria-label="Seuraava viikko" onClick={() => setWeekOffset(o => o + 1)}>
              <ChevronRight size={15} />
            </button>
          </div>
          <p style={{ fontSize: 12, opacity: 0.55, margin: '0 0 var(--space-4)' }}>
            Aseta kuka hoitaa minkäkin kotityön kunakin päivänä.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {chores.filter(c => c.type !== 'kertaluontoinen').map(c => {
              const assignment = plannerDraft.find(a => a.choreId === c.id)
              return (
                <div key={c.id} className="card">
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                    <div className="card-title">{c.name}</div>
                    <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, color: 'var(--color-accent-700)', fontSize: 13 }}>
                      {formatPrice(c.priceCents)} €
                    </span>
                  </div>

                  {c.type === 'paivittainen' && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
                      {DAY_KEYS.map(day => (
                        <div key={day} style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center' }}>
                          <span style={{ fontSize: '9.5px', opacity: 0.55 }}>{DAY_SHORTS[day]}</span>
                          <select
                            className="input"
                            style={{ padding: '3px 2px', fontSize: '10.5px', minHeight: 'auto', textAlign: 'center' }}
                            value={assignment?.days[day] ?? ''}
                            onChange={e => updateDay(c.id, day, e.target.value)}
                          >
                            <option value="">–</option>
                            {childNames.map(n => <option key={n} value={n}>{n}</option>)}
                          </select>
                        </div>
                      ))}
                    </div>
                  )}

                  {c.type === 'viikoittainen' && (
                    <div className="field" style={{ margin: 0 }}>
                      <label style={{ fontSize: 11 }}>Vastuuhenkilö tällä viikolla</label>
                      <select
                        className="input"
                        value={assignment?.all ?? ''}
                        onChange={e => updateAll(c.id, e.target.value)}
                      >
                        <option value="">–</option>
                        {childNames.map(n => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

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
          childNames={childNames}
          onSave={handleSave}
          onClose={() => { setDialogOpen(false); setEditingChore(null) }}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: zero errors. (ParentShell will error until Task 4 — that's expected if you run this before Task 4, but the refactored ChoresView itself is valid TypeScript.)

- [ ] **Step 3: Commit**

```bash
git add src/pages/parent/ChoresView.tsx
git commit -m "refactor: lift chores+weeklyPlans out of ChoresView to props, export DayKey+WeekAssignment"
```

---

### Task 2: Update ProfileView — add initialChild prop

**Files:**
- Modify: `src/pages/parent/ProfileView.tsx:52-56`

**Interfaces:**
- Consumes: nothing new
- Produces:
  ```ts
  interface Props { childNames: string[]; initialChild?: string }
  export function ProfileView(props: Props): JSX.Element
  ```

- [ ] **Step 1: Update Props interface and selectedName initial value**

In `src/pages/parent/ProfileView.tsx`, replace:

```ts
interface Props {
  childNames: string[]
}

export function ProfileView({ childNames }: Props) {
  const [selectedName, setSelectedName] = useState(childNames[0] ?? '')
```

With:

```ts
interface Props {
  childNames: string[]
  initialChild?: string
}

export function ProfileView({ childNames, initialChild }: Props) {
  const [selectedName, setSelectedName] = useState(
    () => (initialChild && childNames.includes(initialChild))
      ? initialChild
      : (childNames[0] ?? '')
  )
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: zero errors (or only the existing ParentShell prop-mismatch error from Task 1 if run before Task 4).

- [ ] **Step 3: Commit**

```bash
git add src/pages/parent/ProfileView.tsx
git commit -m "feat: add initialChild prop to ProfileView for cross-tab navigation"
```

---

### Task 3: Create WeekView

**Files:**
- Create: `src/pages/parent/WeekView.tsx`

**Interfaces:**
- Consumes:
  - `Chore` from `@/pages/parent/ChoreDialog`
  - `DayKey`, `WeekAssignment` from `@/pages/parent/ChoresView` (Task 1)
- Produces:
  ```ts
  interface Props {
    childNames: string[]
    chores: Chore[]
    weeklyPlans: Record<string, WeekAssignment[]>
    onChildClick: (name: string) => void
  }
  export function WeekView(props: Props): JSX.Element
  ```

- [ ] **Step 1: Create the file**

```tsx
import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Chore } from '@/pages/parent/ChoreDialog'
import { DayKey, WeekAssignment } from '@/pages/parent/ChoresView'

interface Props {
  childNames: string[]
  chores: Chore[]
  weeklyPlans: Record<string, WeekAssignment[]>
  onChildClick: (name: string) => void
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

function getWeekId(offset: number): string {
  const d = getWeekDate(offset)
  return `${d.getFullYear()}-W${String(getISOWeek(d)).padStart(2, '0')}`
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

function getAssignee(
  assignment: WeekAssignment | undefined,
  chore: Chore,
  dayKey: DayKey
): string {
  if (chore.type === 'paivittainen') {
    return assignment?.days[dayKey] || chore.assignedChildNames[0] || '–'
  }
  return assignment?.all || chore.assignedChildNames[0] || '–'
}

interface ChildSummary {
  name: string
  doneCount: number
  totalCount: number
  earnedCents: number
}

function buildChildSummaries(
  childNames: string[],
  chores: Chore[],
  weeklyPlan: WeekAssignment[],
  weekDates: Date[]
): ChildSummary[] {
  return childNames.map(name => {
    let doneCount = 0
    let totalCount = 0
    let earnedCents = 0

    chores.filter(c => c.type !== 'kertaluontoinen').forEach(chore => {
      const assignment = weeklyPlan.find(a => a.choreId === chore.id)

      if (chore.type === 'paivittainen') {
        DAY_KEYS.forEach((dayKey, i) => {
          const assignee = getAssignee(assignment, chore, dayKey)
          if (assignee !== name) return
          totalCount++
          if (isPast(weekDates[i])) {
            doneCount++
            earnedCents += chore.priceCents
          }
        })
      } else {
        // viikoittainen: lasketaan kerran
        const assignee = assignment?.all || chore.assignedChildNames[0] || '–'
        if (assignee !== name) return
        totalCount++
        if (weekDates.some(d => isPast(d))) {
          doneCount++
          earnedCents += chore.priceCents
        }
      }
    })

    return { name, doneCount, totalCount, earnedCents }
  })
}

export function WeekView({ childNames, chores, weeklyPlans, onChildClick }: Props) {
  const [overviewWeek, setOverviewWeek] = useState(0)

  const weekDates = getWeekDates(overviewWeek)
  const weekId = getWeekId(overviewWeek)
  const weeklyPlan = weeklyPlans[weekId] ?? []
  const plannableChores = chores.filter(c => c.type !== 'kertaluontoinen')
  const childSummaries = buildChildSummaries(childNames, chores, weeklyPlan, weekDates)

  return (
    <div style={{ padding: 'var(--space-4)' }}>

      {/* Viikkonavigaatio */}
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

      {/* Päivät Ma–Su */}
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
                const assignment = weeklyPlan.find(a => a.choreId === chore.id)
                const assignee = getAssignee(assignment, chore, dayKey)

                return (
                  <div
                    key={chore.id}
                    style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 13 }}
                  >
                    <span style={{ flex: 1 }}>{chore.name}</span>
                    <span style={{ fontSize: 12, opacity: 0.6 }}>{assignee}</span>
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

      {/* Lapset tällä viikolla */}
      {childNames.length > 0 && (
        <>
          <h5 style={{ margin: 'var(--space-4) 0 var(--space-2)' }}>Lapset tällä viikolla</h5>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {childSummaries.map(({ name, doneCount, totalCount, earnedCents }) => (
              <button
                key={name}
                type="button"
                className="card"
                style={{
                  display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                  width: '100%', textAlign: 'left', cursor: 'pointer',
                  background: 'none', border: 'none', padding: 'var(--space-3)',
                }}
                onClick={() => onChildClick(name)}
              >
                <div style={{
                  width: 34, height: 34, borderRadius: '50%',
                  background: 'var(--color-accent-100)', color: 'var(--color-accent-700)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 15, flexShrink: 0,
                }}>
                  {name[0]?.toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 14 }}>
                    {name}
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

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: zero errors (or only ParentShell prop errors if Task 4 not yet done).

- [ ] **Step 3: Commit**

```bash
git add src/pages/parent/WeekView.tsx
git commit -m "feat: add WeekView for parent week overview tab"
```

---

### Task 4: Update ParentShell — 5 tabs, lift state, wire all views

**Files:**
- Modify: `src/components/ParentShell.tsx`

**Interfaces:**
- Consumes:
  - `Chore` from `@/pages/parent/ChoreDialog`
  - `WeekAssignment` from `@/pages/parent/ChoresView`
  - `WeekView` from `@/pages/parent/WeekView`
  - `ProfileView` (already imported, now gets `initialChild` prop)

- [ ] **Step 1: Replace ParentShell.tsx with updated version**

```tsx
import { useState } from 'react'
import { ListChecks, Calendar, Users, UserCircle, Wallet, Settings } from 'lucide-react'
import { FamilyView } from '@/pages/parent/FamilyView'
import { ChoresView, WeekAssignment } from '@/pages/parent/ChoresView'
import { WeekView } from '@/pages/parent/WeekView'
import { ProfileView } from '@/pages/parent/ProfileView'
import { Chore } from '@/pages/parent/ChoreDialog'

const INITIAL_CHORES: Chore[] = [
  { id: 'c1', name: 'Astianpesukoneen tyhjennys', priceCents: 50, type: 'paivittainen', assignedChildNames: [] },
  { id: 'c2', name: 'Koiran ulkoilutus', priceCents: 100, type: 'paivittainen', assignedChildNames: [] },
  { id: 'c3', name: 'Roskat ulos', priceCents: 50, type: 'viikoittainen', assignedChildNames: [] },
]

interface Family {
  creatorName: string
  familyName: string
  members: { name: string; role: 'parent' | 'child' }[]
}

interface Props {
  family: Family
  onAddMember: (member: { name: string; role: 'parent' | 'child' }) => void
  onRoleToggle: () => void
}

type Tab = 'chores' | 'viikko' | 'family' | 'lapset' | 'maksut'

export function ParentShell({ family, onAddMember, onRoleToggle }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('chores')
  const [chores, setChores] = useState<Chore[]>(INITIAL_CHORES)
  const [weeklyPlans, setWeekPlans] = useState<Record<string, WeekAssignment[]>>({})
  const [profileChildId, setProfileChildId] = useState('')

  const childNames = family.members.filter(m => m.role === 'child').map(m => m.name)

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'chores',  label: 'Kotityöt', icon: <ListChecks size={20} /> },
    { id: 'viikko',  label: 'Viikko',   icon: <Calendar size={20} /> },
    { id: 'family',  label: 'Perhe',    icon: <Users size={20} /> },
    { id: 'lapset',  label: 'Lapset',   icon: <UserCircle size={20} /> },
    { id: 'maksut',  label: 'Maksut',   icon: <Wallet size={20} /> },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <header className="nav" style={{ padding: 'var(--space-3) var(--space-4)', flex: 'none' }}>
        <span className="nav-brand" style={{ fontSize: 16 }}>Kotihommat</span>
        <button
          type="button"
          className="tag tag-accent"
          style={{
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'var(--font-heading)',
            fontWeight: 600,
            marginLeft: 'var(--space-2)',
          }}
          onClick={onRoleToggle}
        >
          {family.creatorName}
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-icon"
          aria-label="Asetukset"
          style={{ marginLeft: 'auto' }}
        >
          <Settings size={18} />
        </button>
      </header>

      <main style={{ flex: 1, overflowY: 'auto' }}>
        {activeTab === 'chores' && (
          <ChoresView
            childNames={childNames}
            chores={chores}
            setChores={setChores}
            weeklyPlans={weeklyPlans}
            setWeekPlans={setWeekPlans}
          />
        )}
        {activeTab === 'viikko' && (
          <WeekView
            childNames={childNames}
            chores={chores}
            weeklyPlans={weeklyPlans}
            onChildClick={name => { setProfileChildId(name); setActiveTab('lapset') }}
          />
        )}
        {activeTab === 'family' && (
          <FamilyView
            members={family.members}
            onAddChild={name => onAddMember({ name, role: 'child' })}
          />
        )}
        {activeTab === 'lapset' && (
          <ProfileView
            childNames={childNames}
            initialChild={profileChildId}
          />
        )}
        {activeTab === 'maksut' && (
          <div style={{ padding: 'var(--space-4)' }}>
            <p className="text-muted">Maksut-näkymä tulossa.</p>
          </div>
        )}
      </main>

      <nav style={{ display: 'flex', borderTop: '1px solid var(--color-divider)', flex: 'none' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              padding: 'var(--space-2) 0 var(--space-3)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 11,
              color: activeTab === tab.id
                ? 'var(--color-accent)'
                : 'color-mix(in srgb, var(--color-text) 40%, transparent)',
              fontFamily: 'var(--font-body)',
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 3: Visual check in browser**

```bash
npm run dev
```

Open http://localhost:5173 and navigate to parent view. Verify:

- Bottom nav shows 5 tabs: Kotityöt · Viikko · Perhe · Lapset · Maksut
- **Kotityöt**: lista + viikkosuunnittelu work as before; saving a week plan works
- **Viikko**: shows current week number with ‹ › navigation; lists Ma–Su with chore rows; past days show "Tehty" (tag-accent), today + future show "Kesken" (tag-outline); "Lapset tällä viikolla" cards appear when children added; clicking a child card navigates to Lapset tab with that child pre-selected
- **Perhe**: unchanged
- **Lapset**: same as old "Lapsen profiili"; child selector pre-selects the child clicked from Viikko tab
- **Maksut**: placeholder text "Maksut-näkymä tulossa."

- [ ] **Step 4: Commit**

```bash
git add src/components/ParentShell.tsx
git commit -m "feat: expand ParentShell to 5 tabs, lift chores+weeklyPlans state, add Viikko+Maksut tabs"
```
