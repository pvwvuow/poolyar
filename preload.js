const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 🪟 Window Controls
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    minimize: () => ipcRenderer.send('minimize-window'),
    maximize: () => ipcRenderer.send('maximize-window'),
    close: () => ipcRenderer.send('close-window'),

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 🔐 Authentication
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    loginSuccess: () => ipcRenderer.send('login-success'),
    logout: () => ipcRenderer.send('logout'),

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 🔄 Auto-Updater
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    checkForUpdates: () => ipcRenderer.send('check-for-updates'),
    downloadUpdate: () => ipcRenderer.send('download-update'),
    installUpdate: () => ipcRenderer.send('install-update'),
    getAppVersion: () => ipcRenderer.invoke('get-app-version'),

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 🖥️ App Controls (invoke-based)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    app: {
        getVersion: () => ipcRenderer.invoke('app.getVersion'),
        getName: () => ipcRenderer.invoke('app.getName'),
        getPath: (name) => ipcRenderer.invoke('app.getPath', name),
        minimize: () => ipcRenderer.invoke('app.minimize'),
        maximize: () => ipcRenderer.invoke('app.maximize'),
        close: () => ipcRenderer.invoke('app.close'),
        quit: () => ipcRenderer.invoke('app.quit'),
        isMaximized: () => ipcRenderer.invoke('app.isMaximized'),
        relaunch: () => ipcRenderer.invoke('app.relaunch'),
        installUpdate: () => ipcRenderer.invoke('app.installUpdate'),
        openUpdater: () => ipcRenderer.invoke('app.openUpdater'),
    },

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 💾 Store
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    store: {
        get: (key, defaultValue) => ipcRenderer.invoke('store.get', key, defaultValue),
        set: (key, value) => ipcRenderer.invoke('store.set', key, value),
        delete: (key) => ipcRenderer.invoke('store.delete', key),
        clear: () => ipcRenderer.invoke('store.clear'),
        has: (key) => ipcRenderer.invoke('store.has', key),
    },

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 🔔 Notifications
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    notification: {
        show: (options) => ipcRenderer.invoke('notification.show', options),
    },

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 🔗 Shell
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    shell: {
        openExternal: (url) => ipcRenderer.invoke('shell.openExternal', url),
        showItemInFolder: (fullPath) => ipcRenderer.invoke('shell.showItemInFolder', fullPath),
    },

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 🪟 Window Extra
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    window: {
        setAlwaysOnTop: (flag) => ipcRenderer.invoke('window.setAlwaysOnTop', flag),
        flashFrame: () => ipcRenderer.invoke('window.flashFrame'),
    },

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 📡 Event Listeners
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    on: (channel, callback) => {
        const validChannels = [
            'updater-message',
            'global-shortcut-mute',
            'global-shortcut-deafen'
        ];
        if (validChannels.includes(channel)) {
            const subscription = (event, ...args) => callback(...args);
            ipcRenderer.on(channel, subscription);
            return () => ipcRenderer.removeListener(channel, subscription);
        }
    },

    once: (channel, callback) => {
        const validChannels = [
            'updater-message'
        ];
        if (validChannels.includes(channel)) {
            ipcRenderer.once(channel, (event, ...args) => callback(...args));
        }
    },

    removeAllListeners: (channel) => {
        ipcRenderer.removeAllListeners(channel);
    }
});

console.log('✅ Preload script loaded - electronAPI exposed');