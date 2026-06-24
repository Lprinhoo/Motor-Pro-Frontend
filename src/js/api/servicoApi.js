import { API_BASE_URL } from '../config.js';

// ─── ServicoApi (SRP + DIP) ─────────────────────────────────────────────────
// Sabe apenas COMO falar com os endpoints de /servicos. Depende de um
// HttpClient injetado (DIP). Endpoints, métodos e payloads idênticos ao
// código original.
export class ServicoApi {
    /** @param {import('./httpClient.js').HttpClient} httpClient */
    constructor(httpClient, baseUrl = API_BASE_URL) {
        this.http = httpClient;
        this.baseUrl = baseUrl;
    }

    listar() {
        return this.http.request(`${this.baseUrl}/servicos`);
    }

    criar({ nome, descricao, valor, tempoMedioEmMinutos }) {
        return this.http.request(`${this.baseUrl}/servicos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome, descricao, valor, tempoMedioEmMinutos }),
        });
    }

    atualizar(id, { nome, descricao, valor, tempoMedioEmMinutos }) {
        return this.http.request(`${this.baseUrl}/servicos/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome, descricao, valor, tempoMedioEmMinutos }),
        });
    }

    excluir(id) {
        return this.http.request(`${this.baseUrl}/servicos/${id}`, {
            method: 'DELETE',
        });
    }
}
