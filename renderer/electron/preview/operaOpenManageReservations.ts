import type { Page } from 'playwright';

type Args = {
  blockCode: string;
};

export async function openManageReservationsForBlock(
  page: Page,
  { blockCode }: Args,
): Promise<void> {
  // Manage Block search page — wait for the input instead of waitForLoadState
  // (ADF partial-page rendering doesn't always re-fire the 'load' event)
  const blockCodeInput = page.getByLabel('Block Code').first();
  const searchButton = page.getByRole('button', { name: 'Search' }).last();

  console.log('[open] waiting for Block Code input...');
  await blockCodeInput.waitFor({ state: 'visible', timeout: 60000 });
  console.log('[open] Block Code input visible, filling...');
  await blockCodeInput.fill(blockCode);

  console.log('[open] clicking Search...');
  await searchButton.click();

  // Result row should contain the searched block code
  const resultRow = page.locator('tr', { hasText: blockCode }).first();
  console.log('[open] waiting for result row...');
  await resultRow.waitFor({ state: 'visible', timeout: 30000 });
  console.log('[open] result row visible');

  // Click the I Want To control in the first result row.
  // Using getByTitle regex to avoid CSS attribute selector issues on Windows Chromium.
  const iWantToLink = resultRow.getByTitle(/I Want To/).first();
  await iWantToLink.waitFor({ state: 'visible', timeout: 30000 });

  // Popup contains “Manage Reservations”
  // Using hasText filter to avoid CSS attribute selector rejection on Windows Chromium.
  // ADF popups can swallow a click if the overlay hasn't fully initialised — retry up to 4 times.
  const manageReservationsLink = page.locator('a', { hasText: /Manage Reservations/ }).first();
  let popupOpened = false;
  for (let attempt = 0; attempt < 4; attempt++) {
    await iWantToLink.click();
    const visible = await manageReservationsLink
      .waitFor({ state: 'visible', timeout: 5000 })
      .then(() => true)
      .catch(() => false);
    if (visible) { popupOpened = true; break; }
    await page.waitForTimeout(800);
  }
  if (!popupOpened) {
    throw new Error('Manage Reservations popup did not open after multiple attempts');
  }
  console.log('[open] waiting for Manage Reservations link...');
  await manageReservationsLink.click();
  console.log('[open] Manage Reservations clicked');
}
