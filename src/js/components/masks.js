// ─── Masks (SRP) ────────────────────────────────────────────────────────────
// Funções puras de formatação de texto, extraídas do dashboard.js. Não
// dependem de DOM, popup ou API — podem ser testadas isoladamente e
// reutilizadas em qualquer formulário futuro.

// Máscara de telefone: (99) 99999-9999 / (99) 9999-9999
export function applyPhoneMask(value) {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) {
        return digits.replace(/^(\d{0,2})/, digits.length ? '($1' : '');
    }
    if (digits.length <= 6) {
        return digits.replace(/^(\d{2})(\d{0,4})/, '($1) $2');
    }
    if (digits.length <= 10) {
        return digits.replace(/^(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
    }
    return digits.replace(/^(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
}

// Formatação de usuário: garante @ no início, sem espaços
export function applyUsernameMask(value) {
    let v = value.replace(/\s/g, '');
    if (v && !v.startsWith('@')) v = '@' + v;
    return v;
}

// Máscara de valor monetário (centavos digitados -> "1.234,56")
export function applyCurrencyMask(rawValue) {
    let digits = rawValue.replace(/\D/g, '').replace(/^0+(?=\d)/, '') || '0';
    const cents = parseInt(digits, 10);
    const reais = Math.floor(cents / 100);
    const centavos = (cents % 100).toString().padStart(2, '0');
    return `${reais.toLocaleString('pt-BR')},${centavos}`;
}

// Converte "1.234,56" digitado pelo usuário para float (1234.56)
export function parseCurrencyInput(formattedValue) {
    return parseFloat(formattedValue.replace(/\./g, '').replace(',', '.'));
}
