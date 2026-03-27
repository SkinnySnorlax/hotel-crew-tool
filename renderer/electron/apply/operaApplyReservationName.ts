import type { Page } from 'playwright';

export type ApplyReservationNameInput = {
  reservationId: string;
  expectedCurrentName: string;
  expectedRoomNo?: string | null;
  firstName: string;
  lastName: string;
};

function normalizeText(value: string | null | undefined): string {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

export async function applyReservationNameInOpera(
  page: Page,
  input: ApplyReservationNameInput,
): Promise<void> {
  const {
    reservationId,
    expectedCurrentName,
    expectedRoomNo,
    firstName,
    lastName,
  } = input;

  // Main Manage Reservations grid only
  const reservationGrid = page.locator('div[id$=":pc1:t1"]').first();
  await reservationGrid.waitFor({ state: 'visible', timeout: 30000 });

  // Find the row inside the main grid only
  const reservationLink = reservationGrid
    .locator('a[id$=":l1"]', { hasText: reservationId })
    .first();

  await reservationLink.waitFor({ state: 'visible', timeout: 10000 });

  const row = reservationLink.locator('xpath=ancestor::tr[1]');
  await row.waitFor({ state: 'visible', timeout: 10000 });

  // Safety check on current placeholder name
  const currentNameText = normalizeText(
    await row.locator('a[id$=":l2"]').first().textContent(),
  );

  if (currentNameText !== normalizeText(expectedCurrentName)) {
    throw new Error(
      `Reservation ${reservationId} current name mismatch. Expected "${expectedCurrentName}", found "${currentNameText}"`,
    );
  }

  // Safety check on room number
  if (expectedRoomNo) {
    const roomNoText = normalizeText(
      await row.locator('a[id$=":rid1:dc_l1"]').first().textContent(),
    );

    if (roomNoText !== normalizeText(expectedRoomNo)) {
      throw new Error(
        `Reservation ${reservationId} room mismatch. Expected "${expectedRoomNo}", found "${roomNoText}"`,
      );
    }
  }

  // Open Linked Profiles popup
  const nameLink = row.locator('a[id$=":l2"]').first();
  await nameLink.waitFor({ state: 'visible', timeout: 10000 });
  await nameLink.click();

  const linkedProfilesTitle = page.locator('div.x2c7', {
    hasText: 'Linked Profiles',
  });
  await linkedProfilesTitle.waitFor({ state: 'visible', timeout: 10000 });

  // Click Edit
  const editLink = page.getByRole('link', { name: 'Edit' }).last();
  await editLink.waitFor({ state: 'visible', timeout: 10000 });
  await editLink.click();

  // Edit fields
  const firstNameInput = page
    .locator('input[id$=":fe14:it1:odec_it_it::content"]')
    .last();

  const nameInput = page
    .locator('input[id$=":fe2:it3:odec_it_it::content"]')
    .last();

  await nameInput.waitFor({ state: 'visible', timeout: 15000 });
  await firstNameInput.waitFor({ state: 'visible', timeout: 15000 });

  await nameInput.click();
  await nameInput.fill('');
  await nameInput.fill(lastName);

  await firstNameInput.click();
  await firstNameInput.fill('');
  await firstNameInput.fill(firstName);

  await page.waitForTimeout(800);

  // Save
  const saveButton = page.getByRole('button', { name: 'Save' }).last();
  await saveButton.waitFor({ state: 'visible', timeout: 10000 });
  await saveButton.click();

  await page.waitForLoadState('load').catch(() => {});
  await page.waitForTimeout(1500);

  // Close popup
  const closeButton = page.locator('a[id$=":drp1:odec_pw1::close"]').last();
  await closeButton.waitFor({ state: 'visible', timeout: 10000 });
  await closeButton.click();

  // Wait for popup to actually close
  await closeButton.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {
    // Oracle sometimes leaves the node in DOM; fall through to grid wait
  });

  // Wait for main reservation grid to be ready again for next row
  await reservationGrid.waitFor({ state: 'visible', timeout: 30000 });
  await reservationLink
    .waitFor({ state: 'visible', timeout: 10000 })
    .catch(() => {
      // Row content may refresh after save; main grid visibility is the main reset signal
    });

  await page.waitForTimeout(1200);
}
