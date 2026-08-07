interface Props {
  childName: string
  onSave: (type: 'Loma' | 'Sairas', from: string, to: string) => void
  onClose: () => void
}

export function AbsenceDialog({ childName, onSave, onClose }: Props) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const type = (form.elements.namedItem('atype') as RadioNodeList).value as 'Loma' | 'Sairas'
    const from = (form.elements.namedItem('from') as HTMLInputElement).value
    const to = (form.elements.namedItem('to') as HTMLInputElement).value
    onSave(type, from, to)
  }

  return (
    <div className="dialog-backdrop">
      <form className="dialog" onSubmit={handleSubmit}>
        <div className="dialog-title">Merkitse poissaolo — {childName}</div>

        <div className="field">
          <label>Syy</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
            <label className="radio">
              <input type="radio" name="atype" value="Loma" defaultChecked />
              <span className="dot" /> Loma
            </label>
            <label className="radio">
              <input type="radio" name="atype" value="Sairas" />
              <span className="dot" /> Sairas
            </label>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
          <div className="field">
            <label htmlFor="a-from">Alkaa</label>
            <input className="input" id="a-from" name="from" type="date" required />
          </div>
          <div className="field">
            <label htmlFor="a-to">Päättyy</label>
            <input className="input" id="a-to" name="to" type="date" required />
          </div>
        </div>

        <div className="dialog-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Peruuta</button>
          <button type="submit" className="btn btn-primary">Tallenna</button>
        </div>
      </form>
    </div>
  )
}
