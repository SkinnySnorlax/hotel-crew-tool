import React from 'react';
import type { StartForm } from '../state/appState';

type Props = {
  form: StartForm;
  setForm: React.Dispatch<React.SetStateAction<StartForm>>;
  onPreview: () => void;
};

export function StartPage({ form, setForm, onPreview }: Props) {
  return (
    <div>
      <div style={{ padding: 16, maxWidth: 720 }}>
        <div style={{ display: 'grid', gap: 12 }}>
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
            <input
              value={form.blockCode}
              onChange={(e) => setForm({ ...form, blockCode: e.target.value })}
              placeholder="e.g. SIA_CREW"
              style={{ display: 'block', width: '100%', padding: 8 }}
            />
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

          <button
            onClick={onPreview}
            disabled={
              !form.txtFile ||
              !form.blockCode ||
              !form.username ||
              !form.password
            }
            style={{ padding: 10, cursor: 'pointer' }}
          >
            Preview (Read-only)
          </button>

          <small style={{ color: '#555' }}>
            Preview will parse the TXT + fetch reservations/rooms from Opera and
            show the mapping table. No changes will be made until you confirm.
          </small>
        </div>
      </div>
    </div>
  );
}
