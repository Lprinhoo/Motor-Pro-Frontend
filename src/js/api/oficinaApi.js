import { API_BASE_URL } from '../config.js';

// ─── OficinaApi (SRP + DIP) ─────────────────────────────────────────────────
// Sabe apenas COMO falar com os endpoints de /oficinas e /oficinas/{id}/contatos.
// Depende de um HttpClient injetado (abstração de "fazer requisição
// autenticada com refresh automático"), não de fetch/token diretamente.
// Todos os endpoints, métodos e payloads são idênticos aos originais.
export class OficinaApi {
    /** @param {import('./httpClient.js').HttpClient} httpClient */
    constructor(httpClient, baseUrl = API_BASE_URL) {
        this.http = httpClient;
        this.baseUrl = baseUrl;
    }

    buscarMinhaOficina() {
        return this.http.request(`${this.baseUrl}/oficinas/minha`);
    }

    criarOficina({ nome, endereco }) {
        return this.http.request(`${this.baseUrl}/oficinas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome, endereco }),
        });
    }

    listarContatos(oficinaId) {
        return this.http.request(`${this.baseUrl}/oficinas/${oficinaId}/contatos`);
    }

    criarContato(oficinaId, { tipo, valor }) {
        return this.http.request(`${this.baseUrl}/oficinas/${oficinaId}/contatos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tipo, valor }),
        });
    }

    atualizarContato(oficinaId, contatoId, { tipo, valor }) {
        return this.http.request(`${this.baseUrl}/oficinas/${oficinaId}/contatos/${contatoId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tipo, valor }),
        });
    }

    excluirContato(oficinaId, contatoId) {
        return this.http.request(`${this.baseUrl}/oficinas/${oficinaId}/contatos/${contatoId}`, {
            method: 'DELETE',
        });
    }
}
