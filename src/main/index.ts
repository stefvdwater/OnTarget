import { app, shell, BrowserWindow } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { initDatabase, flushDatabaseSync } from './database'
import { ruimExcelTempBestandenOp } from './ipc'
import icon from '../../resources/icon.ico?asset'

// Bouwt het hoofdvenster, koppelt het preload-script en laadt de renderer (dev-URL of gebouwde index.html).
function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    show: false,
    autoHideMenuBar: true,
    icon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(async () => {
  electronApp.setAppUserModelId('com.ontarget')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  await initDatabase()
  // Tijdelijke Excel-exports van vorige sessies opruimen.
  ruimExcelTempBestandenOp()
  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Synchroon de pending DB-save flushen voor het proces eindigt. Zonder dit
// kan een schrijfactie verloren gaan als de gebruiker binnen 500ms (debounce
// in scheduleSave) na een wijziging afsluit.
app.on('before-quit', () => {
  try {
    flushDatabaseSync()
  } catch (err) {
    console.error('Flush bij quit faalde:', err)
  }
})
