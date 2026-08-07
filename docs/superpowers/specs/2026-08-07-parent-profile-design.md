# Lapsen profiili -välilehti (vanhempi)

**Päivämäärä:** 2026-08-07
**Laajuus:** UI-kerros vain (ei Firebase-kytkentää)

## Tavoite

Vanhemman Lapsen profiili -välilehti: lapsikohtainen segmentoitu valitsin, 7-päivän minikalenteri, statistiikkakortit, poissaolo- ja maksuhistoria sekä toimintopainikkeet poissaolon merkitsemiseen ja maksun kirjaamiseen.

## Arkkitehtuuri

```
ParentShell
  └── ProfileView (childNames: string[])
        ├── AbsenceDialog
        └── PayDialog
```

## Tiedostomuutokset

```
src/
  pages/parent/
    ProfileView.tsx    — CREATE
    AbsenceDialog.tsx  — CREATE
    PayDialog.tsx      — CREATE
  components/
    ParentShell.tsx    — MODIFY: 'profile' placeholder → <ProfileView childNames={...} />
```

## Tyypit

```ts
type DayStatus = 'full' | 'partial' | 'future' | 'poissa'

interface Absence {
  id: string
  type: 'Loma' | 'Sairas'
  range: string   // esim. "1.8.–7.8.2026"
}

interface Payment {
  id: string
  amountCents: number
  date: string    // esim. "1.8.2026"
}

interface ChildProfile {
  earnedCents: number
  paidCents: number
  weekGrid: DayStatus[]   // 7 alkiota Ma–Su
  absences: Absence[]
  payments: Payment[]
}
```

## Mock-oletusprofiili

```ts
function makeDefaultProfile(): ChildProfile {
  return {
    earnedCents: 1850,
    paidCents: 1200,
    weekGrid: ['full', 'full', 'partial', 'future', 'future', 'future', 'future'],
    absences: [],
    payments: [{ id: 'p1', amountCents: 1200, date: '1.8.2026' }],
  }
}
```

## ProfileView

### Props

```ts
interface Props {
  childNames: string[]
}
```

### State

```ts
const [selectedName, setSelectedName] = useState(childNames[0] ?? '')
const [profiles, setProfiles] = useState<Record<string, ChildProfile>>(() =>
  Object.fromEntries(childNames.map(n => [n, makeDefaultProfile()]))
)
const [absenceOpen, setAbsenceOpen] = useState(false)
const [payOpen, setPayOpen] = useState(false)
```

### Apukonstantit (tiedoston yläosassa)

```ts
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
```

### Apufunktio profiilipäivityksille

```ts
const updateProfile = (name: string, fn: (p: ChildProfile) => ChildProfile) =>
  setProfiles(prev => ({ ...prev, [name]: fn(prev[name] ?? makeDefaultProfile()) }))
```

### Handlerit

```ts
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
```

### Rakenne

Jos `childNames.length === 0`:
```tsx
<p className="text-muted">Ei lapsia. Lisää lapsia Perhe-välilehdeltä.</p>
```

Muutoin koko profiilisisältö:

```tsx
<div style={{ padding: 'var(--space-4)' }}>
  <h2 style={{ margin: '0 0 var(--space-3)' }}>Lapsen profiili</h2>

  {/* Lapsikohtainen valitsin */}
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

  {/* 3 statistiikkakorttia */}
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

  {/* Toimintopainikkeet */}
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
```

`profile` on `profiles[selectedName] ?? makeDefaultProfile()`.

## AbsenceDialog

### Props

```ts
interface Props {
  childName: string
  onSave: (type: 'Loma' | 'Sairas', from: string, to: string) => void
  onClose: () => void
}
```

### Rakenne

```tsx
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
```

### handleSubmit

```ts
const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault()
  const form = e.currentTarget
  const type = (form.elements.namedItem('atype') as RadioNodeList).value as 'Loma' | 'Sairas'
  const from = (form.elements.namedItem('from') as HTMLInputElement).value
  const to = (form.elements.namedItem('to') as HTMLInputElement).value
  onSave(type, from, to)
}
```

## PayDialog

### Props

```ts
interface Props {
  childName: string
  maxCents: number
  onSave: (amountCents: number) => void
  onClose: () => void
}
```

### Rakenne

```tsx
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
```

### handleSubmit + formatPrice

```ts
function formatPrice(cents: number): string {
  return (cents / 100).toLocaleString('fi-FI', { minimumFractionDigits: 2 })
}

const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault()
  const amount = parseFloat(
    (e.currentTarget.elements.namedItem('amount') as HTMLInputElement).value
  )
  onSave(Math.round(amount * 100))
}
```

## ParentShell — muutos

```tsx
import { ProfileView } from '@/pages/parent/ProfileView'

{activeTab === 'profile' && (
  <ProfileView
    childNames={family.members.filter(m => m.role === 'child').map(m => m.name)}
  />
)}
```

## Rajaukset

- Ei Firebase-kytkentää
- State häviää sivunlatauksessa
- 7-päivän minikalenteri on staattinen mock (ei laske oikeita tehtävästatuksia)
- Jos lapsia ei ole yhtään: placeholder-teksti "Ei lapsia. Lisää lapsia Perhe-välilehdeltä."
- PayDialog on disabled jos `earnedCents - paidCents <= 0`
