// ─── HttpClient (SRP + DIP) ─────────────────────────────────────────────────
// Responsabilidade ÚNICA: executar fetch autenticado e, quando a resposta for
// 401/403, acionar o refresh de token e repetir a requisição original.
//
// Não conhece regras de negócio de login/cadastro/oficinas — apenas "como
// fazer uma requisição autenticada". Depende de TokenStorage (abstração),
// não de localStorage/sessionStorage diretamente (DIP).
//
// Endpoint, método, headers e body de TODAS as chamadas continuam sendo
// definidos por quem chama `request()` — este módulo não os altera.

export class HttpClient {
    /**
     * @param {string} baseUrl
     * @param {import('./tokenStorage.js').TokenStorage} tokenStorage
     */
    constructor(baseUrl, tokenStorage) {
        this.baseUrl = baseUrl;
        this.tokenStorage = tokenStorage;
        this.isRefreshing = false;
        this.failedQueue = [];
    }

    _processQueue(error, token = null) {
        this.failedQueue.forEach(({ resolve, reject }) => {
            if (error) reject(error);
            else resolve(token);
        });
        this.failedQueue = [];
    }

    _withAuthHeader(options, token) {
        return {
            ...options,
            headers: { ...options.headers, 'Authorization': `Bearer ${token}` },
        };
    }

    /**
     * Requisição autenticada com refresh automático de token.
     * Mesma semântica do antigo `authFetch(url, options)`.
     */
    async request(url, options = {}) {
        const accessToken = this.tokenStorage.get('jwtToken');
        const refreshToken = this.tokenStorage.get('refreshToken');

        const requestOptions = accessToken
            ? this._withAuthHeader(options, accessToken)
            : { ...options };

        let response = await fetch(url, requestOptions);

        const isAuthFailure = response.status === 401 || response.status === 403;
        const isRefreshCall = url === `${this.baseUrl}/auth/refresh`;

        if (isAuthFailure && refreshToken && !isRefreshCall) {
            return this._handleAuthFailure(url, options);
        }

        return response;
    }

    async _handleAuthFailure(url, options) {
        if (this.isRefreshing) {
            return new Promise((resolve, reject) => {
                this.failedQueue.push({ resolve, reject });
            })
                .then(token => fetch(url, this._withAuthHeader(options, token)))
                .catch(err => Promise.reject(err));
        }

        this.isRefreshing = true;
        const refreshToken = this.tokenStorage.get('refreshToken');

        try {
            const refreshResponse = await fetch(`${this.baseUrl}/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken }),
            });

            if (!refreshResponse.ok) {
                throw new Error('Refresh Token inválido ou expirado');
            }

            const { accessToken: newAccessToken, refreshToken: newRefreshToken } = await refreshResponse.json();
            this.tokenStorage.setAuthTokens({ accessToken: newAccessToken, refreshToken: newRefreshToken });

            this._processQueue(null, newAccessToken);
            return await fetch(url, this._withAuthHeader(options, newAccessToken));
        } catch (error) {
            this._processQueue(error);
            this.tokenStorage.clearAuth();
            window.location.href = 'index.html';
            return Promise.reject(error);
        } finally {
            this.isRefreshing = false;
        }
    }
}
