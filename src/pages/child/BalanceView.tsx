interface Payment {
  id: string
  amountCents: number
  date: string
}

interface Props {
  earnedCents: number
  paidCents: number
  payments: Payment[]
}

function formatPrice(cents: number): string {
  return (cents / 100).toLocaleString('fi-FI', { minimumFractionDigits: 2 })
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fi-FI', { day: 'numeric', month: 'numeric', year: 'numeric' })
}

export function BalanceView({ earnedCents, paidCents, payments }: Props) {
  const outstandingCents = Math.max(0, earnedCents - paidCents)
  const paidPct = earnedCents > 0 ? Math.round((paidCents / earnedCents) * 100) : 0

  return (
    <div style={{ padding: 'var(--space-4)' }}>
      <h2 style={{ margin: '0 0 var(--space-4)' }}>Oma saldo</h2>

      <div style={{
        border: '1px solid var(--color-divider)', borderRadius: 999,
        height: 34, position: 'relative', overflow: 'hidden',
        background: 'var(--color-surface)', marginBottom: 'var(--space-2)',
      }}>
        <div style={{
          position: 'absolute', inset: 0, width: `${paidPct}%`,
          background: 'var(--color-accent-500)',
        }} />
        <div style={{
          position: 'absolute', top: 6, right: 8, width: 10, height: 10,
          borderRadius: '50%', border: '1.5px solid var(--color-divider)',
          background: 'var(--color-bg)',
        }} />
      </div>

      <p style={{ fontSize: 11, opacity: 0.55, margin: '0 0 var(--space-6)' }}>
        Täytetty osuus = jo maksettu taskuraha
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
        <div className="card" style={{ gridColumn: '1 / -1', alignItems: 'center', textAlign: 'center', background: 'var(--color-surface)' }}>
          <div className="card-kicker">Ansaittu yhteensä</div>
          <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 30 }}>
            {formatPrice(earnedCents)} €
          </div>
        </div>

        <div className="card" style={{ alignItems: 'center', textAlign: 'center' }}>
          <div className="card-kicker">Maksettu</div>
          <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 20 }}>
            {formatPrice(paidCents)} €
          </div>
        </div>

        <div className="card" style={{ alignItems: 'center', textAlign: 'center' }}>
          <div className="card-kicker">Odottaa maksua</div>
          <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 20, color: 'var(--color-accent-700)' }}>
            {formatPrice(outstandingCents)} €
          </div>
        </div>
      </div>

      <h5 style={{ margin: '0 0 var(--space-2)' }}>Maksuhistoria</h5>
      {payments.length === 0 ? (
        <p style={{ fontSize: 13, opacity: 0.5, margin: 0 }}>Ei maksuja vielä.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {payments.map(p => (
            <div key={p.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: 'var(--space-2) 0',
              borderBottom: '1px solid var(--color-divider)',
            }}>
              <span style={{ fontSize: 13, opacity: 0.6 }}>{formatDate(p.date)}</span>
              <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 15, color: 'var(--color-accent-700)' }}>
                {formatPrice(p.amountCents)} €
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
