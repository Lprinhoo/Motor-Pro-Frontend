import { showPopup, hidePopup } from '../components/popup.js';
import { parseApiError } from '../services/apiErrorParser.js';
import { escapeHtml, getContactIcon, validateContactValue, configureContactValueField } from '../components/serviceHelpers.js';
import * as masks from '../components/masks.js';

/**
 * Módulo de Contatos. Recebe OficinaApi e o id da oficina ativa por injeção
 * (DIP) — não conhece de onde vem o oficinaId, apenas o usa.
 */
export class ContatosSection {
    /** @param {import('../api/oficinaApi.js').OficinaApi} oficinaApi */
    constructor(oficinaApi, getOficinaId) {
        this.oficinaApi = oficinaApi;
        this.getOficinaId = getOficinaId;
    }

    render(dbContent) {
        if (!dbContent) return;
        dbContent.innerHTML = `
            <header class="top-bar">
                <div>
                    <div class="page-eyebrow">CANAIS</div>
                    <h2 class="page-title">Contatos</h2>
                    <div class="page-subtitle">Formas de contato divulgadas para seus clientes.</div>
                </div>
                <div class="top-bar-actions">
                    <button class="btn-action primary" id="addContatoBtn">
                        <i class="ti ti-plus"></i> Novo Contato
                    </button>
                </div>
            </header>

            <section class="panel">
                <div class="panel-title-group">
                    <div>
                        <div class="panel-title">CONTATOS CADASTRADOS</div>
                        <div class="panel-hint">Telefone, WhatsApp, e-mail e redes sociais da oficina.</div>
                    </div>
                </div>
                <div id="contatosListContainer" class="service-panels-grid">
                    <!-- Renderizado pelo ContatosSection -->
                </div>
            </section>
        `;

        document.getElementById('addContatoBtn')?.addEventListener('click', () => this.handleAddContato());
        this.carregarContatos();
    }

    async carregarContatos() {
        const oficinaId = this.getOficinaId();
        const container = document.getElementById('contatosListContainer');
        if (!oficinaId || !container) return;

        try {
            const response = await this.oficinaApi.listarContatos(oficinaId);
            if (response.ok) {
                const contatos = await response.json();
                this._renderizarContatos(Array.isArray(contatos) ? contatos : []);
            } else if (response.status === 204) {
                this._renderizarContatos([]);
            } else {
                showPopup('Erro', escapeHtml(await parseApiError(response, 'Erro ao carregar contatos.')), true);
                this._renderizarContatos([]);
            }
        } catch {
            showPopup('Erro de Conexão', 'Não foi possível conectar ao servidor.', true);
            this._renderizarContatos([]);
        }
    }

    _renderizarContatos(contatos) {
        const container = document.getElementById('contatosListContainer');
        if (!container) return;

        if (!contatos.length) {
            container.innerHTML = '<div class="empty-state">Nenhum contato cadastrado ainda.</div>';
            return;
        }

        container.innerHTML = '';
        contatos.forEach(c => {
            const item = document.createElement('div');
            item.className = 'service-panel contact-card';
            const contactIconHtml = getContactIcon(c.tipo);
            item.innerHTML = `
                <div class="contact-card-bg-icon">${contactIconHtml}</div>
                <div class="contact-card-content">
                    <div class="contact-card-header">
                        <div class="contact-icon">${contactIconHtml}</div>
                        <h3 class="contact-type">${escapeHtml(c.tipo)}</h3>
                    </div>
                    <p class="contact-value">${escapeHtml(c.valor)}</p>
                </div>
                <div class="service-actions">
                    <button class="btn-action ghost btn-edit-contato" type="button">
                        <i class="ti ti-edit"></i> Editar
                    </button>
                    <button class="btn-action ghost btn-delete-contato" type="button">
                        <i class="ti ti-trash"></i> Excluir
                    </button>
                </div>
            `;
            item.querySelector('.btn-edit-contato')?.addEventListener('click', () => this.handleEditContato(c));
            item.querySelector('.btn-delete-contato')?.addEventListener('click', () => this.handleDeleteContato(c));
            container.appendChild(item);
        });
    }

    _generateContactTypeSelectors(prefix = '', selectedType = '') {
        const types = [
            { value: 'WHATSAPP', icon: 'ti ti-brand-whatsapp', label: 'WhatsApp' },
            { value: 'TELEFONE', icon: 'ti ti-phone', label: 'Telefone' },
            { value: 'EMAIL', icon: 'ti ti-mail', label: 'E-mail' },
            { value: 'INSTAGRAM', icon: 'ti ti-brand-instagram', label: 'Instagram' },
            { value: 'FACEBOOK', icon: 'ti ti-brand-facebook', label: 'Facebook' },
        ];
        let html = `<div class="contact-type-options" id="${prefix}contato-tipo-options">`;
        types.forEach(type => {
            const isSelected = type.value === selectedType ? ' selected' : '';
            html += `
                <div class="contact-type-selector${isSelected}" data-type="${type.value}">
                    <i class="${type.icon}"></i>
                    <span>${type.label}</span>
                </div>
            `;
        });
        html += '</div>';
        return html;
    }

