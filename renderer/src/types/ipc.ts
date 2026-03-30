import type { MappingRow } from './mapping';

export type PreviewRunRequest = {
  dateISO: string;
  blockCode: string;
  txtContent: string;
  username: string;
  password: string;
};

export type PreviewRunResult = {
  dateISO: string;
  blockCode: string;
  rows: MappingRow[];
};

export type ApplyRunRequest = {
  dateISO: string;
  blockCode: string;
  username: string;
  password: string;
  rows: MappingRow[];
};

export type ApplyRowResult = {
  rowId: string;
  reservationId: string;
  roomNo: string | null;
  beforeName: string;
  afterName: string | null;
  result: 'UPDATED' | 'SKIPPED' | 'FAILED';
  resultMessage?: string;
};

export type ApplyRunResult = {
  dateISO: string;
  blockCode: string;
  results: ApplyRowResult[];
};

export type VerifyRunRequest = {
  dateISO: string;
  blockCode: string;
  username: string;
  password: string;
  rows: MappingRow[];
};

export type VerifyRowResult = {
  rowId: string;
  reservationId: string;
  roomNo: string | null;
  beforeName: string;
  intendedName: string;
  afterName: string | null;
  result: 'UPDATED' | 'FAILED' | 'SKIPPED' | 'MISMATCH';
  resultMessage?: string;
};

export type VerifyRunResult = {
  dateISO: string;
  blockCode: string;
  results: VerifyRowResult[];
};

export type SaveCredentialsRequest = {
  username: string;
  password: string;
};

export type SavedAccount = {
  username: string;
  password: string;
};

export type LoadCredentialsResult = {
  accounts: SavedAccount[];
};

export type SaveLogRequest = {
  dateISO: string;
  blockCode: string;
  verifyResults: VerifyRowResult[];
};

export type SaveLogResult = {
  savedPath: string;
};

import type { ProgressEvent } from './progress';
export type ApplyProgressPayload = Omit<ProgressEvent, 'ts'>;

export type SheetRow = {
  roomNo: string | null;
  name: string;
  rank?: string;
  order?: number;
};

export type GenerateSheetRequest = {
  dateISO: string;
  blockCode: string;
  wakeUpCall?: string;
  departureTime?: string;
  cabinRows: SheetRow[];
  techRows: SheetRow[];
};

export type FetchAndGenerateSheetRequest = {
  dateISO: string;
  blockCode: string;
  username: string;
  password: string;
  wakeUpCall?: string;
  departureTime?: string;
  txtContent?: string;
};

export type GenerateSheetResult = {
  savedPath: string;
} | null;
