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
