import { ipcMain } from 'electron'
import { queryAll, queryOne, run, transaction } from './database'

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
      { voornaam: vrouw(), naam: naam(), gilde_id: gId, type_boog: 'Recurve',  leeftijdscategorie: 'Aspirant', geslacht: 'V', afstand: 12 },
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

ipcMain.handle('gilden:create', (_, naam: string) =>
  run('INSERT INTO gilden (naam) VALUES (?)', [naam])
)

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

ipcMain.handle('schutters:delete', (_, id: number) =>
  run('DELETE FROM schutters WHERE id = ?', [id])
)

ipcMain.handle('schutters:deleteAll', () => {
  // Wipe alle schutters én afhankelijke records (inschrijvingen, indeling,
  // vergrendelde_doelen) plus gilden zodat de database in een volledig schone
  // staat blijft. Wedstrijden zelf blijven bestaan.
  transaction(() => {
    run('DELETE FROM indeling')
    run('DELETE FROM vergrendelde_doelen')
    run('DELETE FROM inschrijvingen')
    run('DELETE FROM schutters')
    run('DELETE FROM gilden')
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

ipcMain.handle('inschrijvingen:create', (_, i) =>
  run(
    `INSERT INTO inschrijvingen (wedstrijd_id, schutter_id, aanmeldvolgorde, dubbel_eerste_helft, dubbel_tweede_helft)
     VALUES (?, ?, ?, ?, ?)`,
    [i.wedstrijd_id, i.schutter_id, i.aanmeldvolgorde, i.dubbel_eerste_helft, i.dubbel_tweede_helft]
  )
)

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
    // Verwijder niet-vergrendelde rijen
    run('DELETE FROM indeling WHERE wedstrijd_id=? AND vergrendeld=0', [wedstrijd_id])
    // Voeg nieuwe rijen in
    for (const rij of rijen) {
      run(
        `INSERT OR REPLACE INTO indeling (wedstrijd_id, doel_nummer, schutter_id, positie, vergrendeld)
         VALUES (?, ?, ?, ?, ?)`,
        [wedstrijd_id, rij.doel_nummer, rij.schutter_id, rij.positie, rij.vergrendeld ? 1 : 0]
      )
    }
  })
})

ipcMain.handle('indeling:toggleVergrendeld', (_, id: number, vergrendeld: boolean) =>
  run('UPDATE indeling SET vergrendeld=? WHERE id=?', [vergrendeld ? 1 : 0, id])
)

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
