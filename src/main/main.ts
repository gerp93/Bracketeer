import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import { autoUpdater } from 'electron-updater';
import * as path from 'path';
import * as fs from 'fs';
import {
  pinUserDataPath,
  getConfiguredDbPath,
  getEffectiveDbPath,
  getDefaultDbPath,
  isUsingDefaultLocation,
  setDbPath,
  resetToDefaultDbPath,
} from './dbLocation';
import { initDatabase } from './database/schema';
import { ScenarioService } from './database/scenarioService';
import { setupApplicationMenu, attachContextMenu } from './menu';
import type { CreateScenarioInput, UpdateScenarioInput } from '../shared/types/scenario';
import type { Database } from 'sql.js';

pinUserDataPath();
app.setName('bracketeer');

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
  // app.quit() has been observed leaving this process alive for hours
  // instead of exiting (the loser of the lock never reaches 'ready', so
  // there's no window/before-quit lifecycle to fall back on) -- force it.
  setTimeout(() => process.exit(0), 1000);
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    } else {
      createWindow();
    }
  });
}

let mainWindow: BrowserWindow | null = null;
let db: Database | null = null;
let scenarioService: ScenarioService;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 650,
    icon: path.join(__dirname, '../../../assets/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    titleBarStyle: 'default',
    backgroundColor: '#f5f5f5',
  });

  if (!app.isPackaged) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  attachContextMenu(mainWindow);
}

function setupAutoUpdater() {
  if (!app.isPackaged) return;

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('update-downloaded', (info) => {
    dialog
      .showMessageBox(mainWindow!, {
        type: 'info',
        title: 'Update ready',
        message: `Bracketeer ${info.version} has been downloaded.`,
        detail: 'Restart now to install it, or it will install automatically the next time you quit.',
        buttons: ['Restart Now', 'Later'],
        defaultId: 0,
        cancelId: 1,
      })
      .then((result) => {
        if (result.response === 0) {
          autoUpdater.quitAndInstall();
        }
      });
  });

  autoUpdater.on('error', (err) => {
    console.error('Auto-update error:', err);
  });

  autoUpdater.checkForUpdates().catch((err) => {
    console.error('Failed to check for updates:', err);
  });
}

interface UpdateCheckResult {
  status: 'available' | 'not-available' | 'error' | 'unsupported';
  version?: string;
  message?: string;
}

function checkForUpdatesNow(): Promise<UpdateCheckResult> {
  if (!app.isPackaged) {
    return Promise.resolve({ status: 'unsupported' });
  }

  return new Promise((resolve) => {
    const cleanup = () => {
      autoUpdater.removeListener('update-available', onAvailable);
      autoUpdater.removeListener('update-not-available', onNotAvailable);
      autoUpdater.removeListener('error', onError);
    };
    const onAvailable = (info: { version: string }) => {
      cleanup();
      resolve({ status: 'available', version: info.version });
    };
    const onNotAvailable = () => {
      cleanup();
      resolve({ status: 'not-available' });
    };
    const onError = (err: Error) => {
      cleanup();
      resolve({ status: 'error', message: err?.message ?? String(err) });
    };

    autoUpdater.once('update-available', onAvailable);
    autoUpdater.once('update-not-available', onNotAvailable);
    autoUpdater.once('error', onError);
    autoUpdater.checkForUpdates().catch(onError);
  });
}

app.whenReady().then(async () => {
  const configuredDbPath = getConfiguredDbPath();
  if (configuredDbPath && !fs.existsSync(configuredDbPath)) {
    const result = await dialog.showMessageBox({
      type: 'error',
      title: 'Database not found',
      message: "Bracketeer can't find your configured database file.",
      detail: `Expected it at:\n${configuredDbPath}\n\nThis can happen if a drive is disconnected or a synced folder hasn't loaded yet. Reconnect it and relaunch, or switch back to the default location.`,
      buttons: ['Quit', 'Use Default Location'],
      defaultId: 0,
      cancelId: 0,
    });
    if (result.response === 1) {
      resetToDefaultDbPath();
      app.relaunch();
    }
    app.exit();
    return;
  }

  db = await initDatabase();
  scenarioService = new ScenarioService(db);

  registerIPCHandlers();

  setupApplicationMenu();
  createWindow();
  setupAutoUpdater();

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

function registerIPCHandlers() {
  // Database location handlers — wired now so the Settings UI (required by
  // the SQLite-location standard) has something to call from day one, even
  // before the engine/database itself exists.
  ipcMain.handle('dbLocation:get', () => ({
    path: getEffectiveDbPath(),
    isDefault: isUsingDefaultLocation(),
    defaultPath: getDefaultDbPath(),
  }));

  ipcMain.handle('dbLocation:browseExisting', async () => {
    if (!mainWindow) return null;
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Choose an existing Bracketeer database file',
      properties: ['openFile'],
      filters: [{ name: 'SQLite Database', extensions: ['db', 'sqlite', 'sqlite3'] }],
    });
    return result.canceled ? null : result.filePaths[0];
  });

  ipcMain.handle('dbLocation:browseNew', async () => {
    if (!mainWindow) return null;
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Choose where to store the Bracketeer database',
      defaultPath: 'bracketeer.db',
      filters: [{ name: 'SQLite Database', extensions: ['db'] }],
    });
    return result.canceled ? null : (result.filePath ?? null);
  });

  ipcMain.handle('dbLocation:set', (_, newPath: string) => {
    setDbPath(newPath);
    app.relaunch();
    app.exit();
    return { success: true };
  });

  ipcMain.handle('dbLocation:resetToDefault', () => {
    resetToDefaultDbPath();
    app.relaunch();
    app.exit();
    return { success: true };
  });

  // App / update handlers
  ipcMain.handle('app:getVersion', () => app.getVersion());
  ipcMain.handle('updates:check', () => checkForUpdatesNow());

  // Scenario handlers
  ipcMain.handle('scenarios:getAll', () => scenarioService.getAll());
  ipcMain.handle('scenarios:getById', (_, id: string) => scenarioService.getById(id));
  ipcMain.handle('scenarios:create', (_, input: CreateScenarioInput) => scenarioService.create(input));
  ipcMain.handle('scenarios:update', (_, id: string, input: UpdateScenarioInput) => scenarioService.update(id, input));
  ipcMain.handle('scenarios:duplicate', (_, id: string, newName: string) => scenarioService.duplicate(id, newName));
  ipcMain.handle('scenarios:delete', (_, id: string) => {
    scenarioService.delete(id);
    return { success: true };
  });
}
