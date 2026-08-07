# Onboarding — Perheen luonti — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rakenna kaksivaiheinen onboarding-flow (Luo perhe → Hallinnoi jäseniä), joka on täysin toimiva UI:na ilman Firebase-kytkentää.

**Architecture:** `OnboardingView` hallinnoi koko flowta yhdellä komponentilla, joka pitää sisäistä steppiä ja jäsenlistaa. Dialogit (`AddChildDialog`, `InviteParentDialog`) ovat erillisiä puhtaita komponentteja. `App.tsx` pitää `family`-staten ja renderöi joko onboardingin tai myöhemmin rakennettavan app-shellin.

**Tech Stack:** React 18, TypeScript, Vite 5, Classical design system (`src/styles.css`)

## Global Constraints

- Kaikki CSS-luokat (`btn`, `tag`, `card`, `field`, `input`, `dialog`, jne.) tulevat `src/styles.css`:stä — ei inline-tyylejä komponenttilogiikalle, ei erillisiä CSS-moduuleja
- Kaikki suomenkieliset tekstit kirjoitetaan verbatim speksin mukaisesti
- Ei validaatiokirjastoja — natiivi HTML `required`-attribuutti riittää
- Ei Firebase-kytkentää tässä planissa
- Path-alias `@/` → `src/` käytössä

---

### Task 1: AddChildDialog

**Files:**
- Create: `src/pages/onboarding/AddChildDialog.tsx`

**Interfaces:**
- Produces: `AddChildDialog({ onAdd: (name: string) => void, onClose: () => void })`

- [ ] **Step 1: Luo komponentti**

```tsx
// src/pages/onboarding/AddChildDialog.tsx
interface Props {
  onAdd: (name: string) => void
  onClose: () => void
}

export function AddChildDialog({ onAdd, onClose }: Props) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const name = (
      e.currentTarget.elements.namedItem('name') as HTMLInputElement
    ).value.trim()
    if (name) onAdd(name)
  }

  return (
    <div className="dialog-backdrop">
      <div className="dialog">
        <h2 className="dialog-title">Lisää lapsi</h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <div className="field">
            <label htmlFor="child-name">Lapsen nimi</label>
            <input
              className="input"
              id="child-name"
              name="name"
              placeholder="esim. Aino"
              required
              autoFocus
            />
          </div>
          <div className="dialog-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Peruuta
            </button>
            <button type="submit" className="btn btn-primary">
              Lisää
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Tarkista käännös**

```bash
npm run build
```

Odotettu: `✓ built in ...ms` — ei TypeScript-virheitä.

- [ ] **Step 3: Commit**

```bash
git add src/pages/onboarding/AddChildDialog.tsx
git commit -m "feat: add AddChildDialog component"
```

---

### Task 2: InviteParentDialog

**Files:**
- Create: `src/pages/onboarding/InviteParentDialog.tsx`

**Interfaces:**
- Produces: `InviteParentDialog({ onClose: () => void })`

- [ ] **Step 1: Luo komponentti**

```tsx
// src/pages/onboarding/InviteParentDialog.tsx
import { useState } from 'react'

interface Props {
  onClose: () => void
}

const INVITE_LINK = 'https://kotihommat.app/invite/abc123'

