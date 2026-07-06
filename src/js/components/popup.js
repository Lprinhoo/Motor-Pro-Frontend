// ─── PopupService (SRP) ─────────────────────────────────────────────────────
// Mesma lógica e os mesmos elementos DOM do utils.js original
// (popup-overlay, popup-title, popup-message, popup-icon, popup-close-btn,
// popup-card), agora encapsulados em uma classe para evitar estado global
// solto no módulo e facilitar reuso/testes. Nenhum comportamento visual ou
// de markup foi alterado.
export class PopupService {
    constructor() {
        this.overlay = null;
        this.title = null;
        this.message = null;
        this.icon = null;
        this.closeBtn = null;
        this.card = null;
    }

    init() {
        this.overlay  = document.getElementById('popup-overlay');
        this.title    = document.getElementById('popup-title');
        this.message  = document.getElementById('popup-message');
        this.icon     = document.getElementById('popup-icon');
        this.closeBtn = document.getElementById('popup-close-btn');
        this.card     = document.getElementById('popup-card');

        this.closeBtn?.addEventListener('click', () => this.hide());
        this.overlay?.addEventListener('click', (e) => {
            if (e.target === this.overlay) this.hide();
        });
    }

    /** isForm: quando true, esconde o botão OK e exibe o formulário sem conflito visual */
    show(title, message, isError = false, isForm = false) {
        if (!this.overlay || !this.title || !this.message || !this.closeBtn || !this.card) {
            console.error('Popup elements not found in the DOM.');
            return;
        }

        this.title.innerText = title;
        this.message.innerHTML = message;

        // Remove classes de estado anteriores
        this.card.classList.remove('popup-card--success', 'popup-card--error');

        // Adiciona a classe de estado correta
        if (isError) {
            this.card.classList.add('popup-card--error');
        } else {
            this.card.classList.add('popup-card--success');
        }

        this.card.classList.toggle('popup-is-form', isForm);

        if (isForm) {
            this.closeBtn.style.display = 'none';
        } else {
            this.closeBtn.style.display = '';
        }

        if (this.icon) {
            // As cores do ícone agora são definidas via CSS pelas classes popup-card--success/error
            if (isForm && !isError) {
                this.icon.innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`;
            } else {
                this.icon.innerHTML = isError
                    ? `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`
                    : `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/></svg>`;
            }
        }

        this.overlay.classList.remove('hidden');
    }

    hide() {
        if (!this.overlay) return;
        this.overlay.classList.add('hidden');
        if (this.closeBtn) this.closeBtn.style.display = '';
        if (this.card) {
            this.card.classList.remove('popup-is-form', 'popup-card--success', 'popup-card--error');
        }
    }
}

// Instância única para manter a mesma simplicidade de uso (showPopup/hidePopup)
// que o restante da aplicação já conhece.
export const popupService = new PopupService();
document.addEventListener('DOMContentLoaded', () => popupService.init());

// Mantém as funções soltas `showPopup`/`hidePopup` como fachada de
// compatibilidade — assim as páginas não precisam mudar a forma de chamar.
export const showPopup = (...args) => popupService.show(...args);
export const hidePopup = () => popupService.hide();