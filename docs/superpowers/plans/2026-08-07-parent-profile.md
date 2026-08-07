# Lapsen profiili Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the parent's "Lapsen profiili" tab: a per-child view with a 7-day mini-calendar, three stat cards, absence and payment history, and action dialogs for recording absences and payments.

**Architecture:** Three new files under `src/pages/parent/` (AbsenceDialog, PayDialog, ProfileView) wired into the existing `ParentShell`. All state lives in ProfileView as a `Record<string, ChildProfile>` keyed by child name; dialogs are controlled via boolean open/close state.

**Tech Stack:** React 18, TypeScript, CSS classes from `src/styles.css` (no new styles needed).

## Global Constraints

- UI-layer only — no Firebase integration, no persistence across page reloads
- All CSS classes must come verbatim from `src/styles.css` (btn, btn-primary, btn-secondary, card, card-kicker, tag, tag-accent, tag-neutral, tag-outline, field, input, radio, seg, seg-opt, dialog-backdrop, dialog, dialog-title, dialog-body, dialog-actions, text-muted)
- Finnish copy exactly as specified — no English strings in UI
- Icons from `lucide-react` only
- Price formatting: `(cents / 100).toLocaleString('fi-FI', { minimumFractionDigits: 2 })`
- IDs generated with `crypto.randomUUID()`
- TypeScript must pass `npx tsc --noEmit` with zero errors

---

### Task 1: AbsenceDialog

**Files:**
- Create: `src/pages/parent/AbsenceDialog.tsx`

**Interfaces:**
- Consumes: nothing from other tasks
- Produces:
  ```ts
  interface AbsenceDialogProps {
    childName: string
    onSave: (type: 'Loma' | 'Sairas', from: string, to: string) => void
    onClose: () => void
  }
  export function AbsenceDialog(props: AbsenceDialogProps): JSX.Element
  ```

- [ ] **Step 1: Create the file**

```tsx
// src/pages/parent/AbsenceDialog.tsx

interface Props {
  childName: string
  onSave: (type: 'Loma' | 'Sairas', from: string, to: string) => void
  onClose: () => void
}

export function AbsenceDialog({ childName, onSave, onClose }: Props) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const type = (form.elements.namedItem('atype') as RadioNodeList).value as 'Loma' | 'Sairas'
    const from = (form.elements.namedItem('from') as HTMLInputElement).value
    const to = (form.elements.namedItem('to') as HTMLInputElement).value
    onSave(type, from, to)
  }

  return (
    <div className="dialog-backdrop">
      <form className="dialog" onSubmit={handleSubmit}>
        <div className="dialog-title">Merkitse poissaolo — {childName}</div>

        <div className="field">
          <label>Syy</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
            <label className="radio">
              <input type="radio" name="atype" value="Loma" defaultChecked />
              <span className="dot" /> Loma
            </label>
            <label className="radio">
              <input type="radio" name="atype" value="Sairas" />
              <span className="dot" /> Sairas
            </label>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
          <div className="field">
            <label htmlFor="a-from">Alkaa</label>
            <input className="input" id="a-from" name="from" type="date" required />
          </div>
          <div className="field">
            <label htmlFor="a-to">Päättyy</label>
            <input className="input" id="a-to" name="to" type="date" required />
          </div>
        </div>

        <div className="dialog-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Peruuta</button>
          <button type="submit" className="btn btn-primary">Tallenna</button>
        </div>
      </form>
    </div>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/pages/parent/AbsenceDialog.tsx
git commit -m "feat: add AbsenceDialog for parent profile tab"
```

---

### Task 2: PayDialog

**Files:**
- Create: `src/pages/parent/PayDialog.tsx`

**Interfaces:**
- Consumes: nothing from other tasks
- Produces:
  ```ts
  interface PayDialogProps {
    childName: string
    maxCents: number
    onSave: (amountCents: number) => void
    onClose: () => void
  }
  export function PayDialog(props: PayDialogProps): JSX.Element
  ```

- [ ] **Step 1: Create the file**

