# Kotityöt-välilehti (vanhempi)

**Päivämäärä:** 2026-08-07
**Laajuus:** UI-kerros vain (ei Firebase-kytkentää)

## Tavoite

Vanhemman Kotityöt-välilehti kahdella alinäkymällä: **Lista** (kotityöluettelo CRUD:lla) ja **Viikkosuunnittelu** (kuka hoitaa minkäkin kotityön milloinkin). State paikallisesti ChoresViewissä.

## Arkkitehtuuri

```
ParentShell
  └── ChoresView (childNames: string[])
        ├── ChoreDialog (lisää / muokkaa)
        ├── [Lista-näkymä]
        └── [Viikkosuunnittelu-näkymä]
```

## Tiedostomuutokset

```
src/
  pages/parent/
    ChoresView.tsx     — CREATE
    ChoreDialog.tsx    — CREATE
  components/
    ParentShell.tsx    — MODIFY: 'chores' placeholder → <ChoresView childNames={...} />
```

## Tyypit

```ts
type ChoreType = 'paivittainen' | 'viikoittainen' | 'kertaluontoinen'

interface Chore {
  id: string
  name: string
  priceCents: number          // 50 senttiä = 0,50 €, askel 50
  type: ChoreType
  assignedChildNames: string[]
}

type DayKey = 'ma' | 'ti' | 'ke' | 'to' | 'pe' | 'la' | 'su'

interface WeekAssignment {
  choreId: string
  days: Record<DayKey, string>  // päivittäinen: lapsen nimi tai '' = ei ketään
  all: string                   // viikoittainen: lapsen nimi tai '' = ei ketään
}

interface ChoreFormData {
  name: string
  priceCents: number
  type: ChoreType
  assignedChildNames: string[]
}
```

## Mock-alkudata

```ts
const INITIAL_CHORES: Chore[] = [
  { id: 'c1', name: 'Astianpesukoneen tyhjennys', priceCents: 50, type: 'paivittainen', assignedChildNames: [] },
  { id: 'c2', name: 'Koiran ulkoilutus', priceCents: 100, type: 'paivittainen', assignedChildNames: [] },
  { id: 'c3', name: 'Roskat ulos', priceCents: 50, type: 'viikoittainen', assignedChildNames: [] },
]
```

## ChoresView

### Props

```ts
interface Props {
  childNames: string[]
}
```

### State

```ts
const [chores, setChores] = useState<Chore[]>(INITIAL_CHORES)
const [view, setView] = useState<'lista' | 'suunnittelu'>('lista')
const [weekOffset, setWeekOffset] = useState(0)
const [weekPlans, setWeekPlans] = useState<Record<string, WeekAssignment[]>>({})
const [plannerDraft, setPlannerDraft] = useState<WeekAssignment[]>([])
const [plannerSaved, setPlannerSaved] = useState(false)
const [dialogOpen, setDialogOpen] = useState(false)
const [editingChore, setEditingChore] = useState<Chore | null>(null)
```

### Apufunktiot (tiedoston yläosassa)

```ts
const DAY_KEYS: DayKey[] = ['ma', 'ti', 'ke', 'to', 'pe', 'la', 'su']
const DAY_SHORTS: Record<DayKey, string> = {
  ma: 'Ma', ti: 'Ti', ke: 'Ke', to: 'To', pe: 'Pe', la: 'La', su: 'Su',
}
const TYPE_LABELS: Record<ChoreType, string> = {
  paivittainen: 'Päivittäin',
  viikoittainen: 'Viikoittain',
  kertaluontoinen: 'Kerran',
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
```

### useEffect — draft-synkronointi

```ts
useEffect(() => {
  const saved = weekPlans[getWeekId(weekOffset)]
  const plannerChores = chores.filter(c => c.type !== 'kertaluontoinen')
  setPlannerDraft(
    plannerChores.map(c => {
      const existing = saved?.find(a => a.choreId === c.id)
      return existing ?? { choreId: c.id, days: emptyDays(), all: '' }
    })
  )
}, [weekOffset])
```

### CRUD-handlerit

```ts
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
```

### Planner-handlerit

```ts
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
```

### Rakenne

```tsx
<div style={{ padding: 'var(--space-4)' }}>
  {/* Otsikkorivi */}
  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
    <h2 style={{ margin: 0 }}>Kotityöt</h2>
    {view === 'lista' && (
      <button type="button" className="btn btn-primary" onClick={openAdd}>
        <Plus size={14} /> Lisää
      </button>
    )}
  </div>

  {/* Segmented */}
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

  {view === 'lista' && <ListaView ... />}
  {view === 'suunnittelu' && <SuunnitteluView ... />}

  {dialogOpen && (
    <ChoreDialog
      chore={editingChore}
      childNames={childNames}
      onSave={handleSave}
      onClose={() => { setDialogOpen(false); setEditingChore(null) }}
    />
  )}
</div>
```

