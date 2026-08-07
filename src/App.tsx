export default function App() {
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
      <header className="nav" style={{ padding: 'var(--space-3) var(--space-4)', flex: 'none' }}>
        <span className="nav-brand" style={{ fontSize: 16 }}>Kotihommat</span>
      </header>
      <main style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-4)' }}>
        <p className="text-muted">Projekti alustettu. Näkymät tulossa.</p>
      </main>
    </div>
  )
}
