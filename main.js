const { app, BrowserWindow, session, ipcMain } = require('electron');
const path = require('path');
const ElectronOAuth2 = require('electron-oauth2');
require('dotenv').config(); // Carrega as variáveis de ambiente do .env

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
      webSecurity: false  // ← desativa CORS no Electron
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'src/html/index.html'));
}

// Google OAuth setup
const googleOauth = new ElectronOAuth2({
  clientId: process.env.GOOGLE_CLIENT_ID, // Usando variável de ambiente
  clientSecret: process.env.GOOGLE_CLIENT_SECRET, // Usando variável de ambiente
  authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenUrl: 'https://oauth2.googleapis.com/token',
  profileUrl: 'https://www.googleapis.com/oauth2/v3/userinfo',
  redirectUri: 'http://localhost:8080', // DEVE CORRESPONDER AO CONFIGURADO NO GOOGLE CLOUD CONSOLE
  scope: 'openid email profile',
}, {
  width: 500,
  height: 600,
  alwaysOnTop: true,
  autoHideMenuBar: true,
  webPreferences: {
    nodeIntegration: false,
    contextIsolation: true,
  }
});

ipcMain.handle('google-login', async (event) => {
  try {
    const token = await googleOauth.getAccessToken();
    return token.id_token; // Retorna o id_token
  } catch (error) {
    console.error('Erro no login com Google:', error);
    throw error;
  }
});


app.whenReady().then(() => {
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