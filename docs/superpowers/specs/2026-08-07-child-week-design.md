# Lapsen Viikko-näkymä

**Päivämäärä:** 2026-08-07
**Laajuus:** UI-kerros vain (ei Firebase-kytkentää)

## Tavoite

Read-only viikkonäkymä, joka näyttää lapsen koko kuluvan ISO-viikon tehtävät päivittäin ryhmiteltynä statustageilla. Jaettu data Tänään-näkymän kanssa: Tänäänissä tehdyksi merkitty tehtävä näkyy "Tehty"-statuksella Viikossa.

## Data-malli

```ts
// Paikallinen mock-tyyppi (ChildShell.tsx sisällä)
type MockStatus = 'tehty' | 'tekematon' | 'poissa'

interface Task {
  id: string
  name: string
  priceCents: number
  date: string       // ISO-päivä "2026-08-07"
  status: MockStatus
}
```

## Arkkitehtuuri

State nostetaan `TodayView`:sta `ChildShell`:iin. `ChildShell` pitää `tasks: Task[]` -staten koko viikon mock-datalla. `TodayView` ja `WeekView` saavat datan propsina.

```
ChildShell (tasks state, today string)
  ├── TodayView (tasks: today's tasks, onToggle)   ← suodatettu
  └── WeekView  (tasks: all week tasks, today)     ← kaikki, ryhmitellään sisällä
```

## Tiedostomuutokset

```
src/
  components/
    ChildShell.tsx          — MODIFY: lisätään tasks-state + today, poistetaan TodayView:n sisäinen state
  pages/child/
    TodayView.tsx           — MODIFY: sisäinen state → props (tasks, onToggle)
    WeekView.tsx            — CREATE: viikkonäkymä
```

## ChildShell — muutokset

**Mock-data** (koko viikko, 7 päivää, 2–3 tehtävää/päivä):
- Tänään: 2 tekemätöntä + 1 tehty (sama kuin aiempi INITIAL_TASKS, nyt date-kentällä)
- Eilen: kaikki tehty
- Ylihuomenna: yksi tehtävä 'poissa'-statuksella
- Muut päivät: sekoitus tehty/tekematon

**State:**
```ts
const today = new Date().toISOString().slice(0, 10)
const [tasks, setTasks] = useState<Task[]>(INITIAL_WEEK_TASKS)
```

**onToggle:**
```ts
const handleToggle = (id: string) => {
  setTasks(prev =>
    prev.map(t =>
      t.id === id
        ? { ...t, status: t.status === 'tehty' ? 'tekematon' : 'tehty' }
        : t
    )
  )
}
```

**Props TodayView:lle:**
```ts
const todayTasks = tasks.filter(t => t.date === today)
<TodayView tasks={todayTasks} onToggle={handleToggle} />
```

**Props WeekView:lle:**
```ts
<WeekView tasks={tasks} today={today} />
```

## TodayView — muutokset

Poistetaan `useState(INITIAL_TASKS)` ja `bannerDismissed`:n ulkopuolinen state. Lisätään propsit:

```ts
interface TodayViewProps {
  tasks: Task[]
  onToggle: (id: string) => void
}
```

- `task.done` → `task.status === 'tehty'`
- `toggleTask(id)` → `onToggle(id)` (ei voi togglea 'poissa'-tehtäviä)
- Bannerin laskuri: `tasks.filter(t => t.status === 'tekematon').length`
- `bannerDismissed` ja `reminderTime` pysyvät TodayView:n sisäisenä staterna

## WeekView

**Props:**
```ts
interface WeekViewProps {
  tasks: Task[]
  today: string  // ISO-päivä, vertailua varten
}
```

**Apufunktiot (tiedoston yläosassa):**
```ts
function getISOWeek(date: Date): number  // ISO-viikkonumero
function getWeekDays(date: Date): Date[] // Ma–Su, 7 Date-objektia
function toISODate(date: Date): string   // → "2026-08-07"
```

**Rakenne:**
- Otsikko `h2` "Viikko {N}" (`getISOWeek(new Date())`)
- 7 päivälohkoa, jokainen:
  - `<hr className="hr" />` + päiväotsikkorivi: päivänimi (esim. "Maanantai") + päivämäärä (esim. "7.8.") — tämän päivän kohdalla lisäksi `<span className="tag tag-outline">Tänään</span>`
  - Lista tehtävärivejä: `flex row`, nimi (`flex: 1`, `font-size: 15px`) + statustagi
    - `'tehty'` → `<span className="tag tag-accent">Tehty</span>`
    - `'tekematon'` → `<span className="tag tag-outline">Tekemättä</span>`
    - `'poissa'` → `<span className="tag tag-neutral">Poissa</span>`
  - Jos päivälle ei tehtäviä: `<p className="text-muted" style={{fontSize:13}}>Ei tehtäviä</p>`

**Päivien nimet:**
```ts
const DAY_NAMES = ['Maanantai','Tiistai','Keskiviikko','Torstai','Perjantai','Lauantai','Sunnuntai']
```

Päivämäärä formatoidaan `date.toLocaleDateString('fi-FI', { day: 'numeric', month: 'numeric' })`.

## Rajaukset

- Read-only — ei checkboxeja, ei toggleja
- 'Poissa'-tehtäviä ei voi toggleta myöskään Tänään-näkymässä
- Ei viikkonavigaatiota (‹ › nuolet) — näytetään aina kuluva viikko
- Ei Firebase-kytkentää
