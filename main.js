const { app, BrowserWindow, ipcMain, Notification, Tray, Menu, nativeImage, shell, globalShortcut } = require('electron');
const { autoUpdater } = require('electron-updater');
const Store = require('electron-store');
const path = require('path');

// ═══════════════════════════════════════════════════════════
// 🔧 CONFIGURATION
// ═══════════════════════════════════════════════════════════

const store = new Store();
let mainWindow = null;
let updaterWindow = null;
let tray = null;
let isQuitting = false;
let splashWindow = null;

const isDev = process.argv.includes('--dev') || !app.isPackaged;

console.log('💰 Poolyaar Desktop Starting...');
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
// ✨ SPLASH SCREEN
// ═══════════════════════════════════════════════════════════

function createSplash() {
    splashWindow = new BrowserWindow({
        width: 500,
        height: 350,
        transparent: true,
        frame: false,
        alwaysOnTop: true,
        skipTaskbar: true,
        webPreferences: { nodeIntegration: false }
    });

    splashWindow.loadURL(`data:text/html;charset=utf-8,
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body {
                    background: transparent;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    height: 100vh;
                    font-family: 'Segoe UI', Tahoma, sans-serif;
                }
                .splash {
                    text-align: center;
                    background: linear-gradient(135deg, rgba(245, 245, 250, 0.95), rgba(255, 255, 255, 0.95));
                    backdrop-filter: blur(40px);
                    padding: 50px 60px;
                    border-radius: 28px;
                    border: 1px solid rgba(255,255,255,0.5);
                    box-shadow: 0 30px 60px rgba(0,0,0,0.1);
                }
                .logo {
                    width: 100px;
                    height: 100px;
                    margin: 0 auto 24px;
                    background: linear-gradient(135deg, #6c5ce7 0%, #a29bfe 100%);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 50px;
                    animation: pulse 2s ease-in-out infinite;
                    box-shadow: 0 10px 30px rgba(108,92,231,0.3);
                }
                @keyframes pulse {
                    0%, 100% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.08); opacity: 0.9; }
                }
                h1 { 
                    color: #2d3436; 
                    font-size: 42px; 
                    font-weight: 800;
                    margin-bottom: 12px;
                    letter-spacing: 1px;
                }
                p { 
                    color: #636e72; 
                    font-size: 13px; 
                    letter-spacing: 2px; 
                    text-transform: uppercase;
                }
                .spinner {
                    width: 28px;
                    height: 28px;
                    border: 3px solid rgba(108,92,231,0.1);
                    border-top-color: #6c5ce7;
                    border-radius: 50%;
                    animation: spin 0.8s linear infinite;
                    margin: 28px auto 0;
                }
                @keyframes spin { to { transform: rotate(360deg); } }
            </style>
        </head>
        <body>
            <div class="splash">
                <div class="logo">💰</div>
                <h1>Poolyaar</h1>
                <p>Loading Financial Data...</p>
                <div class="spinner"></div>
            </div>
        </body>
        </html>
    `);

    splashWindow.center();
}

// ═══════════════════════════════════════════════════════════
// 🪟 CREATE MAIN WINDOW
// ═══════════════════════════════════════════════════════════

