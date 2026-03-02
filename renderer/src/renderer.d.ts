// src/renderer.d.ts
import type { PreviewRunRequest, PreviewRunResult } from './types/ipc';

declare global {
  interface Window {
    operaBridge: {
      previewRun: (req: PreviewRunRequest) => Promise<PreviewRunResult>;
    };
  }
}

export {};
