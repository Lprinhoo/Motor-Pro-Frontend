import { API_BASE_URL } from '../config.js';

// ─── AuthApi (SRP) ──────────────────────────────────────────────────────────
// Responsabilidade única: saber COMO chamar os endpoints de autenticação.
// Não decide o que fazer com o resultado (isso é responsabilidade do
// AuthService / das páginas). Endpoints, métodos e payloads são EXATAMENTE
// os mesmos do código original.
export class AuthApi {
    constructor(baseUrl = API_BASE_URL) {
        this.baseUrl = baseUrl;
    }

    login(username, password) {
        return fetch(`${this.baseUrl}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });
    }

    register(username, email, password) {
        return fetch(`${this.baseUrl}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password }),
        });
    }
}

export const authApi = new AuthApi();
