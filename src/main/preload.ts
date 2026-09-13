import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('bracketeer', {
  dbLocation: {
    get: () => ipcRenderer.invoke('dbLocation:get'),
    browseExisting: () => ipcRenderer.invoke('dbLocation:browseExisting'),
    browseNew: () => ipcRenderer.invoke('dbLocation:browseNew'),
    set: (newPath: string) => ipcRenderer.invoke('dbLocation:set', newPath),
    resetToDefault: () => ipcRenderer.invoke('dbLocation:resetToDefault'),
  },
  app: {
    getVersion: () => ipcRenderer.invoke('app:getVersion'),
  },
  updates: {
    check: () => ipcRenderer.invoke('updates:check'),
  },
});
