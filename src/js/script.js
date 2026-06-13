import { showPopup, hidePopup } from './utils.js'; // Import showPopup e hidePopup

const API_BASE_URL = 'http://76.13.173.156:8080/api'; // Alterado: '/api' incluído na base

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
    console.log('authFetch: Iniciando requisição para', url, 'com opções:', options);
    let accessToken = localStorage.getItem('jwtToken');
    let refreshToken = localStorage.getItem('refreshToken');
    console.log('authFetch: Refresh Token no localStorage (antes da lógica de refresh):', refreshToken);

    // Adiciona o Access Token ao cabeçalho da requisição
    if (accessToken) {
        options.headers = {
            ...options.headers,
            'Authorization': `Bearer ${accessToken}`
        };
        console.log('authFetch: Access Token adicionado ao cabeçalho.');
    } else {
        console.log('authFetch: Nenhum Access Token encontrado.');
    }

    console.log('authFetch: Fazendo requisição inicial...');
    let response = await fetch(url, options);
    console.log('authFetch: Resposta inicial recebida. Status:', response.status);

    // Se a resposta for 401 (Unauthorized) ou 403 (Forbidden, assumindo token expirado)
    if ((response.status === 401 || response.status === 403) && refreshToken && url !== `${API_BASE_URL}/auth/refresh`) {
        console.warn(`authFetch: Requisição para ${url} falhou com status ${response.status}. Tentando refresh de token...`);
        console.log('authFetch: Refresh Token atual (para refresh):', refreshToken);

        // Se já estiver em processo de refresh, adiciona a requisição à fila
        if (isRefreshing) {
            console.log('authFetch: Refresh já em andamento, adicionando requisição à fila.');
            return new Promise(function(resolve, reject) {
                failedQueue.push({ resolve, reject });
            }).then(token => {
                options.headers['Authorization'] = 'Bearer ' + token;
                console.log('authFetch: Retentando requisição com novo token da fila.');
                return fetch(url, options);
            }).catch(err => {
                console.error('authFetch: Erro ao retentar requisição da fila:', err);
                return Promise.reject(err);
            });
        }

        isRefreshing = true;
        console.log('authFetch: Iniciando processo de refresh de token.');

        try {
            // Tenta obter um novo Access Token usando o Refresh Token
            const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ refreshToken }) // Refresh Token enviado no body (padrão REST)
            });
            console.log('authFetch: Resposta do refresh de token. Status:', refreshResponse.status);

            if (refreshResponse.ok) {
                // Assumindo que o refresh endpoint retorna { accessToken, refreshToken }
                const { accessToken: newAccessToken, refreshToken: newRefreshToken } = await refreshResponse.json();
                localStorage.setItem('jwtToken', newAccessToken);
                localStorage.setItem('refreshToken', newRefreshToken); // Atualiza o Refresh Token também
                accessToken = newAccessToken;
                console.log('authFetch: Novos tokens recebidos e salvos. Novo Access Token:', newAccessToken);

                // Processa todas as requisições na fila com o novo token
                processQueue(null, newAccessToken);

                // Tenta a requisição original novamente com o novo Access Token
                options.headers['Authorization'] = 'Bearer ' + accessToken;
                console.log('authFetch: Retentando requisição original com novo Access Token.');
                response = await fetch(url, options);
                console.log('authFetch: Resposta da requisição original retentada. Status:', response.status);
            } else {
                // Refresh Token inválido ou expirado, força o logout
                console.error('authFetch: Falha no refresh de token. Status:', refreshResponse.status);
                const refreshError = new Error('Refresh Token inválido ou expirado');
                processQueue(refreshError);
                localStorage.clear();
                window.location.href = 'index.html';
                return Promise.reject(refreshError);
            }
        } catch (error) {
            console.error('authFetch: Erro durante o processo de refresh de token:', error);
            processQueue(error);
            localStorage.clear();
            window.location.href = 'index.html';
            return Promise.reject(error);
        } finally {
            isRefreshing = false;
            console.log('authFetch: Processo de refresh de token finalizado.');
        }
    }

    console.log('authFetch: Retornando resposta final com status:', response.status);
    return response;
}

export { authFetch, API_BASE_URL }; // Export authFetch e API_BASE_URL

// Removido todo o bloco document.addEventListener('DOMContentLoaded', ...)
// A lógica específica do index.html foi movida para index-page.js
