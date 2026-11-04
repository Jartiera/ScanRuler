// Offline desktop wrapper: serves the built site (app/) from a private
// app:// origin so module workers, WebAssembly and fetch() behave exactly
// as they do on https://scanruler.com.
const { app, BrowserWindow, protocol, net, shell } = require('electron')
const path = require('node:path')
const fs = require('node:fs')
const { pathToFileURL } = require('node:url')

const ROOT = path.join(__dirname, 'app')

protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, corsEnabled: true } },
])

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    title: 'ScanRuler',
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, sandbox: true },
  })
  // Links to other sites open in the normal browser, not inside the app.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith('app://')) shell.openExternal(url)
    return { action: 'deny' }
  })
  win.loadURL('app://scanruler/')
}

app.whenReady().then(() => {
  protocol.handle('app', (request) => {
    const { pathname } = new URL(request.url)
    let file = path.normalize(path.join(ROOT, decodeURIComponent(pathname)))
    if (!file.startsWith(ROOT)) return new Response('Forbidden', { status: 403 })
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(ROOT, 'index.html')
    return net.fetch(pathToFileURL(file).toString())
  })
  createWindow()
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
})

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
