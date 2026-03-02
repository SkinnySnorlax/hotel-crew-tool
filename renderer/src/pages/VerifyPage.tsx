import type { MappingRow } from '../types/mapping';

type VerifyRow = MappingRow & {
  beforeName: string; // what it was before apply
  afterName: string | null; // what Opera shows after apply (mocked for now)
  result: 'UPDATED' | 'SKIPPED' | 'FAILED';
  resultMessage?: string;
};

type Props = {
  verifyRows: VerifyRow[];
  setVerifyRows: React.Dispatch<React.SetStateAction<VerifyRow[]>>;

  onApplyCorrections: () => void; // later: run small apply pass
  onFinish: () => void;
  onBackToReview: () => void;
};

export function VerifyPage({
  verifyRows,
  setVerifyRows,
  onApplyCorrections,
  onFinish,
  onBackToReview,
}: Props) {
  const patch = (rowId: string, patch: Partial<VerifyRow>) => {
    setVerifyRows(
      verifyRows.map((r) => (r.rowId === rowId ? { ...r, ...patch } : r)),
    );
  };

  const issues = verifyRows.filter((r) => r.result !== 'UPDATED');

  return (
    <div>
      <div style={{ padding: 16 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <button onClick={onBackToReview} style={{ padding: 8 }}>
            Back to Review
          </button>
          <button onClick={onApplyCorrections} style={{ padding: 8 }}>
            Apply Corrections
          </button>
          <button onClick={onFinish} style={{ padding: 8 }}>
            Finish
          </button>
        </div>

        <div style={{ marginBottom: 10, color: '#555' }}>
          {issues.length === 0 ? (
            <div>✅ All rows look updated.</div>
          ) : (
            <div>
              ⚠️ {issues.length} row(s) need attention (skipped/failed).
            </div>
          )}
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th
                style={{
                  textAlign: 'left',
                  borderBottom: '1px solid #ddd',
                  width: 90,
                }}
              >
                Room
              </th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>
                Before
              </th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>
                Intended
              </th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>
                After (from Opera)
              </th>
              <th
                style={{
                  textAlign: 'left',
                  borderBottom: '1px solid #ddd',
                  width: 120,
                }}
              >
                Result
              </th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>
                Fix (optional)
              </th>
            </tr>
          </thead>

          <tbody>
            {verifyRows.map((r) => (
              <tr key={r.rowId}>
                <td style={{ padding: 8 }}>{r.roomNo ?? 'Unassigned'}</td>

                <td style={{ padding: 8 }}>{r.beforeName}</td>

                <td style={{ padding: 8 }}>{r.newName ?? '—'}</td>

                <td style={{ padding: 8 }}>{r.afterName ?? '—'}</td>

                <td style={{ padding: 8 }}>
                  {r.result}
                  {r.resultMessage ? ` — ${r.resultMessage}` : ''}
                </td>

                <td style={{ padding: 8 }}>
                  <input
                    value={r.newName ?? ''}
                    onChange={(e) =>
                      patch(r.rowId, { newName: e.target.value })
                    }
                    placeholder="Type corrected name…"
                    style={{ width: '100%', padding: 6 }}
                  />
                  <div style={{ fontSize: 12, color: '#777', marginTop: 4 }}>
                    Edit here only if Opera “After” is wrong.
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ marginTop: 12, fontSize: 12, color: '#555' }}>
          Notes: “After (from Opera)” will be real once we connect Playwright
          re-fetch. For now this is mocked.
        </div>
      </div>
    </div>
  );
}
