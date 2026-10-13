import { app, BrowserWindow, shell } from 'electron'
import { join } from 'node:path'
import { existsSync } from 'node:fs'
import { registerIpcHandlers, initDataDirs } from './ipc.js'

// Only present in dev (not bundled into the packaged app) — the packaged app gets its icon
// from the .icns baked into the bundle via Info.plist instead.
const DEV_ICON_PATH = join(app.getAppPath(), 'build/icon.png')

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 960,
    show: true,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 8 },
    backgroundColor: '#F3ECDF',
    icon: existsSync(DEV_ICON_PATH) ? DEV_ICON_PATH : undefined,
    webPreferences: {
      preload: join(app.getAppPath(), 'out/preload/index.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  win.webContents.on('did-fail-load', (_e, code, desc, url) => {
    console.error('did-fail-load', code, desc, url)
  })
  win.webContents.on('preload-error', (_e, path, error) => {
    console.error('preload-error', path, error)
  })

  win.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    win.loadFile(join(app.getAppPath(), 'out/renderer/index.html'))
  }
}

app.whenReady().then(async () => {
  if (process.platform === 'darwin' && existsSync(DEV_ICON_PATH)) {
    app.dock?.setIcon(DEV_ICON_PATH)
  }
  await initDataDirs()
  registerIpcHandlers()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
