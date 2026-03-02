// electron/main.ts
import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
let mainWindow = null;
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 780,
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
            preload: path.join(__dirname, 'preload.js'),
        },
    });
    const isDev = !app.isPackaged;
    if (isDev) {
        // Vite dev server
        mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools({ mode: 'detach' });
    }
    else {
        // Vite build output
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }
}
app.whenReady().then(() => {
    createWindow();
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0)
            createWindow();
    });
});
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin')
        app.quit();
});
/**
 * IPC: Preview Run (READ ONLY)
 * NOTE: This is a stub. We will wire Playwright later.
 */
ipcMain.handle('previewRun', async (_event, req) => {
    // DO NOT log credentials.
    const { dateISO, blockCode } = req;
    // Stub: return empty results for now (or mirror your mockPreviewRows if you want).
    return {
        dateISO,
        blockCode,
        rows: [],
    };
});
