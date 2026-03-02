import React from 'react';

type StepKey = 'START' | 'REVIEW' | 'APPLY_RUNNING' | 'VERIFY' | 'DONE';

type Props = {
  step: string;
  title?: string;
  children: React.ReactNode;
};

const STEPS: { key: StepKey; label: string }[] = [
  { key: 'START', label: 'Start' },
  { key: 'REVIEW', label: 'Review' },
  { key: 'APPLY_RUNNING', label: 'Apply' },
  { key: 'VERIFY', label: 'Verify' },
  { key: 'DONE', label: 'Done' },
];

function stepIndex(step: string) {
  const idx = STEPS.findIndex((s) => s.key === step);
  return idx < 0 ? 0 : idx;
}

export function AppShell({ step, title, children }: Props) {
  const idx = stepIndex(step);

  return (
    <div style={{ minHeight: '100vh', background: '#fafafa' }}>
      {/* Top bar */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          background: '#fff',
          borderBottom: '1px solid #e5e5e5',
        }}
      >
        <div
          style={{
            maxWidth: 1100,
            margin: '0 auto',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div>
            <div style={{ fontWeight: 700 }}>Crew Rename Tool</div>
            <div style={{ fontSize: 12, color: '#666' }}>
              Opera Cloud — Front Office Automation
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 12, color: '#666' }}>Current step</div>
            <div style={{ fontWeight: 600 }}>{title ?? STEPS[idx]?.label}</div>
          </div>
        </div>

        {/* Step indicator */}
        <div style={{ background: '#fff' }}>
          <div
            style={{
              maxWidth: 1100,
              margin: '0 auto',
              padding: '8px 16px 12px 16px',
              display: 'flex',
              gap: 10,
              flexWrap: 'wrap',
              alignItems: 'center',
            }}
          >
            {STEPS.map((s, i) => {
              const isDone = i < idx;
              const isActive = i === idx;
              return (
                <div
                  key={s.key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    opacity: isDone || isActive ? 1 : 0.5,
                  }}
                >
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 999,
                      display: 'grid',
                      placeItems: 'center',
                      border: '1px solid #ccc',
                      background: isActive ? '#111' : isDone ? '#777' : '#fff',
                      color: isActive || isDone ? '#fff' : '#111',
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    {i + 1}
                  </div>
                  <div
                    style={{ fontSize: 13, fontWeight: isActive ? 700 : 500 }}
                  >
                    {s.label}
                  </div>
                  {i !== STEPS.length - 1 && (
                    <div style={{ width: 28, height: 1, background: '#ddd' }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Page body */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '16px' }}>
        <div
          style={{
            background: '#fff',
            border: '1px solid #e5e5e5',
            borderRadius: 14,
            padding: 16,
            boxShadow: '0 6px 20px rgba(0,0,0,0.04)',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
