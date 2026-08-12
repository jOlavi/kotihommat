interface Props {
  onAdd: (name: string, pin: string) => void
  onClose: () => void
  role?: 'child' | 'parent'
}

export function AddChildDialog({ onAdd, onClose, role = 'child' }: Props) {
  const isParent = role === 'parent'
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const els = e.currentTarget.elements
    const name = (els.namedItem('name') as HTMLInputElement).value.trim()
    const pin = (els.namedItem('pin') as HTMLInputElement).value.trim()
    if (name && /^\d{4}$/.test(pin)) onAdd(name, pin)
  }

  return (
    <div className="dialog-backdrop">
      <div className="dialog">
        <h2 className="dialog-title">{isParent ? 'Lisää vanhempi' : 'Lisää lapsi'}</h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <div className="field">
            <label htmlFor="child-name">{isParent ? 'Vanhemman nimi' : 'Lapsen nimi'}</label>
            <input
              className="input"
              id="child-name"
              name="name"
              placeholder="esim. Aino"
              required
              autoFocus
            />
          </div>
          <div className="field">
            <label htmlFor="child-pin">PIN-koodi</label>
            <input
              className="input"
              id="child-pin"
              name="pin"
              type="password"
              inputMode="numeric"
              maxLength={4}
              placeholder="1234"
              pattern="[0-9]{4}"
              required
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
