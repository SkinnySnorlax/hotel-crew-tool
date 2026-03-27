import type { ProgressEvent } from '../types/progress';

type Props = {
  events: ProgressEvent[];
  onCancel: () => void;
};

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString();
}

export function PreviewLoadingPage({ events, onCancel }: Props) {
  const last = events[events.length - 1];

  return (
    <div>
      <div style={{ padding: 16, display: 'grid', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, color: '#555' }}>Current step</div>
            <div style={{ fontSize: 18 }}>{last?.message ?? 'Starting…'}</div>
          </div>

          <button onClick={onCancel} style={{ padding: 10 }}>
            Cancel
          </button>
        </div>

        <div
          style={{ border: '1px solid #ddd', borderRadius: 10, padding: 10 }}
        >
          <div style={{ fontSize: 12, color: '#555', marginBottom: 8 }}>
            Live log
          </div>
          <div
            style={{
              maxHeight: 320,
              overflow: 'auto',
              fontFamily:
                'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
              fontSize: 12,
              lineHeight: 1.5,
            }}
          >
            {events.length === 0 ? (
              <div style={{ color: '#999' }}>Waiting…</div>
            ) : (
              events.map((e, idx) => (
                <div key={idx}>
                  [{formatTime(e.ts)}] {e.message}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
