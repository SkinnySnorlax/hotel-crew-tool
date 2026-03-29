// electron/preview/operaNavigateToManageBlock.ts
import type { Page } from 'playwright';

export async function navigateToManageBlock(page: Page): Promise<void> {
  await page.waitForLoadState('load');
  // Give ADF time to finish its JS initialisation after load fires.
  await page.waitForTimeout(1500);

  const bookingsMenu = page.locator(
    '#pt1\\:oc_pg_pt\\:dm1\\:odec_drpmn_mb_grp\\:1\\:odec_drpmn_mb_mn [role="menuitem"][aria-label="Bookings"]',
  );

  const bookingsMenuPopup = page.locator(
    '#pt1\\:oc_pg_pt\\:dm1\\:odec_drpmn_mb_grp\\:1\\:odec_drpmn_mb_mn\\:\\:menu',
  );

  const blocksMenuItem = page.locator(
    '#pt1\\:oc_pg_pt\\:dm1\\:odec_drpmn_mb_grp\\:1\\:odec_drpmn_mb_mn_grp\\:0\\:odec_drpmn_mb_mn_si',
  );

  const blocksSubmenuPopup = page.locator(
    '#pt1\\:oc_pg_pt\\:dm1\\:odec_drpmn_mb_grp\\:1\\:odec_drpmn_mb_mn_grp\\:0\\:odec_drpmn_mb_mn_si\\:\\:menu',
  );

  const manageBlockItem = page.locator(
    '#pt1\\:oc_pg_pt\\:dm1\\:odec_drpmn_mb_grp\\:1\\:odec_drpmn_mb_mn_grp\\:0\\:odec_drpmn_mb_mn_si_grp\\:1\\:odec_drpmn_mb_mn_grp_itm',
  );

  await bookingsMenu.waitFor({ state: 'visible', timeout: 60000 });

  // ADF menus can swallow a click if the app hasn't fully initialised.
  // Retry up to 4 times with a short wait between attempts.
  let opened = false;
  for (let attempt = 0; attempt < 4; attempt++) {
    await bookingsMenu.click();
    const visible = await bookingsMenuPopup
      .waitFor({ state: 'visible', timeout: 5000 })
      .then(() => true)
      .catch(() => false);
    if (visible) { opened = true; break; }
    await page.waitForTimeout(800);
  }
  if (!opened) {
    throw new Error('Bookings menu popup did not open after multiple attempts');
  }

  await blocksMenuItem.waitFor({ state: 'visible', timeout: 30000 });

  // ADF submenus can silently ignore the first interaction.
  // Retry up to 4 times with a short wait between attempts.
  let submenuOpened = false;
  for (let attempt = 0; attempt < 4; attempt++) {
    await blocksMenuItem.click();
    const visible = await blocksSubmenuPopup
      .waitFor({ state: 'visible', timeout: 5000 })
      .then(() => true)
      .catch(() => false);
    if (visible) { submenuOpened = true; break; }
    await page.waitForTimeout(800);
  }
  if (!submenuOpened) {
    throw new Error('Blocks submenu did not open after multiple click attempts');
  }

  await manageBlockItem.waitFor({ state: 'visible', timeout: 30000 });
  console.log('[nav] manageBlockItem visible, clicking...');
  await manageBlockItem.click();
  console.log('[nav] manageBlockItem clicked — navigation to Manage Block page initiated');
}
