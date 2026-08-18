import { LogOut, Users } from 'lucide-react'

interface Props {
  onSignOut: () => void
  onClose: () => void
  onOpenFamily?: () => void
}

export function SettingsDialog({ onSignOut, onClose, onOpenFamily }: Props) {
  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div
        className="dialog"
        onClick={e => e.stopPropagation()}
        style={{ marginTop: 'auto', marginBottom: 0, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, width: '100%', maxWidth: '100%' }}
      >
        <div className="dialog-title">Asetukset</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {onOpenFamily && (
            <button
              type="button"
              className="btn btn-secondary btn-block"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-2)' }}
              onClick={() => { onClose(); onOpenFamily() }}
            >
              <Users size={16} />
              Perhe
            </button>
          )}
          <button
            type="button"
            className="btn btn-secondary btn-block"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-2)' }}
            onClick={onSignOut}
          >
            <LogOut size={16} />
            Kirjaudu ulos
          </button>
        </div>

        <div className="dialog-actions" style={{ marginTop: 'var(--space-3)' }}>
          <button type="button" className="btn btn-ghost btn-block" onClick={onClose}>
            Sulje
          </button>
        </div>
      </div>
    </div>
  )
}
