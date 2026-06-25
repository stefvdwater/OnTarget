// Pure CSV-helpers, los van React en van het schutter-domein. Gedeeld door de
// import/export van SchuttersPage; geen UI- of window.api-afhankelijkheden,
// zodat ze afzonderlijk te testen zijn.

/**
 * Escapet één veld voor CSV-output. Velden met een komma, dubbele
 * aanhalingstekens of een regeleinde worden gequote (RFC 4180-stijl); een
 * interne `"` wordt verdubbeld.
 */
export function csvEscape(waarde: string): string {
  if (waarde == null) return ''
  const s = String(waarde)
  if (/[",\r\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"'
  return s
}

/**
 * Parser voor CSV met quoted fields (RFC 4180-stijl). Ondersteunt embedded
 * komma's, dubbele aanhalingstekens (escaped als "") en CRLF/LF regeleindes.
 */
export function parseCSV(tekst: string): string[][] {
  // Verwijder eventuele UTF-8 BOM
  if (tekst.charCodeAt(0) === 0xfeff) tekst = tekst.slice(1)

  const rijen: string[][] = []
  let rij: string[] = []
  let veld = ''
  let inQuotes = false

  for (let i = 0; i < tekst.length; i++) {
    const c = tekst[i]

    if (inQuotes) {
      if (c === '"') {
        if (tekst[i + 1] === '"') {
          veld += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        veld += c
      }
      continue
    }

    if (c === '"') {
      inQuotes = true
    } else if (c === ',') {
      rij.push(veld)
      veld = ''
    } else if (c === '\r') {
      // negeer; LF erna closet de rij
    } else if (c === '\n') {
      rij.push(veld)
      rijen.push(rij)
      rij = []
      veld = ''
    } else {
      veld += c
    }
  }
  // laatste veld/rij flushen
  if (veld.length > 0 || rij.length > 0) {
    rij.push(veld)
    rijen.push(rij)
  }
  return rijen
}
