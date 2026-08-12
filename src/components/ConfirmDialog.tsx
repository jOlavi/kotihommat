interface Props {
  title: string
  message: string
  confirmLabel?: string
  onConfirm: () => void
  onClose: () => void
}

export function ConfirmDialog({ title, message, confirmLabel = 'Vahvista', onConfirm, onClose }: Props) {
  return (
    <div className="dialog-backdrop">
      <div className="dialog">
        <div className="dialog-title">{title}</div>
        <p className="dialog-body">{message}</p>
        <div className="dialog-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Peruuta</button>
          <button type="button" className="btn btn-primary" onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}
