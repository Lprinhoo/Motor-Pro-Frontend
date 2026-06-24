import { showPopup, hidePopup } from '../components/popup.js';
import { parseApiError } from '../services/apiErrorParser.js';
import { formatarTempo, escapeHtml, extrairValorServico, extrairTempoServico } from '../components/serviceHelpers.js';
import { applyCurrencyMask, parseCurrencyInput } from '../components/masks.js';
import { getMetricsHTML } from './metrics.js';

const DESCRICAO_MIN = 10;
const DESCRICAO_MAX = 500;

/**
 * Módulo de Serviços. Recebe o ServicoApi por injeção (DIP) em vez de
 * importar uma constante de API global — facilita testes e reuso.
 */
export class ServicosSection {
    /** @param {import('../api/servicoApi.js').ServicoApi} servicoApi */
    constructor(servicoApi) {
        this.servicoApi = servicoApi;
    }

    render(dbContent) {
        if (!dbContent) return;
        dbContent.innerHTML = `
            <header class="top-bar">
                <div>
                    <div class="page-eyebrow">VISÃO GERAL</div>
                    <h2 class="page-title">Serviços</h2>
                    <div class="page-subtitle">Resumo de atividades e serviços da oficina.</div>
                </div>
                <div class="top-bar-actions">
                    <div class="search-box">
                        <i class="ti ti-search"></i>
                        <input type="text" placeholder="Buscar serviço...">
                    </div>
                </div>
            </header>

            ${getMetricsHTML()}

            <section class="panel">
                <div class="panel-title-group">
                    <div>
                        <div class="panel-title">SERVIÇOS DISPONÍVEIS</div>
                        <div class="panel-hint">Catálogo de serviços que sua oficina oferece.</div>
                    </div>
                    <div class="panel-actions">
                        <button class="btn-action primary" id="addServiceBtn">
                            <i class="ti ti-plus"></i> Novo Serviço
                        </button>
                    </div>
                </div>
                <div id="servicePanelsContainer" class="service-panels-grid">
                    <!-- Renderizado pelo ServicosSection -->
                </div>
            </section>
        `;

        document.getElementById('addServiceBtn')?.addEventListener('click', () => this.handleAddService());
        this.metricServicosEl = document.getElementById('metricServicos');
        this.carregarDados();
    }

    async carregarDados() {
        try {
            const response = await this.servicoApi.listar();

            if (response.ok) {
                const servicos = await response.json();
                this._renderizarPaineis(Array.isArray(servicos) ? servicos : []);
                if (this.metricServicosEl) this.metricServicosEl.innerText = String(Array.isArray(servicos) ? servicos.length : 0);
            } else if (response.status === 204) {
                this._renderizarPaineis([]);
                if (this.metricServicosEl) this.metricServicosEl.innerText = '0';
            } else {
                showPopup('Erro', escapeHtml(await parseApiError(response, 'Erro ao carregar serviços. Tente novamente.')), true);
                this._renderizarPaineis([]);
                if (this.metricServicosEl) this.metricServicosEl.innerText = '0';
            }
        } catch (error) {
            if (error.message !== 'Refresh Token inválido ou expirado') {
                showPopup('Erro de Conexão', 'Não foi possível conectar ao servidor ou erro inesperado.', true);
            }
            this._renderizarPaineis([]);
            if (this.metricServicosEl) this.metricServicosEl.innerText = '0';
        }
    }

    _renderizarPaineis(servicos) {
        const el = document.getElementById('servicePanelsContainer');
        if (!el) return;

        if (!Array.isArray(servicos)) {
            el.innerHTML = '<div class="empty-state">Erro ao carregar serviços. Formato de dados inesperado.</div>';
            if (this.metricServicosEl) this.metricServicosEl.innerText = '0';
            return;
        }
        if (!servicos.length) {
            el.innerHTML = '<div class="empty-state">Nenhum serviço cadastrado para exibir.</div>';
            return;
        }

        el.innerHTML = '';
        servicos.forEach(s => this._criarCardServico(el, s));
    }

