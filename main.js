const { app, BrowserWindow, ipcMain, Menu, Tray, nativeImage } = require('electron');
const { autoUpdater } = require('electron-updater');
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

console.log('💰 پول‌یار در حال شروع...');
console.log('📦 مسیر برنامه:', app.getAppPath());
console.log('🔧 حالت توسعه:', isDev);
console.log('📍 نسخه:', app.getVersion());

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    console.log('⚠️ یک نمونه از برنامه در حال اجراست');
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
        backgroundColor: '#1a1a2e',
        show: false,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        icon: path.join(__dirname, 'build/icon.png'),
        title: 'پول‌یار'
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

    // Load app
    mainWindow.loadFile(path.join(__dirname, 'src/app.html'));

    // Show when ready
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        mainWindow.focus();
        
        if (isDev) {
            mainWindow.webContents.openDevTools();
        }
    });

    // Minimize to tray
    mainWindow.on('close', (event) => {
        if (!isQuitting) {
            event.preventDefault();
            mainWindow.hide();
        }
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    console.log('✅ پنجره اصلی ایجاد شد');
}

// ═══════════════════════════════════════════════════════════
// 🎯 CREATE TRAY
// ═══════════════════════════════════════════════════════════

function createTray() {
    const iconPath = path.join(__dirname, 'build/icon.png');
    const icon = nativeImage.createFromPath(iconPath);
    const trayIcon = icon.resize({ width: 16, height: 16 });
    
    tray = new Tray(trayIcon);
    
    const contextMenu = Menu.buildFromTemplate([
        {
            label: 'باز کردن پول‌یار',
            click: () => {
                if (mainWindow) mainWindow.show();
            }
        },
        { type: 'separator' },
        {
            label: `نسخه ${app.getVersion()}`,
            enabled: false
        },
        {
            label: 'بررسی آپدیت',
            click: () => {
                if (!isDev) {
                    autoUpdater.checkForUpdates();
                }
            }
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
    tray.setToolTip('پول‌یار - مدیریت مالی شخصی');
    
    tray.on('click', () => {
        if (mainWindow) {
            mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
        }
    });
    
    console.log('✅ آیکون سیستم ایجاد شد');
}

// ═══════════════════════════════════════════════════════════
// 🔄 AUTO UPDATER
// ═══════════════════════════════════════════════════════════

function initAutoUpdater() {
    if (isDev) {
        console.log('⏭️ آپدیت خودکار در حالت توسعه غیرفعال است');
        return;
    }

    autoUpdater.logger = console;
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;

    autoUpdater.on('checking-for-update', () => {
        console.log('🔍 در حال بررسی آپدیت...');
        sendToRenderer('update-checking');
    });

    autoUpdater.on('update-available', (info) => {
        console.log('🆕 آپدیت جدید موجود است:', info.version);
        sendToRenderer('update-available', {
            version: info.version,
            currentVersion: app.getVersion()
        });
    });

    autoUpdater.on('update-not-available', () => {
        console.log('✅ برنامه به‌روز است');
        sendToRenderer('update-not-available');
    });

    autoUpdater.on('download-progress', (progress) => {
        const percent = Math.round(progress.percent);
        console.log(`📥 دانلود: ${percent}%`);
        sendToRenderer('update-download-progress', {
            percent: progress.percent
        });
        
        if (tray) {
            tray.setToolTip(`پول‌یار - دانلود: ${percent}%`);
        }
    });

    autoUpdater.on('update-downloaded', (info) => {
        console.log('✅ آپدیت دانلود شد:', info.version);
        sendToRenderer('update-downloaded', {
            version: info.version
        });
        
        if (tray) {
            tray.setToolTip('پول‌یار - مدیریت مالی شخصی');
        }
    });

    autoUpdater.on('error', (err) => {
        console.error('❌ خطا در آپدیت:', err);
        sendToRenderer('update-error', {
            message: err.message
        });
    });

    // Check on startup (after 5s)
    setTimeout(() => {
        console.log('🔍 بررسی خودکار آپدیت...');
        autoUpdater.checkForUpdates();
    }, 5000);
}

function sendToRenderer(event, data = {}) {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('updater-message', { event, data });
    }
}

// ═══════════════════════════════════════════════════════════
// 📡 IPC HANDLERS
// ═══════════════════════════════════════════════════════════

// Window controls
ipcMain.on('minimize-window', () => {
    if (mainWindow) mainWindow.minimize();
});

ipcMain.on('maximize-window', () => {
    if (mainWindow) {
        mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize();
    }
});

ipcMain.on('close-window', () => {
    if (mainWindow) mainWindow.close();
});

// Auto-updater controls
ipcMain.on('check-for-updates', () => {
    if (!isDev) {
        autoUpdater.checkForUpdates();
    }
});

ipcMain.on('download-update', () => {
    if (!isDev) {
        autoUpdater.downloadUpdate();
    }
});

ipcMain.on('install-update', () => {
    if (!isDev) {
        isQuitting = true;
        autoUpdater.quitAndInstall(false, true);
    }
});

// App info
ipcMain.handle('get-app-version', () => {
    return app.getVersion();
});

// Store operations
ipcMain.handle('store-get', (e, key, defaultValue) => {
    return store.get(key, defaultValue);
});

ipcMain.handle('store-set', (e, key, value) => {
    store.set(key, value);
});

ipcMain.handle('store-delete', (e, key) => {
    store.delete(key);
});

console.log('✅ IPC handlers registered');

// ═══════════════════════════════════════════════════════════
// 🎬 APP LIFECYCLE
// ═══════════════════════════════════════════════════════════

app.whenReady().then(() => {
    console.log('✅ برنامه آماده است');
    createWindow();
    createTray();
    initAutoUpdater();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
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

console.log('💰 پول‌یار آماده است!');