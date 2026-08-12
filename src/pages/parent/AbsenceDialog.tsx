import { useState } from 'react'

interface Props {
  childName: string
  onSave: (type: 'Loma' | 'Sairas', from: string, to: string) => void
  onClose: () => void
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

export function AbsenceDialog({ childName, onSave, onClose }: Props) {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const type = (form.elements.namedItem('atype') as RadioNodeList).value as 'Loma' | 'Sairas'
    onSave(type, from, to)
  }

  const setToday = () => {
    const today = todayISO()
    setFrom(today)
    setTo(today)
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
            <input className="input" id="a-from" name="from" type="date" required value={from} onChange={e => setFrom(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="a-to">Päättyy</label>
            <input className="input" id="a-to" name="to" type="date" required value={to} onChange={e => setTo(e.target.value)} />
          </div>
        </div>

        <button
          type="button"
          className="btn btn-secondary"
          style={{ alignSelf: 'flex-start' }}
          onClick={setToday}
        >
          Tänään
        </button>

        <div className="dialog-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Peruuta</button>
          <button type="submit" className="btn btn-primary">Tallenna</button>
        </div>
      </form>
    </div>
  )
}