    _criarCardServico(container, s) {
        const nome = s.nome ?? 'Serviço sem nome';
        const descricao = s.descricao ?? 'Sem descrição.';
        const valorFinal = extrairValorServico(s);
        const status = s.status ?? 'Disponível';
        const statusClass = status.toLowerCase().replace(/\s+/g, '-');
        const tempoFormatado = formatarTempo(extrairTempoServico(s));

        const article = document.createElement('article');
        article.className = 'service-panel';
        article.dataset.id = s.id;

        article.innerHTML = `
            <div class="service-card-bg-icon"><i class="ti ti-tool"></i></div>
            <div class="service-card-content">
                <div class="service-panel-head">
                    <div class="service-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
                        </svg>
                    </div>
                </div>
                <h3>${escapeHtml(nome)}</h3>
                <p>${escapeHtml(descricao)}</p>
                <div class="service-details">
                    <span class="price"><small>R$</small>${valorFinal.toFixed(2).replace('.', ',')}</span>
                    <span class="status ${statusClass}">${escapeHtml(status)}</span>
                </div>
                <span class="time-chip">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>${tempoFormatado ? escapeHtml(tempoFormatado) : 'Não informado'}
                </span>
                <div class="service-actions">
                    <button class="btn-add-service" type="button">
                        <i class="ti ti-plus"></i> Adicionar à OS
                    </button>
                </div>
                <div class="service-actions">
                    <button class="btn-action ghost btn-edit-service" type="button">
                        <i class="ti ti-edit"></i> Editar
                    </button>
                    <button class="btn-action ghost btn-delete-service" type="button">
                        <i class="ti ti-trash"></i> Excluir
                    </button>
                </div>
            </div>
        `;

        container.appendChild(article);

        article.addEventListener('click', (event) => {
            if (event.target.closest('.btn-delete-service') || event.target.closest('.btn-add-service') || event.target.closest('.btn-edit-service')) {
                return;
            }
            this.handleViewServiceDetails(s);
        });

        article.querySelector('.btn-edit-service')?.addEventListener('click', (event) => {
            event.stopPropagation();
            this.handleEditService(s);
        });
        article.querySelector('.btn-delete-service')?.addEventListener('click', (event) => {
            event.stopPropagation();
            this.confirmarDelecao(s.id, nome);
        });
        article.querySelector('.btn-add-service')?.addEventListener('click', (event) => {
            event.stopPropagation();
            showPopup('Funcionalidade em Desenvolvimento', 'Adicionar serviço à OS diretamente do card está em construção.');
        });
    }

    handleViewServiceDetails(service) {
        const valorFinalFormatado = extrairValorServico(service).toFixed(2).replace('.', ',');
        const tempoFormatado = formatarTempo(extrairTempoServico(service));
        const statusTexto = service.status || 'Disponível';
        const statusClasse = statusTexto.toLowerCase().replace(/\s+/g, '-');

        const detailsHtml = `
            <div class="service-details-popup">
                <p class="popup-subtitle">Detalhes completos do serviço.</p>
                <div class="popup-service-header">
                    <h3 class="popup-service-title">${escapeHtml(service.nome)}</h3>
                    <span class="status ${statusClasse}">${escapeHtml(statusTexto)}</span>
                </div>
                <p class="popup-service-description">${escapeHtml(service.descricao)}</p>
                <div class="popup-stats-row">
                    <div class="popup-stat">
                        <span class="popup-stat-label">Valor</span>
                        <span class="popup-stat-value">R$ ${valorFinalFormatado}</span>
                    </div>
                    <div class="popup-stat-divider"></div>
                    <div class="popup-stat">
                        <span class="popup-stat-label">Tempo Médio</span>
                        <span class="popup-stat-value">${tempoFormatado || 'Não informado'}</span>
                    </div>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn-action ghost" id="popupCloseServiceDetailsBtn">Fechar</button>
                    <button type="button" class="btn-add-service" id="popupAddServiceToOs">
                        <i class="ti ti-plus"></i> Adicionar à OS
                    </button>
                </div>
            </div>
        `;
        showPopup('Detalhes do Serviço', detailsHtml, false, true);
        document.getElementById('popupCloseServiceDetailsBtn')?.addEventListener('click', hidePopup);
        document.getElementById('popupAddServiceToOs')?.addEventListener('click', () => {
            showPopup('Funcionalidade em Desenvolvimento', 'Adicionar serviço à OS está em construção.');
        });
    }

