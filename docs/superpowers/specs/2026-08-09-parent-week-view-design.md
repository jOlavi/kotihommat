# Vanhemman Viikko-näkymä — design spec

**Päivämäärä:** 2026-08-09
**Laajuus:** UI-kerros vain (ei Firebase-kytkentää)

## Tavoite

Laajennetaan ParentShell 5-välilehtiseksi ja toteutetaan uusi Viikko-tab: koko perheen viikkotason yleiskuva kotitöistä ja lasten tilanteesta. Samalla nostetaan `chores`- ja `weeklyPlans`-tila ParentShelliin, jotta molemmat ChoresView ja WeekView jakavat saman datan.

## Arkkitehtuuri

```
ParentShell  (omistaa: chores, weeklyPlans, profileChildId, activeTab)
  ├── ChoresView   (saa chores/setChores + weeklyPlans/setWeekPlans propsina)
  ├── WeekView     (saa chores + weeklyPlans + onChildClick propsina)
  ├── FamilyView   (ei muutoksia)
  ├── ProfileView  (saa initialChild propsina)
  └── [Maksut placeholder]
```

## Tiedostomuutokset

```
src/
  pages/parent/
    WeekView.tsx        — CREATE
  components/
    ParentShell.tsx     — MODIFY: 5 tabbia, nosta chores+weeklyPlans, profileChildId
    ChoresView.tsx      — MODIFY: chores+weeklyPlans propsina sisäisen staten sijaan
    ProfileView.tsx     — MODIFY: hyväksy initialChild prop
```

## Tyypit (jaettu, määritellään tiedoston yläosassa)

ChoresView.tsx:ssa jo määritelty — käytetään sellaisenaan:

```ts
// src/pages/parent/ChoresView.tsx  (olemassa olevat exportit)
export type DayKey = 'ma' | 'ti' | 'ke' | 'to' | 'pe' | 'la' | 'su'
export interface WeekAssignment {
  choreId: string
  days: Record<DayKey, string>
  all: string
}
```

`Chore` ja `ChoreType` exportataan jo `ChoreDialog.tsx`:sta.

## ParentShell — muutokset

### Tab-rakenne

```ts
type Tab = 'chores' | 'viikko' | 'family' | 'lapset' | 'maksut'

const tabs = [
  { id: 'chores',  label: 'Kotityöt',  icon: <ListChecks size={20} /> },
  { id: 'viikko',  label: 'Viikko',    icon: <Calendar size={20} /> },
  { id: 'family',  label: 'Perhe',     icon: <Users size={20} /> },
  { id: 'lapset',  label: 'Lapset',    icon: <UserCircle size={20} /> },
  { id: 'maksut',  label: 'Maksut',    icon: <Wallet size={20} /> },
]
```

### Uusi tila

```ts
const [chores, setChores] = useState<Chore[]>(INITIAL_CHORES)
const [weeklyPlans, setWeekPlans] = useState<Record<string, WeekAssignment[]>>({})
const [profileChildId, setProfileChildId] = useState('')
```

`INITIAL_CHORES` siirretään ChoresView.tsx:sta ParentShell.tsx:ään.

### Renderöinti

```tsx
{activeTab === 'chores' && (
  <ChoresView
    childNames={family.members.filter(m => m.role === 'child').map(m => m.name)}
    chores={chores}
    setChores={setChores}
    weeklyPlans={weeklyPlans}
    setWeekPlans={setWeekPlans}
  />
)}
{activeTab === 'viikko' && (
  <WeekView
    childNames={family.members.filter(m => m.role === 'child').map(m => m.name)}
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
    childNames={family.members.filter(m => m.role === 'child').map(m => m.name)}
    initialChild={profileChildId}
  />
)}
{activeTab === 'maksut' && (
  <div style={{ padding: 'var(--space-4)' }}>
    <p className="text-muted">Maksut-näkymä tulossa.</p>
  </div>
)}
```

## ChoresView — muutokset

### Uusi Props-interface

```ts
interface Props {
  childNames: string[]
  chores: Chore[]
  setChores: React.Dispatch<React.SetStateAction<Chore[]>>
  weeklyPlans: Record<string, WeekAssignment[]>
  setWeekPlans: React.Dispatch<React.SetStateAction<Record<string, WeekAssignment[]>>>
}
```

Poistetaan rivit:
```ts
// POISTETAAN:
const [chores, setChores] = useState<Chore[]>(INITIAL_CHORES)
const [weeklyPlans, setWeekPlans] = useState<Record<string, WeekAssignment[]>>({})
```

`DayKey`, `DAY_KEYS`, `DAY_SHORTS`, `WeekAssignment`, `emptyDays`, `getWeekDate`, `getISOWeek`, `getWeekId`, `formatPrice` pysyvät ChoresView.tsx:ssä.

Exportataan `DayKey` ja `WeekAssignment` jotta WeekView voi importata ne:
```ts
export type DayKey = 'ma' | 'ti' | 'ke' | 'to' | 'pe' | 'la' | 'su'
export interface WeekAssignment { choreId: string; days: Record<DayKey, string>; all: string }
```

