// electron/preload.ts
import { contextBridge, ipcRenderer } from 'electron';
import type { PreviewRunRequest, PreviewRunResult } from '../src/types/ipc';

const api = {
  previewRun: (req: PreviewRunRequest): Promise<PreviewRunResult> =>
    ipcRenderer.invoke('previewRun', req),
};

contextBridge.exposeInMainWorld('operaBridge', api);