    handleAddService() {
        const formHtml = `
            <p class="popup-subtitle">Preencha os dados para incluir um novo serviço no catálogo da sua oficina.</p>
            <form id="add-service-form" class="popup-form">
                <div class="field">
                    <label class="field-label" for="service-name">Nome do Serviço</label>
                    <div class="input-wrap">
                        <input type="text" id="service-name" class="input" placeholder="Ex: Troca de Óleo" required>
                    </div>
                </div>
                <div class="field">
                    <label class="field-label" for="service-description">Descrição</label>
                    <div class="input-wrap">
                        <textarea id="service-description" class="input" placeholder="Descreva o que esse serviço inclui..." minlength="10" maxlength="500" required></textarea>
                    </div>
                    <small id="service-description-counter" class="field-hint">0 / 500 (mínimo 10 caracteres)</small>
                </div>
                <div class="field-row">
                    <div class="field">
                        <label class="field-label" for="service-value">Valor</label>
                        <div class="input-wrap prefix-input">
                            <span>R$</span>
                            <input type="text" id="service-value" inputmode="numeric" placeholder="0,00" required>
                        </div>
                    </div>
                    <div class="field">
                        <label class="field-label" for="service-time">Tempo Médio</label>
                        <div class="input-wrap time-input-wrap">
                            <input type="text" id="service-time" inputmode="numeric" placeholder="60" required>
                            <select id="service-time-unit" class="time-unit-select">
                                <option value="min">min</option>
                                <option value="h">horas</option>
                                <option value="d">dias</option>
                            </select>
                        </div>
                        <small id="service-time-preview" class="field-hint time-preview"></small>
                    </div>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn-secondary" id="cancel-add-service">Cancelar</button>
                    <button type="submit" class="btn-primary">Adicionar Serviço</button>
                </div>
            </form>
        `;

        showPopup('Adicionar Novo Serviço', formHtml, false, true);
        this._wireServiceForm({ formId: 'add-service-form', cancelId: 'cancel-add-service', isEdit: false });
    }

    handleEditService(service) {
        const valorNumerico = extrairValorServico(service);
        const valorFormatado = valorNumerico.toFixed(2).replace('.', ',');
        const tempoMinutos = extrairTempoServico(service) ?? 0;

        const formHtml = `
            <p class="popup-subtitle">Atualize os dados do serviço.</p>
            <form id="edit-service-form" class="popup-form">
                <div class="field">
                    <label class="field-label" for="edit-service-name">Nome do Serviço</label>
                    <div class="input-wrap">
                        <input type="text" id="edit-service-name" class="input" value="${escapeHtml(service.nome ?? '')}" required>
                    </div>
                </div>
                <div class="field">
                    <label class="field-label" for="edit-service-description">Descrição</label>
                    <div class="input-wrap">
                        <textarea id="edit-service-description" class="input" minlength="10" maxlength="500" required>${escapeHtml(service.descricao ?? '')}</textarea>
                    </div>
                    <small id="edit-service-description-counter" class="field-hint">${(service.descricao ?? '').length} / 500 (mínimo 10 caracteres)</small>
                </div>
                <div class="field-row">
                    <div class="field">
                        <label class="field-label" for="edit-service-value">Valor</label>
                        <div class="input-wrap prefix-input">
                            <span>R$</span>
                            <input type="text" id="edit-service-value" inputmode="numeric" value="${valorFormatado}" required>
                        </div>
                    </div>
                    <div class="field">
                        <label class="field-label" for="edit-service-time">Tempo Médio</label>
                        <div class="input-wrap time-input-wrap">
                            <input type="text" id="edit-service-time" inputmode="numeric" value="${tempoMinutos}" required>
                            <select id="edit-service-time-unit" class="time-unit-select">
                                <option value="min" selected>min</option>
                                <option value="h">horas</option>
                                <option value="d">dias</option>
                            </select>
                        </div>
                        <small id="edit-service-time-preview" class="field-hint time-preview">${tempoMinutos ? '≈ ' + formatarTempo(tempoMinutos) : ''}</small>
                    </div>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn-secondary" id="cancel-edit-service">Cancelar</button>
                    <button type="submit" class="btn-primary">Salvar Alterações</button>
                </div>
            </form>
        `;

        showPopup('Editar Serviço', formHtml, false, true);
        this._wireServiceForm({ formId: 'edit-service-form', cancelId: 'cancel-edit-service', isEdit: true, service });
    }

