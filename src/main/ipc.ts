import { ipcMain, dialog, BrowserWindow, shell, app } from 'electron'
import { writeFileSync, chmodSync } from 'fs'
import { join } from 'path'
import ExcelJS from 'exceljs'
import { queryAll, queryOne, run, transaction } from './database'
import { valideerEnNormaliseer, type BackupPayloadV1 } from '@shared/backupTypes'
import type { ExcelModel } from '@shared/afdrukTypes'

// ── Demo data ─────────────────────────────────────────────
ipcMain.handle('demo:laad', () => {
  const gilden = [
    'Gilde De Gulden Pijl', 'Schuttersgilde Sint-Sebastiaan', 'Gilde De Vlaamse Boog',
    'Koninklijk Gilde De Notelaer', 'Gilde De Zilveren Pijl', 'Schuttersgilde De Kempen',
    'Gilde Het Gouden Doel', 'Schuttersgilde De Vrijschutters', 'Gilde De Blauwe Valk',
    'Koninklijk Gilde Sint-Joris', 'Gilde De Rode Roos'
  ]
  const mannen = ['Jan', 'Pieter', 'Luc', 'Marc', 'Tom', 'Koen', 'Steven', 'Frank', 'Joris', 'Bruno', 'Wim', 'Erik', 'Dirk', 'Rik', 'Bart', 'Sven', 'Niels', 'Jonas', 'Ruben', 'Bram', 'Mathias', 'Stef', 'Kevin', 'Dave']
  const vrouwen = ['Marie', 'An', 'Els', 'Sofie', 'Lien', 'Nathalie', 'Karen', 'Lisa', 'Sara', 'Inge', 'Hilde', 'Griet', 'Eva', 'Emma', 'Noor', 'Fien', 'Lies', 'Axelle', 'Julie', 'Laura', 'Charlotte', 'Amber', 'Elien', 'Inne']
  const namen = ['Janssen', 'Peeters', 'Claes', 'Smeets', 'Willems', 'Martens', 'Van den Berg', 'De Smedt', 'Hermans', 'Bogaert', 'Thijs', 'Vermeersch', 'Nijs', 'Wouters', 'Aerts', 'Puts', 'Michiels', 'Stevens', 'Leclercq', 'Dubois', 'Jacobs', 'Goossens', 'De Wolf', 'Maes', 'Van Acker', 'Mertens', 'Desmet', 'Vandenberghe', 'Declercq', 'Baert']
  let mIdx = 0, vIdx = 0, nIdx = 0
  const man = () => mannen[mIdx++ % mannen.length]
  const vrouw = () => vrouwen[vIdx++ % vrouwen.length]
  const naam = () => namen[nIdx++ % namen.length]

  transaction(() => {
    // Verwijder bestaande demodata (alles — verse start)
    run('DELETE FROM indeling')
    run('DELETE FROM vergrendelde_doelen')
    run('DELETE FROM inschrijvingen')
    run('DELETE FROM schutters')
    run('DELETE FROM gilden')

    const gildeIds: number[] = []
    for (const g of gilden) {
      const res = run('INSERT INTO gilden (naam) VALUES (?)', [g])
      gildeIds.push(res.lastInsertRowid)
    }

    const schuttersDef = (gId: number) => [
      { voornaam: man(), naam: naam(), gilde_id: gId, type_boog: 'Recurve',  leeftijdscategorie: 'Senior',   geslacht: 'M', afstand: 25 },
      { voornaam: vrouw(), naam: naam(), gilde_id: gId, type_boog: 'Recurve',  leeftijdscategorie: 'Senior',   geslacht: 'V', afstand: 25 },
      { voornaam: man(), naam: naam(), gilde_id: gId, type_boog: 'Barebow',  leeftijdscategorie: 'Senior',   geslacht: 'M', afstand: 25 },
      { voornaam: vrouw(), naam: naam(), gilde_id: gId, type_boog: 'Recurve',  leeftijdscategorie: 'Veteraan', geslacht: 'V', afstand: 25 },
      { voornaam: man(), naam: naam(), gilde_id: gId, type_boog: 'Recurve',  leeftijdscategorie: 'Veteraan', geslacht: 'M', afstand: 25 },
      { voornaam: vrouw(), naam: naam(), gilde_id: gId, type_boog: 'Barebow',  leeftijdscategorie: 'Senior',   geslacht: 'V', afstand: 25 },
      { voornaam: man(), naam: naam(), gilde_id: gId, type_boog: 'Compound', leeftijdscategorie: 'Senior',   geslacht: 'M', afstand: 25 },
      { voornaam: man(), naam: naam(), gilde_id: gId, type_boog: 'Recurve',  leeftijdscategorie: 'Jeugd',    geslacht: 'M', afstand: 18 },
      { voornaam: vrouw(), naam: naam(), gilde_id: gId, type_boog: 'Recurve',  leeftijdscategorie: 'Aspirant', geslacht: 'V', afstand: 25 },
    ]

    for (const gId of gildeIds) {
      for (const s of schuttersDef(gId)) {
        run('INSERT INTO schutters (voornaam, naam, gilde_id, type_boog, leeftijdscategorie, geslacht, afstand) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [s.voornaam, s.naam, s.gilde_id, s.type_boog, s.leeftijdscategorie, s.geslacht, s.afstand])
      }
    }
    // Extra schutter zodat totaal 100 is (11 × 9 = 99)
    run('INSERT INTO schutters (voornaam, naam, gilde_id, type_boog, leeftijdscategorie, geslacht, afstand) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [man(), naam(), gildeIds[0], 'Recurve', 'Junior', 'M', 25])
  })

  return { ok: true }
})

// ── Gilden ────────────────────────────────────────────────
ipcMain.handle('gilden:getAll', () =>
  queryAll('SELECT * FROM gilden ORDER BY naam')
)

// Geeft alleen gilden terug die minstens één schutter hebben — voor
// suggestie-lijsten waar verlaten gilden ruis zijn.
ipcMain.handle('gilden:getMetSchutters', () =>
  queryAll(`
    SELECT g.*
    FROM gilden g
    WHERE EXISTS (SELECT 1 FROM schutters s WHERE s.gilde_id = g.id)
    ORDER BY g.naam
  `)
)

ipcMain.handle('gilden:create', (_, naam: string) =>
  run('INSERT INTO gilden (naam) VALUES (?)', [naam])
)

// Verwijdert gilden zonder schutters; retourneert het aantal verwijderde rijen.
ipcMain.handle('gilden:deleteLege', () => {
  const result = run(`
    DELETE FROM gilden
    WHERE NOT EXISTS (SELECT 1 FROM schutters s WHERE s.gilde_id = gilden.id)
  `)
  return { verwijderd: result.changes }
})

// ── Schutters ─────────────────────────────────────────────
ipcMain.handle('schutters:getAll', () =>
  queryAll(`
    SELECT s.*, g.naam as gilde_naam
    FROM schutters s
    LEFT JOIN gilden g ON s.gilde_id = g.id
    ORDER BY s.naam, s.voornaam
  `)
)

ipcMain.handle('schutters:search', (_, query: string) =>
  queryAll(`
    SELECT s.*, g.naam as gilde_naam
    FROM schutters s
    LEFT JOIN gilden g ON s.gilde_id = g.id
    WHERE s.naam LIKE ? OR s.voornaam LIKE ? OR g.naam LIKE ?
    ORDER BY s.naam, s.voornaam
    LIMIT 50
  `, [`%${query}%`, `%${query}%`, `%${query}%`])
)

ipcMain.handle('schutters:create', (_, s) =>
  run(
    `INSERT INTO schutters (voornaam, naam, gilde_id, type_boog, leeftijdscategorie, geslacht, afstand)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [s.voornaam, s.naam, s.gilde_id, s.type_boog, s.leeftijdscategorie, s.geslacht, s.afstand]
  )
)

ipcMain.handle('schutters:update', (_, s) =>
  run(
    `UPDATE schutters SET voornaam=?, naam=?, gilde_id=?, type_boog=?,
     leeftijdscategorie=?, geslacht=?, afstand=? WHERE id=?`,
    [s.voornaam, s.naam, s.gilde_id, s.type_boog, s.leeftijdscategorie, s.geslacht, s.afstand, s.id]
  )
)

ipcMain.handle('schutters:delete', (_, id: number) => {
  // Met PRAGMA foreign_keys = ON faalt een directe DELETE zodra de schutter
  // ingeschreven of ingedeeld is. Eerst de afhankelijke rijen opruimen, alles
  // atomair in één transactie. vergrendelde_doelen heeft geen schutter_id en
  // blijft ongemoeid: vergrendeling is een configuratie-keuze, niet afgeleid
  // van bezetting.
  transaction(() => {
    run('DELETE FROM indeling WHERE schutter_id = ?', [id])
    run('DELETE FROM inschrijvingen WHERE schutter_id = ?', [id])
    run('DELETE FROM schutters WHERE id = ?', [id])
  })
  return { ok: true }
})

ipcMain.handle('schutters:deleteAll', () => {
  // Wipe alle schutters én afhankelijke records (inschrijvingen, indeling,
  // vergrendelde_doelen). Gilden en wedstrijden blijven bewaard — die hebben
  // hun eigen cleanup-acties.
  transaction(() => {
    run('DELETE FROM indeling')
    run('DELETE FROM vergrendelde_doelen')
    run('DELETE FROM inschrijvingen')
    run('DELETE FROM schutters')
  })
  return { ok: true }
})

// ── Wedstrijden ───────────────────────────────────────────
ipcMain.handle('wedstrijden:getAll', () =>
  queryAll('SELECT * FROM wedstrijden ORDER BY datum DESC')
)

ipcMain.handle('wedstrijden:getById', (_, id: number) =>
  queryOne('SELECT * FROM wedstrijden WHERE id = ?', [id])
)

ipcMain.handle('wedstrijden:create', (_, w) =>
  run(
    `INSERT INTO wedstrijden (naam, datum, locatie, aantal_doelen, aantal_doelen_18m, aantal_doelen_12m, compound_startdoel, aantal_compound_doelen)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [w.naam, w.datum, w.locatie, w.aantal_doelen, w.aantal_doelen_18m, w.aantal_doelen_12m, w.compound_startdoel, w.aantal_compound_doelen ?? 1]
  )
)

ipcMain.handle('wedstrijden:update', (_, w) =>
  run(
    `UPDATE wedstrijden SET naam=?, datum=?, locatie=?, aantal_doelen=?,
     aantal_doelen_18m=?, aantal_doelen_12m=?, compound_startdoel=?, aantal_compound_doelen=? WHERE id=?`,
    [w.naam, w.datum, w.locatie, w.aantal_doelen, w.aantal_doelen_18m, w.aantal_doelen_12m, w.compound_startdoel, w.aantal_compound_doelen ?? 1, w.id]
  )
)

ipcMain.handle('wedstrijden:delete', (_, id: number) =>
  transaction(() => {
    run('DELETE FROM vergrendelde_doelen WHERE wedstrijd_id = ?', [id])
    run('DELETE FROM indeling WHERE wedstrijd_id = ?', [id])
    run('DELETE FROM inschrijvingen WHERE wedstrijd_id = ?', [id])
    run('DELETE FROM wedstrijden WHERE id = ?', [id])
  })
)

// ── Wedstrijd backup (export/import) ──────────────────────
// JSON-formaat per wedstrijd, met de schutters van haar inschrijvingen erbij
// zodat het bestand zelfstandig importeerbaar is op een andere installatie.
// Het volledige bestandsformaat is gespecificeerd in internal-docs/BACKUP_FORMAT.md.
// Stabiel contract: top-level "type" en "schemaVersie" blijven, binnen één versie
// enkel additieve wijzigingen. Breaking change = bump van schemaVersie + behoud
// van de oude lezer. Update het document mee bij elke wijziging hier.

function bouwBackupPayload(id: number): BackupPayloadV1 {
  const wedstrijd = queryOne('SELECT * FROM wedstrijden WHERE id = ?', [id])
  if (!wedstrijd) throw new Error(`Wedstrijd ${id} bestaat niet`)

  const inschrijvingen = queryAll(
    `SELECT schutter_id, aanmeldvolgorde, dubbel_eerste_helft, dubbel_tweede_helft
     FROM inschrijvingen WHERE wedstrijd_id = ? ORDER BY aanmeldvolgorde`,
    [id]
  )
  const indeling = queryAll(
    `SELECT doel_nummer, schutter_id, positie
     FROM indeling WHERE wedstrijd_id = ? ORDER BY doel_nummer, positie`,
    [id]
  )
  const vergrendeldeDoelen = queryAll(
    'SELECT doel_nummer FROM vergrendelde_doelen WHERE wedstrijd_id = ?',
    [id]
  ).map((r: any) => r.doel_nummer)

  const schutterIds = Array.from(new Set(inschrijvingen.map((i: any) => i.schutter_id)))
  const schutters =
    schutterIds.length === 0
      ? []
      : queryAll(
          `SELECT s.id, s.voornaam, s.naam, s.type_boog, s.leeftijdscategorie,
                  s.geslacht, s.afstand, g.naam AS gilde_naam
           FROM schutters s
           LEFT JOIN gilden g ON s.gilde_id = g.id
           WHERE s.id IN (${schutterIds.map(() => '?').join(',')})`,
          schutterIds
        )

  return {
    type: 'ontarget-wedstrijd-backup',
    schemaVersie: 1,
    geexporteerdOp: new Date().toISOString(),
    wedstrijd: {
      naam: wedstrijd.naam,
      datum: wedstrijd.datum,
      locatie: wedstrijd.locatie,
      aantal_doelen: wedstrijd.aantal_doelen,
      aantal_doelen_18m: wedstrijd.aantal_doelen_18m,
      aantal_doelen_12m: wedstrijd.aantal_doelen_12m,
      compound_startdoel: wedstrijd.compound_startdoel,
      aantal_compound_doelen: wedstrijd.aantal_compound_doelen
    },
    schutters,
    inschrijvingen,
    indeling,
    vergrendeldeDoelen
  }
}

// Slug-versie voor bestandsnamen. Gedupliceerd in renderer (lib/wedstrijdBackup.ts)
// omdat main- en renderer-bundles niet rechtstreeks code delen. Houd beide
// implementaties in sync.
function slugifyVoorBestand(naam: string): string {
  const basis = naam
    .toLowerCase()
    .normalize('NFD')
    // eslint-disable-next-line no-misleading-character-class
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
  return basis || 'wedstrijd'
}

ipcMain.handle('wedstrijden:exportBackup', (_, id: number) => bouwBackupPayload(id))

// Bulk-export: opent één map-keuze-dialoog en schrijft één JSON per wedstrijd
// rechtstreeks weg met fs.writeFileSync. Vermijdt dat de gebruiker per bestand
// een opslag-dialoog moet bevestigen.
ipcMain.handle('wedstrijden:exportBackupBulk', async (event, ids: number[]) => {
  const win = BrowserWindow.fromWebContents(event.sender) ?? undefined
  const result = await dialog.showOpenDialog(win!, {
    title: 'Kies map voor backup-bestanden',
    properties: ['openDirectory', 'createDirectory'],
    buttonLabel: 'Opslaan in deze map'
  })
  if (result.canceled || result.filePaths.length === 0) {
    return { geannuleerd: true, opgeslagen: 0, map: null as string | null, fouten: [] as string[] }
  }
  const map = result.filePaths[0]
  let opgeslagen = 0
  const fouten: string[] = []
  for (const id of ids) {
    try {
      const payload = bouwBackupPayload(id)
      const slug = slugifyVoorBestand(payload.wedstrijd.naam)
      const bestandsnaam = `wedstrijd-${slug}-${payload.wedstrijd.datum}.json`
      writeFileSync(join(map, bestandsnaam), JSON.stringify(payload, null, 2))
      opgeslagen++
    } catch (e) {
      fouten.push(`Wedstrijd ${id}: ${(e as Error).message}`)
    }
  }
  return { geannuleerd: false, opgeslagen, map, fouten }
})

// Checkt of er een naam+datum-conflict is. Doet zelf geen wijzigingen.
// Valideert eerst type + schemaVersie zodat ongeldige bestanden hier al stuk
// gaan en niet pas in importApply (de UI's batch-catch toont de fout dan
// netjes per bestand). Zie internal-docs/BACKUP_FORMAT.md "Hoe lezers moeten
// omgaan met versie-mismatch".
ipcMain.handle('wedstrijden:importCheck', (_, payload: unknown) => {
  const p = valideerEnNormaliseer(payload)
  const bestaande = queryOne(
    'SELECT id, naam, datum FROM wedstrijden WHERE naam = ? AND datum = ?',
    [p.wedstrijd.naam, p.wedstrijd.datum]
  )
  return { conflict: bestaande ?? null }
})

// Importeert de backup-payload. actie bepaalt wat te doen bij naam+datum-conflict:
//   'vervang' = bestaande wedstrijd verwijderen (met inschrijvingen + indeling) en nieuwe aanmaken
//   'kopie'   = nieuwe wedstrijd aanmaken met '(kopie)'-suffix tot de naam vrij is
//   'geen'    = veronderstelt dat er geen conflict is; faalt bij conflict
ipcMain.handle('wedstrijden:importApply', (_, payload: unknown, actie: 'vervang' | 'kopie' | 'geen') => {
  const p = valideerEnNormaliseer(payload)
  const w = p.wedstrijd

  let aantalNieuweSchutters = 0
  let aantalNieuweGilden = 0
  let nieuweWedstrijdId = 0
  let nieuweNaam = String(w.naam)

  transaction(() => {
    // 1) Conflict afhandelen
    const conflict = queryOne(
      'SELECT id FROM wedstrijden WHERE naam = ? AND datum = ?',
      [w.naam, w.datum]
    )
    if (conflict) {
      if (actie === 'vervang') {
        run('DELETE FROM vergrendelde_doelen WHERE wedstrijd_id = ?', [conflict.id])
        run('DELETE FROM indeling WHERE wedstrijd_id = ?', [conflict.id])
        run('DELETE FROM inschrijvingen WHERE wedstrijd_id = ?', [conflict.id])
        run('DELETE FROM wedstrijden WHERE id = ?', [conflict.id])
      } else if (actie === 'kopie') {
        let n = 1
        let kandidaat = `${w.naam} (kopie)`
        while (queryOne('SELECT id FROM wedstrijden WHERE naam = ? AND datum = ?', [kandidaat, w.datum])) {
          n++
          kandidaat = `${w.naam} (kopie ${n})`
        }
        nieuweNaam = kandidaat
      } else {
        throw new Error('Wedstrijd met dezelfde naam en datum bestaat al')
      }
    }

    // 2) Schutters mappen: per backup-id -> id in deze DB
    //    Match op (voornaam, naam, gilde_naam) lowercase. Geen match = nieuw aanmaken.
    const schutterIdMap = new Map<number, number>()
    const gildeCache = new Map<string, number>()

    for (const s of p.schutters ?? []) {
      // Probeer bestaande schutter te vinden — match op (voornaam, naam, gilde) lowercase
      const bestaande = queryOne(
        `SELECT s.id FROM schutters s
         LEFT JOIN gilden g ON s.gilde_id = g.id
         WHERE LOWER(s.voornaam) = LOWER(?)
           AND LOWER(s.naam) = LOWER(?)
           AND LOWER(COALESCE(g.naam, '')) = LOWER(COALESCE(?, ''))`,
        [s.voornaam.trim(), s.naam.trim(), (s.gilde_naam ?? '').trim()]
      )

      if (bestaande) {
        schutterIdMap.set(s.id, bestaande.id)
        continue
      }

      // Gilde opzoeken of aanmaken
      let gildeId: number | null = null
      const gildeNaam = (s.gilde_naam ?? '').trim()
      if (gildeNaam) {
        const cacheKey = gildeNaam.toLowerCase()
        if (gildeCache.has(cacheKey)) {
          gildeId = gildeCache.get(cacheKey)!
        } else {
          const bestaandGilde = queryOne(
            'SELECT id FROM gilden WHERE LOWER(naam) = LOWER(?)',
            [gildeNaam]
          )
          if (bestaandGilde) {
            gildeId = bestaandGilde.id
          } else {
            const gres = run('INSERT INTO gilden (naam) VALUES (?)', [gildeNaam])
            gildeId = gres.lastInsertRowid
            aantalNieuweGilden++
          }
          gildeCache.set(cacheKey, gildeId!)
        }
      }

      const sres = run(
        `INSERT INTO schutters (voornaam, naam, gilde_id, type_boog, leeftijdscategorie, geslacht, afstand)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [s.voornaam.trim(), s.naam.trim(), gildeId, s.type_boog, s.leeftijdscategorie, s.geslacht, s.afstand]
      )
      schutterIdMap.set(s.id, sres.lastInsertRowid)
      aantalNieuweSchutters++
    }

    // 3) Wedstrijd aanmaken
    const wres = run(
      `INSERT INTO wedstrijden (naam, datum, locatie, aantal_doelen, aantal_doelen_18m, aantal_doelen_12m, compound_startdoel, aantal_compound_doelen)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        nieuweNaam,
        w.datum,
        w.locatie ?? null,
        w.aantal_doelen,
        w.aantal_doelen_18m,
        w.aantal_doelen_12m,
        w.compound_startdoel,
        w.aantal_compound_doelen ?? 1
      ]
    )
    nieuweWedstrijdId = wres.lastInsertRowid

    // 4) Inschrijvingen
    for (const i of p.inschrijvingen ?? []) {
      const nieuweSchutterId = schutterIdMap.get(i.schutter_id)
      if (!nieuweSchutterId) continue // schutter zat niet in payload.schutters, sla over
      run(
        `INSERT INTO inschrijvingen (wedstrijd_id, schutter_id, aanmeldvolgorde, dubbel_eerste_helft, dubbel_tweede_helft)
         VALUES (?, ?, ?, ?, ?)`,
        [nieuweWedstrijdId, nieuweSchutterId, i.aanmeldvolgorde, i.dubbel_eerste_helft, i.dubbel_tweede_helft]
      )
    }

    // 5) Indeling
    for (const r of p.indeling ?? []) {
      const nieuweSchutterId = schutterIdMap.get(r.schutter_id)
      if (!nieuweSchutterId) continue
      run(
        `INSERT INTO indeling (wedstrijd_id, doel_nummer, schutter_id, positie, vergrendeld)
         VALUES (?, ?, ?, ?, 0)`,
        [nieuweWedstrijdId, r.doel_nummer, nieuweSchutterId, r.positie]
      )
    }

    // 6) Vergrendelde doelen
    for (const doelNr of p.vergrendeldeDoelen ?? []) {
      run(
        'INSERT OR IGNORE INTO vergrendelde_doelen (wedstrijd_id, doel_nummer) VALUES (?, ?)',
        [nieuweWedstrijdId, doelNr]
      )
    }
  })

  return {
    ok: true,
    wedstrijdId: nieuweWedstrijdId,
    naam: nieuweNaam,
    nieuweSchutters: aantalNieuweSchutters,
    nieuweGilden: aantalNieuweGilden
  }
})

// ── Inschrijvingen ────────────────────────────────────────
ipcMain.handle('inschrijvingen:getByWedstrijd', (_, wedstrijd_id: number) =>
  queryAll(`
    SELECT i.*, s.voornaam, s.naam, s.type_boog, s.afstand, s.leeftijdscategorie, s.geslacht,
           g.naam as gilde_naam
    FROM inschrijvingen i
    JOIN schutters s ON i.schutter_id = s.id
    LEFT JOIN gilden g ON s.gilde_id = g.id
    WHERE i.wedstrijd_id = ?
    ORDER BY i.aanmeldvolgorde
  `, [wedstrijd_id])
)

ipcMain.handle('inschrijvingen:create', (_, i) => {
  // Aanmeldvolgorde wordt hier in de transactie bepaald (niet door de renderer)
  // zodat twee snelle clicks geen identieke volgorde meer kunnen claimen.
  let result: { lastInsertRowid: number; changes: number; aanmeldvolgorde: number } = {
    lastInsertRowid: 0,
    changes: 0,
    aanmeldvolgorde: 0
  }
  transaction(() => {
    const row = queryOne(
      'SELECT COALESCE(MAX(aanmeldvolgorde), 0) + 1 AS volgende FROM inschrijvingen WHERE wedstrijd_id = ?',
      [i.wedstrijd_id]
    )
    const aanmeldvolgorde: number = row?.volgende ?? 1
    const r = run(
      `INSERT INTO inschrijvingen (wedstrijd_id, schutter_id, aanmeldvolgorde, dubbel_eerste_helft, dubbel_tweede_helft)
       VALUES (?, ?, ?, ?, ?)`,
      [i.wedstrijd_id, i.schutter_id, aanmeldvolgorde, i.dubbel_eerste_helft, i.dubbel_tweede_helft]
    )
    result = { lastInsertRowid: r.lastInsertRowid, changes: r.changes, aanmeldvolgorde }
  })
  return result
})

ipcMain.handle('inschrijvingen:update', (_, i) =>
  run(
    `UPDATE inschrijvingen SET aanmeldvolgorde=?, dubbel_eerste_helft=?, dubbel_tweede_helft=? WHERE id=?`,
    [i.aanmeldvolgorde, i.dubbel_eerste_helft, i.dubbel_tweede_helft, i.id]
  )
)

ipcMain.handle('inschrijvingen:delete', (_, id: number) =>
  run('DELETE FROM inschrijvingen WHERE id = ?', [id])
)

ipcMain.handle('inschrijvingen:reorder', (_, wedstrijd_id: number, volgorde: number[]) => {
  transaction(() => {
    volgorde.forEach((id, index) =>
      run('UPDATE inschrijvingen SET aanmeldvolgorde=? WHERE id=? AND wedstrijd_id=?', [index + 1, id, wedstrijd_id])
    )
  })
})

// ── Indeling ──────────────────────────────────────────────
ipcMain.handle('indeling:getByWedstrijd', (_, wedstrijd_id: number) =>
  queryAll(`
    SELECT i.*, s.voornaam, s.naam, s.type_boog, s.afstand, s.leeftijdscategorie, s.geslacht,
           g.naam as gilde_naam, insch.dubbel_eerste_helft, insch.dubbel_tweede_helft
    FROM indeling i
    JOIN schutters s ON i.schutter_id = s.id
    LEFT JOIN gilden g ON s.gilde_id = g.id
    LEFT JOIN inschrijvingen insch ON insch.schutter_id = s.id AND insch.wedstrijd_id = i.wedstrijd_id
    WHERE i.wedstrijd_id = ?
    ORDER BY i.doel_nummer, i.positie
  `, [wedstrijd_id])
)

ipcMain.handle('indeling:save', (_, wedstrijd_id: number, rijen: any[]) => {
  transaction(() => {
    // Verwijder alle rijen voor deze wedstrijd — lock-state leeft in vergrendelde_doelen.
    // React-state stuurt vergrendelde schutters telkens mee, dus volledig wissen + opnieuw
    // wegschrijven is veilig en voorkomt stale rijen.
    run('DELETE FROM indeling WHERE wedstrijd_id=?', [wedstrijd_id])
    for (const rij of rijen) {
      run(
        `INSERT INTO indeling (wedstrijd_id, doel_nummer, schutter_id, positie, vergrendeld)
         VALUES (?, ?, ?, ?, 0)`,
        [wedstrijd_id, rij.doel_nummer, rij.schutter_id, rij.positie]
      )
    }
  })
})

ipcMain.handle('indeling:toggleDoelVergrendeld', (_, wedstrijd_id: number, doel_nummer: number, vergrendeld: boolean) => {
  if (vergrendeld) {
    run('INSERT OR IGNORE INTO vergrendelde_doelen (wedstrijd_id, doel_nummer) VALUES (?, ?)', [wedstrijd_id, doel_nummer])
  } else {
    run('DELETE FROM vergrendelde_doelen WHERE wedstrijd_id=? AND doel_nummer=?', [wedstrijd_id, doel_nummer])
  }
})

ipcMain.handle('indeling:getVergrendeldeDoelen', (_, wedstrijd_id: number) =>
  queryAll('SELECT doel_nummer FROM vergrendelde_doelen WHERE wedstrijd_id=?', [wedstrijd_id])
    .map((r) => r.doel_nummer)
)

// Bouwt een opgemaakt .xlsx-werkboek uit het meegestuurde Excel-model en opent
// het in de standaard-app voor .xlsx (doorgaans MS Excel). Het model is in de
// renderer opgebouwd uit exact dezelfde rijen/kolommen als de afdruk-preview
// (zie afdruk-helpers.ts → bouwExcelModel). Schrijft naar een tijdelijk bestand
// zodat de gebruiker van daaruit in Excel kan afdrukken of "Opslaan als".
ipcMain.handle('indeling:openInExcel', async (_, model: ExcelModel) => {
  try {
    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('Indeling')
    const aantalKolommen = model.kolommen.length
    ws.columns = model.kolommen.map((k) => ({ width: k.breedte }))

    // Titel + subtitel over de volledige breedte.
    const titelRij = ws.addRow([model.titel])
    ws.mergeCells(titelRij.number, 1, titelRij.number, aantalKolommen)
    titelRij.getCell(1).font = { bold: true, size: 14 }

    const subRij = ws.addRow([model.subtitel])
    ws.mergeCells(subRij.number, 1, subRij.number, aantalKolommen)
    subRij.getCell(1).font = { color: { argb: 'FF555555' } }

    ws.addRow([])

    // Kolomkoppen: vet, lichte vulling, dunne onderrand.
    const kopRij = ws.addRow(model.kolommen.map((k) => k.kop))
    kopRij.eachCell((cel) => {
      cel.font = { bold: true }
      cel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } }
      cel.border = { bottom: { style: 'thin', color: { argb: 'FFBFBFBF' } } }
    })
    // Koprij bevriezen zodat hij bij scrollen zichtbaar blijft.
    ws.views = [{ state: 'frozen', ySplit: kopRij.number }]

    for (const rij of model.rijen) {
      if (rij.soort === 'groepkop') {
        const r = ws.addRow([rij.tekst])
        ws.mergeCells(r.number, 1, r.number, aantalKolommen)
        r.getCell(1).font = { bold: true }
        r.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF7F7F7' } }
      } else {
        ws.addRow(rij.cellen)
      }
    }

    if (model.totalen.length > 0) {
      ws.addRow([])
      ws.addRow(['Totalen']).getCell(1).font = { bold: true }
      for (const regel of model.totalen) ws.addRow([regel])
    }

    if (model.waarschuwingen.length > 0) {
      ws.addRow([])
      ws.addRow(['Aandachtspunten']).getCell(1).font = { bold: true }
      for (const regel of model.waarschuwingen) ws.addRow([regel])
    }

    const slug = slugifyVoorBestand(model.titel)
    const bestand = join(app.getPath('temp'), `indeling-${slug}-${model.datum}-${Date.now()}.xlsx`)
    await wb.xlsx.writeFile(bestand)

    // Alleen-lezen maken: Excel opent het bestand als "Alleen-lezen", zodat de
    // gebruiker eerst "Opslaan als" moet doen om in een eigen kopie te werken.
    // Op Windows zet een chmod zonder schrijfbit het read-only-attribuut.
    chmodSync(bestand, 0o444)

    const fout = await shell.openPath(bestand)
    if (fout) return { ok: false, fout }
    return { ok: true, bestand }
  } catch (e) {
    return { ok: false, fout: (e as Error).message }
  }
})
