// ─── Configuração da aplicação ─────────────────────────────────────────────
// Único ponto que define a URL base da API. Qualquer mudança de ambiente
// (dev/staging/produção) passa a ser feita apenas aqui.
//
// ⚠️ Mantida como HTTP propositalmente: o backend atual não expõe HTTPS.
// Trocar para HTTPS aqui só deve ser feito quando o servidor suportar TLS,
// caso contrário todas as chamadas da aplicação passam a falhar.
export const API_BASE_URL = 'http://76.13.173.156:8080/api';
