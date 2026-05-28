export {}

declare global {
  interface Window {
    api: {
      gilden: {
        getAll: () => Promise<any[]>
        getMetSchutters: () => Promise<any[]>
        create: (naam: string) => Promise<any>
        deleteLege: () => Promise<{ verwijderd: number }>
      }
      schutters: {
        getAll: () => Promise<any[]>
        search: (query: string) => Promise<any[]>
        create: (schutter: object) => Promise<any>
        update: (schutter: object) => Promise<any>
        delete: (id: number) => Promise<any>
        deleteAll: () => Promise<{ ok: boolean }>
      }
      wedstrijden: {
        getAll: () => Promise<any[]>
        getById: (id: number) => Promise<any>
        create: (wedstrijd: object) => Promise<any>
        update: (wedstrijd: object) => Promise<any>
        delete: (id: number) => Promise<any>
        exportBackup: (id: number) => Promise<any>
        exportBackupBulk: (ids: number[]) => Promise<{
          geannuleerd: boolean
          opgeslagen: number
          map: string | null
          fouten: string[]
        }>
        importCheck: (payload: object) => Promise<{ conflict: { id: number; naam: string; datum: string } | null }>
        importApply: (
          payload: object,
          actie: 'vervang' | 'kopie' | 'geen'
        ) => Promise<{
          ok: boolean
          wedstrijdId: number
          naam: string
          nieuweSchutters: number
          nieuweGilden: number
        }>
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
        toggleDoelVergrendeld: (wedstrijd_id: number, doel_nummer: number, vergrendeld: boolean) => Promise<void>
        getVergrendeldeDoelen: (wedstrijd_id: number) => Promise<number[]>
      }
    }
  }
}
