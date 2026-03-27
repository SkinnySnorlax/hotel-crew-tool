import {
  chromium,
  type Browser,
  type BrowserContext,
  type Page,
} from 'playwright';

const OPERA_LOGIN_URL =
  'https://mtca1.oraclehospitality.ap-sydney-1.ocs.oraclecloud.com/EVTEP/operacloud/faces/opera-cloud-index/OperaCloud';

export type OperaLoginSession = {
  browser: Browser;
  context: BrowserContext;
  page: Page;
};

type LoginArgs = {
  username: string;
  password: string;
};

export async function loginToOpera({
  username,
  password,
}: LoginArgs): Promise<OperaLoginSession> {
  const browser = await chromium.launch({
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 960 },
  });

  const page = await context.newPage();

  await page.goto(OPERA_LOGIN_URL, { waitUntil: 'load' });

  const usernameInput = page.locator('#idcs-signin-basic-signin-form-username');
  const passwordInput = page.locator(
    '#idcs-signin-basic-signin-form-password\\|input',
  );
  const signInButton = page.locator('#idcs-signin-basic-signin-form-submit');

  await usernameInput.waitFor({ state: 'visible' });
  await usernameInput.fill(username);
  await passwordInput.fill(password);

  const beforeUrl = page.url();

  await signInButton.click();

  // Wait for login flow / redirects to move off the login URL.
  await page.waitForURL((url) => url.toString() !== beforeUrl, {
    timeout: 30000,
  });

  // Let the destination page finish its initial load.
  await page.waitForLoadState('load');

  // Safety check: if username field is still visible after redirect, treat as failed.
  const stillOnLogin = await usernameInput.isVisible().catch(() => false);
  if (stillOnLogin) {
    throw new Error(
      `Opera login appears to have failed. Current URL: ${page.url()}`,
    );
  }

  return { browser, context, page };
}
