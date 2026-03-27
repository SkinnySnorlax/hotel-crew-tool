import React from 'react';
import type { ProgressEvent } from '../types/progress';
import type { MappingRow } from '../types/mapping';

type VerifyRow = MappingRow & {
  beforeName: string;
  afterName: string | null;
  result: 'UPDATED' | 'SKIPPED' | 'FAILED' | 'MISMATCH';
  resultMessage?: string;
};

type Props = {
  events: ProgressEvent[];
  verifyRows: VerifyRow[];
  savedLogPath: string | null;
  onBackToStart: () => void;
  onGenerateSheet: () => Promise<string | null>;
};

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();

  URL.revokeObjectURL(url);
}

type ResultRow = {
  reservationId?: string;
  roomNo?: string | null;
  message: string;
  status: 'UPDATED' | 'SKIPPED' | 'FAILED';
  ts: number;
};

function extractResults(events: ProgressEvent[]): ResultRow[] {
  return events
    .filter(
      (e) =>
        e.status === 'UPDATED' ||
        e.status === 'SKIPPED' ||
        e.status === 'FAILED',
    )
    .map((e) => ({
      reservationId: e.reservationId,
      roomNo: e.roomNo ?? null,
      message: e.message,
      status: e.status as 'UPDATED' | 'SKIPPED' | 'FAILED',
      ts: e.ts,
    }));
}

export function DonePage({ events, verifyRows, savedLogPath, onBackToStart, onGenerateSheet }: Props) {
  const [sheetPath, setSheetPath] = React.useState<string | null>(null);
  const [generatingSheet, setGeneratingSheet] = React.useState(false);

  const handleGenerateSheet = async () => {
    setGeneratingSheet(true);
    try {
      const p = await onGenerateSheet();
      setSheetPath(p);
    } finally {
      setGeneratingSheet(false);
    }
  };

  const updated = verifyRows.filter((r) => r.result === 'UPDATED').length;
  const failed = verifyRows.filter((r) => r.result === 'FAILED').length;
  const skipped = verifyRows.filter((r) => r.result === 'SKIPPED').length;
  const mismatch = verifyRows.filter((r) => r.result === 'MISMATCH').length;

  const results = extractResults(events);
  const last20 = events.slice(-20);

  return (
    <div>
      <div style={{ padding: 16, display: 'grid', gap: 12 }}>
        <div
          style={{ border: '1px solid #ddd', borderRadius: 12, padding: 12 }}
        >
          <h3 style={{ marginTop: 0 }}>Summary</h3>
          <div>✅ Updated: {updated}</div>
          <div>⚠️ Skipped: {skipped}</div>
          <div>❌ Failed: {failed}</div>
          {mismatch > 0 && <div>🔀 Mismatch: {mismatch}</div>}
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            onClick={() =>
              downloadJson(`crew-rename-log-${Date.now()}.json`, { events })
            }
            style={{ padding: 10 }}
          >
            Download Log (JSON)
          </button>

          <button
            onClick={handleGenerateSheet}
            disabled={generatingSheet}
            style={{ padding: 10 }}
          >
            {generatingSheet ? 'Generating…' : 'Generate Sign-Off Sheet'}
          </button>

          <button onClick={onBackToStart} style={{ padding: 10 }}>
            Back to Start
          </button>
        </div>

        {sheetPath && (
          <div style={{ fontSize: 12, color: '#555' }}>
            Sign-off sheet saved to: <strong>{sheetPath}</strong>
          </div>
        )}

        <div
          style={{ border: '1px solid #ddd', borderRadius: 12, padding: 12 }}
        >
          <h3 style={{ marginTop: 0 }}>Results</h3>

          {results.length === 0 ? (
            <div style={{ color: '#777' }}>No update results recorded.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th
                    style={{
                      textAlign: 'left',
                      borderBottom: '1px solid #ddd',
                      width: 110,
                    }}
                  >
                    Room
                  </th>
                  <th
                    style={{
                      textAlign: 'left',
                      borderBottom: '1px solid #ddd',
                      width: 120,
                    }}
                  >
                    Status
                  </th>
                  <th
                    style={{
                      textAlign: 'left',
                      borderBottom: '1px solid #ddd',
                    }}
                  >
                    Detail
                  </th>
                  <th
                    style={{
                      textAlign: 'left',
                      borderBottom: '1px solid #ddd',
                      width: 140,
                    }}
                  >
                    Time
                  </th>
                </tr>
              </thead>

              <tbody>
                {results.map((r, idx) => (
                  <tr key={idx}>
                    <td style={{ padding: 8 }}>{r.roomNo ?? '—'}</td>
                    <td style={{ padding: 8 }}>{r.status}</td>
                    <td style={{ padding: 8 }}>{r.message}</td>
                    <td style={{ padding: 8 }}>
                      {new Date(r.ts).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div
          style={{ border: '1px solid #ddd', borderRadius: 12, padding: 12 }}
        >
          <h3 style={{ marginTop: 0 }}>Last events</h3>
          <div
            style={{
              maxHeight: 220,
              overflow: 'auto',
              fontFamily:
                'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
              fontSize: 12,
              lineHeight: 1.5,
            }}
          >
            {last20.length === 0 ? (
              <div style={{ color: '#777' }}>No events recorded.</div>
            ) : (
              last20.map((e, idx) => (
                <div key={idx}>
                  [{new Date(e.ts).toLocaleTimeString()}] {e.message}
                </div>
              ))
            )}
          </div>
        </div>

        {savedLogPath ? (
          <div style={{ fontSize: 12, color: '#555' }}>
            Log saved to: <strong>{savedLogPath}</strong>
          </div>
        ) : (
          <div style={{ fontSize: 12, color: '#999' }}>
            Log could not be saved automatically.
          </div>
        )}
      </div>
    </div>
  );
}
