import type { ProgressEvent } from '../types/progress';

type Props = {
  events: ProgressEvent[];
  onBackToStart: () => void;
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

export function DonePage({ events, onBackToStart }: Props) {
  const updated = events.filter((e) => e.status === 'UPDATED').length;
  const failed = events.filter((e) => e.status === 'FAILED').length;
  const skipped = events.filter((e) => e.status === 'SKIPPED').length;

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

          <button onClick={onBackToStart} style={{ padding: 10 }}>
            Back to Start
          </button>
        </div>

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

        <div style={{ fontSize: 12, color: '#555' }}>
          Note: In the Electron .exe version, logs will be saved to disk
          automatically.
        </div>
      </div>
    </div>
  );
}
