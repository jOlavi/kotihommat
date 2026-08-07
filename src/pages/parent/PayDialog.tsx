function formatPrice(cents: number): string {
  return (cents / 100).toLocaleString('fi-FI', { minimumFractionDigits: 2 })
}

interface Props {
  childName: string
  maxCents: number
  onSave: (amountCents: number) => void
  onClose: () => void
}

export function PayDialog({ childName, maxCents, onSave, onClose }: Props) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const amount = parseFloat(
      (e.currentTarget.elements.namedItem('amount') as HTMLInputElement).value
    )
    onSave(Math.round(amount * 100))
  }

  return (
    <div className="dialog-backdrop">
      <form className="dialog" onSubmit={handleSubmit}>
        <div className="dialog-title">Merkitse maksetuksi — {childName}</div>
        <p className="dialog-body">
          Odottaa maksua: {formatPrice(maxCents)} €. Kirjaa kuinka paljon taskurahaa maksat nyt.
        </p>
        <div className="field">
          <label htmlFor="pay-amount">Maksettava summa (€)</label>
          <input
            className="input"
            id="pay-amount"
            name="amount"
            type="number"
            step="0.5"
            min="0.5"
            max={maxCents / 100}
            defaultValue={maxCents / 100}
            required
          />
        </div>
        <div className="dialog-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Peruuta</button>
          <button type="submit" className="btn btn-primary">Tallenna</button>
        </div>
      </form>
    </div>
  )
}
