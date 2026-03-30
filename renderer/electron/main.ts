// electron/main.ts
import { app, BrowserWindow, ipcMain, safeStorage, dialog } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import type {
  PreviewRunRequest,
  PreviewRunResult,
  ApplyRunRequest,
  ApplyRunResult,
  VerifyRunRequest,
  VerifyRunResult,
  SaveLogRequest,
  SaveLogResult,
  SaveCredentialsRequest,
  LoadCredentialsResult,
  GenerateSheetRequest,
  FetchAndGenerateSheetRequest,
  GenerateSheetResult,
  SheetRow,
} from '../src/types/ipc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BROWSERS_PATH = path.join(app.getPath('userData'), 'pw-browsers');
process.env.PLAYWRIGHT_BROWSERS_PATH = BROWSERS_PATH;

async function ensureChromium(): Promise<void> {
  const { chromium } = await import('playwright');
  try {
    if (fs.existsSync(chromium.executablePath())) return;
  } catch {
    /* executablePath throws if not installed — fall through to install */
  }

  const setupWin = new BrowserWindow({
    width: 480,
    height: 180,
    frame: false,
    resizable: false,
    center: true,
    webPreferences: { contextIsolation: true },
  });
  await setupWin.loadURL(
    'data:text/html;charset=utf-8,' +
      encodeURIComponent(
        `<!DOCTYPE html><html><body style="margin:0;display:flex;align-items:center;justify-content:center;height:100vh;background:#fafafa;font-family:system-ui,sans-serif;text-align:center;color:#333">
        <div><p style="font-size:15px;font-weight:600;margin:0 0 8px">First-time setup</p>
        <p style="font-size:13px;color:#666;margin:0">Downloading browser engine (one-time, ~150 MB)…<br>Please wait, this may take a few minutes.</p></div>
      </body></html>`,
      ),
  );

  const appDir = app.isPackaged
    ? app.getAppPath().replace('app.asar', 'app.asar.unpacked')
    : app.getAppPath();
  const cli = path.join(appDir, 'node_modules', 'playwright', 'cli.js');

  if (!fs.existsSync(cli)) {
    setupWin.close();
    await dialog.showMessageBox({
      type: 'error',
      title: 'Setup Failed',
      message: 'Browser installer not found. Please reinstall the application.',
      detail: `Expected CLI at: ${cli}`,
      buttons: ['Quit'],
    });
    app.quit();
    return;
  }

  try {
    await new Promise<void>((resolve, reject) => {
      const proc = spawn(process.execPath, [cli, 'install', 'chromium'], {
        env: {
          ...process.env,
          ELECTRON_RUN_AS_NODE: '1',
          PLAYWRIGHT_BROWSERS_PATH: BROWSERS_PATH,
        },
      });
      let stderr = '';
      proc.stderr?.on('data', (d: Buffer) => {
        stderr += d.toString();
      });
      proc.on('error', (err) =>
        reject(new Error(`spawn failed: ${err.message}`)),
      );
      proc.on('close', (code) =>
        code === 0
          ? resolve()
          : reject(new Error(`Exit code ${code}\n${stderr.slice(-2000)}`)),
      );
    });
  } catch (err) {
    setupWin.close();
    await dialog.showMessageBox({
      type: 'error',
      title: 'Setup Failed',
      message:
        'Failed to download browser engine. Please check your internet connection and restart.',
      detail: `CLI: ${cli}\n\n${err instanceof Error ? err.message : String(err)}`,
      buttons: ['Quit'],
    });
    app.quit();
    return;
  }
  setupWin.close();
}