    handleAddContato() {
        const formHtml = `
            <p class="popup-subtitle">Adicione uma nova forma de contato para seus clientes.</p>
            <form id="add-contato-form" class="popup-form">
                <div class="field">
                    <label class="field-label" for="contato-tipo-options">Tipo</label>
                    ${this._generateContactTypeSelectors('', 'WHATSAPP')} <!-- Define WhatsApp como padrão selecionado -->
                </div>
                <div class="field">
                    <label class="field-label" for="contato-valor">Valor</label>
                    <div class="input-wrap">
                        <input type="text" id="contato-valor" class="input" placeholder="Ex: (99) 99999-9999" required>
                    </div>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn-secondary" id="cancel-add-contato">Cancelar</button>
                    <button type="submit" class="btn-primary">Adicionar Contato</button>
                </div>
            </form>
        `;
        showPopup('Adicionar Contato', formHtml, false, true);
        this._wireContatoForm({ formId: 'add-contato-form', cancelId: 'cancel-add-contato', isEdit: false });
    }

    handleEditContato(contato) {
        const formHtml = `
            <p class="popup-subtitle">Atualize as informações deste contato.</p>
            <form id="edit-contato-form" class="popup-form">
                <div class="field">
                    <label class="field-label" for="edit-contato-tipo-options">Tipo</label>
                    ${this._generateContactTypeSelectors('edit-', contato.tipo)}
                </div>
                <div class="field">
                    <label class="field-label" for="edit-contato-valor">Valor</label>
                    <div class="input-wrap">
                        <input type="text" id="edit-contato-valor" class="input" value="${escapeHtml(contato.valor ?? '')}" required>
                    </div>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn-secondary" id="cancel-edit-contato">Cancelar</button>
                    <button type="submit" class="btn-primary">Salvar Alterações</button>
                </div>
            </form>
        `;
        showPopup('Editar Contato', formHtml, false, true);
        this._wireContatoForm({ formId: 'edit-contato-form', cancelId: 'cancel-edit-contato', isEdit: true, contato });
    }

    _wireContatoForm({ formId, cancelId, isEdit, contato }) {
        const prefix = isEdit ? 'edit-' : '';
        const form = document.getElementById(formId);
        const tipoOptionsContainer = document.getElementById(`${prefix}contato-tipo-options`);
        const valorField = document.getElementById(`${prefix}contato-valor`);

        let selectedTipo = tipoOptionsContainer?.querySelector('.contact-type-selector.selected')?.dataset.type || '';

        // Configuração inicial para valorField com base no tipo selecionado
        configureContactValueField(selectedTipo, valorField, masks);

        tipoOptionsContainer?.querySelectorAll('.contact-type-selector').forEach(selector => {
            selector.addEventListener('click', () => {
                // Remove 'selected' de todos
                tipoOptionsContainer.querySelectorAll('.contact-type-selector').forEach(s => s.classList.remove('selected'));
                // Adiciona 'selected' ao clicado
                selector.classList.add('selected');
                selectedTipo = selector.dataset.type;
                configureContactValueField(selectedTipo, valorField, masks);
            });
        });

        document.getElementById(cancelId)?.addEventListener('click', hidePopup);

        form?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const tipo = selectedTipo; // Obtém o tipo atualmente selecionado
            const valor = valorField.value.trim();

            const validation = validateContactValue(tipo, valor);
            if (!valor || !validation.valid) {
                showPopup('Erro de Validação', validation.message || 'Preencha o valor corretamente.', true);
                return;
            }

            const oficinaId = this.getOficinaId();
            try {
                const response = isEdit
                    ? await this.oficinaApi.atualizarContato(oficinaId, contato.id, { tipo, valor })
                    : await this.oficinaApi.criarContato(oficinaId, { tipo, valor });

                if (response.ok) {
                    hidePopup();
                    showPopup('Sucesso', isEdit ? 'Contato atualizado com sucesso!' : 'Contato adicionado com sucesso!');
                    this.carregarContatos();
                } else {
                    showPopup('Erro de Validação', escapeHtml(await parseApiError(response, isEdit ? 'Erro ao atualizar contato.' : 'Erro ao adicionar contato.')), true);
                }
            } catch {
                showPopup('Erro de Conexão', 'Não foi possível conectar ao servidor.', true);
            }
        });
    }

    handleDeleteContato(contato) {
        const confirmHtml = `
            <p class="confirm-text">
                Tem certeza que deseja excluir o contato<br>
                <strong>${escapeHtml(contato.tipo)}: ${escapeHtml(contato.valor)}</strong>?<br>
                <span class="confirm-warning">Essa ação não pode ser desfeita.</span>
            </p>
            <div class="confirm-actions">
                <button id="cancel-delete-contato-btn" class="btn-secondary">Cancelar</button>
                <button id="confirm-delete-contato-btn" class="btn-danger">Excluir</button>
            </div>
        `;
        showPopup('Excluir Contato', confirmHtml, false, true);

        document.getElementById('confirm-delete-contato-btn')?.addEventListener('click', async () => {
            const oficinaId = this.getOficinaId();
            try {
                const response = await this.oficinaApi.excluirContato(oficinaId, contato.id);
                if (response.ok || response.status === 204) {
                    hidePopup();
                    showPopup('Sucesso', 'Contato excluído com sucesso!');
                    this.carregarContatos();
                } else {
                    showPopup('Erro', escapeHtml(await parseApiError(response, 'Erro ao excluir contato.')), true);
                }
            } catch {
                showPopup('Erro de Conexão', 'Não foi possível conectar ao servidor.', true);
            }
        });
        document.getElementById('cancel-delete-contato-btn')?.addEventListener('click', hidePopup);
    }
}