import { LogOut } from 'lucide-react'

interface Props {
  onSignOut: () => void
  onClose: () => void
}

export function SettingsDialog({ onSignOut, onClose }: Props) {
  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div
        className="dialog"
        onClick={e => e.stopPropagation()}
        style={{ marginTop: 'auto', marginBottom: 0, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, width: '100%', maxWidth: '100%' }}
      >
        <div className="dialog-title">Asetukset</div>

        <button
          type="button"
          className="btn btn-secondary btn-block"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-2)' }}
          onClick={onSignOut}
        >
          <LogOut size={16} />
          Kirjaudu ulos
        </button>

        <div className="dialog-actions" style={{ marginTop: 'var(--space-3)' }}>
          <button type="button" className="btn btn-ghost btn-block" onClick={onClose}>
            Sulje
          </button>
        </div>
      </div>
    </div>
  )
}
