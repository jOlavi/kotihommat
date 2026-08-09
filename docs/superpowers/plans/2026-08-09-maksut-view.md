# Maksut-välilehti Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move all payment content (stat cards, payment history, pay action) from the Lapset tab into a new Maksut tab, with shared child-profile state lifted to ParentShell.

**Architecture:** `ChildProfile` types and `makeDefaultProfile` are exported from ProfileView so both PayView and ParentShell can share them. `profiles` state moves from ProfileView into ParentShell and is passed down as props + an `updateProfile` callback to both ProfileView and the new PayView.

**Tech Stack:** React 18, TypeScript, CSS classes from `src/styles.css`.

## Global Constraints

- UI-layer only — no Firebase, no persistence across page reloads
- All CSS classes from `src/styles.css` verbatim: `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-block`, `.card`, `.card-kicker`, `.tag`, `.tag-accent`, `.tag-neutral`, `.tag-outline`, `.seg`, `.seg-opt`, `.text-muted`
- Finnish copy exactly as in spec
- Price formatting: `(cents / 100).toLocaleString('fi-FI', { minimumFractionDigits: 2 })`
- IDs: `crypto.randomUUID()`
- TypeScript must pass `npx tsc --noEmit -p tsconfig.app.json` with zero errors after every task

---

### Task 1: Refactor ProfileView — export types, remove payment section, accept profiles as prop

**Files:**
- Modify: `src/pages/parent/ProfileView.tsx`

**Interfaces:**
- Consumes: nothing new
- Produces (exports for Tasks 2 and 3):
  ```ts
  export type DayStatus = 'full' | 'partial' | 'future' | 'poissa'
  export interface Absence { id: string; type: 'Loma' | 'Sairas'; range: string }
  export interface Payment { id: string; amountCents: number; date: string }
  export interface ChildProfile {
    earnedCents: number; paidCents: number; weekGrid: DayStatus[]
    absences: Absence[]; payments: Payment[]
  }
  export function makeDefaultProfile(): ChildProfile
  export function ProfileView(props: {
    childNames: string[]
    initialChild?: string
    profiles: Record<string, ChildProfile>
    updateProfile: (name: string, fn: (p: ChildProfile) => ChildProfile) => void
  }): JSX.Element
  ```

- [ ] **Step 1: Replace ProfileView.tsx with refactored version**

```tsx
import { useState } from 'react'
import { AbsenceDialog } from '@/pages/parent/AbsenceDialog'

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
  childNames: string[]
  initialChild?: string
  profiles: Record<string, ChildProfile>
  updateProfile: (name: string, fn: (p: ChildProfile) => ChildProfile) => void
}

export function ProfileView({ childNames, initialChild, profiles, updateProfile }: Props) {
  const [selectedName, setSelectedName] = useState(
    () => (initialChild && childNames.includes(initialChild))
      ? initialChild
      : (childNames[0] ?? '')
  )
  const [absenceOpen, setAbsenceOpen] = useState(false)

  const handleAbsenceSave = (type: 'Loma' | 'Sairas', from: string, to: string) => {
    const fmt = (s: string) =>
      new Date(s).toLocaleDateString('fi-FI', { day: 'numeric', month: 'numeric' })
    const toFull = new Date(to).toLocaleDateString('fi-FI', {
      day: 'numeric', month: 'numeric', year: 'numeric',
    })
    const range = from === to ? toFull : `${fmt(from)}–${toFull}`
    updateProfile(selectedName, p => ({
      ...p,
      absences: [...p.absences, { id: crypto.randomUUID(), type, range }],
    }))
    setAbsenceOpen(false)
  }

  if (childNames.length === 0) {
    return (
      <div style={{ padding: 'var(--space-4)' }}>
        <p className="text-muted">Ei lapsia. Lisää lapsia Perhe-välilehdeltä.</p>
      </div>
    )
  }

  const profile = profiles[selectedName] ?? makeDefaultProfile()

  return (
    <div style={{ padding: 'var(--space-4)' }}>
      <h2 style={{ margin: '0 0 var(--space-3)' }}>Lapsen profiili</h2>

      <div className="seg" style={{ width: '100%', marginBottom: 'var(--space-4)' }}>
        {childNames.map(n => (
          <label key={n} className="seg-opt" style={{ flex: 1, justifyContent: 'center' }}>
            <input type="radio" name="profiletab"
              checked={selectedName === n} onChange={() => setSelectedName(n)} />
            {n}
          </label>
        ))}
      </div>

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
          childName={selectedName}
          onSave={handleAbsenceSave}
          onClose={() => setAbsenceOpen(false)}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit -p tsconfig.app.json 2>&1 | cat
```

