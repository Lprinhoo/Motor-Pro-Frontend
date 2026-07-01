const { app, BrowserWindow, session, ipcMain } = require('electron');
const path = require('path');
const http = require('http'); // Adicionado
require('dotenv').config();

function createWindow() {
  const mainWindow = new BrowserWindow({
    minWidth: 800,
    minHeight: 600,
    fullscreen: true,
    icon: path.join(__dirname, 'src/assets/icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false
    }
  });
  mainWindow.loadFile(path.join(__dirname, 'src/html/index.html'));
}

app.whenReady().then(() => {

  ipcMain.handle('google-login', async (event) => {
    return new Promise((resolve, reject) => {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
      const redirectUri = 'http://127.0.0.1:8989';

      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `response_type=code` +
        `&client_id=${encodeURIComponent(clientId)}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&scope=${encodeURIComponent('openid email profile')}` +
        `&access_type=online`;

      let authFlowCompleted = false; // <-- Adicione esta flag

      // Servidor local temporário para capturar o redirect
      const server = http.createServer(async (req, res) => {
        const code = new URL(req.url, redirectUri).searchParams.get('code');
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<h2>Login realizado! Pode fechar esta janela.</h2>');
        server.close();
        authWindow.close();

        if (!code) {
          authFlowCompleted = true; // Marca como concluído para evitar rejeição dupla
          return reject(new Error('Código não encontrado'));
        }

        try {
          const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              code,
              client_id: clientId,
              client_secret: clientSecret,
              redirect_uri: redirectUri,
              grant_type: 'authorization_code'
            })
          });
          const data = await tokenRes.json();
          console.log('Resposta Google:', JSON.stringify(data));
          authFlowCompleted = true; // Marca como concluído com sucesso
          resolve(data.id_token);
        } catch (err) {
          authFlowCompleted = true; // Marca como concluído com erro
          reject(err);
        }
      });

      server.listen(8989, '127.0.0.1');

      const authWindow = new BrowserWindow({
        width: 500, height: 600,
        alwaysOnTop: true, autoHideMenuBar: true,
        webPreferences: { nodeIntegration: false, contextIsolation: true }
      });

      authWindow.loadURL(authUrl);
      authWindow.on('closed', () => {
        server.close();
        if (!authFlowCompleted) { // Só rejeita se o fluxo não foi concluído
          reject(new Error('window was closed by user'));
        }
      });
    });
  });

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Access-Control-Allow-Origin': ['*'],
        'Access-Control-Allow-Methods': ['GET, POST, PUT, DELETE, OPTIONS'],
        'Access-Control-Allow-Headers': ['*'],
        'Access-Control-Allow-Credentials': ['true'],
      }
    });
  });

  session.defaultSession.webRequest.onBeforeRequest(
      { urls: ['*://*/*'] },
      (details, callback) => {
        if (details.method === 'OPTIONS') {
          callback({ cancel: false });
        } else {
          callback({});
        }
      }
  );

  createWindow();

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