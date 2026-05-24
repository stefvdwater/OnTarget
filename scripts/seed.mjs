/**
 * Seed-script: vult de database met ~100 dummy schutters verdeeld over 11 gilden.
 * Per gilde: 6 normale (25m), 1 compound (25m), 2 jeugd (korte afstand).
 *
 * Zorg dat de app NIET actief is voor je dit uitvoert!
 * Gebruik: node scripts/seed.mjs
 */

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'
import initSqlJs from 'sql.js'

const dbPath = join(process.env.APPDATA, 'target-assignment', 'doelindeling.db')

if (!existsSync(dbPath)) {
  console.error('❌ Database niet gevonden op:', dbPath)
  console.error('   Start de app eerst zodat de database aangemaakt wordt.')
  process.exit(1)
}

const SQL = await initSqlJs()
const buf = readFileSync(dbPath)
const db = new SQL.Database(buf)

// ── Gilden ────────────────────────────────────────────────

const gilden = [
  'Gilde De Gulden Pijl',
  'Schuttersgilde Sint-Sebastiaan',
  'Gilde De Vlaamse Boog',
  'Koninklijk Gilde De Notelaer',
  'Gilde De Zilveren Pijl',
  'Schuttersgilde De Kempen',
  'Gilde Het Gouden Doel',
  'Schuttersgilde De Vrijschutters',
  'Gilde De Blauwe Valk',
  'Koninklijk Gilde Sint-Joris',
  'Gilde De Rode Roos',
]

// ── Namenpool ─────────────────────────────────────────────

const mannen = [
  'Jan', 'Pieter', 'Luc', 'Marc', 'Tom', 'Koen', 'Steven', 'Frank',
  'Joris', 'Bruno', 'Wim', 'Erik', 'Dirk', 'Rik', 'Bart', 'Sven',
  'Niels', 'Jonas', 'Ruben', 'Bram', 'Mathias', 'Stef', 'Kevin', 'Dave',
]
const vrouwen = [
  'Marie', 'An', 'Els', 'Sofie', 'Lien', 'Nathalie', 'Karen', 'Lisa',
  'Sara', 'Inge', 'Hilde', 'Griet', 'Eva', 'Emma', 'Noor', 'Fien',
  'Lies', 'Axelle', 'Julie', 'Laura', 'Charlotte', 'Amber', 'Elien', 'Inne',
]
const namen = [
  'Janssen', 'Peeters', 'Claes', 'Smeets', 'Willems', 'Martens',
  'Van den Berg', 'De Smedt', 'Hermans', 'Bogaert', 'Thijs', 'Vermeersch',
  'Nijs', 'Wouters', 'Aerts', 'Puts', 'Michiels', 'Stevens',
  'Leclercq', 'Dubois', 'Jacobs', 'Goossens', 'De Wolf', 'Maes',
  'Van Acker', 'Mertens', 'Desmet', 'Vandenberghe', 'Declercq', 'Baert',
]

// Simpele teller voor unieke namen
let mIdx = 0
let vIdx = 0
let nIdx = 0

function man() { return mannen[mIdx++ % mannen.length] }
function vrouw() { return vrouwen[vIdx++ % vrouwen.length] }
function naam() { return namen[nIdx++ % namen.length] }

// ── Schutter-definities per gilde ────────────────────────
// Elk gilde krijgt: 6 normaal (25m), 1 compound (25m), 2 jeugd (12m/18m)

function schuttersVoorGilde(gildeId) {
  return [
    // Normaal 25m – mix van boogtypen, geslacht en categorie
    { voornaam: man(),   naam: naam(), gilde_id: gildeId, type_boog: 'Recurve',  leeftijdscategorie: 'Senior',   geslacht: 'M', afstand: 25 },
    { voornaam: vrouw(), naam: naam(), gilde_id: gildeId, type_boog: 'Recurve',  leeftijdscategorie: 'Senior',   geslacht: 'V', afstand: 25 },
    { voornaam: man(),   naam: naam(), gilde_id: gildeId, type_boog: 'Barebow',  leeftijdscategorie: 'Senior',   geslacht: 'M', afstand: 25 },
    { voornaam: vrouw(), naam: naam(), gilde_id: gildeId, type_boog: 'Recurve',  leeftijdscategorie: 'Veteraan', geslacht: 'V', afstand: 25 },
    { voornaam: man(),   naam: naam(), gilde_id: gildeId, type_boog: 'Recurve',  leeftijdscategorie: 'Veteraan', geslacht: 'M', afstand: 25 },
    { voornaam: vrouw(), naam: naam(), gilde_id: gildeId, type_boog: 'Barebow',  leeftijdscategorie: 'Senior',   geslacht: 'V', afstand: 25 },
    // Compound 25m
    { voornaam: man(),   naam: naam(), gilde_id: gildeId, type_boog: 'Compound', leeftijdscategorie: 'Senior',   geslacht: 'M', afstand: 25 },
    // Jeugd korte afstand
    { voornaam: man(),   naam: naam(), gilde_id: gildeId, type_boog: 'Recurve',  leeftijdscategorie: 'Jeugd',    geslacht: 'M', afstand: 18 },
    { voornaam: vrouw(), naam: naam(), gilde_id: gildeId, type_boog: 'Recurve',  leeftijdscategorie: 'Aspirant', geslacht: 'V', afstand: 25 },
  ]
}

// ── Schrijf naar DB ───────────────────────────────────────

db.run('BEGIN')

try {
  // Verwijder bestaande testdata als gewenst (optioneel)
  // db.run('DELETE FROM schutters')
  // db.run('DELETE FROM gilden')

  const gildeIds = []
  for (const gildeNaam of gilden) {
    // Voeg gilde in (negeer als het al bestaat)
    db.run('INSERT OR IGNORE INTO gilden (naam) VALUES (?)', [gildeNaam])
    const rij = db.exec('SELECT id FROM gilden WHERE naam = ?', [gildeNaam])
    gildeIds.push(rij[0].values[0][0])
  }

  let aantalIngevoegd = 0
  for (const gildeId of gildeIds) {
    for (const s of schuttersVoorGilde(gildeId)) {
      db.run(
        `INSERT INTO schutters (voornaam, naam, gilde_id, type_boog, leeftijdscategorie, geslacht, afstand)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [s.voornaam, s.naam, s.gilde_id, s.type_boog, s.leeftijdscategorie, s.geslacht, s.afstand]
      )
      aantalIngevoegd++
    }
  }

  // Extra schutter om op 100 te komen (11 × 9 = 99)
  db.run(
    `INSERT INTO schutters (voornaam, naam, gilde_id, type_boog, leeftijdscategorie, geslacht, afstand)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [man(), naam(), gildeIds[0], 'Recurve', 'Junior', 'M', 25]
  )
  aantalIngevoegd++

  db.run('COMMIT')

  const data = db.export()
  writeFileSync(dbPath, Buffer.from(data))

  console.log(`✅ ${aantalIngevoegd} schutters toegevoegd aan ${gilden.length} gilden.`)
  console.log(`   Database opgeslagen: ${dbPath}`)
} catch (e) {
  db.run('ROLLBACK')
  console.error('❌ Fout:', e.message)
  process.exit(1)
}
