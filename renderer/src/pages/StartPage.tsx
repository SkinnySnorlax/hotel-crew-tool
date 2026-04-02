import React from 'react';
import type { StartForm } from '../state/appState';
import type { SavedAccount } from '../types/ipc';

const DEFAULTS = {
  A: { wakeUpCall: '11:10', departureTime: '12:10' },
  B: { wakeUpCall: '22:15', departureTime: '23:15' },
};

function blockCodeOptions(dateISO: string): [string, string] {
  if (!dateISO) return ['C-SINA', 'C-SINB'];
  const [year, month, day] = dateISO.split('-');
  const formatted = `${day}${month}${year.slice(2)}`;
  return [`C-SINA${formatted}`, `C-SINB${formatted}`];
}

type Props = {
  form: StartForm;
  setForm: React.Dispatch<React.SetStateAction<StartForm>>;
  onPreview: () => Promise<void>;
  onGenerateSheet: () => Promise<string | null>;
  savedAccounts: SavedAccount[];
};

export function StartPage({
  form,
  setForm,
  onPreview,
  onGenerateSheet,
  savedAccounts,
}: Props) {
  const selectedAccount = savedAccounts.find(
    (a) => a.username === form.username,
  );
  const [optA, optB] = blockCodeOptions(form.dateISO);
  const [generatingSheet, setGeneratingSheet] = React.useState(false);
  const [sheetPath, setSheetPath] = React.useState<string | null>(null);
  const [sheetError, setSheetError] = React.useState<string | null>(null);

  // When the date changes, keep the same A/B variant but update the date portion
  React.useEffect(() => {
    setForm((prev) => {
      const [a, b] = blockCodeOptions(prev.dateISO);
      const isB = prev.blockCode.startsWith('C-SINB');
      return { ...prev, blockCode: isB ? b : a };
    });
  }, [form.dateISO, setForm]);

  // Auto-fill wake-up / departure times based on block code variant,
  // but preserve any value the user has manually set (i.e. one that
  // isn't empty and doesn't match the OTHER variant's default).
  React.useEffect(() => {
    setForm((prev) => {
      const isB = prev.blockCode.startsWith('C-SINB');
      const target = isB ? DEFAULTS.B : DEFAULTS.A;
      const other = isB ? DEFAULTS.A : DEFAULTS.B;
      const wakeUpCall =
        prev.wakeUpCall === '' || prev.wakeUpCall === other.wakeUpCall
          ? target.wakeUpCall
          : prev.wakeUpCall;
      const departureTime =
        prev.departureTime === '' || prev.departureTime === other.departureTime
          ? target.departureTime
          : prev.departureTime;
      return { ...prev, wakeUpCall, departureTime };
    });
  }, [form.blockCode, setForm]);

  const canPreview = !!(
    form.txtFile &&
    form.blockCode &&
    form.username &&
    form.password
  );

  const handleGenerateSheet = async () => {
    setGeneratingSheet(true);
    setSheetPath(null);
    setSheetError(null);
    try {
      const p = await onGenerateSheet();
      if (p) {
        setSheetPath(p);
      } else {
        setSheetError(
          'No named reservations found in Opera — sheet not generated.',
        );
      }
    } catch (err) {
      setSheetError(
        err instanceof Error ? err.message : 'Sheet generation failed.',
      );
    } finally {
      setGeneratingSheet(false);
    }
  };

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (canPreview) onPreview();
        }}
        style={{ padding: 16, maxWidth: 720 }}
      >
        <div style={{ display: 'grid', gap: 12 }}>
          {savedAccounts.length > 0 && (
            <label>
              Saved Accounts
              <select
                value={selectedAccount ? form.username : ''}
                onChange={(e) => {
                  const acct = savedAccounts.find(
                    (a) => a.username === e.target.value,
                  );
                  if (acct)
                    setForm((prev) => ({
                      ...prev,
                      username: acct.username,
                      password: acct.password,
                    }));
                }}
                style={{ display: 'block', width: '100%', padding: 8 }}
              >
                <option value="" disabled>
                  — select saved account —
                </option>
                {savedAccounts.map((a) => (
                  <option key={a.username} value={a.username}>
                    {a.username}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label>
            Date
            <input
              type="date"
              value={form.dateISO}
              onChange={(e) => setForm({ ...form, dateISO: e.target.value })}
              style={{ display: 'block', width: '100%', padding: 8 }}
            />
          </label>

          <label>
            Block Code
            <select
              value={form.blockCode}
              onChange={(e) => setForm({ ...form, blockCode: e.target.value })}
              style={{ display: 'block', width: '100%', padding: 8 }}
            >
              <option value={optA}>{optA}</option>
              <option value={optB}>{optB}</option>
            </select>
          </label>

          <label>
            TXT File
            <input
              type="file"
              accept=".txt"
              onChange={(e) =>
                setForm({ ...form, txtFile: e.target.files?.[0] })
              }
              style={{ display: 'block', width: '100%', padding: 8 }}
            />
          </label>

          <label>
            Opera Username
            <input
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              style={{ display: 'block', width: '100%', padding: 8 }}
            />
          </label>

          <label>
            Opera Password
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              style={{ display: 'block', width: '100%', padding: 8 }}
            />
          </label>

          <label>
            Wake-Up Call (Editable)
            <input
              value={form.wakeUpCall}
              onChange={(e) => {
                const v = e.target.value;
                setForm((prev) => ({ ...prev, wakeUpCall: v }));
              }}
              placeholder="e.g. 06:00"
              style={{ display: 'block', width: '100%', padding: 8 }}
            />
          </label>

          <label>
            Departure Time (Editable)
            <input
              value={form.departureTime}
              onChange={(e) => {
                const v = e.target.value;
                setForm((prev) => ({ ...prev, departureTime: v }));
              }}
              placeholder="e.g. 08:30"
              style={{ display: 'block', width: '100%', padding: 8 }}
            />
          </label>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="submit"
              disabled={!canPreview}
              style={{ padding: 10, cursor: 'pointer', flex: 1 }}
            >
              Preview (Read-only)
            </button>

            <button
              type="button"
              disabled={!canPreview || generatingSheet}
              onClick={handleGenerateSheet}
              style={{ padding: 10, cursor: 'pointer', flex: 1 }}
            >
              {generatingSheet ? 'Generating…' : 'Generate Sign-Off Sheet'}
            </button>
          </div>

          {sheetPath && (
            <div style={{ fontSize: 12, color: '#555' }}>
              Sign-off sheet saved to: <strong>{sheetPath}</strong>
            </div>
          )}
          {sheetError && (
            <div style={{ fontSize: 12, color: '#c00' }}>{sheetError}</div>
          )}

          <small style={{ color: '#555' }}>
            Preview will parse the TXT + fetch reservations/rooms from Opera and
            show the mapping table. No changes will be made until you confirm.
          </small>
        </div>
      </form>
    </div>
  );
}
