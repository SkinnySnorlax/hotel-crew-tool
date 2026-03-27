import type { Page } from 'playwright';

type Args = {
  blockCode: string;
};

export async function openManageReservationsForBlock(
  page: Page,
  { blockCode }: Args,
): Promise<void> {
  await page.waitForLoadState('load');

  // Manage Block search page
  const blockCodeInput = page.getByLabel('Block Code').first();
  const searchButton = page.getByRole('button', { name: 'Search' }).last();

  await blockCodeInput.waitFor({ state: 'visible', timeout: 30000 });
  await blockCodeInput.fill(blockCode);

  await Promise.all([page.waitForLoadState('load'), searchButton.click()]);

  // Result row should contain the searched block code
  const resultRow = page.locator('tr', { hasText: blockCode }).first();
  await resultRow.waitFor({ state: 'visible', timeout: 30000 });

  // Click the I Want To control in the first result row.
  // Your screenshots show the visible trigger as the “3” button.
  const iWantToLink = resultRow.locator('a[title="I Want To…"]').first();
  await iWantToLink.waitFor({ state: 'visible', timeout: 30000 });
  await iWantToLink.click();

  // Popup contains "Manage Reservations"
  const manageReservationsLink = page.getByRole('link', {
    name: 'Manage Reservations',
  });
  await manageReservationsLink.waitFor({ state: 'visible', timeout: 30000 });
  await manageReservationsLink.click();

  await page.waitForLoadState('load');
}
