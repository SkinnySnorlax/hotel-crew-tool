// src/types/ipc.ts
import type { MappingRow } from './mapping';

export type PreviewRunRequest = {
  dateISO: string; // YYYY-MM-DD
  blockCode: string;
  txtPath?: string; // later: pass file path instead of File object
  username: string;
  password: string;
};

export type PreviewRunResult = {
  dateISO: string;
  blockCode: string;
  rows: MappingRow[];
};
