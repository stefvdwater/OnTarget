import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  // App
  app: {
    getVersion: () => ipcRenderer.invoke('app:getVersion')
  },

  // Gilden
  gilden: {
    getAll: () => ipcRenderer.invoke('gilden:getAll'),
    getMetSchutters: () => ipcRenderer.invoke('gilden:getMetSchutters'),
    create: (naam: string) => ipcRenderer.invoke('gilden:create', naam),
    deleteLege: () => ipcRenderer.invoke('gilden:deleteLege')
  },

  // Schutters
  schutters: {
    getAll: () => ipcRenderer.invoke('schutters:getAll'),
    search: (query: string) => ipcRenderer.invoke('schutters:search', query),
    create: (schutter: object) => ipcRenderer.invoke('schutters:create', schutter),
    update: (schutter: object) => ipcRenderer.invoke('schutters:update', schutter),
    delete: (id: number) => ipcRenderer.invoke('schutters:delete', id),
    deleteAll: () => ipcRenderer.invoke('schutters:deleteAll')
  },

  // Wedstrijden
  wedstrijden: {
    getAll: () => ipcRenderer.invoke('wedstrijden:getAll'),
    getById: (id: number) => ipcRenderer.invoke('wedstrijden:getById', id),
    create: (wedstrijd: object) => ipcRenderer.invoke('wedstrijden:create', wedstrijd),
    update: (wedstrijd: object) => ipcRenderer.invoke('wedstrijden:update', wedstrijd),
    delete: (id: number) => ipcRenderer.invoke('wedstrijden:delete', id)
  },

  // Inschrijvingen
  inschrijvingen: {
    getByWedstrijd: (wedstrijd_id: number) =>
      ipcRenderer.invoke('inschrijvingen:getByWedstrijd', wedstrijd_id),
    create: (inschrijving: object) => ipcRenderer.invoke('inschrijvingen:create', inschrijving),
    update: (inschrijving: object) => ipcRenderer.invoke('inschrijvingen:update', inschrijving),
    delete: (id: number) => ipcRenderer.invoke('inschrijvingen:delete', id),
    reorder: (wedstrijd_id: number, volgorde: number[]) =>
      ipcRenderer.invoke('inschrijvingen:reorder', wedstrijd_id, volgorde)
  },

  // Demo
  demo: {
    laad: () => ipcRenderer.invoke('demo:laad')
  },

  // Indeling
  indeling: {
    getByWedstrijd: (wedstrijd_id: number) =>
      ipcRenderer.invoke('indeling:getByWedstrijd', wedstrijd_id),
    save: (wedstrijd_id: number, indeling: object[]) =>
      ipcRenderer.invoke('indeling:save', wedstrijd_id, indeling),
    toggleDoelVergrendeld: (wedstrijd_id: number, doel_nummer: number, vergrendeld: boolean) =>
      ipcRenderer.invoke('indeling:toggleDoelVergrendeld', wedstrijd_id, doel_nummer, vergrendeld),
    getVergrendeldeDoelen: (wedstrijd_id: number) =>
      ipcRenderer.invoke('indeling:getVergrendeldeDoelen', wedstrijd_id)
  }
})