```tsx
// src/pages/parent/PayDialog.tsx

function formatPrice(cents: number): string {
  return (cents / 100).toLocaleString('fi-FI', { minimumFractionDigits: 2 })
}

interface Props {
  childName: string
  maxCents: number
  onSave: (amountCents: number) => void
  onClose: () => void
}

export function PayDialog({ childName, maxCents, onSave, onClose }: Props) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const amount = parseFloat(
      (e.currentTarget.elements.namedItem('amount') as HTMLInputElement).value
    )
    onSave(Math.round(amount * 100))
  }

  return (
    <div className="dialog-backdrop">
      <form className="dialog" onSubmit={handleSubmit}>
        <div className="dialog-title">Merkitse maksetuksi — {childName}</div>
        <p className="dialog-body">
          Odottaa maksua: {formatPrice(maxCents)} €. Kirjaa kuinka paljon taskurahaa maksat nyt.
        </p>
        <div className="field">
          <label htmlFor="pay-amount">Maksettava summa (€)</label>
          <input
            className="input"
            id="pay-amount"
            name="amount"
            type="number"
            step="0.5"
            min="0.5"
            max={maxCents / 100}
            defaultValue={maxCents / 100}
            required
          />
        </div>
        <div className="dialog-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Peruuta</button>
          <button type="submit" className="btn btn-primary">Tallenna</button>
        </div>
      </form>
    </div>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/pages/parent/PayDialog.tsx
git commit -m "feat: add PayDialog for parent profile tab"
```

---

### Task 3: ProfileView

**Files:**
- Create: `src/pages/parent/ProfileView.tsx`

**Interfaces:**
- Consumes:
  - `AbsenceDialog` from `./AbsenceDialog` (Task 1)
  - `PayDialog` from `./PayDialog` (Task 2)
- Produces:
  ```ts
  interface ProfileViewProps { childNames: string[] }
  export function ProfileView(props: ProfileViewProps): JSX.Element
  ```

- [ ] **Step 1: Create the file**

```tsx
// src/pages/parent/ProfileView.tsx
import { useState } from 'react'
import { AbsenceDialog } from '@/pages/parent/AbsenceDialog'
import { PayDialog } from '@/pages/parent/PayDialog'

type DayStatus = 'full' | 'partial' | 'future' | 'poissa'

interface Absence {
  id: string
  type: 'Loma' | 'Sairas'
  range: string
}

interface Payment {
  id: string
  amountCents: number
  date: string
}

interface ChildProfile {
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

function formatPrice(cents: number): string {
  return (cents / 100).toLocaleString('fi-FI', { minimumFractionDigits: 2 })
}

function makeDefaultProfile(): ChildProfile {
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
}

export function ProfileView({ childNames }: Props) {
  const [selectedName, setSelectedName] = useState(childNames[0] ?? '')
  const [profiles, setProfiles] = useState<Record<string, ChildProfile>>(() =>
    Object.fromEntries(childNames.map(n => [n, makeDefaultProfile()]))
  )
  const [absenceOpen, setAbsenceOpen] = useState(false)
  const [payOpen, setPayOpen] = useState(false)

  const updateProfile = (name: string, fn: (p: ChildProfile) => ChildProfile) =>
    setProfiles(prev => ({ ...prev, [name]: fn(prev[name] ?? makeDefaultProfile()) }))

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

  return (
    <div style={{ padding: 'var(--space-4)' }}>
      <h2 style={{ margin: '0 0 var(--space-3)' }}>Lapsen profiili</h2>

      {/* Child selector */}
      <div className="seg" style={{ width: '100%', marginBottom: 'var(--space-4)' }}>
        {childNames.map(n => (
          <label key={n} className="seg-opt" style={{ flex: 1, justifyContent: 'center' }}>
            <input type="radio" name="profiletab"
              checked={selectedName === n} onChange={() => setSelectedName(n)} />
            {n}
          </label>
        ))}
      </div>

      {/* 7-day mini-calendar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 'var(--space-4)' }}>
        {profile.weekGrid.map((status, i) => (
          <div key={i} className="day-cell">
            <span style={{ fontSize: 10, opacity: 0.55 }}>{DAY_SHORTS[i]}</span>
            <span
              className={`tag ${STATUS_META[status].tag}`}
              style={{ fontSize: 9, padding: '2px 5px' }}
            >
              {STATUS_META[status].label}
            </span>
          </div>
        ))}
      </div>

      {/* 3 stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
        {[
          { label: 'Ansaittu', cents: profile.earnedCents, accent: false },
          { label: 'Maksettu', cents: profile.paidCents, accent: false },
          { label: 'Odottaa', cents: profile.earnedCents - profile.paidCents, accent: true },
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

      {/* Absences */}
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

      {/* Payment history */}
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

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
        <button type="button" className="btn btn-secondary" style={{ flex: 1 }}
          onClick={() => setAbsenceOpen(true)}>
          Merkitse poissaolo
        </button>
        <button type="button" className="btn btn-primary" style={{ flex: 1 }}
          disabled={profile.earnedCents - profile.paidCents <= 0}
          onClick={() => setPayOpen(true)}>
          Merkitse maksetuksi
        </button>
      </div>

      {absenceOpen && (
        <AbsenceDialog
          childName={selectedName}
          onSave={handleAbsenceSave}
          onClose={() => setAbsenceOpen(false)}
        />
      )}
      {payOpen && (
        <PayDialog
          childName={selectedName}
          maxCents={profile.earnedCents - profile.paidCents}
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
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/pages/parent/ProfileView.tsx
git commit -m "feat: add ProfileView for parent profile tab"
```

