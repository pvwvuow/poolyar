const { contextBridge, ipcRenderer } = require('electron');

// ═══════════════════════════════════════════════════════════
// 🌉 Context Bridge API
// ═══════════════════════════════════════════════════════════

contextBridge.exposeInMainWorld('electronAPI', {
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 🪟 Window Controls
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    minimize: () => ipcRenderer.invoke('window.minimize'),
    maximize: () => ipcRenderer.invoke('window.maximize'),
    close: () => ipcRenderer.invoke('window.close'),
    isMaximized: () => ipcRenderer.invoke('window.isMaximized'),

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 🖥️ App Info
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    getVersion: () => ipcRenderer.invoke('app.getVersion'),
    getName: () => ipcRenderer.invoke('app.getName'),
    getPath: (name) => ipcRenderer.invoke('app.getPath', name),

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 💾 Store (LocalStorage alternative)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    store: {
        get: (key, defaultValue) => ipcRenderer.invoke('store.get', key, defaultValue),
        set: (key, value) => ipcRenderer.invoke('store.set', key, value),
        delete: (key) => ipcRenderer.invoke('store.delete', key),
        clear: () => ipcRenderer.invoke('store.clear'),
        has: (key) => ipcRenderer.invoke('store.has', key)
    },

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 🔗 Shell Operations
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    openExternal: (url) => ipcRenderer.invoke('shell.openExternal', url)
});

console.log('✅ Preload script loaded - electronAPI exposed to renderer');