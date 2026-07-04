let popupOverlay;
let popupTitle;
let popupMessage;
let popupIcon;
let popupCloseBtn;
let popupCard; // Adicionado para referenciar o popup-card

document.addEventListener('DOMContentLoaded', () => {
    popupOverlay  = document.getElementById('popup-overlay');
    popupTitle    = document.getElementById('popup-title');
    popupMessage  = document.getElementById('popup-message');
    popupIcon     = document.getElementById('popup-icon');
    popupCloseBtn = document.getElementById('popup-close-btn');
    popupCard     = document.getElementById('popup-card'); // Obtém a referência ao popup-card

    if (popupCloseBtn) {
        popupCloseBtn.addEventListener('click', hidePopup);
    }
    if (popupOverlay) {
        popupOverlay.addEventListener('click', (e) => {
            if (e.target === popupOverlay) hidePopup();
        });
    }
});

// isForm: quando true, esconde o botão OK e exibe o formulário sem conflito visual
export const showPopup = (title, message, isError = false, isForm = false) => {
    if (!popupOverlay || !popupTitle || !popupMessage || !popupCloseBtn || !popupCard) {
        console.error('Popup elements not found in the DOM.');
        return;
    }
    popupTitle.innerText   = title;
    popupMessage.innerHTML = message;
    popupTitle.style.color = isError ? '#FF5252' : '#00E676';

    // Adiciona ou remove a classe popup-is-form no popupCard
    if (isForm) {
        popupCard.classList.add('popup-is-form');
    } else {
        popupCard.classList.remove('popup-is-form');
    }

    // Botão OK: oculto quando é formulário
    if (isForm) {
        popupCloseBtn.style.display = 'none';
    } else {
        popupCloseBtn.style.display = '';
        popupCloseBtn.style.background = isError ? '#FF5252' : 'linear-gradient(135deg, #00E676 0%, #00C853 100%)';
        popupCloseBtn.style.color = isError ? '#fff' : '#0A0A0C';
    }

    if (popupIcon) {
        const iconColor = isError ? '#FF5252' : '#00E676';
        popupIcon.style.background = isError ? 'rgba(255,82,82,0.15)' : 'rgba(0,230,118,0.15)';
        popupIcon.style.border = isError ? '1px solid rgba(255,82,82,0.25)' : '1px solid rgba(0,230,118,0.25)';

        if (isForm && !isError) {
            // Formulário de criação: ícone de "+" em vez do check de sucesso
            popupIcon.innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`;
        } else {
            popupIcon.innerHTML = isError
                ? `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`
                : `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/></svg>`;
        }
    }

    popupOverlay.classList.remove('hidden');
};

export const hidePopup = () => {
    if (popupOverlay) {
        popupOverlay.classList.add('hidden');
        // Garante que o botão OK volta a aparecer na próxima vez
        if (popupCloseBtn) popupCloseBtn.style.display = '';
        // Remove a classe popup-is-form ao fechar o popup
        if (popupCard) popupCard.classList.remove('popup-is-form');
    }
};