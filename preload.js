const { contextBridge, ipcRenderer } = require('electron');

window.addEventListener('DOMContentLoaded', () => {
  const replaceText = (selector, text) => {
    const element = document.getElementById(selector);
    if (element) element.innerText = text;
  };

  for (const type of ['chrome', 'node', 'electron']) {
    replaceText(`${type}-version`, process.versions[type]);
  }
});

// Expor funções IPC de forma segura para o processo de renderização
contextBridge.exposeInMainWorld('api', {
  googleLogin: (refreshToken) => ipcRenderer.invoke('google-login', refreshToken),
  refreshGoogleToken: (refreshToken) => ipcRenderer.invoke('refresh-google-token', refreshToken),
  // Você pode adicionar outras funções IPC aqui conforme necessário
});