import type { Wedstrijd } from '../types'

// Genereert een ASCII-veilige slug voor een bestandsnaam uit een wedstrijdnaam.
export function slugifyVoorBestand(naam: string): string {
  const basis = naam
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
  return basis || 'wedstrijd'
}

function downloadJson(payload: unknown, bestandsnaam: string): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = bestandsnaam
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// Exporteert één wedstrijd als backup-JSON. Bestandsformaat: zie
// internal-docs/BACKUP_FORMAT.md.
export async function exporteerWedstrijd(w: Wedstrijd): Promise<void> {
  const payload = await window.api.wedstrijden.exportBackup(w.id)
  downloadJson(payload, `wedstrijd-${slugifyVoorBestand(w.naam)}-${w.datum}.json`)
}

export interface BulkExportResultaat {
  geannuleerd: boolean
  opgeslagen: number
  map: string | null
  fouten: string[]
}

// Exporteert meerdere wedstrijden in één map. De gebruiker kiest één keer
// een doelmap; alle JSON-bestanden worden daar weggeschreven door het main
// process (geen save-dialoog per bestand).
export async function exporteerWedstrijden(wedstrijden: Wedstrijd[]): Promise<BulkExportResultaat> {
  if (wedstrijden.length === 0) {
    return { geannuleerd: false, opgeslagen: 0, map: null, fouten: [] }
  }
  return window.api.wedstrijden.exportBackupBulk(wedstrijden.map((w) => w.id))
}
