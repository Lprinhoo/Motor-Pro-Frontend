// ─── Service/Contact Helpers (SRP) ──────────────────────────────────────────
// Funções puras de domínio (sem DOM, sem rede), extraídas do dashboard.js
// original. Mesma lógica/comportamento, apenas isoladas para reuso e testes.

// Converte minutos para string legível (ex: 90 -> "1h 30min", 1440 -> "1d")
export function formatarTempo(minutos) {
    if (!minutos || isNaN(minutos) || minutos <= 0) return null;
    const dias  = Math.floor(minutos / 1440);
    const horas = Math.floor((minutos % 1440) / 60);
    const mins  = minutos % 60;
    const partes = [];
    if (dias)  partes.push(`${dias}d`);
    if (horas) partes.push(`${horas}h`);
    if (mins)  partes.push(`${mins}min`);
    return partes.join(' ');
}

// Escapa caracteres HTML para prevenir XSS
export function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Ícone Tabler apropriado para cada tipo de contato
export function getContactIcon(tipo) {
    switch (tipo) {
        case 'WHATSAPP': return '<i class="ti ti-brand-whatsapp"></i>';
        case 'TELEFONE': return '<i class="ti ti-phone"></i>';
        case 'EMAIL':    return '<i class="ti ti-mail"></i>';
        case 'INSTAGRAM':return '<i class="ti ti-brand-instagram"></i>';
        case 'FACEBOOK': return '<i class="ti ti-brand-facebook"></i>';
        default:         return '<i class="ti ti-address-book"></i>';
    }
}

// A API ainda não tem um contrato 100% estável para estes campos — mantém a
// MESMA ordem de fallback usada no código original (sem alterações de
// comportamento), apenas consolidada em um único lugar.
export function extrairValorServico(service) {
    let bruto = service.valor ?? service.preco ?? service.valorServico ?? service.valorUnitario ?? service.price;
    if (typeof bruto === 'string') bruto = bruto.replace(/\./g, '').replace(',', '.');
    const num = parseFloat(bruto);
    return isNaN(num) ? 0 : num;
}

export function extrairTempoServico(service) {
    return service.tempoMedioEmMinutos ?? service.tempoMedioMinutos ?? service.tempoMedio
        ?? service.tempoEmMinutos ?? service.tempo ?? service.duration
        ?? service.estimatedTime ?? service.estimatedMinutes;
}

export function validateContactValue(tipo, valor) {
    switch (tipo) {
        case 'WHATSAPP':
        case 'TELEFONE': {
            const digits = valor.replace(/\D/g, '');
            if (digits.length < 10 || digits.length > 11) {
                return { valid: false, message: 'Informe um telefone válido com DDD, ex: (99) 99999-9999.' };
            }
            return { valid: true };
        }
        case 'EMAIL': {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
            if (!emailRegex.test(valor)) {
                return { valid: false, message: 'Informe um e-mail válido, ex: contato@suaoficina.com.' };
            }
            return { valid: true };
        }
        case 'INSTAGRAM':
        case 'FACEBOOK': {
            if (!/^@[A-Za-z0-9_.]{2,30}$/.test(valor)) {
                return { valid: false, message: 'Informe um usuário válido, ex: @suaoficina.' };
            }
            return { valid: true };
        }
        default:
            return { valid: true };
    }
}

// Ajusta placeholder/máscara do campo "Valor" conforme o tipo de contato escolhido
export function configureContactValueField(tipo, inputEl, masks) {
    if (!inputEl) return;

    if (inputEl._maskHandler) {
        inputEl.removeEventListener('input', inputEl._maskHandler);
        inputEl._maskHandler = null;
    }

    switch (tipo) {
        case 'WHATSAPP':
        case 'TELEFONE':
            inputEl.placeholder = 'Ex: (99) 99999-9999';
            inputEl.setAttribute('inputmode', 'numeric');
            inputEl.maxLength = 15;
            inputEl._maskHandler = (e) => { e.target.value = masks.applyPhoneMask(e.target.value); };
            inputEl.addEventListener('input', inputEl._maskHandler);
            inputEl.value = masks.applyPhoneMask(inputEl.value);
            break;
        case 'EMAIL':
            inputEl.placeholder = 'Ex: contato@suaoficina.com';
            inputEl.removeAttribute('inputmode');
            inputEl.removeAttribute('maxlength');
            break;
        case 'INSTAGRAM':
        case 'FACEBOOK':
            inputEl.placeholder = 'Ex: @suaoficina';
            inputEl.removeAttribute('inputmode');
            inputEl.removeAttribute('maxlength');
            inputEl._maskHandler = (e) => { e.target.value = masks.applyUsernameMask(e.target.value); };
            inputEl.addEventListener('input', inputEl._maskHandler);
            inputEl.value = masks.applyUsernameMask(inputEl.value);
            break;
        default:
            inputEl.placeholder = 'Ex: (99) 99999-9999 ou @usuario';
            inputEl.removeAttribute('inputmode');
            inputEl.removeAttribute('maxlength');
    }
}
