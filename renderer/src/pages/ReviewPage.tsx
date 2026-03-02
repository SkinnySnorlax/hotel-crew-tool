import React from 'react';
import type { MappingRow } from '../types/mapping';

import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';

import {
  SortableContext,
  useSortable,
  arrayMove,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';

type Props = {
  rows: MappingRow[];
  setRows: React.Dispatch<React.SetStateAction<MappingRow[]>>;
  onConfirmApply: () => void;
  onBack: () => void;
};

function SortableHandleCell({
  id,
  disabled,
}: {
  id: string;
  disabled: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useSortable({
    id,
    disabled,
  });

  return (
    <span
      ref={setNodeRef}
      style={{
        opacity: isDragging ? 0.3 : 1,
        display: 'inline-flex',
        alignItems: 'center',
      }}
      {...attributes}
      {...listeners}
    >
      <span
        aria-label="Drag handle"
        title="Drag to reorder names"
        style={{
          cursor: disabled ? 'not-allowed' : 'grab',
          userSelect: 'none',
          padding: '0 8px',
          fontSize: 18,
          lineHeight: 1,
        }}
      >
        ☰
      </span>
    </span>
  );
}

export function ReviewPage({ rows, setRows, onConfirmApply, onBack }: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const patchRow = (rowId: string, patch: Partial<MappingRow>) => {
    setRows(rows.map((r) => (r.rowId === rowId ? { ...r, ...patch } : r)));
  };

  // Only reorder "newName" across eligible rows; rooms stay fixed.
  const eligibleRowIds = rows
    .filter((r) => r.apply && !!r.newName)
    .map((r) => r.rowId);

  // Freeze lane at drag start so indices don't shift mid-drag.
  const dragLaneRef = React.useRef<string[]>([]);
  const lastOverRef = React.useRef<string | null>(null);

  const [activeId, setActiveId] = React.useState<string | null>(null);

  const reorderWithinLane = (
    lane: string[],
    activeRowId: string,
    overRowId: string,
  ) => {
    if (activeRowId === overRowId) return;

    const fromIndex = lane.indexOf(activeRowId);
    const toIndex = lane.indexOf(overRowId);
    if (fromIndex < 0 || toIndex < 0) return;

    // Map current rows by id for lookup
    const rowById = new Map(rows.map((r) => [r.rowId, r] as const));

    // Extract names in lane order
    const namesInLane = lane.map((id) => rowById.get(id)?.newName ?? null);

    // Reorder names only
    const moved = arrayMove(namesInLane, fromIndex, toIndex);

    // Write back reordered names to same lane rows
    const nameByRowId = new Map<string, string | null>();
    lane.forEach((id, idx) => nameByRowId.set(id, moved[idx] ?? null));

    setRows(
      rows.map((r) =>
        nameByRowId.has(r.rowId)
          ? { ...r, newName: nameByRowId.get(r.rowId) ?? null }
          : r,
      ),
    );
  };

  const handleDragStart = (event: DragStartEvent) => {
    const id = String(event.active.id);
    setActiveId(id);

    if (eligibleRowIds.includes(id)) {
      dragLaneRef.current = eligibleRowIds.slice();
    } else {
      dragLaneRef.current = [];
    }

    lastOverRef.current = null;
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const lane = dragLaneRef.current;
    if (lane.length === 0) return;

    const activeRowId = String(active.id);
    const overRowId = String(over.id);

    if (lastOverRef.current === overRowId) return;
    lastOverRef.current = overRowId;

    reorderWithinLane(lane, activeRowId, overRowId);
  };

  const handleDragEnd = (_event: DragEndEvent) => {
    dragLaneRef.current = [];
    lastOverRef.current = null;
    setActiveId(null);
  };

  const activeName = activeId
    ? (rows.find((r) => r.rowId === activeId)?.newName ?? '')
    : '';

  return (
    <div>
      <div style={{ padding: 16 }}>
        <div style={{ marginBottom: 12, display: 'flex', gap: 8 }}>
          <button onClick={onBack} style={{ padding: 8 }}>
            Back
          </button>
          <button onClick={onConfirmApply} style={{ padding: 8 }}>
            Confirm Apply
          </button>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          {/* Draggables are eligible rows only */}
          <SortableContext
            items={eligibleRowIds}
            strategy={verticalListSortingStrategy}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th
                    style={{
                      textAlign: 'left',
                      borderBottom: '1px solid #ddd',
                      width: 60,
                    }}
                  >
                    Move
                  </th>
                  <th
                    style={{
                      textAlign: 'left',
                      borderBottom: '1px solid #ddd',
                    }}
                  >
                    New Name
                  </th>
                  <th
                    style={{
                      textAlign: 'left',
                      borderBottom: '1px solid #ddd',
                      width: 120,
                    }}
                  >
                    Room
                  </th>
                  <th
                    style={{
                      textAlign: 'left',
                      borderBottom: '1px solid #ddd',
                    }}
                  >
                    Current Name
                  </th>
                  <th
                    style={{
                      textAlign: 'left',
                      borderBottom: '1px solid #ddd',
                      width: 220,
                    }}
                  >
                    Status
                  </th>
                  <th
                    style={{
                      textAlign: 'left',
                      borderBottom: '1px solid #ddd',
                      width: 60,
                    }}
                  >
                    Apply
                  </th>
                </tr>
              </thead>

              <tbody>
                {rows.map((r) => {
                  const draggable = r.apply && !!r.newName;

                  return (
                    <tr key={r.rowId}>
                      {/* Move */}
                      <td style={{ padding: 8 }}>
                        <SortableHandleCell
                          id={r.rowId}
                          disabled={!draggable}
                        />
                      </td>

                      {/* New Name */}
                      <td style={{ padding: 8 }}>
                        <input
                          value={r.newName ?? ''}
                          onChange={(e) =>
                            patchRow(r.rowId, { newName: e.target.value })
                          }
                          placeholder="Type name…"
                          style={{ width: '100%', padding: 6 }}
                        />
                        {!draggable && (
                          <div
                            style={{
                              fontSize: 12,
                              color: '#777',
                              marginTop: 4,
                            }}
                          >
                            {r.apply
                              ? 'Enter a name to enable drag'
                              : 'Enable Apply to drag'}
                          </div>
                        )}
                      </td>

                      {/* Room */}
                      <td style={{ padding: 8 }}>{r.roomNo ?? 'Unassigned'}</td>

                      {/* Current Name */}
                      <td style={{ padding: 8 }}>{r.currentName}</td>

                      {/* Status */}
                      <td style={{ padding: 8 }}>
                        {r.status}
                        {r.message ? ` — ${r.message}` : ''}
                      </td>

                      {/* Apply */}
                      <td style={{ padding: 8 }}>
                        <input
                          type="checkbox"
                          checked={r.apply}
                          onChange={(e) =>
                            patchRow(r.rowId, { apply: e.target.checked })
                          }
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </SortableContext>

          {/* Floating drag preview so the handle doesn't "snap back" visually */}
          <DragOverlay>
            {activeId ? (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 10px',
                  border: '1px solid #ddd',
                  borderRadius: 10,
                  background: '#fff',
                  boxShadow: '0 6px 18px rgba(0,0,0,0.15)',
                  cursor: 'grabbing',
                  maxWidth: 460,
                }}
              >
                <span style={{ userSelect: 'none', fontSize: 18 }}>☰</span>
                <span
                  style={{
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {activeName}
                </span>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>

        <div style={{ marginTop: 10, color: '#555', fontSize: 12 }}>
          Drag using ☰ to move the <b>name assignment</b> up/down. Rooms stay
          fixed.
        </div>
      </div>
    </div>
  );
}