    _wireServiceForm({ formId, cancelId, isEdit, service }) {
        const prefix = isEdit ? 'edit-' : '';
        const form = document.getElementById(formId);
        const descField = document.getElementById(`${prefix}service-description`);
        const descCounter = document.getElementById(`${prefix}service-description-counter`);
        const valorField = document.getElementById(`${prefix}service-value`);
        const timeField = document.getElementById(`${prefix}service-time`);
        const timeUnit = document.getElementById(`${prefix}service-time-unit`);
        const timePreview = document.getElementById(`${prefix}service-time-preview`);

        descField?.addEventListener('input', () => {
            const len = descField.value.trim().length;
            descCounter.innerText = `${len} / 500 (mínimo 10 caracteres)`;
            descCounter.style.color = (len < DESCRICAO_MIN || len > DESCRICAO_MAX) ? '#FF5252' : '';
        });

        const atualizarPreview = () => {
            const val = parseInt(timeField?.value);
            const unit = timeUnit?.value;
            if (!val || isNaN(val) || val <= 0) { if (timePreview) timePreview.textContent = ''; return; }
            let min = val;
            if (unit === 'h') min = val * 60;
            if (unit === 'd') min = val * 1440;
            if (timePreview) timePreview.textContent = min ? `≈ ${formatarTempo(min)}` : '';
        };
        timeField?.addEventListener('input', () => {
            timeField.value = timeField.value.replace(/\D/g, '');
            atualizarPreview();
        });
        timeField?.addEventListener('keydown', (e) => {
            if (['e', 'E', '+', '-', '.', ','].includes(e.key)) e.preventDefault();
        });
        timeUnit?.addEventListener('change', atualizarPreview);

        valorField?.addEventListener('input', () => {
            valorField.value = applyCurrencyMask(valorField.value);
        });
        valorField?.addEventListener('focus', () => {
            requestAnimationFrame(() => valorField.setSelectionRange(valorField.value.length, valorField.value.length));
        });

        document.getElementById(cancelId)?.addEventListener('click', hidePopup);

        form?.addEventListener('submit', async (e) => {
            e.preventDefault();

            const nome = document.getElementById(`${prefix}service-name`).value.trim();
            const descricao = descField.value.trim();
            const tempoVal = parseInt(timeField.value);
            const tempoUnitVal = timeUnit.value;

            let tempoMedioEmMinutos = tempoVal;
            if (tempoUnitVal === 'h') tempoMedioEmMinutos = tempoVal * 60;
            if (tempoUnitVal === 'd') tempoMedioEmMinutos = tempoVal * 1440;

            const valor = parseCurrencyInput(valorField.value);

            if (!nome || isNaN(valor) || valor <= 0 || isNaN(tempoMedioEmMinutos) || tempoMedioEmMinutos <= 0) {
                showPopup('Erro de Validação', 'Por favor, preencha todos os campos corretamente. Valor e Tempo Médio devem ser números positivos.', true);
                return;
            }
            if (descricao.length < DESCRICAO_MIN || descricao.length > DESCRICAO_MAX) {
                showPopup('Erro de Validação', `A descrição deve ter entre ${DESCRICAO_MIN} e ${DESCRICAO_MAX} caracteres. Atualmente tem ${descricao.length}.`, true);
                return;
            }

            const serviceData = { nome, descricao, valor, tempoMedioEmMinutos };

            try {
                const response = isEdit
                    ? await this.servicoApi.atualizar(service.id, serviceData)
                    : await this.servicoApi.criar(serviceData);

                if (response.ok) {
                    hidePopup();
                    showPopup('Sucesso', isEdit ? 'Serviço atualizado com sucesso!' : 'Serviço adicionado com sucesso!');
                    this.carregarDados();
                } else {
                    showPopup('Erro de Validação', escapeHtml(await parseApiError(response, isEdit ? 'Erro ao atualizar serviço.' : 'Erro ao adicionar serviço.')), true);
                }
            } catch {
                showPopup('Erro de Conexão', 'Não foi possível conectar ao servidor ou erro inesperado.', true);
            }
        });
    }

    confirmarDelecao(id, nome) {
        const confirmHtml = `
            <p class="confirm-text">
                Tem certeza que deseja excluir o serviço<br>
                <strong></strong>?<br>
                <span class="confirm-warning">Essa ação não pode ser desfeita.</span>
            </p>
            <div class="confirm-actions">
                <button id="cancel-delete-btn" class="btn-secondary">Cancelar</button>
                <button id="confirm-delete-btn" class="btn-danger">Excluir</button>
            </div>
        `;

        // Corrigido (Alto A4): isError=false alinha com o padrão usado em contatos
        showPopup('Excluir Serviço', confirmHtml, false, true);
        document.querySelector('.confirm-text strong').textContent = `"${nome}"`;

        document.getElementById('confirm-delete-btn')?.addEventListener('click', async () => {
            try {
                const response = await this.servicoApi.excluir(id);
                if (response.ok || response.status === 204) {
                    hidePopup();
                    showPopup('Sucesso', 'Serviço excluído com sucesso!');
                    this.carregarDados();
                } else {
                    showPopup('Erro', escapeHtml(await parseApiError(response, 'Erro ao excluir serviço.')), true);
                }
            } catch {
                showPopup('Erro de Conexão', 'Não foi possível conectar ao servidor.', true);
            }
        });
        document.getElementById('cancel-delete-btn')?.addEventListener('click', hidePopup);
    }
}
