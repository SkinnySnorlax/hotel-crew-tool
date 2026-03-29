import type {
  PreviewRunRequest,
  PreviewRunResult,
  ApplyRunRequest,
  ApplyRunResult,
  VerifyRunRequest,
  VerifyRunResult,
  SaveLogRequest,
  SaveLogResult,
  SaveCredentialsRequest,
  LoadCredentialsResult,
  GenerateSheetRequest,
  FetchAndGenerateSheetRequest,
  GenerateSheetResult,
} from './types/ipc';
import type { ProgressEvent } from './types/progress';

declare global {
  interface Window {
    operaBridge?: {
      previewRun: (req: PreviewRunRequest) => Promise<PreviewRunResult>;
      applyRun: (req: ApplyRunRequest) => Promise<ApplyRunResult>;
      verifyRun: (req: VerifyRunRequest) => Promise<VerifyRunResult>;
      saveLog: (req: SaveLogRequest) => Promise<SaveLogResult>;
      cancelRun: () => Promise<void>;
      saveCredentials: (req: SaveCredentialsRequest) => Promise<void>;
      loadCredentials: () => Promise<LoadCredentialsResult>;
      onApplyProgress: (callback: (payload: Omit<ProgressEvent, 'ts'>) => void) => void;
      offApplyProgress: () => void;
      onPreviewLog: (callback: (payload: { message: string }) => void) => void;
      offPreviewLog: () => void;
      generateSignOffSheet: (req: GenerateSheetRequest) => Promise<GenerateSheetResult>;
      fetchAndGenerateSheet: (req: FetchAndGenerateSheetRequest) => Promise<GenerateSheetResult>;
    };
  }
}

export {};
