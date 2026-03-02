import React from 'react';
import type { ProgressEvent } from '../types/progress';

type Props = {
  events: ProgressEvent[];
  onCancel: () => void; // later: stop run
};

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString();
}

export function ApplyPage({ events, onCancel }: Props) {
  const last = events[events.length - 1];
  const percent =
    last?.current && last?.total
      ? Math.round((last.current / last.total) * 100)
      : 0;

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
          <div style={{ fontSize: 12, color: '#555' }}>Progress</div>
          <div
            style={{
              height: 10,
              background: '#eee',
              borderRadius: 6,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${percent}%`,
                height: '100%',
                background: '#999',
              }}
            />
          </div>
          <div style={{ marginTop: 6, fontSize: 12, color: '#555' }}>
            {last?.current && last?.total
              ? `${last.current}/${last.total} (${percent}%)`
              : '—'}
          </div>
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
            {events.map((e, idx) => (
              <div key={idx}>
                [{formatTime(e.ts)}] {e.message}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
