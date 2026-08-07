# Lapsen Tänään-näkymä + ChildShell

**Päivämäärä:** 2026-08-07
**Laajuus:** UI-kerros vain (ei Firebase-kytkentää)

## Tavoite

Lapsen päänäkymä: tämän päivän kotityöt tehtäväkortteina, joita voi merkitä tehdyksi. Samalla rakennetaan lapsen app-shell (header + bottom nav) ja dev-toggle roolinvaihtoa varten.

## Arkkitehtuuri

`App.tsx` pitää `role: 'parent' | 'child'` -staten (lisäksi olemassa oleva `family`). Onboardingin jälkeen rooli on oletuksena `'child'`. ChildShell saa `onRoleToggle`-propsin dev-vaihtoa varten — myöhemmin Firebase-autentikaatio korvaa roolin suoraan ilman togglea.

## Komponenttirakenne

```
src/
  App.tsx                        — lisätään role-state ja ChildShell-kytkentä
  components/
    ChildShell.tsx               — header + bottom tabs + sisältöalue
  pages/child/
    TodayView.tsx                — Tänään-sisältö
```

## App.tsx — muutokset

Lisätään `role: 'parent' | 'child'` -state (default `'child'` onboardingin jälkeen). `onRoleToggle` vaihtaa `'child' ↔ 'parent'`. Tällä hetkellä `role === 'parent'` näyttää placeholder-tekstin "Vanhempanäkymä tulossa", `role === 'child'` renderöi `<ChildShell>`.

`childName` johdetaan `family.members`:sta: `family.members.find(m => m.role === 'child')?.name ?? 'Lapsi'` — jos onboardingissa ei lisätty lapsia, käytetään fallbackia `'Lapsi'`.

```ts
const [role, setRole] = useState<'parent' | 'child'>('child')
```

## ChildShell

**Props:**
```ts
interface ChildShellProps {
  childName: string
  onRoleToggle: () => void
}
```

**Header (`.nav`):**
- Vasen: `<span className="nav-brand">` "Kotihommat"
- Keskellä: `<button className="tag tag-accent">` lapsen nimi — `onClick={onRoleToggle}` (dev-toggle)
- Oikea: `.btn.btn-ghost.btn-icon` settings-hammasratas (placeholder, ei toimintaa)

**Sisäinen state:**
```ts
activeTab: 'today' | 'week' | 'balance'   // default 'today'
```

**Sisältöalue:** `flex: 1, overflowY: 'auto'` — renderöi aktiivisen välilehden:
- `today` → `<TodayView />`
- `week` → `<p className="text-muted">Viikko tulossa.</p>`
- `balance` → `<p className="text-muted">Oma saldo tulossa.</p>`

**Bottom tab bar:** kiinteä alareuna, flex row, 3 nappia tasavälein. Aktiivinen tab: `color: var(--color-accent)`. Inaktiivinen: `color: color-mix(in srgb, var(--color-text) 40%, transparent)`.

| Tab | Ikoni (lucide-react) | Label |
|-----|---------------------|-------|
| today | `Home` | Tänään |
| week | `CalendarDays` | Viikko |
| balance | `PiggyBank` | Oma saldo |

## TodayView

**Mock-data (kovakoodattu):**
```ts
const INITIAL_TASKS = [
  { id: '1', name: 'Astianpesukoneen tyhjennys', priceCents: 50, done: false },
  { id: '2', name: 'Koiran ulkoilutus', priceCents: 100, done: false },
  { id: '3', name: 'Roskat ulos', priceCents: 50, done: true },
]
```

**State:**
```ts
tasks: typeof INITIAL_TASKS   // togglaus setTasks:lla
bannerDismissed: boolean       // default false
reminderTime: string | null    // default null (muistutusrivi piilotettu)
```

**Banneri** (näkyy kun `!bannerDismissed && tasks.some(t => !t.done)`):
- Border: `1px solid var(--color-accent)`, bg: `var(--color-accent-100)`, radius: `var(--radius-md)`
- Ikoni: `TriangleAlert` (16px, `stroke="var(--color-accent-700)"`)
- Teksti: `"Sinulla on N tekemätöntä tehtävää tänään"` (N lasketaan dynaamisesti)
- Dismiss: `.btn.btn-ghost.btn-icon` 24×24px, `X`-ikoni, `onClick={() => setBannerDismissed(true)}`

**Muistutusrivi** (näkyy vain jos `reminderTime !== null`):
- `Bell`-ikoni 12px + teksti `"Muistutus klo {reminderTime}"`, `font-size: 12px`, `opacity: 0.6`

**Tehtäväkortit** — jokainen rivi `display: flex, align-items: center, gap: var(--space-3)`:
- **Checkbox:** `<input type="checkbox">` 22×22px, `accent-color: var(--color-accent)`, `cursor: pointer`
- **Nimi:** `flex: 1`, `text-decoration: line-through` kun `done`
- **Hinta:** `"X,XX €"` (priceCents / 100 formatoitu `toLocaleString('fi-FI', {minimumFractionDigits: 2})`), `color: var(--color-accent-700)`, `font-size: 14px`

Kortit erotetaan toisistaan `1px solid var(--color-divider)` -viivalla (ei `.card`-luokkaa, sillä speksi kuvaa rivit, ei kortteja).

## Rajaukset

- Ei Firebase-kytkentää — data on kovakoodattua
- Dev-toggle (`onRoleToggle`) jää koodiin kunnes Firebase-auth lisätään
- Settings-nappi on placeholder (ei dialogi vielä)
- Muistutusaika kovakoodattu `null`:ksi (muistutusrivi ei näy)
- `reminderTime`-prop lisätään myöhemmin asetusdialogin kanssa
