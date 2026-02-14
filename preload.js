const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    // Window controls
    minimize: () => ipcRenderer.send('minimize-window'),
    maximize: () => ipcRenderer.send('maximize-window'),
    close: () => ipcRenderer.send('close-window'),
    
    // Auto-updater
    checkForUpdates: () => ipcRenderer.send('check-for-updates'),
    downloadUpdate: () => ipcRenderer.send('download-update'),
    installUpdate: () => ipcRenderer.send('install-update'),
    getAppVersion: () => ipcRenderer.invoke('get-app-version'),
    onUpdaterMessage: (callback) => {
        ipcRenderer.on('updater-message', (event, data) => callback(data));
    },
    
    // Store
    store: {
        get: (key, defaultValue) => ipcRenderer.invoke('store-get', key, defaultValue),
        set: (key, value) => ipcRenderer.invoke('store-set', key, value),
        delete: (key) => ipcRenderer.invoke('store-delete', key)
    }
});