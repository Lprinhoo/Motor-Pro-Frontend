import { showPopup, hidePopup } from './utils.js';

const API_BASE_URL = 'http://76.13.173.156:8080/api';

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
    let accessToken = localStorage.getItem('jwtToken');
    const refreshToken = localStorage.getItem('refreshToken');

    if (accessToken) {
        options.headers = {
            ...options.headers,
            'Authorization': `Bearer ${accessToken}`
        };
    }

    let response = await fetch(url, options);

    if ((response.status === 401 || response.status === 403) && refreshToken && url !== `${API_BASE_URL}/auth/refresh`) {
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
            const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ refreshToken })
            });

            if (refreshResponse.ok) {
                const { accessToken: newAccessToken, refreshToken: newRefreshToken } = await refreshResponse.json();
                localStorage.setItem('jwtToken', newAccessToken);
                if (newRefreshToken) {
                    localStorage.setItem('refreshToken', newRefreshToken);
                }
                accessToken = newAccessToken;

                processQueue(null, newAccessToken);

                options.headers['Authorization'] = 'Bearer ' + accessToken;
                response = await fetch(url, options);
            } else {
                const refreshError = new Error('Refresh Token inválido ou expirado');
                processQueue(refreshError);
                localStorage.clear();
                window.location.href = 'index.html';
                return Promise.reject(refreshError);
            }
        } catch (error) {
            processQueue(error);
            localStorage.clear();
            window.location.href = 'index.html';
            return Promise.reject(error);
        } finally {
            isRefreshing = false;
        }
    }

    return response;
}

export { authFetch, API_BASE_URL };
