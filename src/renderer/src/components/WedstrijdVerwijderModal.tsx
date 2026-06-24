import type { Wedstrijd } from '../types'

interface Props {
  wedstrijd: Pick<Wedstrijd, 'naam'>
  bezig?: boolean
  onAnnuleer: () => void
  onBevestig: () => void
}

// Gedeelde bevestiging voor het verwijderen van een wedstrijd. Wordt gebruikt
// zowel op het wedstrijd-overzicht (de prullenbak op de kaart) als in de
// Gevarenzone van de Configuratie-tab, zodat bewoording en uitzicht op één
// plek staan en niet uit elkaar lopen.
export default function WedstrijdVerwijderModal({
  wedstrijd,
  bezig = false,
  onAnnuleer,
  onBevestig
}: Props): JSX.Element {
  return (
    <div className="modal-backdrop" onClick={() => !bezig && onAnnuleer()}>
      <div className="modal-body" onClick={(e) => e.stopPropagation()}>
        <header className="modal-head">Wedstrijd verwijderen?</header>
        <div className="modal-text">
          Alle inschrijvingen en de doelindeling van &quot;{wedstrijd.naam}&quot; worden permanent
          verwijderd. Deze actie kan niet ongedaan gemaakt worden.
        </div>
        <div className="modal-actions">
          <button className="btn" onClick={onAnnuleer} disabled={bezig}>
            Annuleer
          </button>
          <button className="btn danger" onClick={onBevestig} disabled={bezig}>
            {bezig ? 'Bezig…' : 'Definitief verwijderen'}
          </button>
        </div>
      </div>
    </div>
  )
}
