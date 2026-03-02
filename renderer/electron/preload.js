// electron/preload.ts
import { contextBridge, ipcRenderer } from 'electron';
const api = {
    previewRun: (req) => ipcRenderer.invoke('previewRun', req),
};
contextBridge.exposeInMainWorld('operaBridge', api);
