export interface Gilde {
  id: number
  naam: string
}

export interface Schutter {
  id: number
  voornaam: string
  naam: string
  gilde_id: number | null
  gilde_naam: string | null
  type_boog: 'Recurve' | 'Compound' | 'Barebow' | 'Andere'
  leeftijdscategorie: 'Aspirant' | 'Jeugd' | 'Junior' | 'Senior' | 'Veteraan'
  geslacht: 'M' | 'V'
  afstand: 12 | 18 | 25
}

export interface SchutterFormData {
  voornaam: string
  naam: string
  gilde_id: number | null
  gilde_naam_nieuw: string
  type_boog: Schutter['type_boog']
  leeftijdscategorie: Schutter['leeftijdscategorie']
  geslacht: Schutter['geslacht']
  afstand: Schutter['afstand']
}

export interface Wedstrijd {
  id: number
  naam: string
  datum: string
  locatie: string | null
  aantal_doelen: number
  aantal_doelen_18m: number
  aantal_doelen_12m: number
  compound_startdoel: number
  aantal_compound_doelen: number
  aangemaakt_op: string
}

export interface Inschrijving {
  id: number
  wedstrijd_id: number
  schutter_id: number
  voornaam: string
  naam: string
  gilde_naam: string | null
  type_boog: Schutter['type_boog']
  afstand: Schutter['afstand']
  leeftijdscategorie: Schutter['leeftijdscategorie']
  geslacht: Schutter['geslacht']
  aanmeldvolgorde: number
  dubbel_eerste_helft: 0 | 1
  dubbel_tweede_helft: 0 | 1
}

export interface Indelingsrij {
  id: number
  wedstrijd_id: number
  doel_nummer: number
  schutter_id: number
  voornaam: string
  naam: string
  gilde_naam: string | null
  type_boog: Schutter['type_boog']
  afstand: Schutter['afstand']
  positie: number
  vergrendeld: 0 | 1
  dubbel_eerste_helft: 0 | 1
  dubbel_tweede_helft: 0 | 1
}
