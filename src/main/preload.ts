import { contextBridge, ipcRenderer } from 'electron';
import type { CreateScenarioInput, UpdateScenarioInput } from '../shared/types/scenario';

contextBridge.exposeInMainWorld('bracketeer', {
  scenarios: {
    getAll: () => ipcRenderer.invoke('scenarios:getAll'),
    getById: (id: string) => ipcRenderer.invoke('scenarios:getById', id),
    create: (input: CreateScenarioInput) => ipcRenderer.invoke('scenarios:create', input),
    update: (id: string, input: UpdateScenarioInput) => ipcRenderer.invoke('scenarios:update', id, input),
    duplicate: (id: string, newName: string) => ipcRenderer.invoke('scenarios:duplicate', id, newName),
    delete: (id: string) => ipcRenderer.invoke('scenarios:delete', id),
  },
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
