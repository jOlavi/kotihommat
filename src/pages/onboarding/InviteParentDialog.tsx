import { useState } from 'react'

interface Props {
  onClose: () => void
}

const INVITE_LINK = 'https://kotihommat.app/invite/abc123'

export function InviteParentDialog({ onClose }: Props) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(INVITE_LINK)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  return (
    <div className="dialog-backdrop">
      <div className="dialog">
        <h2 className="dialog-title">Kutsu toinen vanhempi</h2>
        <div className="field">
          <label htmlFor="invite-link">Kutsulinkki</label>
          <input
            className="input"
            id="invite-link"
            value={INVITE_LINK}
            readOnly
            onChange={() => {}}
          />
        </div>
        <div className="dialog-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Sulje
          </button>
          <button type="button" className="btn btn-primary" onClick={handleCopy}>
            {copied ? 'Kopioitu!' : 'Kopioi linkki'}
          </button>
        </div>
      </div>
    </div>
  )
}
