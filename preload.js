const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('env', {
  API_BASE_URL: process.env.CALL_API,
});

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
  // Modificado: Adicionado o parâmetro forceNewLogin
  googleLogin: (refreshToken, forceNewLogin) => ipcRenderer.invoke('google-login', refreshToken, forceNewLogin),
  refreshGoogleToken: (refreshToken) => ipcRenderer.invoke('refresh-google-token', refreshToken),
  // Você pode adicionar outras funções IPC aqui conforme necessário
});