Expected: errors only from ParentShell (missing new props) — ProfileView itself is valid.

- [ ] **Step 3: Commit**

```bash
git add src/pages/parent/ProfileView.tsx
git commit -m "refactor: export ChildProfile types, remove payment section from ProfileView"
```

---

### Task 2: Create PayView

**Files:**
- Create: `src/pages/parent/PayView.tsx`

**Interfaces:**
- Consumes:
  - `ChildProfile`, `makeDefaultProfile` from `@/pages/parent/ProfileView` (Task 1)
  - `PayDialog` from `@/pages/parent/PayDialog` (already exists)
- Produces:
  ```ts
  interface PayViewProps {
    childNames: string[]
    profiles: Record<string, ChildProfile>
    updateProfile: (name: string, fn: (p: ChildProfile) => ChildProfile) => void
  }
  export function PayView(props: PayViewProps): JSX.Element
  ```

- [ ] **Step 1: Create the file**

```tsx
import { useState } from 'react'
import { ChildProfile, makeDefaultProfile } from '@/pages/parent/ProfileView'
import { PayDialog } from '@/pages/parent/PayDialog'

function formatPrice(cents: number): string {
  return (cents / 100).toLocaleString('fi-FI', { minimumFractionDigits: 2 })
}

interface Props {
  childNames: string[]
  profiles: Record<string, ChildProfile>
  updateProfile: (name: string, fn: (p: ChildProfile) => ChildProfile) => void
}

export function PayView({ childNames, profiles, updateProfile }: Props) {
  const [selectedName, setSelectedName] = useState(childNames[0] ?? '')
  const [payOpen, setPayOpen] = useState(false)

  const handlePaySave = (amountCents: number) => {
    const date = new Date().toLocaleDateString('fi-FI', {
      day: 'numeric', month: 'numeric', year: 'numeric',
    })
    updateProfile(selectedName, p => ({
      ...p,
      paidCents: p.paidCents + amountCents,
      payments: [...p.payments, { id: crypto.randomUUID(), amountCents, date }],
    }))
    setPayOpen(false)
  }

  if (childNames.length === 0) {
    return (
      <div style={{ padding: 'var(--space-4)' }}>
        <p className="text-muted">Ei lapsia. Lisää lapsia Perhe-välilehdeltä.</p>
      </div>
    )
  }

  const profile = profiles[selectedName] ?? makeDefaultProfile()
  const odottaa = profile.earnedCents - profile.paidCents

  return (
    <div style={{ padding: 'var(--space-4)' }}>
      <h2 style={{ margin: '0 0 var(--space-3)' }}>Maksut</h2>

      <div className="seg" style={{ width: '100%', marginBottom: 'var(--space-4)' }}>
        {childNames.map(n => (
          <label key={n} className="seg-opt" style={{ flex: 1, justifyContent: 'center' }}>
            <input type="radio" name="paytab"
              checked={selectedName === n} onChange={() => setSelectedName(n)} />
            {n}
          </label>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
        {[
          { label: 'Ansaittu', cents: profile.earnedCents, accent: false },
          { label: 'Maksettu', cents: profile.paidCents, accent: false },
          { label: 'Odottaa', cents: odottaa, accent: true },
        ].map(({ label, cents, accent }) => (
          <div key={label} className="card" style={{ alignItems: 'center', textAlign: 'center', padding: 'var(--space-2)' }}>
            <div className="card-kicker" style={{ fontSize: 9 }}>{label}</div>
            <div style={{
              fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 16,
              ...(accent ? { color: 'var(--color-accent-700)' } : {}),
            }}>
              {formatPrice(cents)} €
            </div>
          </div>
        ))}
      </div>

      <h5 style={{ margin: '0 0 var(--space-2)' }}>Maksuhistoria</h5>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 'var(--space-4)' }}>
        {profile.payments.length === 0 ? (
          <p style={{ fontSize: 12, opacity: 0.5, margin: 0 }}>Ei maksuja vielä.</p>
        ) : profile.payments.map(p => (
          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 13 }}>
            <span className="tag tag-accent">{formatPrice(p.amountCents)} €</span>
            <span style={{ opacity: 0.7 }}>{p.date}</span>
          </div>
        ))}
      </div>

      <button type="button" className="btn btn-primary btn-block"
        disabled={odottaa <= 0}
        onClick={() => setPayOpen(true)}>
        Merkitse maksetuksi
      </button>

      {payOpen && (
        <PayDialog
          childName={selectedName}
          maxCents={odottaa}
          onSave={handlePaySave}
          onClose={() => setPayOpen(false)}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit -p tsconfig.app.json 2>&1 | cat
```

