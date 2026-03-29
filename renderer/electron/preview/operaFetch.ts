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
  },
): Promise<OperaReservation[]> {
  const { placeholderOnly = true } = options ?? {};

  // Wait for the Manage Block Reservation grid to exist.
  const grid = page.locator('[id*="oc_srch_rslts_tbl_tmpl"][id$=":t1"]');
  await grid.waitFor({ state: 'visible', timeout: 60000 });

  // Real data rows have _afrrk on the tr.
  const rows = page.locator(
    'tr[_afrrk][id*="oc_srch_rslts_tbl_tmpl"], tr[_afrrk]',
  );

  const rowCount = await rows.count();
  const results: OperaReservation[] = [];

  for (let i = 0; i < rowCount; i += 1) {
    const row = rows.nth(i);

    const confirmationNo = normalizeText(
      await row
        .locator('a[id$=":l1"]')
        .first()
        .textContent()
        .catch(() => ''),
    );

    const currentName = normalizeText(
      await row
        .locator('a[id$=":l2"]')
        .first()
        .textContent()
        .catch(() => ''),
    );

    const roomNo = normalizeText(
      await row
        .locator('a[id$=":rid1:dc_l1"]')
        .first()
        .textContent()
        .catch(() => ''),
    );

    if (!confirmationNo || !currentName || !roomNo) continue;
    if (!isAllowedRoom(roomNo)) continue;

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
