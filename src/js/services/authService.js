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
        if (!response.ok) {
            if (response.status === 401) {
                throw new Error('Credenciais inválidas');
            }
            throw new Error('Erro ao fazer login');
        }

        const data = await response.json();
        const { accessToken, refreshToken } = data;
        if (!accessToken) {
            throw new Error('Token de acesso não recebido na resposta do servidor.');
        }

        this.tokenStorage.setAuthTokens({ accessToken, refreshToken }, remember);
        return { ok: true, accessToken, response };
    }

    async register(username, email, password) {
        const response = await this.authApi.register(username, email, password);
        if (!response.ok) {
            if (response.status === 409) { // Conflict
                throw new Error('Usuário já existe');
            }
            throw new Error('Erro ao criar conta');
        }
        return { ok: true, response };
    }

    async googleAuth(idToken) {
        const response = await this.authApi.googleAuth(idToken);
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Erro desconhecido no backend ao autenticar com Google.');
        }

        const data = await response.json();
        const { accessToken, refreshToken } = data;
        if (!accessToken) {
            throw new Error('Token de acesso não recebido na resposta do servidor.');
        }

        this.tokenStorage.setAuthTokens({ accessToken, refreshToken }, false); // Google login doesn't use "remember me" checkbox
        return { ok: true, accessToken, response };
    }

    logout() {
        this.tokenStorage.clearAuth();
    }
}