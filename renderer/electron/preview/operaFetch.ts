import type { Page } from 'playwright';
import type { OperaReservation } from './types.js';

function normalizeText(value: string | null | undefined): string {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

function isAllowedPlaceholder(name: string): boolean {
  const n = normalizeText(name).toUpperCase();

  return (
    n === 'SINGAPORE AIRLINES CREW' ||
    n === 'SINGAPORE AIRLINES CREW (NIGHT)' ||
    n === 'SINGAPORE AIRLINES TECH CREW' ||
    n === 'SINGAPORE AIRLINES TECH CREW (NIGHT)'
  );
}

function isAllowedRoom(roomNo: string): boolean {
  return /^[01]/.test(roomNo);
}

export async function fetchOperaReservationsFromManageReservations(
  page: Page,
  options?: {
    placeholderOnly?: boolean;
    log?: (msg: string) => void;
  },
): Promise<OperaReservation[]> {
  const { placeholderOnly = true, log = console.log } = options ?? {};

  log(`[fetch] page URL: ${page.url()}`);

  // Wait for the Manage Reservations grid specifically.
  // After clicking "Manage Reservations", ADF does a partial page refresh —
  // the old Manage Block search grid (same component, same ID pattern) can
  // still be in the DOM while the new grid loads in. waitFor({ state: 'visible' })
  // matches both grids. We must wait until the grid has a "Confirmation Number"
  // column header, which only exists on the Manage Reservations grid.
  // Then also wait for a data row's confirmation number link to have text,
  // since ADF populates row content after the grid container is visible.
  log('[fetch] waiting for Manage Reservations grid with data...');
  await page.waitForFunction(() => {
    const table = document.querySelector(
      '[id*="oc_srch_rslts_tbl_tmpl"][id$=":t1"]',
    );
    if (!table) return false;
    const ths = Array.from(table.querySelectorAll('th[role="columnheader"]'));
    const hasConfCol = ths.some(
      (th) =>
        (th.querySelector('span')?.textContent?.trim() ??
          (th as HTMLElement).textContent?.trim() ??
          '') === 'Confirmation Number',
    );
    if (!hasConfCol) return false;
    const l1 = table.querySelector('tr[_afrrk] a[id$=":l1"]');
    return !!l1 && (l1.textContent?.trim() ?? '') !== '';
  }, { timeout: 60000 }).catch(() => {
    log('[fetch] Manage Reservations grid not ready — block may be empty');
  });
  log('[fetch] grid ready');

  // Batch-extract all row data in a single browser evaluate to avoid per-element
  // IPC round-trips (each carry a 30s default timeout and hang on rows that are
  // missing an expected anchor element).
  //
  // Column detection is dynamic: we match <th> elements by their visible span
  // text and record each header's DOM sibling-index.  That index equals the
  // matching <td> index in every data row, so this survives column reordering,
  // additions, or removals by hotel admins — no hardcoded :lN anchor-ID suffixes.
  const rawRows = await page.evaluate(() => {
    const table = document.querySelector(
      '[id*="oc_srch_rslts_tbl_tmpl"][id$=":t1"]',
    );
    if (!table) return [];

    // Map column header label → td sibling index.
    const colIndex: Record<string, number> = {};
    const ths = Array.from(
      table.querySelectorAll<HTMLElement>('th[role="columnheader"]'),
    );
    ths.forEach((th, i) => {
      const label =
        th.querySelector('span')?.textContent?.trim() ??
        th.textContent?.trim() ??
        '';
      if (label) colIndex[label] = i;
    });

    function cellText(tr: Element, label: string): string {
      const idx = colIndex[label];
      if (idx === undefined) return '';
      const td = tr.querySelectorAll('td')[idx];
      if (!td) return '';
      // Prefer anchor text (e.g. "Assign Room" link); fall back to td text.
      return (
        ((td.querySelector('a') ?? td) as HTMLElement).textContent?.trim() ?? ''
      );
    }

    return Array.from(table.querySelectorAll('tr[_afrrk]')).map((tr) => ({
      confirmationNo: cellText(tr, 'Confirmation Number'),
      currentName: cellText(tr, 'Name'),
      roomNoRaw: cellText(tr, 'Room'),
      roomType: cellText(tr, 'Room Type'),
    }));
  });

  log(`[fetch] row count: ${rawRows.length}`);
  if (rawRows.length <= 3) {
    rawRows.forEach((r, i) =>
      log(
        `[fetch] row[${i}]: conf="${r.confirmationNo}" name="${r.currentName}" room="${r.roomNoRaw}" type="${r.roomType}"`,
      ),
    );
  }
  const results: OperaReservation[] = [];

  for (const data of rawRows) {
    const confirmationNo = normalizeText(data.confirmationNo);
    const currentName = normalizeText(data.currentName);
    // "Assign Room" = active but unassigned → treat as empty room number
    const roomNoRaw = normalizeText(data.roomNoRaw);
    const roomNo = roomNoRaw === 'Assign Room' ? '' : roomNoRaw;
    const roomType = normalizeText(data.roomType).toUpperCase();

    if (!confirmationNo || !currentName) continue;
    // No room cell text at all = cancelled / invalid reservation — skip
    if (!roomNoRaw) continue;
    // PM room type (posting master) — skip
    if (roomType === 'PM') continue;
    // Non-empty room not on floor 0 or 1 (e.g. 90xx) — skip
    if (roomNo && !isAllowedRoom(roomNo)) continue;
    if (placeholderOnly && !isAllowedPlaceholder(currentName)) continue;

    results.push({
      reservationId: confirmationNo,
      confirmationNo,
      roomNo,
      currentName,
    });
  }

  return results;
}
