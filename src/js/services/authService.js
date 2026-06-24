// ─── AuthService (SRP) ──────────────────────────────────────────────────────
// Orquestra AuthApi (rede) + TokenStorage (persistência) para expor regras de
// negócio de autenticação: fazer login, cadastrar, deslogar, saber se está
// logado. Não manipula DOM nem exibe popups — isso é responsabilidade da
// camada de apresentação (páginas), respeitando a separação de
// responsabilidades e permitindo reuso/testes desta lógica isoladamente.
//
// Endpoints, métodos e payloads usados (via AuthApi) são idênticos aos do
// código original — nenhuma integração com a API foi alterada.
export class AuthService {
    /**
     * @param {import('../api/authApi.js').AuthApi} authApi
     * @param {import('./tokenStorage.js').TokenStorage} tokenStorage
     */
    constructor(authApi, tokenStorage) {
        this.authApi = authApi;
        this.tokenStorage = tokenStorage;
    }

    isAuthenticated() {
        return Boolean(this.tokenStorage.get('jwtToken'));
    }

    isRemembered() {
        return this.tokenStorage.isRemembered();
    }

    /**
     * @returns {Promise<{ok: boolean, accessToken?: string, response: Response}>}
     */
    async login(username, password, remember) {
        const response = await this.authApi.login(username, password);
        if (!response.ok) return { ok: false, response };

        const data = await response.json();
        const { accessToken, refreshToken } = data;
        if (!accessToken) return { ok: false, response, missingToken: true };

        this.tokenStorage.setAuthTokens({ accessToken, refreshToken }, remember);
        return { ok: true, accessToken, response };
    }

    async register(username, email, password) {
        const response = await this.authApi.register(username, email, password);
        return { ok: response.ok, response };
    }

    logout() {
        this.tokenStorage.clearAuth();
    }
}
