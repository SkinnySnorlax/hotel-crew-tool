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
  wakeUpCall: string;
  departureTime: string;
  username: string;
  password: string;
  txtFile?: File;
};

export function useAppState() {
  const [step, setStep] = useState<AppStep>('START');
  const [form, setForm] = useState<StartForm>(() => {
    const d = new Date();
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = String(d.getFullYear());
    const yy = yyyy.slice(2);
    return {
      dateISO: `${yyyy}-${mm}-${dd}`,
      blockCode: `C-SINA${dd}${mm}${yy}`,
      wakeUpCall: '',
      departureTime: '',
      username: '',
      password: '',
    };
  });

  const [rows, setRows] = useState<MappingRow[]>([]);

  return useMemo(
    () => ({
      step,
      setStep,
      form,
      setForm,
      rows,
      setRows,
    }),
    [step, form, rows],
  );
}