export function InviteParentDialog({ onClose }: Props) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(INVITE_LINK)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  return (
    <div className="dialog-backdrop">
      <div className="dialog">
        <h2 className="dialog-title">Kutsu toinen vanhempi</h2>
        <div className="field">
          <label htmlFor="invite-link">Kutsulinkki</label>
          <input
            className="input"
            id="invite-link"
            value={INVITE_LINK}
            readOnly
          />
        </div>
        <div className="dialog-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Sulje
          </button>
          <button type="button" className="btn btn-primary" onClick={handleCopy}>
            {copied ? 'Kopioitu!' : 'Kopioi linkki'}
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Tarkista käännös**

```bash
npm run build
```

Odotettu: `✓ built in ...ms`

- [ ] **Step 3: Commit**

```bash
git add src/pages/onboarding/InviteParentDialog.tsx
git commit -m "feat: add InviteParentDialog component"
```

---

### Task 3: OnboardingView — Step A (Luo perhe)

**Files:**
- Create: `src/pages/onboarding/OnboardingView.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: ei aiempia taskeja
- Produces: `OnboardingView({ onComplete: (creatorName: string, familyName: string, members: { name: string; role: 'parent' | 'child' }[]) => void })`

- [ ] **Step 1: Luo OnboardingView — vain Step A**

```tsx
// src/pages/onboarding/OnboardingView.tsx
import { useState } from 'react'
import { AddChildDialog } from './AddChildDialog'
import { InviteParentDialog } from './InviteParentDialog'

type Step = 'create' | 'manage'
type DialogType = 'addChild' | 'inviteParent' | null

interface Member {
  name: string
  role: 'parent' | 'child'
}

interface Props {
  onComplete: (creatorName: string, familyName: string, members: Member[]) => void
}

export function OnboardingView({ onComplete }: Props) {
  const [step, setStep] = useState<Step>('create')
  const [creatorName, setCreatorName] = useState('')
  const [familyName, setFamilyName] = useState('')
  const [members, setMembers] = useState<Member[]>([])
  const [dialog, setDialog] = useState<DialogType>(null)

  const handleCreateFamily = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const els = e.currentTarget.elements
    const name = (els.namedItem('name') as HTMLInputElement).value.trim()
    const family = (els.namedItem('family') as HTMLInputElement).value.trim()
    setCreatorName(name)
    setFamilyName(family)
    setMembers([{ name, role: 'parent' }])
    setStep('manage')
  }

  const handleAddChild = (name: string) => {
    setMembers(prev => [...prev, { name, role: 'child' }])
    setDialog(null)
  }

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'var(--color-bg)',
        display: 'flex',
        flexDirection: 'column',
        padding: 'var(--space-8) var(--space-6)',
        zIndex: 50,
        overflowY: 'auto',
      }}
    >
      {step === 'create' && (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: 'var(--space-6)',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 'var(--space-3)',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                border: '1.5px solid var(--color-accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontWeight: 600,
                  fontSize: 24,
                  color: 'var(--color-accent)',
                }}
              >
                K
              </span>
            </div>
            <h1 style={{ fontSize: 28, margin: 0 }}>Luo perheesi</h1>
            <p style={{ opacity: 0.7, maxWidth: '32ch', margin: 0 }}>
              Aloitetaan lisäämällä sinut ensimmäisenä vanhempana.
            </p>
          </div>
          <form
            onSubmit={handleCreateFamily}
            style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}
          >
            <div className="field">
              <label htmlFor="setup-name">Oma nimi</label>
              <input
                className="input"
                id="setup-name"
                name="name"
                placeholder="esim. Liisa"
                required
              />
            </div>
            <div className="field">
              <label htmlFor="setup-family">Perheen nimi</label>
              <input
                className="input"
                id="setup-family"
                name="family"
                defaultValue="Virtanen"
                required
              />
            </div>
            <button type="submit" className="btn btn-primary btn-block">
              Luo perhe
            </button>
          </form>
        </div>
      )}

      {step === 'manage' && (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-4)',
          }}
        >
          <div style={{ textAlign: 'center', paddingTop: 'var(--space-4)' }}>
            <span
              className="tag tag-accent"
              style={{
                fontFamily: 'var(--font-heading)',
                fontWeight: 600,
                fontSize: 13,
              }}
            >
              Perhe {familyName}
            </span>
            <p style={{ opacity: 0.65, margin: 'var(--space-2) 0 0', fontSize: 13 }}>
              Perhe luotu. Lisää muut jäsenet, tai jatka sovellukseen.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {members.map((m, i) => (
              <div
                key={i}
                className="card"
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 'var(--space-3)',
                  padding: 'var(--space-2) var(--space-3)',
                }}
              >
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: '50%',
                    border: '1.5px solid var(--color-divider)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flex: 'none',
                    fontFamily: 'var(--font-heading)',
                    fontWeight: 600,
                    fontSize: 13,
                  }}
                >
                  {m.name.charAt(0).toUpperCase()}
                </div>
                <span style={{ flex: 1, fontSize: 14 }}>{m.name}</span>
                <span className={m.role === 'child' ? 'tag tag-accent' : 'tag tag-outline'}>
                  {m.role === 'child' ? 'Lapsi' : 'Vanhempi'}
                </span>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginTop: 'auto' }}>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ flex: 1 }}
                onClick={() => setDialog('addChild')}
              >
                Lisää lapsi
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ flex: 1 }}
                onClick={() => setDialog('inviteParent')}
              >
                Lisää vanhempi
              </button>
            </div>
            <button
              type="button"
              className="btn btn-primary btn-block"
              onClick={() => onComplete(creatorName, familyName, members)}
            >
              Valmis, siirry sovellukseen
            </button>
          </div>
        </div>
      )}

      {dialog === 'addChild' && (
        <AddChildDialog onAdd={handleAddChild} onClose={() => setDialog(null)} />
      )}
      {dialog === 'inviteParent' && (
        <InviteParentDialog onClose={() => setDialog(null)} />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Päivitä App.tsx käyttämään OnboardingView'tä**

```tsx
// src/App.tsx
import { useState } from 'react'
import { OnboardingView } from '@/pages/onboarding/OnboardingView'

interface FamilyState {
  creatorName: string
  familyName: string
  members: { name: string; role: 'parent' | 'child' }[]
}

export default function App() {
  const [family, setFamily] = useState<FamilyState | null>(null)

  return (
    <div
      style={{
        width: 'min(480px, 100vw)',
        height: 'min(900px, 100dvh)',
        background: 'var(--color-bg)',
        overflow: 'hidden',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: 'var(--shadow-lg)',
      }}
    >
      {family === null ? (
        <OnboardingView
          onComplete={(creatorName, familyName, members) =>
            setFamily({ creatorName, familyName, members })
          }
        />
      ) : (
        <>
          <header className="nav" style={{ padding: 'var(--space-3) var(--space-4)', flex: 'none' }}>
            <span className="nav-brand" style={{ fontSize: 16 }}>Kotihommat</span>
            <button className="tag tag-accent" style={{ border: 'none', cursor: 'pointer', fontFamily: 'var(--font-heading)', fontWeight: 600 }}>
              {family.creatorName}
            </button>
          </header>
          <main style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-4)' }}>
            <p className="text-muted">Tervetuloa, {family.creatorName}! Näkymät tulossa.</p>
          </main>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Tarkista käännös**

```bash
npm run build
```

Odotettu: `✓ built in ...ms` — ei virheitä.

- [ ] **Step 4: Tarkista selaimessa**

```bash
npm run dev
```

Avaa `http://localhost:5173`. Tarkista:
- Step A näkyy: logo-ympyrä "K", otsikko "Luo perheesi", kaksi inputtia, "Luo perhe" -nappi
- Lomakkeen submit siirtää Step B:hen: perhe-tagi, luoja listassa "Vanhempi"-tagilla
- "Valmis, siirry sovellukseen" näyttää tervetuloviestin

- [ ] **Step 5: Commit**

```bash
git add src/pages/onboarding/OnboardingView.tsx src/App.tsx
git commit -m "feat: add OnboardingView with Step A and Step B"
```

---

### Task 4: Dialogien toiminnallisuuden tarkistus

**Files:**
- Modify: ei uusia tiedostoja — dialogit ovat jo OnboardingView.tsx:ssä

**Interfaces:**
- Consumes: `AddChildDialog({ onAdd, onClose })`, `InviteParentDialog({ onClose })`

- [ ] **Step 1: Testaa dialogit selaimessa**

```bash
npm run dev
```

Tarkista Step B:ssä:

1. **Lisää lapsi** — paina nappia → dialogi aukeaa, kirjoita nimi, paina "Lisää" → jäsen ilmestyy listaan "Lapsi"-tagilla, dialogi sulkeutuu
2. **Peruuta** — dialogi sulkeutuu ilman muutoksia
3. **Lisää vanhempi** — paina nappia → dialogi aukeaa, kutsuylinkki näkyy read-only-kentässä, "Kopioi linkki" muuttuu "Kopioitu!":ksi 1.8s ajaksi, "Sulje" sulkee dialogin

- [ ] **Step 2: Final build + lint**

```bash
npm run build && npm run lint
```

Odotettu: ei virheitä.

Jos kaikki toimii, onboarding on valmis. Seuraava vaihe on lapsi- ja vanhempinäkymien rakentaminen.
