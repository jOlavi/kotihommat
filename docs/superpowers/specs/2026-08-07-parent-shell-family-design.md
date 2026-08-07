# ParentShell + Perhe-välilehti

**Päivämäärä:** 2026-08-07
**Laajuus:** UI-kerros vain (ei Firebase-kytkentää)

## Tavoite

Vanhemman pääkomponentti (ParentShell) 3-välilehtisellä navigaatiolla, sekä Perhe-välilehti joka näyttää perheen jäsenet ja mahdollistaa lapsen lisäämisen ja toisen vanhemman kutsumisen. Kotityöt ja Lapsen profiili -välilehdet saavat placeholder-tekstin — ne toteutetaan erillisinä spekseinä.

## Arkkitehtuuri

```
App.tsx
  └── ParentShell (family, onAddMember, onRoleToggle)
        ├── FamilyView (members, onAddChild)
        │     ├── AddChildDialog    ← reused from onboarding
        │     └── InviteParentDialog ← reused from onboarding
        ├── [Kotityöt placeholder]
        └── [Lapsen profiili placeholder]
```

## Tiedostomuutokset

```
src/
  components/
    ParentShell.tsx       — CREATE
  pages/parent/
    FamilyView.tsx        — CREATE
  App.tsx                 — MODIFY: placeholder → <ParentShell />, lisää onAddMember
```

## ParentShell

### Props

```ts
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
```

TypeScript structural typing takaa yhteensopivuuden App.tsx:n `FamilyState`-tyypin kanssa ilman erillistä type-exporttia.

### State

```ts
const [activeTab, setActiveTab] = useState<'chores' | 'family' | 'profile'>('chores')
```

### Header

Sama rakenne kuin ChildShellissä:
- `.nav-brand` "Kotihommat"
- `family.creatorName` — `tag tag-accent`-nappi, `onClick → onRoleToggle` (dev toggle lapsi-näkymään)
- `Settings`-ikoni (Lucide, 18px) oikealla — ei toimintoa vielä, `aria-label="Asetukset"`

Ei teemaväri-overridetä — käyttää `:root` kultaramppia suoraan.

### Bottom nav

| Tab id | Label | Ikoni (lucide-react, 20px) |
|--------|-------|---------------------------|
| `chores` | Kotityöt | `ListChecks` |
| `family` | Perhe | `Users` |
| `profile` | Lapsen profiili | `UserCircle` |

Sama tyyli kuin ChildShellissä: aktiivinen `var(--color-accent)`, inaktiivinen `color-mix(in srgb, var(--color-text) 40%, transparent)`.

### Main-alue

```tsx
{activeTab === 'chores' && (
  <div style={{ padding: 'var(--space-4)' }}>
    <p className="text-muted">Kotityöt tulossa.</p>
  </div>
)}
{activeTab === 'family' && (
  <FamilyView
    members={family.members}
    onAddChild={name => onAddMember({ name, role: 'child' })}
  />
)}
{activeTab === 'profile' && (
  <div style={{ padding: 'var(--space-4)' }}>
    <p className="text-muted">Lapsen profiili tulossa.</p>
  </div>
)}
```

## FamilyView

### Props

```ts
interface Props {
  members: { name: string; role: 'parent' | 'child' }[]
  onAddChild: (name: string) => void
}
```

### State

```ts
const [addChildOpen, setAddChildOpen] = useState(false)
const [inviteOpen, setInviteOpen] = useState(false)
```

### Rakenne

```
<div style={{ padding: 'var(--space-4)' }}>
  <h2 style={{ margin: '0 0 var(--space-4)' }}>Perhe</h2>

  /* Jäsenlista */
  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
    {members.map(m => (
      <div className="card" style={{ flexDirection: 'row', alignItems: 'center', gap: 'var(--space-3)' }}>
        /* Avataari 38×38px ympyrä */
        /* Nimi + meta */
        /* tag tag-accent */
      </div>
    ))}
  </div>

  /* Napit */
  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
    <button className="btn btn-primary btn-block" onClick={() => setAddChildOpen(true)}>Lisää lapsi</button>
    <button className="btn btn-secondary btn-block" onClick={() => setInviteOpen(true)}>Kutsu toinen vanhempi</button>
  </div>

  /* Dialogit */
  {addChildOpen && <AddChildDialog onAdd={name => { onAddChild(name); setAddChildOpen(false) }} onClose={() => setAddChildOpen(false)} />}
  {inviteOpen && <InviteParentDialog onClose={() => setInviteOpen(false)} />}
</div>
```

### Jäsenkortti — tarkka rakenne

`.card` + `style={{ flexDirection: 'row', alignItems: 'center', gap: 'var(--space-3)' }}`

**Avataari:**
```
width: 38, height: 38, borderRadius: '50%'
border: '1.5px solid var(--color-divider)'
display: flex, alignItems: center, justifyContent: center
flex: none
fontFamily: var(--font-heading), fontWeight: 600
Sisältö: member.name[0].toUpperCase()
```

**Teksti (flex: 1):**
```
<div style={{ fontSize: 15, fontWeight: 600, fontFamily: 'var(--font-heading)' }}>{member.name}</div>
<div style={{ fontSize: 12, opacity: 0.6 }}>{member.role === 'parent' ? 'Vanhempi' : 'Lapsi'}</div>
```

**Tagi:**
```
<span className="tag tag-accent">{member.role === 'parent' ? 'Vanhempi' : 'Lapsi'}</span>
```

## App.tsx — muutos

Korvataan inline-placeholder `<ParentShell />`-komponentilla:

```tsx
import { ParentShell } from '@/components/ParentShell'

// role === 'parent' -haara:
<ParentShell
  family={family}
  onAddMember={member =>
    setFamily(f => f && { ...f, members: [...f.members, member] })
  }
  onRoleToggle={() => setRole('child')}
/>
```

## Rajaukset

- Kotityöt ja Lapsen profiili -välilehdet: placeholder-teksti, ei toimintoa
- Settings-nappi: näkyy, ei toimintoa
- Ei Firebase-kytkentää
- Ei vanhemman teemaväri-overridetä (käyttää `:root` kultaramppia)
- "Kutsu toinen vanhempi" -dialogi näyttää staattisen linkin (jo toteutettu onboardingissa)
