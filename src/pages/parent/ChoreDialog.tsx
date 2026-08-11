import { Chore, ChoreType, Member } from '@/types'

export interface ChoreFormData {
  name: string
  priceCents: number
  type: ChoreType
  assignedMemberIds: string[]
}

const TYPE_LABELS: Record<ChoreType, string> = {
  daily: 'Päivittäin',
  weekly: 'Viikoittain',
  once: 'Kerran',
}

interface Props {
  chore: Chore | null
  firestoreMembers: Member[]
  onSave: (data: ChoreFormData) => void
  onClose: () => void
}

export function ChoreDialog({ chore, firestoreMembers, onSave, onClose }: Props) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const name = (form.elements.namedItem('name') as HTMLInputElement).value.trim()
    const price = parseFloat((form.elements.namedItem('price') as HTMLInputElement).value)
    const type = (form.elements.namedItem('type') as RadioNodeList).value as ChoreType
    const assignedMemberIds = Array.from(
      form.querySelectorAll<HTMLInputElement>('input[name="assign"]:checked')
    ).map(el => el.value)
    onSave({ name, priceCents: Math.round(price * 100), type, assignedMemberIds })
  }

  return (
    <div className="dialog-backdrop">
      <form className="dialog" onSubmit={handleSubmit}>
        <div className="dialog-title">
          {chore ? 'Muokkaa kotityötä' : 'Lisää kotityö'}
        </div>

        <div className="field">
          <label htmlFor="chore-name">Nimi</label>
          <input
            className="input"
            id="chore-name"
            name="name"
            required
            defaultValue={chore?.name ?? ''}
            placeholder="esim. Roskien vienti"
          />
        </div>

        <div className="field">
          <label htmlFor="chore-price">Hinta (€)</label>
          <input
            className="input"
            id="chore-price"
            name="price"
            type="number"
            step="0.5"
            min="0.5"
            required
            defaultValue={chore ? chore.priceCents / 100 : ''}
          />
        </div>

        <div className="field">
          <label>Tyyppi</label>
          <div className="seg" style={{ width: '100%' }}>
            {(['daily', 'weekly', 'once'] as ChoreType[]).map(t => (
              <label key={t} className="seg-opt" style={{ flex: 1, justifyContent: 'center' }}>
                <input
                  type="radio"
                  name="type"
                  value={t}
                  defaultChecked={(chore?.type ?? 'daily') === t}
                />
                {TYPE_LABELS[t]}
              </label>
            ))}
          </div>
        </div>

        {firestoreMembers.length > 0 && (
          <div className="field">
            <label>Kohdista lapselle</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
              {firestoreMembers.map(m => (
                <label key={m.uid} className="radio">
                  <input
                    type="checkbox"
                    name="assign"
                    value={m.uid}
                    defaultChecked={chore?.assignedMemberIds.includes(m.uid) ?? false}
                  />
                  <span className="dot" />
                  {m.firstName}
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="dialog-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Peruuta
          </button>
          <button type="submit" className="btn btn-primary">
            Tallenna
          </button>
        </div>
      </form>
    </div>
  )
}
