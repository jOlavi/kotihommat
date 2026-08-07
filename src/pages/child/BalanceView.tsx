const MOCK_ANSAITTU_CENTS = 1850
const MOCK_MAKSETTU_CENTS = 1200
const MOCK_ODOTTAA_CENTS  = 650
const MOCK_PAID_PCT       = 65

function formatPrice(cents: number): string {
  return (cents / 100).toLocaleString('fi-FI', { minimumFractionDigits: 2 })
}

export function BalanceView() {
  return (
    <div style={{ padding: 'var(--space-4)' }}>
      <h2 style={{ margin: '0 0 var(--space-4)' }}>Oma saldo</h2>

      <div
        style={{
          border: '1px solid var(--color-divider)',
          borderRadius: 999,
          height: 34,
          position: 'relative',
          overflow: 'hidden',
          background: 'var(--color-surface)',
          marginBottom: 'var(--space-2)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            width: `${MOCK_PAID_PCT}%`,
            background: 'var(--color-accent-500)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 6,
            right: 8,
            width: 10,
            height: 10,
            borderRadius: '50%',
            border: '1.5px solid var(--color-divider)',
            background: 'var(--color-bg)',
          }}
        />
      </div>

      <p style={{ fontSize: 11, opacity: 0.55, margin: '0 0 var(--space-6)' }}>
        Täytetty osuus = jo maksettu taskuraha
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
        <div
          className="card"
          style={{ gridColumn: '1 / -1', alignItems: 'center', textAlign: 'center', background: 'var(--color-surface)' }}
        >
          <div className="card-kicker">Ansaittu yhteensä</div>
          <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 30 }}>
            {formatPrice(MOCK_ANSAITTU_CENTS)} €
          </div>
        </div>

        <div className="card" style={{ alignItems: 'center', textAlign: 'center' }}>
          <div className="card-kicker">Maksettu</div>
          <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 20 }}>
            {formatPrice(MOCK_MAKSETTU_CENTS)} €
          </div>
        </div>

        <div className="card" style={{ alignItems: 'center', textAlign: 'center' }}>
          <div className="card-kicker">Odottaa maksua</div>
          <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 20, color: 'var(--color-accent-700)' }}>
            {formatPrice(MOCK_ODOTTAA_CENTS)} €
          </div>
        </div>
      </div>
    </div>
  )
}
