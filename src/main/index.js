const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');
const WindowTracker = require('./window-tracker');

let mainWindow;

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 650,
    height: 800,
    x: 50,
    y: 50,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  mainWindow.webContents.openDevTools();
};

app.whenReady()
  .then(() => {
    createWindow();
  });

// --------------------------------------
const windowTracker = new WindowTracker();
// IPC handlers
ipcMain.handle('get-tracked-windows', () => {
  return windowTracker.getTrackedWindows();
});

ipcMain.on('remove-tracked-window', (event, windowTitle) => {
  windowTracker.removeTrackedWindow(windowTitle);
});

ipcMain.on('set-document-title', (event, title) => {
  windowTracker.setDocumentTitle(title);
});

ipcMain.on('start-tracking', () => {
  windowTracker.startTracking();
});

ipcMain.on('stop-tracking', () => {
  windowTracker.stopTracking();
});

ipcMain.on('clear-tracked-windows', () => {
  windowTracker.clearTrackedWindows();
});

ipcMain.handle('set-window-opacity', async (event, windowTitle, opacity) => {
  return windowTracker.setWindowOpacity(windowTitle, opacity);
});

ipcMain.on('reset-window-opacity', () => {
  for (const window of windowTracker.getTrackedWindows()) {
    windowTracker.setWindowOpacity(window, 1);
  }
});

// ontop
ipcMain.handle('toggle-window-ontop', async (event, windowTitle, isOnTop) => {
  return windowTracker.toggleWindowOntop(windowTitle, isOnTop);
});

ipcMain.handle('maximize-window', async (event, windowTitle) => {
  return windowTracker.maximizeWindow(windowTitle);
});

ipcMain.handle('get-top-window', async () => {
  return windowTracker.getForegroundWindowTitle();
});

app.on('before-quit', () => {
  windowTracker.stopTracking();
  windowTracker.clearTrackedWindows();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