---

### Task 4: Wire ProfileView into ParentShell

**Files:**
- Modify: `src/components/ParentShell.tsx:69-73`

**Interfaces:**
- Consumes: `ProfileView` from `@/pages/parent/ProfileView` (Task 3)
- Produces: nothing (terminal task)

Current code in `ParentShell.tsx` at lines 69–73:
```tsx
{activeTab === 'profile' && (
  <div style={{ padding: 'var(--space-4)' }}>
    <p className="text-muted">Lapsen profiili tulossa.</p>
  </div>
)}
```

- [ ] **Step 1: Add import**

At the top of `src/components/ParentShell.tsx`, after the existing imports, add:

```tsx
import { ProfileView } from '@/pages/parent/ProfileView'
```

The import block should look like:
```tsx
import { useState } from 'react'
import { ListChecks, Users, UserCircle, Settings } from 'lucide-react'
import { FamilyView } from '@/pages/parent/FamilyView'
import { ChoresView } from '@/pages/parent/ChoresView'
import { ProfileView } from '@/pages/parent/ProfileView'
```

- [ ] **Step 2: Replace placeholder with ProfileView**

Replace:
```tsx
{activeTab === 'profile' && (
  <div style={{ padding: 'var(--space-4)' }}>
    <p className="text-muted">Lapsen profiili tulossa.</p>
  </div>
)}
```

With:
```tsx
{activeTab === 'profile' && (
  <ProfileView
    childNames={family.members.filter(m => m.role === 'child').map(m => m.name)}
  />
)}
```

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 4: Visual check in browser**

```bash
npm run dev
```

Open http://localhost:5173. Navigate to parent view → "Lapsen profiili" tab. Verify:
- If no children added: see "Ei lapsia. Lisää lapsia Perhe-välilehdeltä."
- After adding a child from Perhe tab: child name appears in seg selector, 7-day mini-calendar shows Ma–Su with tags, three stat cards show Ansaittu/Maksettu/Odottaa amounts
- "Merkitse poissaolo" opens AbsenceDialog — select Loma/Sairas, pick dates, Tallenna adds entry to Poissaolot list
- "Merkitse maksetuksi" opens PayDialog with odottaa amount pre-filled — Tallenna updates Maksuhistoria and stat cards
- "Merkitse maksetuksi" button is disabled when Odottaa = 0

- [ ] **Step 5: Commit**

```bash
git add src/components/ParentShell.tsx
git commit -m "feat: wire ProfileView into ParentShell profile tab"
```