## ProfileView — muutos

Lisätään `initialChild` prop. Jos se on annettu ja löytyy `childNames`-listasta, käytetään sitä `selectedName`-staten alkuarvona:

```ts
interface Props {
  childNames: string[]
  initialChild?: string
}

const [selectedName, setSelectedName] = useState(
  () => (initialChild && childNames.includes(initialChild))
    ? initialChild
    : (childNames[0] ?? '')
)
```

## WeekView

### Props

```ts
import { Chore } from '@/pages/parent/ChoreDialog'
import { DayKey, WeekAssignment } from '@/pages/parent/ChoresView'

interface Props {
  childNames: string[]
  chores: Chore[]
  weeklyPlans: Record<string, WeekAssignment[]>
  onChildClick: (name: string) => void
}
```

### Apukonstantit ja -funktiot

```ts
const DAY_KEYS: DayKey[] = ['ma', 'ti', 'ke', 'to', 'pe', 'la', 'su']
const DAY_NAMES: Record<DayKey, string> = {
  ma: 'Maanantai', ti: 'Tiistai', ke: 'Keskiviikko',
  to: 'Torstai',   pe: 'Perjantai', la: 'Lauantai', su: 'Sunnuntai',
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

// Palauttaa viikon Ma–Su päivämäärät Date-objekteina
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
  return date < today
}

function isToday(date: Date): boolean {
  const today = new Date()
  return date.toDateString() === today.toDateString()
}

function formatPrice(cents: number): string {
  return (cents / 100).toLocaleString('fi-FI', { minimumFractionDigits: 2 })
}
```

### Tila

```ts
const [overviewWeek, setOverviewWeek] = useState(0)
```

### Tekijän ratkaisu

```ts
function getAssignee(
  assignment: WeekAssignment | undefined,
  chore: Chore,
  dayKey: DayKey
): string {
  if (chore.type === 'paivittainen') {
    return assignment?.days[dayKey] || chore.assignedChildNames[0] || '–'
  }
  // viikoittainen
  return assignment?.all || chore.assignedChildNames[0] || '–'
}
```

### Lapsiyhteenveto

```ts
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
```

### Rakenne

```tsx
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
        <button type="button" className="btn btn-ghost btn-icon" aria-label="Edellinen viikko"
          onClick={() => setOverviewWeek(o => o - 1)}>
          <ChevronLeft size={15} />
        </button>
        <h2 style={{ margin: 0, fontSize: 18 }}>Viikko {getISOWeek(getWeekDate(overviewWeek))}</h2>
        <button type="button" className="btn btn-ghost btn-icon" aria-label="Seuraava viikko"
          onClick={() => setOverviewWeek(o => o + 1)}>
          <ChevronRight size={15} />
        </button>
      </div>
      <p style={{ fontSize: 12, opacity: 0.55, margin: '0 0 var(--space-4)', textAlign: 'center' }}>
        Yleiskuva viikon kotitöistä ja kunkin lapsen tilanteesta.
      </p>

      {/* Päivät */}
      {DAY_KEYS.map((dayKey, i) => {
        const date = weekDates[i]
        const today = isToday(date)
        const past = isPast(date)

        return (
          <div key={dayKey}>
            <div className="hr" />
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', margin: 'var(--space-2) 0 var(--space-1)' }}>
              <h5 style={{ margin: 0 }}>{DAY_NAMES[dayKey]}</h5>
              <span style={{ fontSize: 11, opacity: 0.5 }}>
                {date.toLocaleDateString('fi-FI', { day: 'numeric', month: 'numeric' })}
              </span>
              {today && <span className="tag tag-outline" style={{ fontSize: 10 }}>Tänään</span>}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 'var(--space-3)' }}>
              {plannableChores.length === 0 ? (
                <p style={{ fontSize: 12, opacity: 0.4, margin: 0 }}>Ei kotitöitä.</p>
              ) : plannableChores.map(chore => {
                const assignment = weeklyPlan.find(a => a.choreId === chore.id)
                const assignee = getAssignee(assignment, chore, dayKey)
                const done = past  // menneet päivät = Tehty

                return (
                  <div key={chore.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 13 }}>
                    <span style={{ flex: 1 }}>{chore.name}</span>
                    <span style={{ fontSize: 12, opacity: 0.6 }}>{assignee}</span>
                    <span
                      className={`tag ${done ? 'tag-accent' : 'tag-outline'}`}
                      style={{ width: 64, textAlign: 'center', fontSize: 11 }}
                    >
                      {done ? 'Tehty' : 'Kesken'}
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
                style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                         width: '100%', textAlign: 'left', cursor: 'pointer',
                         background: 'none', border: 'none', padding: 'var(--space-3)' }}
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
                  <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 14 }}>{name}</div>
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

## Rajaukset

- Ei Firebase-kytkentää — tila häviää sivunlatauksessa
- Mock-status: menneet päivät = Tehty, tämä päivä ja tulevat = Kesken
- Viikoittainen kotityö näkyy joka päivä samalla vastuuhenkilöllä (ei vain yhtenä päivänä)
- Maksut-tab on placeholder