*Lista ja Suunnittelu renderöidään suoraan ChoresView:ssä, ei erillisinä komponentteina — pitää tiedoston hallittavana.*

### Lista — korttirakenne

```tsx
{chores.map(c => (
  <div key={c.id} className="card">
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-2)' }}>
      <div style={{ flex: 1 }}>
        <div className="card-title">{c.name}</div>
        <div className="card-meta" style={{ marginTop: 4 }}>
          <span className="tag tag-outline">{TYPE_LABELS[c.type]}</span>
          <span>{c.assignedChildNames.length > 0 ? c.assignedChildNames.join(', ') : 'Ei kohdistettu'}</span>
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
```

### Viikkosuunnittelu — rakenne

```tsx
{/* Navigointi */}
<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-1)' }}>
  <button type="button" className="btn btn-ghost btn-icon" onClick={() => setWeekOffset(o => o - 1)}>
    <ChevronLeft size={15} />
  </button>
  <h5 style={{ margin: 0, fontSize: 15 }}>
    Suunnittele Viikko {getISOWeek(getWeekDate(weekOffset))}
  </h5>
  <button type="button" className="btn btn-ghost btn-icon" onClick={() => setWeekOffset(o => o + 1)}>
    <ChevronRight size={15} />
  </button>
</div>
<p style={{ fontSize: 12, opacity: 0.55, margin: '0 0 var(--space-4)' }}>
  Aseta kuka hoitaa minkäkin kotityön kunakin päivänä.
</p>

{/* Kortit */}
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

{/* Tallenna */}
<button
  type="button"
  className="btn btn-primary btn-block"
  style={{ marginTop: 'var(--space-4)' }}
  onClick={handleSavePlan}
>
  {plannerSaved ? 'Tallennettu!' : 'Tallenna viikkosuunnitelma'}
</button>
```

## ChoreDialog

### Props

```ts
interface Props {
  chore: Chore | null
  childNames: string[]
  onSave: (data: ChoreFormData) => void
  onClose: () => void
}
```

### Rakenne

```tsx
<div className="dialog-backdrop">
  <form className="dialog" onSubmit={handleSubmit}>
    <div className="dialog-title">{chore ? 'Muokkaa kotityötä' : 'Lisää kotityö'}</div>

    <div className="field">
      <label htmlFor="chore-name">Nimi</label>
      <input className="input" id="chore-name" name="name" required
        defaultValue={chore?.name ?? ''} placeholder="esim. Roskien vienti" />
    </div>

    <div className="field">
      <label htmlFor="chore-price">Hinta (€)</label>
      <input className="input" id="chore-price" name="price" type="number"
        step="0.5" min="0.5" required defaultValue={chore ? chore.priceCents / 100 : ''} />
    </div>

    <div className="field">
      <label>Tyyppi</label>
      <div className="seg" style={{ width: '100%' }}>
        {(['paivittainen', 'viikoittainen', 'kertaluontoinen'] as ChoreType[]).map(t => (
          <label key={t} className="seg-opt" style={{ flex: 1, justifyContent: 'center' }}>
            <input type="radio" name="type" value={t}
              defaultChecked={(chore?.type ?? 'paivittainen') === t} />
            {TYPE_LABELS[t]}
          </label>
        ))}
      </div>
    </div>

    {childNames.length > 0 && (
      <div className="field">
        <label>Kohdista lapselle</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
          {childNames.map(n => (
            <label key={n} className="radio">
              <input type="checkbox" name="assign" value={n}
                defaultChecked={chore?.assignedChildNames.includes(n) ?? false} />
              <span className="dot" />
              {n}
            </label>
          ))}
        </div>
      </div>
    )}

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
  const name = (form.elements.namedItem('name') as HTMLInputElement).value.trim()
  const price = parseFloat((form.elements.namedItem('price') as HTMLInputElement).value)
  const type = (form.elements.namedItem('type') as RadioNodeList).value as ChoreType
  const assignBoxes = Array.from(form.querySelectorAll('input[name="assign"]:checked')) as HTMLInputElement[]
  const assignedChildNames = assignBoxes.map(el => el.value)
  onSave({ name, priceCents: Math.round(price * 100), type, assignedChildNames })
}
```

## ParentShell — muutos

```tsx
// Lisää import:
import { ChoresView } from '@/pages/parent/ChoresView'

// Korvaa 'chores' placeholder:
{activeTab === 'chores' && (
  <ChoresView
    childNames={family.members.filter(m => m.role === 'child').map(m => m.name)}
  />
)}
```

## Rajaukset

- Ei Firebase-kytkentää
- Kotityöt-state häviää sivunlatauksessa (in-memory mock)
- Viikkosuunnittelussa kertaluontoiset kotityöt eivät näy (vain päivittäiset ja viikoittaiset)
- Tallenna-nappi antaa välittömän "Tallennettu!"-palautteen 1,5s ajan
- `childNames` on tyhjä lista jos onboardingissa ei lisätty lapsia — ChoreDialog ei näytä kohdistuskenttää
