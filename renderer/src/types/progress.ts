export type RunStep =
  | 'LOGIN'
  | 'FETCH'
  | 'VALIDATE'
  | 'UPDATE'
  | 'VERIFY'
  | 'DONE';

export type ProgressEvent = {
  ts: number; // Date.now()
  step: RunStep;
  message: string;
  current?: number;
  total?: number;
  reservationId?: string;
  roomNo?: string | null;
  status?: 'UPDATED' | 'SKIPPED' | 'FAILED';
};
