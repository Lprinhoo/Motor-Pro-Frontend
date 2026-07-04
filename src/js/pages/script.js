import { showPopup, hidePopup } from './utils.js';

const API_BASE_URL = 'http://76.13.173.156:8080/api';

// ─── Helpers de armazenamento (Lembrar-me) ─────────────────────────────────
// Se "Lembrar-me" foi marcado no login, usamos localStorage (sobrevive a fechar
// o app/navegador). Caso contrário, usamos sessionStorage (some ao fechar).
function isRemembered() {
    return localStorage.getItem('rememberMe') === 'true';
}

function getAuthStorage() {
    return isRemembered() ? localStorage : sessionStorage;
}

// Busca um valor em qualquer um dos dois storages (cobre os dois cenários)
function getStoredValue(key) {
    return localStorage.getItem(key) || sessionStorage.getItem(key);
}

// Salva os dados de autenticação no storage correto e limpa o outro
// (evita tokens "fantasma" duplicados entre localStorage/sessionStorage)
function setAuthData({ accessToken, refreshToken } = {}, remember = isRemembered()) {
    const storage = remember ? localStorage : sessionStorage;
    const other   = remember ? sessionStorage : localStorage;

    localStorage.setItem('rememberMe', remember ? 'true' : 'false');

    if (accessToken !== undefined)  storage.setItem('jwtToken', accessToken);
    if (refreshToken !== undefined) storage.setItem('refreshToken', refreshToken || '');

    other.removeItem('jwtToken');
    other.removeItem('refreshToken');
}

function clearAuthData() {
    localStorage.clear();
    sessionStorage.clear();
}

// Variáveis globais para controle de refresh de token
let isRefreshing = false;
let failedQueue = [];

// Função para processar a fila de requisições falhas
const processQueue = (error, token = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

// Função utilitária para requisições autenticadas com refresh de token
async function authFetch(url, options = {}) {
    let accessToken = getStoredValue('jwtToken');
    const refreshToken = getStoredValue('refreshToken'); // Backend refresh token
    const googleRefreshToken = localStorage.getItem('googleRefreshToken'); // Google refresh token

    if (accessToken) {
        options.headers = {
            ...options.headers,
            'Authorization': `Bearer ${accessToken}`
        };
    }

    let response = await fetch(url, options);

    if ((response.status === 401 || response.status === 403) && url !== `${API_BASE_URL}/auth/refresh` && url !== `${API_BASE_URL}/auth/google`) {
        if (isRefreshing) {
            return new Promise(function(resolve, reject) {
                failedQueue.push({ resolve, reject });
            }).then(token => {
                options.headers['Authorization'] = 'Bearer ' + token;
                return fetch(url, options);
            }).catch(err => {
                return Promise.reject(err);
            });
        }

        isRefreshing = true;

        try {
            let newAccessToken;
            let newBackendRefreshToken;

            if (googleRefreshToken) {
                // Attempt to refresh Google token
                const googleRefreshResult = await window.api.refreshGoogleToken(googleRefreshToken);
                if (googleRefreshResult && googleRefreshResult.idToken) {
                    // Use the new Google idToken to get new backend tokens
                    const backendAuthResponse = await fetch(`${API_BASE_URL}/auth/google`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ idToken: googleRefreshResult.idToken }),
                    });

                    if (backendAuthResponse.ok) {
                        const backendAuthData = await backendAuthResponse.json();
                        newAccessToken = backendAuthData.accessToken;
                        newBackendRefreshToken = backendAuthData.refreshToken;
                        // Update Google refresh token if a new one was provided
                        if (googleRefreshResult.refreshToken && googleRefreshResult.refreshToken !== googleRefreshToken) {
                            localStorage.setItem('googleRefreshToken', googleRefreshResult.refreshToken);
                        }
                    } else {
                        throw new Error('Failed to re-authenticate with backend using new Google ID token.');
                    }
                } else {
                    throw new Error('Failed to refresh Google token.');
                }
            } else if (refreshToken) {
                // Regular backend token refresh
                const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ refreshToken })
                });

                if (refreshResponse.ok) {
                    const data = await refreshResponse.json();
                    newAccessToken = data.accessToken;
                    newBackendRefreshToken = data.refreshToken;
                } else {
                    throw new Error('Refresh Token inválido ou expirado');
                }
            } else {
                throw new Error('No refresh token available.');
            }

            // If we got new tokens, update them and retry the original request
            if (newAccessToken) {
                setAuthData({ accessToken: newAccessToken, refreshToken: newBackendRefreshToken });
                processQueue(null, newAccessToken);

                options.headers['Authorization'] = 'Bearer ' + newAccessToken;
                response = await fetch(url, options);
            } else {
                throw new Error('Failed to obtain new access token.');
            }

        } catch (error) {
            console.error('Token refresh failed:', error);
            processQueue(error);
            clearAuthData();
            localStorage.removeItem('googleRefreshToken'); // Clear Google refresh token on failure
            window.location.href = 'index.html';
            return Promise.reject(error);
        } finally {
            isRefreshing = false;
        }
    }

    return response;
}

export { authFetch, API_BASE_URL, setAuthData, clearAuthData, isRemembered, getStoredValue };