// electron/preload.cjs
const { contextBridge, ipcRenderer } = require('electron');

console.log('[preload] loaded');

contextBridge.exposeInMainWorld('operaBridge', {
  previewRun: (req) => ipcRenderer.invoke('previewRun', req),
  applyRun: (req) => ipcRenderer.invoke('applyRun', req),
  verifyRun: (req) => ipcRenderer.invoke('verifyRun', req),
  saveLog: (req) => ipcRenderer.invoke('saveLog', req),
  cancelRun: () => ipcRenderer.invoke('cancelRun'),
  saveCredentials: (req) => ipcRenderer.invoke('saveCredentials', req),
  loadCredentials: () => ipcRenderer.invoke('loadCredentials'),
  onApplyProgress: (callback) => {
    ipcRenderer.on('applyProgress', (_event, payload) => callback(payload));
  },
  offApplyProgress: () => {
    ipcRenderer.removeAllListeners('applyProgress');
  },
  onPreviewLog: (callback) => {
    ipcRenderer.on('previewLog', (_event, payload) => callback(payload));
  },
  offPreviewLog: () => {
    ipcRenderer.removeAllListeners('previewLog');
  },
  generateSignOffSheet: (req) => ipcRenderer.invoke('generateSignOffSheet', req),
  fetchAndGenerateSheet: (req) => ipcRenderer.invoke('fetchAndGenerateSheet', req),
});

console.log('[preload] operaBridge exposed');
