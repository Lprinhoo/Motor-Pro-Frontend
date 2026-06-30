// ─── ApiErrorParser (SRP) ───────────────────────────────────────────────────
// Responsabilidade única: extrair uma mensagem de erro legível de uma
// Response não-ok. Centraliza a lógica que antes estava duplicada em ~8
// pontos diferentes do dashboard.js (cada handler de submit tinha seu próprio
// try { JSON.parse } catch {...}).
//
// Não faz nenhuma chamada de rede própria — apenas interpreta uma Response
// já recebida, então não tem nenhum impacto na comunicação com a API.
export async function parseApiError(response, fallbackMessage = 'Ocorreu um erro. Tente novamente.') {
    let generalMessage = fallbackMessage;
    const fieldErrors = {};

    try {
        const errorText = await response.text();
        try {
            const errorData = JSON.parse(errorText);
            if (errorData?.errors && typeof errorData.errors === 'object') {
                // Se a API retornar erros específicos por campo (ex: { "errors": { "campo": "mensagem" } })
                for (const key in errorData.errors) {
                    if (Object.prototype.hasOwnProperty.call(errorData.errors, key)) {
                        const errorValue = errorData.errors[key];
                        fieldErrors[key] = Array.isArray(errorValue) ? errorValue.join(' ') : errorValue;
                    }
                }
                // Tenta obter uma mensagem geral, ou combina as mensagens de erro de campo
                generalMessage = errorData?.message || Object.values(fieldErrors).join(' ') || fallbackMessage;
            } else {
                // Se não houver erros de campo específicos, usa a mensagem geral
                generalMessage = errorData?.error || errorData?.message || errorText || fallbackMessage;
            }
        } catch {
            // Se o texto não for um JSON válido, usa o texto como mensagem geral
            generalMessage = errorText || fallbackMessage;
        }
    } catch {
        // Se não for possível ler o corpo da resposta, mantém a mensagem de fallback
    }
    return { generalMessage, fieldErrors };
}