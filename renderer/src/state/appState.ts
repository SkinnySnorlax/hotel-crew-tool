import { useMemo, useState } from 'react';
import type { MappingRow } from '../types/mapping';

export type AppStep =
  | 'START'
  | 'PREVIEW_LOADING'
  | 'REVIEW'
  | 'APPLY_RUNNING'
  | 'VERIFY'
  | 'DONE'
  | 'ERROR';

export type StartForm = {
  dateISO: string; // YYYY-MM-DD
  blockCode: string;
  username: string;
  password: string;
  txtFile?: File;
};

export function useAppState() {
  const [step, setStep] = useState<AppStep>('START');
  const [form, setForm] = useState<StartForm>({
    dateISO: new Date().toISOString().slice(0, 10),
    blockCode: '',
    username: '',
    password: '',
  });

  const [rows, setRows] = useState<MappingRow[]>([]);
  const [error, setError] = useState<string>('');

  return useMemo(
    () => ({
      step,
      setStep,
      form,
      setForm,
      rows,
      setRows,
      error,
      setError,
    }),
    [step, form, rows, error],
  );
}
