import type { MappingRow } from '../types/mapping';

type VerifyRow = MappingRow & {
  beforeName: string;
  afterName: string | null;
  result: 'UPDATED' | 'SKIPPED' | 'FAILED' | 'MISMATCH';
  resultMessage?: string;
};

type Props = {
  verifyRows: VerifyRow[];
  onApplyCorrections: () => void;
  onFinish: () => void;
  onBackToReview: () => void;
};

function getResultLabel(result: VerifyRow['result']): string {
  switch (result) {
    case 'UPDATED':
      return 'Verified';
    case 'SKIPPED':
      return 'Skipped';
    case 'FAILED':
      return 'Failed';
    case 'MISMATCH':
      return 'Mismatch';
    default:
      return result;
  }
}

function getResultStyle(result: VerifyRow['result']): React.CSSProperties {
  switch (result) {
    case 'UPDATED':
      return { color: '#0a7f3f', fontWeight: 600 };
    case 'SKIPPED':
      return { color: '#666' };
    case 'FAILED':
      return { color: '#b42318', fontWeight: 600 };
    case 'MISMATCH':
      return { color: '#b54708', fontWeight: 600 };
    default:
      return {};
  }
}

export function VerifyPage({
  verifyRows,
  onApplyCorrections,
  onFinish,
  onBackToReview,
}: Props) {
  const issues = verifyRows.filter(
    (r) => r.result === 'FAILED' || r.result === 'MISMATCH',
  );

  return (
    <div>
      <div style={{ padding: 16 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <button onClick={onBackToReview} style={{ padding: 8 }}>
            Back to Review
          </button>
          <button onClick={onApplyCorrections} style={{ padding: 8 }}>
            Retry Failed
          </button>
          <button onClick={onFinish} style={{ padding: 8 }}>
            Finish
          </button>
        </div>

        <div style={{ marginBottom: 10, color: '#555' }}>
          {issues.length === 0 ? (
            <div>✅ All rows verified successfully.</div>
          ) : (
            <div>⚠️ {issues.length} row(s) need attention.</div>
          )}
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th
                style={{
                  textAlign: 'left',
                  borderBottom: '1px solid #ddd',
                  width: 120,
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
                  width: 140,
                }}
              >
                Result
              </th>
            </tr>
          </thead>

          <tbody>
            {verifyRows.map((r) => (
              <tr key={r.rowId}>
                <td style={{ padding: 8, verticalAlign: 'top' }}>
                  <div>{r.roomNo ?? 'Unassigned'}</div>
                  <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                    Res ID: {r.reservationId}
                  </div>
                </td>

                <td style={{ padding: 8, verticalAlign: 'top' }}>
                  {r.beforeName}
                </td>

                <td style={{ padding: 8, verticalAlign: 'top' }}>
                  {r.newName ?? '—'}
                </td>

                <td style={{ padding: 8, verticalAlign: 'top' }}>
                  {r.afterName ?? '—'}
                </td>

                <td style={{ padding: 8, verticalAlign: 'top' }}>
                  <span style={getResultStyle(r.result)}>
                    {getResultLabel(r.result)}
                  </span>
                  {r.resultMessage ? ` — ${r.resultMessage}` : ''}
                </td>

              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
