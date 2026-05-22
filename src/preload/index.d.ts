export {}

declare global {
  interface Window {
    api: {
      gilden: {
        getAll: () => Promise<any[]>
        create: (naam: string) => Promise<any>
      }
      schutters: {
        getAll: () => Promise<any[]>
        search: (query: string) => Promise<any[]>
        create: (schutter: object) => Promise<any>
        update: (schutter: object) => Promise<any>
        delete: (id: number) => Promise<any>
      }
      wedstrijden: {
        getAll: () => Promise<any[]>
        getById: (id: number) => Promise<any>
        create: (wedstrijd: object) => Promise<any>
        update: (wedstrijd: object) => Promise<any>
        delete: (id: number) => Promise<any>
      }
      inschrijvingen: {
        getByWedstrijd: (wedstrijd_id: number) => Promise<any[]>
        create: (inschrijving: object) => Promise<any>
        update: (inschrijving: object) => Promise<any>
        delete: (id: number) => Promise<any>
        reorder: (wedstrijd_id: number, volgorde: number[]) => Promise<void>
      }
      demo: {
        laad: () => Promise<{ ok: boolean }>
      }
      indeling: {
        getByWedstrijd: (wedstrijd_id: number) => Promise<any[]>
        save: (wedstrijd_id: number, indeling: object[]) => Promise<void>
        toggleVergrendeld: (id: number, vergrendeld: boolean) => Promise<any>
        toggleDoelVergrendeld: (wedstrijd_id: number, doel_nummer: number, vergrendeld: boolean) => Promise<void>
        getVergrendeldeDoelen: (wedstrijd_id: number) => Promise<number[]>
      }
    }
  }
}
