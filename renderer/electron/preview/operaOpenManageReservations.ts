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
  const iWantToLink = resultRow.locator('a[title=”I Want To…”]').first();
  await iWantToLink.waitFor({ state: 'visible', timeout: 30000 });
  await iWantToLink.click();

  // Popup contains “Manage Reservations”
  const manageReservationsLink = page.getByRole('link', {
    name: 'Manage Reservations',
  });
  console.log('[open] waiting for Manage Reservations link...');
  await manageReservationsLink.waitFor({ state: 'visible', timeout: 30000 });
  await manageReservationsLink.click();
  console.log('[open] Manage Reservations clicked');
}
