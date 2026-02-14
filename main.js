const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, shell } = require('electron');
const Store = require('electron-store');
const path = require('path');

// ═══════════════════════════════════════════════════════════
// 🔧 CONFIGURATION
// ═══════════════════════════════════════════════════════════

const store = new Store();
let mainWindow = null;
let tray = null;
let isQuitting = false;

const isDev = process.argv.includes('--dev') || !app.isPackaged;

console.log('💰 Poolyar Desktop Starting...');
console.log('📦 App Path:', app.getAppPath());
console.log('🔧 Dev Mode:', isDev);
console.log('📍 Version:', app.getVersion());

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    console.log('⚠️ Another instance is already running');
    app.quit();
} else {
    app.on('second-instance', () => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
            mainWindow.show();
        }
    });
}

// ═══════════════════════════════════════════════════════════
// 🪟 CREATE MAIN WINDOW
// ═══════════════════════════════════════════════════════════

function createWindow() {
    const windowState = store.get('windowState', {
        width: 1200,
        height: 800,
        x: undefined,
        y: undefined,
        isMaximized: false
    });

    mainWindow = new BrowserWindow({
        width: windowState.width,
        height: windowState.height,
        x: windowState.x,
        y: windowState.y,
        minWidth: 900,
        minHeight: 600,
        frame: false,
        transparent: false,
        backgroundColor: '#1a1a2e',
        show: false,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false,
            preload: path.join(__dirname, 'preload.js'),
            webSecurity: true
        },
        icon: path.join(__dirname, 'build/icon.png'),
        title: 'Poolyar - مدیریت حساب'
    });

    if (windowState.isMaximized) {
        mainWindow.maximize();
    }

    // Save window state
    const saveState = () => {
        if (!mainWindow) return;
        const bounds = mainWindow.getBounds();
        store.set('windowState', {
            width: bounds.width,
            height: bounds.height,
            x: bounds.x,
            y: bounds.y,
            isMaximized: mainWindow.isMaximized()
        });
    };

    mainWindow.on('resize', saveState);
    mainWindow.on('move', saveState);

    // Load HTML file
    mainWindow.loadFile(path.join(__dirname, 'src/index.html'));

    // Show window after load
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        mainWindow.focus();
        
        if (isDev) {
            mainWindow.webContents.openDevTools();
        }
    });

    // Minimize to tray instead of closing
    mainWindow.on('close', (event) => {
        if (!isQuitting) {
            event.preventDefault();
            mainWindow.hide();
        }
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    // Open external links in browser
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });

    console.log('✅ Main window created');
}

// ═══════════════════════════════════════════════════════════
// 🎯 CREATE TRAY
// ═══════════════════════════════════════════════════════════

function createTray() {
    const iconPath = path.join(__dirname, 'build/icon.png');
    const icon = nativeImage.createFromPath(iconPath);
    
    const trayIcon = process.platform === 'win32' 
        ? icon.resize({ width: 16, height: 16 })
        : icon.resize({ width: 22, height: 22 });
    
    tray = new Tray(trayIcon);
    
    const contextMenu = Menu.buildFromTemplate([
        {
            label: 'باز کردن Poolyar',
            click: () => {
                if (mainWindow) {
                    mainWindow.show();
                    if (process.platform === 'darwin') app.dock.show();
                }
            }
        },
        { type: 'separator' },
        {
            label: `نسخه ${app.getVersion()}`,
            enabled: false
        },
        { type: 'separator' },
        {
            label: 'خروج',
            click: () => {
                isQuitting = true;
                app.quit();
            }
        }
    ]);
    
    tray.setContextMenu(contextMenu);
    tray.setToolTip('Poolyar - مدیریت حساب');
    
    tray.on('click', () => {
        if (mainWindow) {
            mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
        }
    });
    
    console.log('✅ Tray icon created');
}

// ═══════════════════════════════════════════════════════════
// 📡 IPC HANDLERS
// ═══════════════════════════════════════════════════════════

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🪟 Window Controls
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ipcMain.handle('window.minimize', () => {
    if (mainWindow) mainWindow.minimize();
});

ipcMain.handle('window.maximize', () => {
    if (mainWindow) {
        mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize();
    }
    return mainWindow?.isMaximized();
});

ipcMain.handle('window.close', () => {
    if (mainWindow) mainWindow.close();
});

ipcMain.handle('window.isMaximized', () => {
    return mainWindow?.isMaximized() || false;
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🖥️ App Info
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ipcMain.handle('app.getVersion', () => app.getVersion());
ipcMain.handle('app.getName', () => app.getName());
ipcMain.handle('app.getPath', (e, name) => app.getPath(name));

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 💾 Store Operations
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ipcMain.handle('store.get', (e, key, defaultValue) => {
    return store.get(key, defaultValue);
});

ipcMain.handle('store.set', (e, key, value) => {
    store.set(key, value);
});

ipcMain.handle('store.delete', (e, key) => {
    store.delete(key);
});

ipcMain.handle('store.clear', () => {
    store.clear();
});

ipcMain.handle('store.has', (e, key) => {
    return store.has(key);
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🔗 Shell Operations
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ipcMain.handle('shell.openExternal', (e, url) => {
    shell.openExternal(url);
});

console.log('✅ IPC handlers registered');

// ═══════════════════════════════════════════════════════════
// 🎬 APP LIFECYCLE
// ═══════════════════════════════════════════════════════════

app.whenReady().then(() => {
    console.log('✅ Electron app ready');
    
    createWindow();
    createTray();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        } else if (mainWindow) {
            mainWindow.show();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('before-quit', () => {
    isQuitting = true;
});

// ═══════════════════════════════════════════════════════════
// 🛡️ SECURITY
// ═══════════════════════════════════════════════════════════

app.on('web-contents-created', (event, contents) => {
    contents.on('will-navigate', (event, navigationUrl) => {
        const parsedUrl = new URL(navigationUrl);
        
        if (parsedUrl.protocol !== 'file:') {
            event.preventDefault();
            console.warn('⚠️ Blocked navigation to:', navigationUrl);
        }
    });

    contents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });
});

console.log('💰 Poolyar Desktop ready!');