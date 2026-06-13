let popupOverlay;
let popupTitle;
let popupMessage;
let popupIcon;
let popupCloseBtn;

document.addEventListener('DOMContentLoaded', () => {
    popupOverlay  = document.getElementById('popup-overlay');
    popupTitle    = document.getElementById('popup-title');
    popupMessage  = document.getElementById('popup-message');
    popupIcon     = document.getElementById('popup-icon');
    popupCloseBtn = document.getElementById('popup-close-btn');

    if (popupCloseBtn) {
        popupCloseBtn.addEventListener('click', hidePopup);
    }
    if (popupOverlay) {
        popupOverlay.addEventListener('click', (e) => {
            if (e.target === popupOverlay) hidePopup();
        });
    }
});

export const showPopup = (title, message, isError = false) => {
    if (!popupOverlay || !popupTitle || !popupMessage || !popupCloseBtn) {
        console.error('Popup elements not found in the DOM.');
        return;
    }
    popupTitle.innerText   = title;
    popupMessage.innerHTML = message; // Alterado para innerHTML
    // Padronizando as cores e ícones do popup
    popupTitle.style.color = isError ? '#FF5252' : '#00E676';
    popupCloseBtn.style.background = isError ? '#FF5252' : 'linear-gradient(135deg, #00E676 0%, #00C853 100%)';
    popupCloseBtn.style.color = isError ? '#fff' : '#0A0A0C';

    if (popupIcon) {
        popupIcon.style.background = isError
            ? 'rgba(255,82,82,0.15)'
            : 'rgba(0,230,118,0.15)';
        popupIcon.style.border = isError
            ? '1px solid rgba(255,82,82,0.25)'
            : '1px solid rgba(0,230,118,0.25)';
        popupIcon.innerHTML = isError
            ? '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FF5252" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>'
            : '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00E676" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/></svg>';
    }

    popupOverlay.classList.remove('hidden');
};

export const hidePopup = () => {
    if (popupOverlay) {
        popupOverlay.classList.add('hidden');
    }
};