import React from 'react';
import './App.css';

import { AppShell } from './components/AppShell';
import { useAppState } from './state/appState';
import { StartPage } from './pages/StartPage';
import { ReviewPage } from './pages/ReviewPage';
import { ApplyPage } from './pages/ApplyPage';
import { VerifyPage } from './pages/VerifyPage';
import { DonePage } from './pages/DonePage';

import type { MappingRow } from './types/mapping';
import type { ProgressEvent } from './types/progress';

type VerifyRow = MappingRow & {
  beforeName: string;
  afterName: string | null;
  result: 'UPDATED' | 'SKIPPED' | 'FAILED';
  resultMessage?: string;
};

function mockPreviewRows(): MappingRow[] {
  return [
    {
      rowId: '1',
      reservationId: 'R1',
      roomNo: '1203',
      currentName: 'Singapore Airlines Crew',
      newName: 'TAN WEI MING',
      apply: true,
      status: 'READY',
    },
    {
      rowId: '2',
      reservationId: 'R2',
      roomNo: '1205',
      currentName: 'Singapore Airlines Tech Crew',
      newName: 'LIM JIA HUI',
      apply: true,
      status: 'READY',
    },
    {
      rowId: '3',
      reservationId: 'R3',
      roomNo: '1210',
      currentName: 'John Smith',
      newName: null,
      apply: false,
      status: 'SKIP',
      message: 'Not a placeholder',
    },
  ];
}

export default function App() {
  const { step, setStep, form, setForm, rows, setRows } = useAppState();

  const [events, setEvents] = React.useState<ProgressEvent[]>([]);
  const [verifyRows, setVerifyRows] = React.useState<VerifyRow[]>([]);
  const applyTimerRef = React.useRef<number | null>(null);

  const pushEvent = (e: Omit<ProgressEvent, 'ts'>) => {
    setEvents((prev) => [...prev, { ts: Date.now(), ...e }]);
  };

  const clearApplyTimer = () => {
    if (applyTimerRef.current !== null) {
      window.clearInterval(applyTimerRef.current);
      applyTimerRef.current = null;
    }
  };

  const buildMockVerifyRows = () => {
    // Mock “After (from Opera)” as if apply succeeded for checked+named rows.
    const v: VerifyRow[] = rows.map((r) => {
      const didApply = !!(r.apply && r.newName);

      return {
        ...r,
        beforeName: r.currentName,
        afterName: didApply ? (r.newName ?? null) : r.currentName,
        result: didApply ? 'UPDATED' : 'SKIPPED',
        resultMessage: didApply
          ? undefined
          : r.apply
            ? 'No new name'
            : 'Apply unchecked',
      };
    });

    setVerifyRows(v);
  };

  const onPreview = () => {
    setStep('PREVIEW_LOADING');
    setTimeout(() => {
      setRows(mockPreviewRows());
      setStep('REVIEW');
    }, 500);
  };

  const startMockApply = () => {
    clearApplyTimer();
    setEvents([]);
    setStep('APPLY_RUNNING');

    pushEvent({ step: 'LOGIN', message: 'Logging in to Opera…' });

    window.setTimeout(() => {
      pushEvent({ step: 'FETCH', message: 'Fetching block reservations…' });

      window.setTimeout(() => {
        const eligible = rows.filter((r) => r.apply && r.newName);
        const total = eligible.length;

        if (total === 0) {
          pushEvent({
            step: 'DONE',
            message:
              'Nothing to update (no rows selected). Going to verification…',
          });

          buildMockVerifyRows();
          window.setTimeout(() => setStep('VERIFY'), 500);
          return;
        }

        let i = 0;
        applyTimerRef.current = window.setInterval(() => {
          i += 1;

          const r = eligible[i - 1];
          pushEvent({
            step: 'UPDATE',
            message: `Updating ${i}/${total} — Room ${r.roomNo ?? 'Unassigned'} → ${r.newName}`,
            current: i,
            total,
            reservationId: r.reservationId,
            roomNo: r.roomNo ?? null,
            status: 'UPDATED',
          });

          if (i >= total) {
            clearApplyTimer();
            pushEvent({
              step: 'DONE',
              message: 'Done. Preparing verification…',
            });

            buildMockVerifyRows();
            window.setTimeout(() => setStep('VERIFY'), 600);
          }
        }, 450);
      }, 800);
    }, 800);
  };

  const cancelMockApply = () => {
    clearApplyTimer();
    pushEvent({ step: 'DONE', message: 'Cancelled. Returning to review…' });
    setStep('REVIEW');
  };

  const applyMockCorrections = () => {
    // Mock correction apply:
    // - If user edited newName, assume it now matches “After”.
    setVerifyRows((prev) =>
      prev.map((r) => {
        const didApply = !!(r.apply && r.newName);
        if (!didApply) return r;

        return {
          ...r,
          afterName: r.newName ?? null,
          result: 'UPDATED',
          resultMessage: undefined,
        };
      }),
    );
    alert('Mock: Corrections applied (we will wire real Playwright later).');
  };

  React.useEffect(() => {
    return () => clearApplyTimer();
  }, []);

  if (step === 'START' || step === 'PREVIEW_LOADING') {
    return (
      <AppShell step="START" title="Start">
        <StartPage form={form} setForm={setForm} onPreview={onPreview} />
      </AppShell>
    );
  }

  if (step === 'REVIEW') {
    return (
      <AppShell step="REVIEW" title="Review">
        <ReviewPage
          rows={rows}
          setRows={setRows}
          onBack={() => setStep('START')}
          onConfirmApply={startMockApply}
        />
      </AppShell>
    );
  }

  if (step === 'APPLY_RUNNING') {
    return (
      <AppShell step="APPLY_RUNNING" title="Apply">
        <ApplyPage events={events} onCancel={cancelMockApply} />
      </AppShell>
    );
  }

  if (step === 'VERIFY') {
    return (
      <AppShell step="VERIFY" title="Verify">
        <VerifyPage
          verifyRows={verifyRows}
          setVerifyRows={setVerifyRows}
          onBackToReview={() => setStep('REVIEW')}
          onApplyCorrections={applyMockCorrections}
          onFinish={() => setStep('DONE')}
        />
      </AppShell>
    );
  }

  if (step === 'DONE') {
    return (
      <AppShell step="DONE" title="Done">
        <DonePage events={events} onBackToStart={() => setStep('START')} />
      </AppShell>
    );
  }

  return (
    <div style={{ padding: 16 }}>
      <h2>TODO: {step}</h2>
      <button onClick={() => setStep('START')} style={{ padding: 8 }}>
        Back to Start
      </button>
    </div>
  );
}