function createWindow() {
    const windowState = store.get('windowState', {
        width: 1100,
        height: 650,
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
        frame: false, // فریم اختصاصی HTML استفاده می‌شود
        transparent: false,
        backgroundColor: '#f5f5fa', // رنگ پیش‌فرض پول‌یار
        show: false,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false,
            preload: path.join(__dirname, 'preload.js'),
            webSecurity: true
        },
        icon: path.join(__dirname, 'build/icon.png'),
        title: 'Poolyaar'
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

    // Load the main HTML file
    mainWindow.loadFile(path.join(__dirname, 'index.html'));
    console.log('✅ Loaded index.html');

    // Show window after load
    mainWindow.once('ready-to-show', () => {
        if (splashWindow) {
            splashWindow.close();
            splashWindow = null;
        }

        setTimeout(() => {
            mainWindow.show();
            mainWindow.focus();
            
            if (isDev) {
                mainWindow.webContents.openDevTools();
            }
        }, 100);
    });

    // Minimize to tray instead of closing
    mainWindow.on('close', (event) => {
        if (!isQuitting) {
            event.preventDefault();
            mainWindow.hide();
            // Show notification that app is running in tray
            if (process.platform === 'win32' || process.platform === 'linux') {
                 // Optional: Toast notification
            }
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
// 🔄 CREATE UPDATER WINDOW
// ═══════════════════════════════════════════════════════════

function createUpdaterWindow() {
    if (updaterWindow) {
        updaterWindow.focus();
        return;
    }

    updaterWindow = new BrowserWindow({
        width: 600,
        height: 700,
        resizable: false,
        frame: false,
        transparent: false,
        backgroundColor: '#ffffff',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        parent: mainWindow,
        modal: false,
        show: false
    });

    // Since we don't have a custom updater HTML, we load a built-in template or the main one
    // For now, we'll load a Basic HTML string for the updater
    updaterWindow.loadURL(`data:text/html;charset=utf-8,
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: sans-serif; padding: 20px; background: #fff; color: #333; text-align: center; direction: rtl; }
                h2 { color: #6c5ce7; }
                #status { margin: 20px 0; font-size: 14px; }
                #progress-bar { width: 100%; height: 10px; background: #eee; border-radius: 5px; overflow: hidden; display: none; margin: 10px 0;}
                #progress { width: 0%; height: 100%; background: #6c5ce7; transition: width 0.3s; }
                button { padding: 10px 20px; background: #6c5ce7; color: white; border: none; border-radius: 5px; cursor: pointer; }
                button:disabled { background: #ccc; }
            </style>
        </head>
        <body>
            <h2>Poolyaar Updater</h2>
            <div id="status">Checking for updates...</div>
            <div id="progress-bar"><div id="progress"></div></div>
            <button id="actionBtn" style="display:none;">Restart & Install</button>
            <script>
                const { ipcRenderer } = require('electron');
                ipcRenderer.on('updater-message', (e, { event, data }) => {
                    const status = document.getElementById('status');
                    const pBar = document.getElementById('progress-bar');
                    const progress = document.getElementById('progress');
                    const btn = document.getElementById('actionBtn');

                    if(event === 'checking-for-update') status.innerText = 'Checking for updates...';
                    if(event === 'update-not-available') status.innerText = 'You are on the latest version!';
                    if(event === 'update-available') {
                        status.innerText = 'New version available: ' + data.version;
                    }
                    if(event === 'download-progress') {
                        status.innerText = 'Downloading...';
                        pBar.style.display = 'block';
                        progress.style.width = data.percent + '%';
                    }
                    if(event === 'update-downloaded') {
                        status.innerText = 'Update Ready to Install!';
                        pBar.style.display = 'none';
                        btn.style.display = 'inline-block';
                        btn.onclick = () => ipcRenderer.send('install-update');
                    }
                    if(event === 'error') {
                        status.innerText = 'Error: ' + data.message;
                    }
                });
            </script>
        </body>
        </html>
    `);

    updaterWindow.once('ready-to-show', () => {
        updaterWindow.show();
    });

    updaterWindow.on('closed', () => {
        updaterWindow = null;
    });

    console.log('✅ Updater window created');
}

// ═══════════════════════════════════════════════════════════
// 🎯 CREATE TRAY
// ═══════════════════════════════════════════════════════════

function createTray() {
    const iconPath = path.join(__dirname, 'build/icon.png');
    // Default to a colored square if icon missing
    let icon;
    
    try {
        icon = nativeImage.createFromPath(iconPath);
        if (icon.isEmpty()) throw new Error("Icon empty");
    } catch (e) {
        // Fallback for dev mode
        icon = nativeImage.createFromDataURL(`data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH5gMWEiwpLFO86QAAABl0RVh0Q29tbWVudABDcmVhdGVkIHdpdGggR0lNUFeBDhcAAABTSURBVHja7M6xDQAgDAAx9296+4/xhK7yF98+MPD2QwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIDpC1sAAYpK8KMAAAAASUVORK5CYII=`);
    }
    
    const trayIcon = process.platform === 'win32' 
        ? icon.resize({ width: 16, height: 16 })
        : icon.resize({ width: 22, height: 22 });
    
    tray = new Tray(trayIcon);
    
    const contextMenu = Menu.buildFromTemplate([
        {
            label: 'Open Poolyaar',
            click: () => {
                if (mainWindow) {
                    mainWindow.show();
                    if (process.platform === 'darwin') app.dock.show();
                }
            }
        },
        { type: 'separator' },
        {
            label: `Version ${app.getVersion()}`,
            enabled: false
        },
        {
            label: 'Check for Updates',
            click: () => {
                if (!isDev) {
                    createUpdaterWindow();
                } else {
                    console.log('⏭️ Auto-update disabled in dev mode');
                }
            }
        },
        { type: 'separator' },
        {
            label: 'Quit',
            click: () => {
                isQuitting = true;
                app.quit();
            }
        }
    ]);
    
    tray.setContextMenu(contextMenu);
    tray.setToolTip('Poolyaar - Personal Finance');
    
    tray.on('click', () => {
        if (mainWindow) {
            mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
        }
    });
    
    console.log('✅ Tray icon created');
}

// ═══════════════════════════════════════════════════════════
// 🔄 AUTO UPDATER
// ═══════════════════════════════════════════════════════════

function initAutoUpdater() {
    if (isDev) {
        console.log('⏭️ Auto-updater disabled in dev mode');
        return;
    }

    autoUpdater.logger = console;
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;

    autoUpdater.on('checking-for-update', () => {
        console.log('🔍 Checking for updates...');
        sendToUpdater('checking-for-update');
    });

    autoUpdater.on('update-available', (info) => {
        console.log('🆕 Update available:', info.version);
        sendToUpdater('update-available', {
            version: info.version,
            currentVersion: app.getVersion(),
            releaseDate: info.releaseDate,
            releaseNotes: info.releaseNotes
        });
        
        if (mainWindow) {
            // Optional: Show in-app notification in main window
        }
    });

    autoUpdater.on('update-not-available', () => {
        console.log('✅ Poolyaar is up to date');
        sendToUpdater('update-not-available', {
            version: app.getVersion(),
            message: 'You are running the latest version'
        });
    });

    autoUpdater.on('download-progress', (progress) => {
        const percent = Math.round(progress.percent);
        console.log(`📥 Download: ${percent}%`);
        
        sendToUpdater('download-progress', {
            percent: progress.percent,
            transferred: progress.transferred,
            total: progress.total,
            bytesPerSecond: progress.bytesPerSecond
        });

        if (tray) {
            tray.setToolTip(`Poolyaar - Downloading: ${percent}%`);
        }
    });

    autoUpdater.on('update-downloaded', (info) => {
        console.log('✅ Update downloaded:', info.version);
        
        sendToUpdater('update-downloaded', {
            version: info.version,
            message: 'Update ready to install'
        });

        if (Notification.isSupported()) {
            const notification = new Notification({
                title: '✨ Update Ready',
                body: `Poolyaar ${info.version} is ready. Restart to install.`,
                icon: path.join(__dirname, 'build/icon.png')
            });
            
            notification.show();
        }

        if (tray) {
            tray.setToolTip('Poolyaar - Personal Finance');
        }
    });

    autoUpdater.on('error', (err) => {
        console.error('❌ Update error:', err);
        
        sendToUpdater('update-error', {
            message: err.message || 'Update failed'
        });
    });

    // Check on startup (after 5s)
    setTimeout(() => {
        console.log('🔍 Auto-checking for updates...');
        autoUpdater.checkForUpdates();
    }, 5000);

    // Check every 4 hours
    setInterval(() => {
        autoUpdater.checkForUpdates();
    }, 4 * 60 * 60 * 1000);
}

function sendToUpdater(event, data = {}) {
    if (updaterWindow && !updaterWindow.isDestroyed()) {
        updaterWindow.webContents.send('updater-message', { event, data });
    }
}

// ═══════════════════════════════════════════════════════════
// ⌨️ GLOBAL SHORTCUTS
// ═══════════════════════════════════════════════════════════

function registerShortcuts() {
    // Show/Hide window
    globalShortcut.register('CommandOrControl+Shift+P', () => {
        if (mainWindow) {
            mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
        }
    });

    console.log('⌨️ Global shortcuts registered');
}

// ═══════════════════════════════════════════════════════════
// 📡 IPC HANDLERS
// ═══════════════════════════════════════════════════════════

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🪟 Window Controls
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
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

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🔄 Auto-Updater Controls
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ipcMain.on('check-for-updates', () => {
    if (!isDev) {
        console.log('🔍 Manual update check requested');
        autoUpdater.checkForUpdates();
    } else {
        console.log('⏭️ Update check skipped in dev mode');
        sendToUpdater('update-error', {
            message: 'Updates disabled in development mode'
        });
    }
});

ipcMain.on('download-update', () => {
    if (!isDev) {
        console.log('📥 Download update requested');
        autoUpdater.downloadUpdate();
    }
});

ipcMain.on('install-update', () => {
    if (!isDev) {
        console.log('🔄 Install update requested');
        isQuitting = true;
        autoUpdater.quitAndInstall(false, true);
    }
});

ipcMain.handle('get-app-version', () => {
    return app.getVersion();
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🖥️ App Controls
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ipcMain.handle('app.getVersion', () => app.getVersion());
ipcMain.handle('app.getName', () => app.getName());
ipcMain.handle('app.getPath', (e, name) => app.getPath(name));

ipcMain.handle('app.minimize', () => {
    if (mainWindow) mainWindow.minimize();
});

ipcMain.handle('app.maximize', () => {
    if (mainWindow) {
        mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize();
    }
    return mainWindow?.isMaximized();
});

ipcMain.handle('app.close', () => {
    if (mainWindow) mainWindow.close();
});

ipcMain.handle('app.quit', () => {
    isQuitting = true;
    app.quit();
});

ipcMain.handle('app.isMaximized', () => {
    return mainWindow?.isMaximized() || false;
});

ipcMain.handle('app.openUpdater', () => {
    createUpdaterWindow();
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 💾 Store Operations (مهم برای پول‌یار)
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
// 🔔 Notifications
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ipcMain.handle('notification.show', (e, options) => {
    if (Notification.isSupported()) {
        const notification = new Notification({
            title: options.title,
            body: options.body,
            icon: options.icon || path.join(__dirname, 'build/icon.png'),
            silent: options.silent || false
        });

        if (options.onClick) {
            notification.on('click', () => {
                if (mainWindow) {
                    mainWindow.show();
                    mainWindow.focus();
                }
            });
        }

        notification.show();
        return true;
    }
    return false;
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🔗 Shell Operations
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ipcMain.handle('shell.openExternal', (e, url) => {
    shell.openExternal(url);
});

ipcMain.handle('shell.showItemInFolder', (e, fullPath) => {
    shell.showItemInFolder(fullPath);
});

console.log('✅ IPC handlers registered');

// ═══════════════════════════════════════════════════════════
// 🎬 APP LIFECYCLE
// ═══════════════════════════════════════════════════════════

app.whenReady().then(() => {
    console.log('✅ Electron app ready');
    
    createSplash();
    
    setTimeout(() => {
        createWindow();
        createTray();
        initAutoUpdater();
        registerShortcuts();
    }, 1500);

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
    globalShortcut.unregisterAll();
});

app.on('will-quit', () => {
    globalShortcut.unregisterAll();
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

console.log('💰 Poolyaar Desktop ready to manage finances!');