let mainWindow: BrowserWindow | null = null;
let activeSession: { browser: import('playwright').Browser } | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  const isDev = !app.isPackaged;

  if (isDev) {
    // Vite dev server
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    // Vite build output
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(async () => {
  await ensureChromium();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle(
  'previewRun',
  async (event, req: PreviewRunRequest): Promise<PreviewRunResult> => {
    const { dateISO, blockCode, txtContent, username, password } = req;
    const { parseTxt } = await import('./preview/parseTxt.js');
    const { buildPreviewRows } = await import('./preview/mapping.js');
    const { loginToOpera } = await import('./preview/operaLogin.js');
    const { navigateToManageBlock } =
      await import('./preview/operaNavigateToManageBlock.js');
    const { openManageReservationsForBlock } =
      await import('./preview/operaOpenManageReservations.js');
    const { fetchOperaReservationsFromManageReservations } =
      await import('./preview/operaFetch.js');

    const log = (message: string) => {
      console.log(message);
      try {
        event.sender.send('previewLog', { message });
      } catch {
        /* window closed */
      }
    };

    log('[preview] parseTxt starting...');
    const parsedTxt = parseTxt(txtContent);
    log('[preview] parseTxt complete');

    log('[preview] loginToOpera starting...');
    const session = await loginToOpera({ username, password });
    activeSession = session;
    log('[preview] loginToOpera complete');

    try {
      log('[preview] navigateToManageBlock starting...');
      await navigateToManageBlock(session.page);
      log('[preview] navigateToManageBlock complete');

      log('[preview] openManageReservationsForBlock starting...');
      await openManageReservationsForBlock(session.page, {
        blockCode,
      });
      log('[preview] openManageReservationsForBlock complete');

      log(
        `[preview] fetchOperaReservations starting — URL: ${session.page.url()}`,
      );
      const reservations = await fetchOperaReservationsFromManageReservations(
        session.page,
        { log },
      );
      log(
        `[preview] fetchOperaReservations complete — ${reservations.length} rows`,
      );

      const rows = buildPreviewRows(
        reservations.map((r) => ({
          reservationId: r.reservationId,
          roomNo: r.roomNo ?? null,
          currentName: r.currentName,
        })),
        parsedTxt,
      );
      log(`[preview] buildPreviewRows complete — ${rows.length} rows`);

      return {
        dateISO,
        blockCode,
        rows,
      };
    } finally {
      activeSession = null;
      await session.browser.close().catch(() => {});
    }
  },
);

ipcMain.handle(
  'applyRun',
  async (event, req: ApplyRunRequest): Promise<ApplyRunResult> => {
    const { dateISO, blockCode, username, password, rows } = req;
    const { loginToOpera } = await import('./preview/operaLogin.js');
    const { navigateToManageBlock } =
      await import('./preview/operaNavigateToManageBlock.js');
    const { openManageReservationsForBlock } =
      await import('./preview/operaOpenManageReservations.js');
    const { parseOperaGuestName } =
      await import('./apply/parseOperaGuestName.js');
    const { applyReservationNameInOpera } =
      await import('./apply/operaApplyReservationName.js');

    const session = await loginToOpera({ username, password });
    activeSession = session;

    try {
      await navigateToManageBlock(session.page);

      await openManageReservationsForBlock(session.page, {
        blockCode,
      });

      const results: ApplyRunResult['results'] = [];
      const total = rows.length * 2;
      let rowIndex = 0;

      for (const row of rows) {
        rowIndex++;
        try {
          event.sender.send('applyProgress', {
            step: 'UPDATE',
            message: `Processing room ${row.roomNo ?? 'Unassigned'} (${row.currentName} → ${row.newName ?? '?'})…`,
            reservationId: row.reservationId,
            roomNo: row.roomNo ?? null,
            current: rowIndex,
            total,
          });
        } catch {
          /* window closed */
        }
        if (!row.apply) {
          results.push({
            rowId: row.rowId,
            reservationId: row.reservationId,
            roomNo: row.roomNo ?? null,
            beforeName: row.currentName,
            afterName: row.currentName,
            result: 'SKIPPED',
            resultMessage: 'Apply unchecked',
          });
          continue;
        }

        if (row.status !== 'READY') {
          results.push({
            rowId: row.rowId,
            reservationId: row.reservationId,
            roomNo: row.roomNo ?? null,
            beforeName: row.currentName,
            afterName: row.currentName,
            result: 'FAILED',
            resultMessage: `Row status is ${row.status}, not READY`,
          });
          continue;
        }

        if (!row.newName?.trim()) {
          results.push({
            rowId: row.rowId,
            reservationId: row.reservationId,
            roomNo: row.roomNo ?? null,
            beforeName: row.currentName,
            afterName: row.currentName,
            result: 'FAILED',
            resultMessage: 'No new name provided',
          });
          continue;
        }

        const parsed = parseOperaGuestName(row.newName);

        if (!parsed.ok) {
          results.push({
            rowId: row.rowId,
            reservationId: row.reservationId,
            roomNo: row.roomNo ?? null,
            beforeName: row.currentName,
            afterName: row.newName,
            result: 'FAILED',
            resultMessage: parsed.error,
          });
          continue;
        }

        try {
          await applyReservationNameInOpera(session.page, {
            reservationId: row.reservationId,
            expectedCurrentName: row.currentName,
            expectedRoomNo: row.roomNo ?? null,
            firstName: parsed.firstName,
            lastName: parsed.lastName,
          });

          results.push({
            rowId: row.rowId,
            reservationId: row.reservationId,
            roomNo: row.roomNo ?? null,
            beforeName: row.currentName,
            afterName: row.newName,
            result: 'UPDATED',
          });
        } catch (error) {
          results.push({
            rowId: row.rowId,
            reservationId: row.reservationId,
            roomNo: row.roomNo ?? null,
            beforeName: row.currentName,
            afterName: row.newName,
            result: 'FAILED',
            resultMessage:
              error instanceof Error ? error.message : 'Unknown apply error',
          });
        }

        const r = results[results.length - 1];
        try {
          event.sender.send('applyProgress', {
            step: 'UPDATE',
            message:
              r.result === 'UPDATED'
                ? `✓ Room ${r.roomNo ?? 'Unassigned'} → ${r.afterName}`
                : r.result === 'SKIPPED'
                  ? `— Room ${r.roomNo ?? 'Unassigned'} skipped`
                  : `✗ Room ${r.roomNo ?? 'Unassigned'} — ${r.resultMessage ?? 'Unknown error'}`,
            reservationId: r.reservationId,
            roomNo: r.roomNo,
            status: r.result,
            current: rowIndex,
            total,
          });
        } catch {
          /* window closed */
        }
      }

      return {
        dateISO,
        blockCode,
        results,
      };
    } finally {
      activeSession = null;
      await session.browser.close().catch(() => {});
    }
  },
);

ipcMain.handle(
  'verifyRun',
  async (_event, req: VerifyRunRequest): Promise<VerifyRunResult> => {
    const { dateISO, blockCode, username, password, rows } = req;
    const { loginToOpera } = await import('./preview/operaLogin.js');
    const { navigateToManageBlock } =
      await import('./preview/operaNavigateToManageBlock.js');
    const { openManageReservationsForBlock } =
      await import('./preview/operaOpenManageReservations.js');
    const { fetchOperaReservationsFromManageReservations } =
      await import('./preview/operaFetch.js');
    const { parseOperaGuestName } =
      await import('./apply/parseOperaGuestName.js');

    const session = await loginToOpera({ username, password });
    activeSession = session;

    try {
      await navigateToManageBlock(session.page);

      await openManageReservationsForBlock(session.page, {
        blockCode,
      });

      const freshReservations =
        await fetchOperaReservationsFromManageReservations(session.page, {
          placeholderOnly: false,
        });

      const reservationById = new Map(
        freshReservations.map((reservation) => [
          reservation.reservationId,
          reservation,
        ]),
      );

      const results: VerifyRunResult['results'] = rows.map((row) => {
        if (!row.apply) {
          return {
            rowId: row.rowId,
            reservationId: row.reservationId,
            roomNo: row.roomNo ?? null,
            beforeName: row.currentName,
            intendedName: row.currentName,
            afterName: row.currentName,
            result: 'SKIPPED',
            resultMessage: 'Apply unchecked',
          };
        }

        const rawName = row.newName?.trim() ?? '';
        const parsed = parseOperaGuestName(rawName);
        const intendedName = parsed.ok
          ? `${parsed.lastName}, ${parsed.firstName}`
          : rawName;

        if (!intendedName) {
          return {
            rowId: row.rowId,
            reservationId: row.reservationId,
            roomNo: row.roomNo ?? null,
            beforeName: row.currentName,
            intendedName: '',
            afterName: null,
            result: 'FAILED',
            resultMessage: 'No intended name provided',
          };
        }

        const freshReservation = reservationById.get(row.reservationId);

        if (!freshReservation) {
          return {
            rowId: row.rowId,
            reservationId: row.reservationId,
            roomNo: row.roomNo ?? null,
            beforeName: row.currentName,
            intendedName,
            afterName: null,
            result: 'FAILED',
            resultMessage: 'Reservation not found during verify',
          };
        }

        const afterName = freshReservation.currentName;

        if (afterName === intendedName) {
          return {
            rowId: row.rowId,
            reservationId: row.reservationId,
            roomNo: freshReservation.roomNo ?? row.roomNo ?? null,
            beforeName: row.currentName,
            intendedName,
            afterName,
            result: 'UPDATED',
          };
        }

        return {
          rowId: row.rowId,
          reservationId: row.reservationId,
          roomNo: freshReservation.roomNo ?? row.roomNo ?? null,
          beforeName: row.currentName,
          intendedName,
          afterName,
          result: 'MISMATCH',
          resultMessage: 'Opera name does not match intended name',
        };
      });

      return {
        dateISO,
        blockCode,
        results,
      };
    } finally {
      activeSession = null;
      await session.browser.close().catch(() => {});
    }
  },
);

ipcMain.handle('cancelRun', async () => {
  if (activeSession) {
    await activeSession.browser.close().catch(() => {});
    activeSession = null;
  }
});

ipcMain.handle('saveLog', (_event, req: SaveLogRequest): SaveLogResult => {
  const { dateISO, blockCode, verifyResults } = req;

  const logsDir = path.join(app.getPath('documents'), 'Crew Rename Logs');
  fs.mkdirSync(logsDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `crew-rename-${dateISO}-${blockCode}-${timestamp}.json`;
  const savedPath = path.join(logsDir, filename);

  fs.writeFileSync(
    savedPath,
    JSON.stringify(
      { dateISO, blockCode, savedAt: new Date().toISOString(), verifyResults },
      null,
      2,
    ),
    'utf-8',
  );

  return { savedPath };
});

function getCredsPath() {
  return path.join(app.getPath('userData'), 'credentials.json');
}

function readCredsFile(): Record<string, string> {
  try {
    return JSON.parse(fs.readFileSync(getCredsPath(), 'utf-8'));
  } catch {
    return {};
  }
}

ipcMain.handle(
  'saveCredentials',
  (_event, req: SaveCredentialsRequest): void => {
    const creds = readCredsFile();
    creds[req.username] = safeStorage
      .encryptString(req.password)
      .toString('base64');
    fs.writeFileSync(getCredsPath(), JSON.stringify(creds), 'utf-8');
  },
);

ipcMain.handle('loadCredentials', (): LoadCredentialsResult => {
  const creds = readCredsFile();
  const accounts = Object.entries(creds).map(([username, enc]) => ({
    username,
    password: safeStorage.decryptString(Buffer.from(enc, 'base64')),
  }));
  return { accounts };
});

// ── Sign-off sheet helpers ────────────────────────────────────────────────────

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function formatSheetDate(dateISO: string): string {
  const d = new Date(dateISO + 'T00:00:00');
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function sortSheetRows(rows: SheetRow[]): SheetRow[] {
  return [...rows].sort((a, b) => {
    // If both rows have a TXT order, sort by rank position (highest = 0 first)
    if (a.order !== undefined && b.order !== undefined) return a.order - b.order;
    // Rows with a TXT order come before unmatched rows
    if (a.order !== undefined) return -1;
    if (b.order !== undefined) return 1;
    // Fallback: sort by room number descending
    const na = parseInt(a.roomNo ?? '', 10);
    const nb = parseInt(b.roomNo ?? '', 10);
    if (!isNaN(na) && !isNaN(nb)) return nb - na;
    return (a.roomNo ?? '').localeCompare(b.roomNo ?? '');
  });
}

function buildCrewTableHtml(rows: SheetRow[], hasRank: boolean): string {
  const sorted = sortSheetRows(rows);
  const rankCol = hasRank ? '<th style="width:60px">Rank</th>' : '';
  const bodyRows = sorted
    .map((r, i) => {
      const rankCell = hasRank ? `<td>${escHtml(r.rank ?? '')}</td>` : '';
      const displayName = escHtml(
        r.name.replace(',', '').replace(/\s+/g, ' ').trim(),
      );
      return `<tr>
      <td style="width:40px;text-align:center">${i + 1}</td>
      ${rankCell}
      <td>${displayName}</td>
      <td style="width:80px">${escHtml(r.roomNo ?? 'TBA')}</td>
      <td style="width:200px"></td>
    </tr>`;
    })
    .join('');
  return `<table class="crew">
    <thead><tr>
      <th style="width:40px;text-align:center">#</th>
      ${rankCol}
      <th>Name</th>
      <th style="width:80px">Room</th>
      <th style="width:200px">Signature</th>
    </tr></thead>
    <tbody>${bodyRows}</tbody>
  </table>`;
}

function addDays(dateISO: string, days: number): string {
  const d = new Date(dateISO + 'T00:00:00');
  d.setDate(d.getDate() + days);
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

function buildSignOffHtml(req: GenerateSheetRequest): string {
  const arrivalDisplay = formatSheetDate(req.dateISO);
  const departureDisplay = formatSheetDate(addDays(req.dateISO, 2));
  const hasRank = [...req.cabinRows, ...req.techRows].some((r) => r.rank);

  const wakeUp = req.wakeUpCall ? escHtml(req.wakeUpCall) : '&nbsp;';
  const deptTime = req.departureTime ? escHtml(req.departureTime) : '&nbsp;';

  const infoRows = [
    `<tr><td class="lbl">Arrival Date:</td><td>${escHtml(arrivalDisplay)}</td><td class="hi"><b>Wake-Up Call:</b> ${wakeUp}</td></tr>`,
    `<tr><td class="lbl">Departure Date:</td><td>${escHtml(departureDisplay)}</td><td class="hi"><b>Departure Time:</b> ${deptTime}</td></tr>`,
  ].join('');

  const totalRows = req.cabinRows.length + req.techRows.length;
  const splitPages =
    totalRows > 20 && req.techRows.length > 0 && req.cabinRows.length > 0;

  const headerHtml = `<div class="header">
  <div class="header-brand">RYDGES AUCKLAND</div>
  <div class="header-title">SINGAPORE AIRLINES CREW</div>
  <div class="header-brand">SINGAPORE AIRLINES</div>
</div>`;

  const techSection =
    req.techRows.length > 0
      ? `<div class="section-title">Tech Crew</div>${buildCrewTableHtml(req.techRows, hasRank)}`
      : '';
  const cabinSection =
    req.cabinRows.length > 0
      ? `<div class="section-title">Cabin Crew</div>${buildCrewTableHtml(req.cabinRows, hasRank)}`
      : '';

  const bodyContent = splitPages
    ? `<div style="page-break-after:always">
${headerHtml}
<table class="info"><tbody>${infoRows}</tbody></table>
${techSection}
</div>
<div>
${headerHtml}
<table class="info"><tbody>${infoRows}</tbody></table>
${cabinSection}
</div>`
    : `${headerHtml}
<table class="info"><tbody>${infoRows}</tbody></table>
${techSection}
${cabinSection}`;

  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
@page{size:A4;margin:12mm}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Arial,Helvetica,sans-serif;font-size:10.5pt;color:#000}
.header{display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:3px solid #1c3054;margin-bottom:10px}
.header-brand{font-size:12pt;font-weight:bold;color:#1c3054}
.header-title{font-size:14pt;font-weight:bold;text-align:center}
table.info{width:100%;border-collapse:collapse;margin-bottom:14px;font-size:10pt}
table.info td{padding:4px 8px;border:1px solid #ccc}
.lbl{font-weight:bold;width:140px;background:#f0f0f0}
.hi{background:#f7941d;width:200px}
.section-title{font-size:11pt;font-weight:bold;margin:14px 0 6px;color:#1c3054;border-bottom:1px solid #1c3054;padding-bottom:3px}
table.crew{width:100%;border-collapse:collapse;font-size:10pt}
table.crew th{background:#1c3054;color:#fff;padding:6px 8px;text-align:left}
table.crew td{padding:5px 8px;border-bottom:1px solid #ddd;height:30px}
table.crew tr:nth-child(even) td{background:#f7f7f7}
.footer{margin-top:16px;font-size:8pt;color:#888;text-align:right}
</style></head><body>
${bodyContent}
<div class="footer">Generated by Hotel Crew Tool &bull; ${new Date().toLocaleString()}</div>
</body></html>`;
}

async function saveSignOffPdf(req: GenerateSheetRequest): Promise<string> {
  const html = buildSignOffHtml(req);
  const win = new BrowserWindow({
    show: false,
    webPreferences: { offscreen: true },
  });
  try {
    await win.loadURL(
      'data:text/html;charset=utf-8,' + encodeURIComponent(html),
    );
    const pdfBuffer = await win.webContents.printToPDF({
      landscape: false,
      pageSize: 'A4',
      printBackground: true,
    });
    const logsDir = path.join(app.getPath('documents'), 'Crew Rename Logs');
    fs.mkdirSync(logsDir, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `crew-signoff-${req.dateISO}-${req.blockCode}-${timestamp}.pdf`;
    const savedPath = path.join(logsDir, filename);
    fs.writeFileSync(savedPath, pdfBuffer);
    return savedPath;
  } finally {
    win.close();
  }
}

ipcMain.handle(
  'generateSignOffSheet',
  async (_event, req: GenerateSheetRequest): Promise<GenerateSheetResult> => {
    if (req.cabinRows.length === 0 && req.techRows.length === 0) return null;
    const savedPath = await saveSignOffPdf(req);
    return { savedPath };
  },
);

ipcMain.handle(
  'fetchAndGenerateSheet',
  async (
    _event,
    req: FetchAndGenerateSheetRequest,
  ): Promise<GenerateSheetResult> => {
    const {
      dateISO,
      blockCode,
      username,
      password,
      wakeUpCall,
      departureTime,
      txtContent,
    } = req;
    const { loginToOpera } = await import('./preview/operaLogin.js');
    const { navigateToManageBlock } =
      await import('./preview/operaNavigateToManageBlock.js');
    const { openManageReservationsForBlock } =
      await import('./preview/operaOpenManageReservations.js');
    const { fetchOperaReservationsFromManageReservations } =
      await import('./preview/operaFetch.js');
    const { parseTxt } = await import('./preview/parseTxt.js');

    const session = await loginToOpera({ username, password });
    activeSession = session;

    try {
      await navigateToManageBlock(session.page);
      await openManageReservationsForBlock(session.page, { blockCode });
      const reservations = await fetchOperaReservationsFromManageReservations(
        session.page,
        { placeholderOnly: false },
      );

      // Placeholder name check
      const PLACEHOLDERS = [
        'SINGAPORE AIRLINES CREW',
        'SINGAPORE AIRLINES CREW (NIGHT)',
        'SINGAPORE AIRLINES TECH CREW',
        'SINGAPORE AIRLINES TECH CREW (NIGHT)',
      ];
      const isPlaceholder = (name: string) =>
        PLACEHOLDERS.includes(name.toUpperCase().trim());

      const named = reservations.filter(
        (r) => r.currentName && !isPlaceholder(r.currentName),
      );

      // If TXT provided, use it to determine TECH/CABIN and rank
      if (txtContent) {
        const parsed = parseTxt(txtContent);

        // Build lookup: normalised name → { rank, section, order }
        // order = index in TXT array (0 = highest rank, matches TXT line 01, 02…)
        type CrewInfo = { rank: string; section: 'CABIN' | 'TECH'; order: number };
        const crewMap = new Map<string, CrewInfo>();
        for (const [i, m] of parsed.techCrew.entries())
          crewMap.set(m.name.toUpperCase(), { rank: m.rank, section: 'TECH', order: i });
        for (const [i, m] of parsed.cabinCrew.entries())
          crewMap.set(m.name.toUpperCase(), { rank: m.rank, section: 'CABIN', order: i });

        const cabinRows: SheetRow[] = [];
        const techRows: SheetRow[] = [];

        for (const r of named) {
          // Opera name is "LASTNAME, FIRSTNAME" — normalise to "LASTNAME FIRSTNAME"
          const normName = r.currentName
            .replace(',', '')
            .replace(/\s+/g, ' ')
            .trim()
            .toUpperCase();
          const info = crewMap.get(normName);
          const row: SheetRow = {
            roomNo: r.roomNo ?? null,
            name: r.currentName,
            rank: info?.rank,
            order: info?.order,
          };
          if (info?.section === 'TECH') techRows.push(row);
          else cabinRows.push(row);
        }

        if (cabinRows.length === 0 && techRows.length === 0) return null;
        return {
          savedPath: await saveSignOffPdf({
            dateISO,
            blockCode,
            wakeUpCall,
            departureTime,
            cabinRows,
            techRows,
          }),
        };
      }

      // No TXT — single combined list (put everything in cabinRows for layout)
      const cabinRows: SheetRow[] = named.map((r) => ({
        roomNo: r.roomNo ?? null,
        name: r.currentName,
      }));
      if (cabinRows.length === 0) return null;
      return {
        savedPath: await saveSignOffPdf({
          dateISO,
          blockCode,
          wakeUpCall,
          departureTime,
          cabinRows,
          techRows: [],
        }),
      };
    } finally {
      activeSession = null;
      await session.browser.close().catch(() => {});
    }
  },
);
