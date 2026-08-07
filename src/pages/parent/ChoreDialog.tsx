export type ChoreType = 'paivittainen' | 'viikoittainen' | 'kertaluontoinen'

export interface Chore {
  id: string
  name: string
  priceCents: number
  type: ChoreType
  assignedChildNames: string[]
}

export interface ChoreFormData {
  name: string
  priceCents: number
  type: ChoreType
  assignedChildNames: string[]
}

const TYPE_LABELS: Record<ChoreType, string> = {
  paivittainen: 'Päivittäin',
  viikoittainen: 'Viikoittain',
  kertaluontoinen: 'Kerran',
}

interface Props {
  chore: Chore | null
  childNames: string[]
  onSave: (data: ChoreFormData) => void
  onClose: () => void
}

export function ChoreDialog({ chore, childNames, onSave, onClose }: Props) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const name = (form.elements.namedItem('name') as HTMLInputElement).value.trim()
    const price = parseFloat((form.elements.namedItem('price') as HTMLInputElement).value)
    const type = (form.elements.namedItem('type') as RadioNodeList).value as ChoreType
    const assignBoxes = Array.from(
      form.querySelectorAll('input[name="assign"]:checked')
    ) as HTMLInputElement[]
    const assignedChildNames = assignBoxes.map(el => el.value)
    onSave({ name, priceCents: Math.round(price * 100), type, assignedChildNames })
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
            {(['paivittainen', 'viikoittainen', 'kertaluontoinen'] as ChoreType[]).map(t => (
              <label key={t} className="seg-opt" style={{ flex: 1, justifyContent: 'center' }}>
                <input
                  type="radio"
                  name="type"
                  value={t}
                  defaultChecked={(chore?.type ?? 'paivittainen') === t}
                />
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
                  <input
                    type="checkbox"
                    name="assign"
                    value={n}
                    defaultChecked={chore?.assignedChildNames.includes(n) ?? false}
                  />
                  <span className="dot" />
                  {n}
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
