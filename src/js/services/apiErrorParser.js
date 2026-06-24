// ─── ApiErrorParser (SRP) ───────────────────────────────────────────────────
// Responsabilidade única: extrair uma mensagem de erro legível de uma
// Response não-ok. Centraliza a lógica que antes estava duplicada em ~8
// pontos diferentes do dashboard.js (cada handler de submit tinha seu próprio
// try { JSON.parse } catch {...}).
//
// Não faz nenhuma chamada de rede própria — apenas interpreta uma Response
// já recebida, então não tem nenhum impacto na comunicação com a API.
export async function parseApiError(response, fallbackMessage = 'Ocorreu um erro. Tente novamente.') {
    let errorMessage = fallbackMessage;
    try {
        const errorText = await response.text();
        try {
            const errorData = JSON.parse(errorText);
            if (errorData?.errors && typeof errorData.errors === 'object') {
                errorMessage = Object.values(errorData.errors).join(' ');
            } else {
                errorMessage = errorData?.message || errorText || fallbackMessage;
            }
        } catch {
            errorMessage = errorText || fallbackMessage;
        }
    } catch {
        // resposta sem corpo legível — mantém fallback
    }
    return errorMessage;
}
