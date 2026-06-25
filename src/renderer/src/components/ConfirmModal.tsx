interface Props {
  titel: string
  bevestigLabel: string
  // Label op de bevestig-knop tijdens een lopende actie (bv. "Bezig…"). Zonder
  // dit blijft bevestigLabel staan, handig voor synchrone bevestigingen.
  bezigLabel?: string
  // 'danger' (rode knop) voor onomkeerbare acties, 'primary' voor de rest.
  variant?: 'danger' | 'primary'
  bezig?: boolean
  onAnnuleer: () => void
  onBevestig: () => void
  children: React.ReactNode
}

// Gedeelde bevestigingsmodal: titel, een vrije inhoud (children) en de vaste
// Annuleer/Bevestig-knoppenrij. Vervangt de losse *Bevestig/*Bezig-modals zodat
// bewoording en uitzicht op één plek staan. De backdrop dismisst niet (bewust:
// een misklik mag een destructieve keuze niet per ongeluk bevestigen of het
// invulwerk verliezen); annuleren gaat enkel via de knop.
export default function ConfirmModal({
  titel,
  bevestigLabel,
  bezigLabel,
  variant = 'danger',
  bezig = false,
  onAnnuleer,
  onBevestig,
  children
}: Props): JSX.Element {
  return (
    <div className="modal-backdrop" onClick={(e) => e.stopPropagation()}>
      <div className="modal-body" onClick={(e) => e.stopPropagation()}>
        <header className="modal-head">{titel}</header>
        <div className="modal-text">{children}</div>
        <div className="modal-actions">
          <button className="btn" onClick={onAnnuleer} disabled={bezig}>
            Annuleer
          </button>
          <button
            className={'btn ' + (variant === 'primary' ? 'btn-primary' : 'danger')}
            onClick={onBevestig}
            disabled={bezig}
          >
            {bezig && bezigLabel ? bezigLabel : bevestigLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
