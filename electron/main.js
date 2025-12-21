const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');

// Configuration des logs de mise à jour (optionnel mais recommandé)
autoUpdater.logger = require('electron-log');
autoUpdater.logger.transports.file.level = 'info';

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 768,
    title: 'Gesmind',
    // icon: path.join(__dirname, '../public/favicon.ico'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false, // Attention: Pour la prod, contextIsolation: true est plus sûr, mais nécessite un preload script.
      devTools: false,
    },
    autoHideMenuBar: true,
  });

  const indexPath = path.join(__dirname, '../dist/index.html');

  mainWindow.loadFile(indexPath).catch((e) => {
    console.error('Erreur chargement index.html:', e);
  });

  // Vérifier les mises à jour une fois la fenêtre chargée
  mainWindow.once('ready-to-show', () => {
    autoUpdater.checkForUpdatesAndNotify();
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

/* --- Gestion des Mises à Jour Automatiques --- */

// Événement : Mise à jour disponible
autoUpdater.on('update-available', () => {
  if (mainWindow) mainWindow.webContents.send('update_available');
});

// Événement : Mise à jour téléchargée
autoUpdater.on('update-downloaded', () => {
  if (mainWindow) mainWindow.webContents.send('update_downloaded');
});

// IPC : L'utilisateur accepte de redémarrer pour installer
ipcMain.on('restart_app', () => {
  autoUpdater.quitAndInstall();
});

// IPC : Vérification manuelle demandée depuis les paramètres
ipcMain.on('check_for_updates', () => {
  autoUpdater.checkForUpdates();
});