Expected: errors only from ParentShell (missing props) — PayView itself is valid.

- [ ] **Step 3: Commit**

```bash
git add src/pages/parent/PayView.tsx
git commit -m "feat: add PayView for Maksut tab"
```

---

### Task 3: Update ParentShell — lift profiles state, wire ProfileView and PayView

**Files:**
- Modify: `src/components/ParentShell.tsx`

**Interfaces:**
- Consumes:
  - `ChildProfile`, `makeDefaultProfile` from `@/pages/parent/ProfileView` (Task 1)
  - `PayView` from `@/pages/parent/PayView` (Task 2)

- [ ] **Step 1: Replace ParentShell.tsx with updated version**

```tsx
import { useState } from 'react'
import { ListChecks, Calendar, Users, UserCircle, Wallet, Settings } from 'lucide-react'
import { FamilyView } from '@/pages/parent/FamilyView'
import { ChoresView, WeekAssignment } from '@/pages/parent/ChoresView'
import { WeekView } from '@/pages/parent/WeekView'
import { ProfileView, ChildProfile, makeDefaultProfile } from '@/pages/parent/ProfileView'
import { PayView } from '@/pages/parent/PayView'
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
  const [profiles, setProfiles] = useState<Record<string, ChildProfile>>(() =>
    Object.fromEntries(
      family.members.filter(m => m.role === 'child').map(m => [m.name, makeDefaultProfile()])
    )
  )

  const updateProfile = (name: string, fn: (p: ChildProfile) => ChildProfile) =>
    setProfiles(prev => ({ ...prev, [name]: fn(prev[name] ?? makeDefaultProfile()) }))

  const childNames = family.members.filter(m => m.role === 'child').map(m => m.name)

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'chores', label: 'Kotityöt', icon: <ListChecks size={20} /> },
    { id: 'viikko', label: 'Viikko',   icon: <Calendar size={20} /> },
    { id: 'family', label: 'Perhe',    icon: <Users size={20} /> },
    { id: 'lapset', label: 'Lapset',   icon: <UserCircle size={20} /> },
    { id: 'maksut', label: 'Maksut',   icon: <Wallet size={20} /> },
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
            profiles={profiles}
            updateProfile={updateProfile}
          />
        )}
        {activeTab === 'maksut' && (
          <PayView
            childNames={childNames}
            profiles={profiles}
            updateProfile={updateProfile}
          />
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
npx tsc --noEmit -p tsconfig.app.json 2>&1 | cat
```

Expected: zero errors.

- [ ] **Step 3: Visual check in browser**

```bash
npm run dev
```

Open http://localhost:5173, navigate to parent view. Verify:

- **Lapset tab**: lapsenvalitsin + 7-päivän kalenteri + poissaolot + "Merkitse poissaolo" -nappi. Ei statistiikkakortteja, ei maksuhistoriaa.
- **Maksut tab**: lapsenvalitsin + 3 statistiikkakorttia (Ansaittu/Maksettu/Odottaa) + maksuhistoria + "Merkitse maksetuksi" -nappi (disabled jos Odottaa = 0). PayDialog aukeaa ja kirjaus päivittää kortteja.
- Kun poissaolo lisätään Lapset-tabilla ja siirrytään Maksut-tabille, profiilin tila on yhteinen (sama child). Valinnat säilyvät.

- [ ] **Step 4: Commit**

```bash
git add src/components/ParentShell.tsx
git commit -m "feat: lift profiles state to ParentShell, wire PayView to Maksut tab"
```
