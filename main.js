const { app, BrowserWindow, session, ipcMain } = require('electron');
const path = require('path');
const http = require('http');
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

// Troca o refresh_token por um novo id_token sem abrir popup
async function refreshGoogleToken(refreshToken) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    })
  });

  const data = await tokenRes.json();
  if (data.error) throw new Error(data.error_description || data.error);
  return data.id_token;
}

// Fluxo completo de login com popup
async function fullGoogleLogin() {
  return new Promise((resolve, reject) => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = 'http://127.0.0.1:8989';

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `response_type=code` +
        `&client_id=${encodeURIComponent(clientId)}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&scope=${encodeURIComponent('openid email profile')}` +
        `&access_type=offline` +
        `&prompt=consent`;

    let authFlowCompleted = false;

    const server = http.createServer(async (req, res) => {
      if (authFlowCompleted) return;

      const code = new URL(req.url, redirectUri).searchParams.get('code');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<h2>Login realizado! Pode fechar esta janela.</h2>');

      if (!code) {
        authFlowCompleted = true;
        server.close();
        authWindow.close();
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
        console.log('Tokens obtidos com sucesso');
        authFlowCompleted = true;
        server.close();
        authWindow.close();

        // Retorna id_token e refresh_token
        resolve({
          idToken: data.id_token,
          refreshToken: data.refresh_token
        });
      } catch (err) {
        authFlowCompleted = true;
        server.close();
        authWindow.close();
        reject(err);
      }
    });

    server.listen(8989, '127.0.0.1');

    const authWindow = new BrowserWindow({
      width: 500, height: 600,
      alwaysOnTop: true, autoHideMenuBar: true,
      frame: false,
      backgroundColor: '#0f1117',
      webPreferences: { nodeIntegration: false, contextIsolation: true }
    });

    authWindow.loadURL(authUrl);

    authWindow.on('closed', () => {
      server.close();
      if (!authFlowCompleted) {
        reject(new Error('Login cancelado pelo usuário'));
      }
    });
  });
}

app.whenReady().then(() => {

  // Modificado: Adicionado o parâmetro forceNewLogin
  ipcMain.handle('google-login', async (event, savedRefreshToken, forceNewLogin) => {
    // Se forceNewLogin for true, ignora o refresh token e inicia um novo login completo
    if (forceNewLogin) {
      console.log('Forçando novo login completo com Google...');
      return await fullGoogleLogin();
    }

    // Se já tem refresh_token salvo, usa ele direto (sem popup)
    if (savedRefreshToken) {
      try {
        console.log('Usando refresh_token salvo...');
        const idToken = await refreshGoogleToken(savedRefreshToken);
        return { idToken, refreshToken: savedRefreshToken };
      } catch (err) {
        console.warn('Refresh token inválido ou expirado, iniciando login completo:', err.message);
        // Se o refresh falhar, cai no login completo abaixo
      }
    }

    // Sem refresh_token ou ele expirou → abre popup do Google
    return await fullGoogleLogin();
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