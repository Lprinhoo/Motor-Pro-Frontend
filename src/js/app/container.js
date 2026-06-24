import { API_BASE_URL } from '../config.js';
import { tokenStorage } from '../services/tokenStorage.js';
import { HttpClient } from '../api/httpClient.js';
import { AuthApi } from '../api/authApi.js';
import { OficinaApi } from '../api/oficinaApi.js';
import { ServicoApi } from '../api/servicoApi.js';
import { AuthService } from '../services/authService.js';

// ─── Composition Root (DIP) ─────────────────────────────────────────────────
// Único lugar da aplicação que conhece e conecta as implementações concretas
// (HttpClient real, APIs reais, TokenStorage real). As páginas e demais
// serviços recebem essas instâncias já prontas, sem precisar saber como
// foram construídas — isso é o que permite, por exemplo, substituir o
// HttpClient por um mock em testes sem alterar nenhuma página.
const httpClient = new HttpClient(API_BASE_URL, tokenStorage);

export const authApi = new AuthApi(API_BASE_URL);
export const oficinaApi = new OficinaApi(httpClient, API_BASE_URL);
export const servicoApi = new ServicoApi(httpClient, API_BASE_URL);
export const authService = new AuthService(authApi, tokenStorage);
export { tokenStorage, httpClient };
