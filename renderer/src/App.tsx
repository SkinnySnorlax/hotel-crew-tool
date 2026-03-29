import React from 'react';
import './App.css';

import { AppShell } from './components/AppShell';
import { useAppState } from './state/appState';
import { StartPage } from './pages/StartPage';
import { PreviewLoadingPage } from './pages/PreviewLoadingPage';
import { ReviewPage } from './pages/ReviewPage';
import { ApplyPage } from './pages/ApplyPage';
import { VerifyPage } from './pages/VerifyPage';
import { DonePage } from './pages/DonePage';

import type { MappingRow } from './types/mapping';
import type { ProgressEvent } from './types/progress';
import type { SavedAccount } from './types/ipc';

type VerifyRow = MappingRow & {
  beforeName: string;
  afterName: string | null;
  result: 'UPDATED' | 'SKIPPED' | 'FAILED' | 'MISMATCH';
  resultMessage?: string;
};

export default function App() {
  const { step, setStep, form, setForm, rows, setRows } = useAppState();

  const [events, setEvents] = React.useState<ProgressEvent[]>([]);
  const [verifyRows, setVerifyRows] = React.useState<VerifyRow[]>([]);
  const [savedLogPath, setSavedLogPath] = React.useState<string | null>(null);
  const [savedAccounts, setSavedAccounts] = React.useState<SavedAccount[]>([]);
  const applyTimerRef = React.useRef<number | null>(null);
  const cancelRequestedRef = React.useRef(false);

  const pushEvent = (e: Omit<ProgressEvent, 'ts'>) => {
    setEvents((prev) => [...prev, { ts: Date.now(), ...e }]);
  };

  const clearApplyTimer = () => {
    if (applyTimerRef.current !== null) {
      window.clearInterval(applyTimerRef.current);
      applyTimerRef.current = null;
    }
  };

  const onPreview = async () => {
    if (!form.txtFile) {
      alert('Please choose a TXT file.');
      return;
    }

    setEvents([]);
    setStep('PREVIEW_LOADING');

    try {
      if (!window.operaBridge?.previewRun) {
        throw new Error('Electron preview bridge is not available.');
      }

      pushEvent({ step: 'LOGIN', message: 'Logging in to Opera…' });

      const txtContent = await form.txtFile.text();

      pushEvent({ step: 'FETCH', message: 'Fetching reservations from Opera…' });

      window.operaBridge.onPreviewLog?.((payload) => {
        console.log('[previewLog]', payload.message);
        pushEvent({ step: 'FETCH', message: payload.message });
      });

      const res = await window.operaBridge.previewRun({
        dateISO: form.dateISO,
        blockCode: form.blockCode,
        txtContent,
        username: form.username,
        password: form.password,
      }).finally(() => {
        window.operaBridge?.offPreviewLog?.();
      });

      pushEvent({ step: 'DONE', message: `Preview complete — ${res.rows.length} reservation(s) found.` });

      window.operaBridge?.saveCredentials?.({ username: form.username, password: form.password }).then(() => {
        setSavedAccounts((prev) => {
          const idx = prev.findIndex((a) => a.username === form.username);
          if (idx >= 0) {
            const updated = [...prev];
            updated[idx] = { username: form.username, password: form.password };
            return updated;
          }
          return [...prev, { username: form.username, password: form.password }];
        });
      }).catch(() => {});

      setRows(res.rows);
      setStep('REVIEW');
    } catch (err) {
      if (cancelRequestedRef.current) {
        cancelRequestedRef.current = false;
        return;
      }
      console.error('Preview failed:', err);
      pushEvent({
        step: 'DONE',
        message: err instanceof Error ? `Preview failed: ${err.message}` : 'Preview failed',
      });
      setStep('ERROR');
    }
  };

  const startApply = async () => {
    clearApplyTimer();
    setEvents([]);
    setStep('APPLY_RUNNING');

    pushEvent({ step: 'LOGIN', message: 'Logging in to Opera…' });

    try {
      if (!window.operaBridge?.applyRun) {
        throw new Error('Electron apply bridge is not available.');
      }

      if (!window.operaBridge?.verifyRun) {
        throw new Error('Electron verify bridge is not available.');
      }

      const total = rows.length * 2;

      window.operaBridge.onApplyProgress((payload) => pushEvent(payload));

      pushEvent({
        step: 'FETCH',
        message: 'Applying reviewed room-name changes…',
      });

      try {
        await window.operaBridge.applyRun({
          dateISO: form.dateISO,
          blockCode: form.blockCode,
          username: form.username,
          password: form.password,
          rows,
        });
      } finally {
        window.operaBridge.offApplyProgress();
      }

      setEvents((prev) => [
        ...prev,
        {
          ts: Date.now(),
          step: 'FETCH' as const,
          message: 'Re-fetching Opera reservations for verification…',
          current: rows.length,
          total,
        },
      ]);

      const verifyRes = await window.operaBridge.verifyRun({
        dateISO: form.dateISO,
        blockCode: form.blockCode,
        username: form.username,
        password: form.password,
        rows,
      });

      const verify: VerifyRow[] = rows.map((r) => {
        const match = verifyRes.results.find(
          (x: (typeof verifyRes.results)[number]) => x.rowId === r.rowId,
        );

        if (!match) {
          return {
            ...r,
            beforeName: r.currentName,
            afterName: r.currentName,
            result: 'FAILED',
            resultMessage: 'Missing verify result',
          };
        }

        return {
          ...r,
          roomNo: match.roomNo ?? r.roomNo ?? null,
          beforeName: match.beforeName,
          newName: match.intendedName,
          afterName: match.afterName,
          result: match.result,
          resultMessage: match.resultMessage,
        };
      });

      setEvents((prev) => [
        ...prev,
        {
          ts: Date.now(),
          step: 'DONE',
          message: 'Apply and verification finished.',
          current: total,
          total,
        },
      ]);

      setVerifyRows(verify);
      setStep('VERIFY');
    } catch (err) {
      if (cancelRequestedRef.current) {
        cancelRequestedRef.current = false;
        return;
      }
      console.error('Apply failed:', err);
      pushEvent({
        step: 'DONE',
        message:
          err instanceof Error
            ? `Apply failed: ${err.message}`
            : 'Apply failed',
      });
      setStep('ERROR');
    }
  };

  const cancelApply = async () => {
    clearApplyTimer();
    cancelRequestedRef.current = true;
    await window.operaBridge?.cancelRun?.();
    pushEvent({ step: 'DONE', message: 'Cancelled.' });
    setStep('REVIEW');
  };

  const applyCorrections = async () => {
    try {
      if (!window.operaBridge?.applyRun) {
        throw new Error('Electron apply bridge is not available.');
      }

      if (!window.operaBridge?.verifyRun) {
        throw new Error('Electron verify bridge is not available.');
      }

      const correctionRows = verifyRows
        .filter((r) => r.result === 'FAILED' || r.result === 'MISMATCH')
        .map((r) => ({
          ...r,
          apply: true,
          status: 'READY' as const,
          currentName: r.afterName ?? r.currentName,
        }));

      if (correctionRows.length === 0) {
        alert('There are no failed or mismatched rows to retry.');
        return;
      }

      setEvents([]);
      setStep('APPLY_RUNNING');
      pushEvent({ step: 'LOGIN', message: 'Logging in to Opera for retry…' });

      pushEvent({ step: 'FETCH', message: 'Retrying failed rows…' });

      const applyRes = await window.operaBridge.applyRun({
        dateISO: form.dateISO,
        blockCode: form.blockCode,
        username: form.username,
        password: form.password,
        rows: correctionRows,
      });

      applyRes.results.forEach((r: (typeof applyRes.results)[number]) => {
        pushEvent({
          step: 'UPDATE',
          message:
            r.result === 'UPDATED'
              ? `Retried room ${r.roomNo ?? 'Unassigned'} → ${r.afterName}`
              : `Failed room ${r.roomNo ?? 'Unassigned'} — ${r.resultMessage ?? 'Unknown error'}`,
          reservationId: r.reservationId,
          roomNo: r.roomNo ?? null,
          status: r.result === 'UPDATED' ? 'UPDATED' : 'FAILED',
        });
      });

      pushEvent({ step: 'FETCH', message: 'Re-verifying retried rows…' });

      const verifyRes = await window.operaBridge.verifyRun({
        dateISO: form.dateISO,
        blockCode: form.blockCode,
        username: form.username,
        password: form.password,
        rows: correctionRows,
      });

      pushEvent({ step: 'DONE', message: 'Retry complete.' });

      const verifyByRowId = new Map<string, (typeof verifyRes.results)[number]>(
        verifyRes.results.map((result: (typeof verifyRes.results)[number]) => [
          result.rowId,
          result,
        ]),
      );

      setVerifyRows((prev) =>
        prev.map((row) => {
          const verified = verifyByRowId.get(row.rowId);
          if (!verified) return row;

          return {
            ...row,
            roomNo: verified.roomNo ?? row.roomNo ?? null,
            beforeName: verified.beforeName,
            newName: verified.intendedName,
            afterName: verified.afterName,
            result: verified.result,
            resultMessage: verified.resultMessage,
          };
        }),
      );

      setStep('VERIFY');
    } catch (err) {
      console.error('Correction apply failed:', err);
      pushEvent({
        step: 'DONE',
        message:
          err instanceof Error
            ? `Retry failed: ${err.message}`
            : 'Retry failed',
      });
      setStep('ERROR');
    }
  };

  React.useEffect(() => {
    window.operaBridge?.loadCredentials?.().then((res) => {
      setSavedAccounts(res.accounts);
    }).catch(() => {});

    return () => clearApplyTimer();
  }, []);

  const generateSheetFromStart = async (): Promise<string | null> => {
    if (!window.operaBridge?.fetchAndGenerateSheet) return null;
    const txtContent = form.txtFile ? await form.txtFile.text() : undefined;
    const result = await window.operaBridge.fetchAndGenerateSheet({
      dateISO: form.dateISO,
      blockCode: form.blockCode,
      username: form.username,
      password: form.password,
      wakeUpCall: form.wakeUpCall || undefined,
      departureTime: form.departureTime || undefined,
      txtContent,
    });
    return result?.savedPath ?? null;
  };

  if (step === 'START') {
    return (
      <AppShell step="START" title="Start">
        <StartPage form={form} setForm={setForm} onPreview={onPreview} onGenerateSheet={generateSheetFromStart} savedAccounts={savedAccounts} />
      </AppShell>
    );
  }

  if (step === 'PREVIEW_LOADING') {
    return (
      <AppShell step="START" title="Loading Preview">
        <PreviewLoadingPage
          events={events}
          onCancel={async () => {
            cancelRequestedRef.current = true;
            await window.operaBridge?.cancelRun?.();
            setStep('START');
          }}
        />
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
          onConfirmApply={startApply}
        />
      </AppShell>
    );
  }

  if (step === 'APPLY_RUNNING') {
    return (
      <AppShell step="APPLY_RUNNING" title="Apply">
        <ApplyPage events={events} onCancel={cancelApply} />
      </AppShell>
    );
  }

  if (step === 'VERIFY') {
    return (
      <AppShell step="VERIFY" title="Verify">
        <VerifyPage
          verifyRows={verifyRows}
          onBackToReview={() => setStep('REVIEW')}
          onApplyCorrections={applyCorrections}
          onFinish={async () => {
            if (window.operaBridge?.saveLog) {
              try {
                const res = await window.operaBridge.saveLog({
                  dateISO: form.dateISO,
                  blockCode: form.blockCode,
                  verifyResults: verifyRows.map((r) => ({
                    rowId: r.rowId,
                    reservationId: r.reservationId,
                    roomNo: r.roomNo ?? null,
                    beforeName: r.beforeName,
                    intendedName: r.newName ?? '',
                    afterName: r.afterName,
                    result: r.result,
                    resultMessage: r.resultMessage,
                  })),
                });
                setSavedLogPath(res.savedPath);
              } catch {
                setSavedLogPath(null);
              }
            }
            setStep('DONE');
          }}
        />
      </AppShell>
    );
  }

  const generateSheet = async (): Promise<string | null> => {
    if (!window.operaBridge?.generateSignOffSheet) return null;

    const updatedRows = verifyRows.filter((r) => r.result === 'UPDATED');

    const isCabin = (name: string) => {
      const u = name.toUpperCase().trim();
      return u === 'SINGAPORE AIRLINES CREW' || u === 'SINGAPORE AIRLINES CREW (NIGHT)';
    };
    const isTech = (name: string) => {
      const u = name.toUpperCase().trim();
      return u === 'SINGAPORE AIRLINES TECH CREW' || u === 'SINGAPORE AIRLINES TECH CREW (NIGHT)';
    };

    const cabinRows = updatedRows
      .filter((r) => isCabin(r.currentName))
      .map((r) => ({ roomNo: r.roomNo ?? null, name: r.newName ?? r.currentName, rank: r.rank }));

    const techRows = updatedRows
      .filter((r) => isTech(r.currentName))
      .map((r) => ({ roomNo: r.roomNo ?? null, name: r.newName ?? r.currentName, rank: r.rank }));

    const result = await window.operaBridge.generateSignOffSheet({
      dateISO: form.dateISO,
      blockCode: form.blockCode,
      wakeUpCall: form.wakeUpCall || undefined,
      departureTime: form.departureTime || undefined,
      cabinRows,
      techRows,
    });

    return result?.savedPath ?? null;
  };

  if (step === 'DONE') {
    return (
      <AppShell step="DONE" title="Done">
        <DonePage events={events} verifyRows={verifyRows} savedLogPath={savedLogPath} onBackToStart={() => setStep('START')} onGenerateSheet={generateSheet} />
      </AppShell>
    );
  }

  if (step === 'ERROR') {
    return (
      <AppShell step="START" title="Error">
        <div style={{ padding: 16 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>
            Something went wrong
          </div>
          <div style={{ color: '#555', marginBottom: 12 }}>
            Please check the DevTools console, then try again.
          </div>
          <button onClick={() => setStep('START')} style={{ padding: 10 }}>
            Back to Start
          </button>
        </div>
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
