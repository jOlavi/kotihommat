# Maksut-välilehti — design spec

**Päivämäärä:** 2026-08-09
**Laajuus:** UI-kerros vain (ei Firebase-kytkentää)

## Tavoite

Siirretään maksuihin liittyvät tiedot (statistiikkakortit, maksuhistoria, "Merkitse maksetuksi") Lapset-tabista omalle Maksut-tabille. Molemmat tabit käyttävät samaa lapsenvalitsin-segmenttikontrollia. Jaettu `profiles`-tila nostetaan ParentShelliin.

## Arkkitehtuuri

```
ParentShell  (omistaa: profiles: Record<string, ChildProfile>, updateProfile)
  ├── ProfileView  (Lapset-tab: lapsenvalitsin + minikalenteri + poissaolot)
  └── PayView      (Maksut-tab: lapsenvalitsin + statistiikat + maksuhistoria + maksaminen)
```

## Tiedostomuutokset

```
src/
  pages/parent/
    ProfileView.tsx   — MODIFY: exportoi tyypit, poista maksuosio, vastaanota profiles+updateProfile propsina
    PayView.tsx       — CREATE
  components/
    ParentShell.tsx   — MODIFY: nosta profiles-tila, välitä ProfileView:lle ja PayView:lle
```

## Exportattavat tyypit (ProfileView.tsx)

Nämä exportataan `ProfileView.tsx`:stä jotta `PayView` ja `ParentShell` voivat importata ne:

```ts
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

export function makeDefaultProfile(): ChildProfile {
  return {
    earnedCents: 1850,
    paidCents: 1200,
    weekGrid: ['full', 'full', 'partial', 'future', 'future', 'future', 'future'],
    absences: [],
    payments: [{ id: 'p1', amountCents: 1200, date: '1.8.2026' }],
  }
}
```

## ProfileView — muutokset

### Uusi Props

```ts
interface Props {
  childNames: string[]
  initialChild?: string
  profiles: Record<string, ChildProfile>
  updateProfile: (name: string, fn: (p: ChildProfile) => ChildProfile) => void
}
```

### Poistetaan

- `useState` rivit `profiles` ja `payOpen`
- `handlePaySave`-handleri
- `PayDialog`-import
- 3 statistiikkakorttia (Ansaittu / Maksettu / Odottaa)
- Maksuhistoria-osio (h5 + lista)
- "Merkitse maksetuksi" -nappi
- `{payOpen && <PayDialog ... />}`

### Jää jäljelle (koko rakenne)

```tsx
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

      {/* Lapsenvalitsin */}
      <div className="seg" style={{ width: '100%', marginBottom: 'var(--space-4)' }}>
        {childNames.map(n => (
          <label key={n} className="seg-opt" style={{ flex: 1, justifyContent: 'center' }}>
            <input type="radio" name="profiletab"
              checked={selectedName === n} onChange={() => setSelectedName(n)} />
            {n}
          </label>
        ))}
      </div>

      {/* 7-päivän minikalenteri */}
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

      {/* Poissaolot */}
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

      {/* Toimintonappi */}
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

## PayView — koko rakenne

### Props

```ts
import { ChildProfile, makeDefaultProfile } from '@/pages/parent/ProfileView'

interface Props {
  childNames: string[]
  profiles: Record<string, ChildProfile>
  updateProfile: (name: string, fn: (p: ChildProfile) => ChildProfile) => void
}
```

### Apufunktio

```ts
function formatPrice(cents: number): string {
  return (cents / 100).toLocaleString('fi-FI', { minimumFractionDigits: 2 })
}
```

### Tila

```ts
const [selectedName, setSelectedName] = useState(childNames[0] ?? '')
const [payOpen, setPayOpen] = useState(false)
```

### handlePaySave

```ts
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
```

### JSX

```tsx
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

      {/* Lapsenvalitsin */}
      <div className="seg" style={{ width: '100%', marginBottom: 'var(--space-4)' }}>
        {childNames.map(n => (
          <label key={n} className="seg-opt" style={{ flex: 1, justifyContent: 'center' }}>
            <input type="radio" name="paytab"
              checked={selectedName === n} onChange={() => setSelectedName(n)} />
            {n}
          </label>
        ))}
      </div>

      {/* 3 statistiikkakorttia */}
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

      {/* Maksuhistoria */}
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

      {/* Toimintonappi */}
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

## ParentShell — muutokset

### Uusi tila

```ts
import { ChildProfile, makeDefaultProfile } from '@/pages/parent/ProfileView'
import { PayView } from '@/pages/parent/PayView'

const [profiles, setProfiles] = useState<Record<string, ChildProfile>>(() =>
  Object.fromEntries(
    family.members.filter(m => m.role === 'child').map(m => [m.name, makeDefaultProfile()])
  )
)

const updateProfile = (name: string, fn: (p: ChildProfile) => ChildProfile) =>
  setProfiles(prev => ({ ...prev, [name]: fn(prev[name] ?? makeDefaultProfile()) }))
```

### Huom: profiles-alustus

`profiles` alustetaan `family`-propsin lasten perusteella. Koska `family` voi muuttua (lapsi lisätään Perhe-tabilla), uuden lapsen profiili luodaan `updateProfile`-kutsun yhteydessä automaattisesti `?? makeDefaultProfile()` fallbackin ansiosta.

### Renderöinti

```tsx
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
```

## Rajaukset

- Ei Firebase-kytkentää — tila häviää sivunlatauksessa
- `profiles`-tila alustetaan lapsen lisäämishetkellä automaattisesti makeDefaultProfile()-fallbackilla
