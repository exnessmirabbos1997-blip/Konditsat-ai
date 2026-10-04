// Quritgich aparat AI — Windows uchun ish stoli dasturi (Electron). Sahifaning o'zi o'zgarishsiz yuklanadi (index.html).
const { app, BrowserWindow, Menu, shell, dialog } = require('electron');
const path = require('path');

if (!app.requestSingleInstanceLock()) { app.quit(); }

let win = null;
const root = path.join(__dirname, '..');
const indexUrl = require('url').pathToFileURL(path.join(root, 'index.html')).toString();

function createWindow() {
  win = new BrowserWindow({
    width: 1440, height: 900, minWidth: 900, minHeight: 600,
    backgroundColor: '#0a1018',
    title: 'Quritgich aparat AI',
    icon: path.join(root, 'build', 'icon.png'),
    show: false,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true, spellcheck: false }
  });
  win.once('ready-to-show', () => win.show());
  win.loadURL(indexUrl);
  // Faqat ichki sahifa; tashqi havola yoki yangi oyna — standart brauzerda ochiladi
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => { if (url !== indexUrl && !url.startsWith(indexUrl + '#')) e.preventDefault(); });
  win.on('closed', () => { win = null; });
}

function buildMenu() {
  const zoom = d => () => { const w = win && win.webContents; if (w) w.setZoomLevel(d === 0 ? 0 : w.getZoomLevel() + d); };
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: 'Fayl', submenu: [{ label: 'Chiqish', accelerator: 'Alt+F4', role: 'quit' }] },
    { label: 'Ko‘rinish', submenu: [
      { label: 'Qayta yuklash', accelerator: 'CmdOrCtrl+R', click: () => win && win.webContents.reload() },
      { label: 'To‘liq ekran', accelerator: 'F11', click: () => win && win.setFullScreen(!win.isFullScreen()) },
      { type: 'separator' },
      { label: 'Kattalashtirish', accelerator: 'CmdOrCtrl+=', click: zoom(0.5) },
      { label: 'Kichiklashtirish', accelerator: 'CmdOrCtrl+-', click: zoom(-0.5) },
      { label: 'Asl o‘lcham', accelerator: 'CmdOrCtrl+0', click: zoom(0) }
    ] },
    { label: 'Yordam', submenu: [{ label: 'Dastur haqida', click: () => dialog.showMessageBox(win, {
      type: 'info', title: 'Quritgich aparat AI', message: 'Quritgich aparat AI',
      detail: 'Versiya ' + app.getVersion() + '\nAI asosida erta ogohlantirish va hodisa tahlili simulyatori.\nMa’lumotlar kompyuterdan tashqariga chiqmaydi.' }) }] }
  ]));
}

app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
app.whenReady().then(() => { buildMenu(); createWindow(); });
app.on('window-all-closed', () => app.quit());
