import type { Conflict, Doel, DoelMetConflicten } from './types'

export function detecteerConflicten(doel: Doel): Conflict[] {
  const conflicten: Conflict[] = []
  const s = doel.schutters

  if (s.length === 0) return []

  // Aantal gilden
  const gilden = new Set(s.map((x) => x.gilde_naam ?? '__geen__'))
  if (s.length > 1 && gilden.size < 2) {
    conflicten.push({
      bericht: 'Alle schutters op dit doel komen van hetzelfde gilde.'
    })
  }

  const beurtenEerste = berekenBeurten(s, 'eerste')
  const beurtenTweede = berekenBeurten(s, 'tweede')

  const teveel1 = beurtenEerste > 6
  const teveel2 = beurtenTweede > 6
  const teweinig1 = beurtenEerste > 0 && beurtenEerste < 4
  const teweinig2 = beurtenTweede > 0 && beurtenTweede < 4

  if (teveel1 && teveel2) {
    const aantal = beurtenEerste === beurtenTweede ? `${beurtenEerste}` : `${beurtenEerste} / ${beurtenTweede}`
    conflicten.push({ bericht: `Te veel beurten (${aantal}).` })
  } else if (teveel1) {
    conflicten.push({ bericht: `Te veel beurten in de eerste helft (${beurtenEerste}).` })
  } else if (teveel2) {
    conflicten.push({ bericht: `Te veel beurten in de tweede helft (${beurtenTweede}).` })
  }

  if (teweinig1 && teweinig2) {
    const aantal = beurtenEerste === beurtenTweede ? `${beurtenEerste}` : `${beurtenEerste} / ${beurtenTweede}`
    conflicten.push({ bericht: `Te weinig beurten (${aantal}).` })
  } else if (teweinig1) {
    conflicten.push({ bericht: `Te weinig beurten in de eerste helft (${beurtenEerste}).` })
  } else if (teweinig2) {
    conflicten.push({ bericht: `Te weinig beurten in de tweede helft (${beurtenTweede}).` })
  }

  // Verwachte afstand voor deze zone
  const verwachteAfstand: Record<string, number> = { '25m': 25, compound: 25, '18m': 18, '12m': 12 }
  const verwacht = verwachteAfstand[doel.zone]
  if (verwacht !== undefined) {
    s.forEach((x) => {
      if (x.afstand !== verwacht) {
        conflicten.push({
          bericht: `${x.voornaam} ${x.naam} schiet op ${x.afstand}m maar staat op een ${doel.zone}-doel (${verwacht}m).`
        })
      }
    })
  }

  // Boogtype-controle op compound doel
  if (doel.zone === 'compound') {
    const niet_compound = s.filter((x) => x.type_boog !== 'Compound')
    niet_compound.forEach((c) => {
      conflicten.push({
        bericht: `${c.voornaam} ${c.naam} heeft een ${c.type_boog}-boog maar staat op een compound doel.`
      })
    })
  } else {
    // Compound schutter op niet-compound doel
    const compounders = s.filter((x) => x.type_boog === 'Compound')
    compounders.forEach((c) => {
      conflicten.push({
        bericht: `${c.voornaam} ${c.naam} is een compound schutter op een niet-compound doel.`
      })
    })
  }

  // Overflow
  if (s.length > 6) {
    conflicten.push({
      bericht: `Er zijn meer schutters ingeschreven dan de doelen aankunnen. Overweeg extra doelen toe te voegen.`
    })
  }

  // Dubbelschutter niet vooraan
  const dubbelaars = s.filter((x) => x.dubbel_eerste_helft || x.dubbel_tweede_helft)
  if (dubbelaars.length > 0) {
    const eerstePositie = Math.min(...s.map((x) => x.positie))
    const eersteIsdubbel = s.find((x) => x.positie === eerstePositie)
    if (eersteIsdubbel && !eersteIsdubbel.dubbel_eerste_helft && !eersteIsdubbel.dubbel_tweede_helft) {
      conflicten.push({
        bericht: 'Een dubbelschutter staat niet op de eerste positie.'
      })
    }
  }

  return conflicten
}

function berekenBeurten(schutters: Doel['schutters'], helft: 'eerste' | 'tweede'): number {
  return schutters.reduce((som, s) => {
    const dubbel =
      helft === 'eerste' ? s.dubbel_eerste_helft : s.dubbel_tweede_helft
    const aanwezig =
      helft === 'eerste'
        ? !s.dubbel_tweede_helft || s.dubbel_eerste_helft // aanwezig in eerste helft tenzij enkel TH
        : !s.dubbel_eerste_helft || s.dubbel_tweede_helft // aanwezig in tweede helft tenzij enkel EH
    if (!aanwezig) return som
    return som + (dubbel ? 2 : 1)
  }, 0)
}

export function voegConflictenToe(doelen: Doel[]): DoelMetConflicten[] {
  return doelen.map((d) => ({ ...d, conflicten: detecteerConflicten(d) }))
}
