import { authFetch, API_BASE_URL } from './script.js';
import { showPopup, hidePopup } from './utils.js'; // Import showPopup e hidePopup

document.addEventListener('DOMContentLoaded', () => {
    const logoutBtn     = document.getElementById('logoutBtn');
    const addServiceBtn   = document.getElementById('addServiceBtn');
    const editServicesBtn = document.getElementById('editServicesBtn');
    const metricServicosEl = document.getElementById('metricServicos'); // Adicionado para a métrica

    const token     = localStorage.getItem('jwtToken');
    const oficinaId = localStorage.getItem('oficinaId');

    if (!token) {
        setTimeout(() => { window.location.href = 'index.html'; }, 2000);
        return;
    }
    if (!oficinaId) {
        setTimeout(() => { window.location.href = 'register-oficina.html'; }, 2000);
        return;
    }

    const oficinaNome = localStorage.getItem('oficinaNome') || `Oficina #${oficinaId}`;
    document.getElementById('sbOficinaName').innerText = oficinaNome;
    const avatarEl = document.getElementById('sbOficinaAvatar');
    if (avatarEl) avatarEl.innerText = (oficinaNome.trim()[0] || 'O').toUpperCase();

    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            const page = item.dataset.page;
            if (page !== 'dashboard') {
                const label = item.querySelector('span')?.innerText || item.innerText.trim();
                showPopup('Em breve', `A seção "${label}" estará disponível em breve.`);
            }
        });
    });

    logoutBtn.addEventListener('click', () => {
        localStorage.clear();
        window.location.href = 'index.html';
    });

    // ─── Função para adicionar serviço (agora com formulário modal) ────────────────────────
    async function handleAddService() {
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
                        <div class="input-wrap prefix-input">
                            <input type="number" id="service-time" min="1" placeholder="60" required>
                            <span>min</span>
                        </div>
                    </div>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn-secondary" id="cancel-add-service">Cancelar</button>
                    <button type="submit" class="btn-primary">Adicionar Serviço</button>
                </div>
            </form>
        `;

        showPopup('Adicionar Novo Serviço', formHtml, false, true);

        const addServiceForm = document.getElementById('add-service-form');
        const cancelBtn = document.getElementById('cancel-add-service');
        const descricaoField = document.getElementById('service-description');
        const descricaoCounter = document.getElementById('service-description-counter');
        const valorField = document.getElementById('service-value');

        if (descricaoField && descricaoCounter) {
            descricaoField.addEventListener('input', () => {
                const len = descricaoField.value.trim().length;
                descricaoCounter.innerText = `${len} / 500 (mínimo 10 caracteres)`;
                descricaoCounter.style.color = (len < 10 || len > 500) ? '#FF5252' : '';
            });
        }

        // ─── Máscara de moeda no campo Valor (digita em centavos, formata em tempo real) ──
        if (valorField) {
            valorField.addEventListener('input', () => {
                // Mantém só os dígitos digitados
                let digits = valorField.value.replace(/\D/g, '');
                // Remove zeros à esquerda excedentes, mas mantém ao menos "0"
                digits = digits.replace(/^0+(?=\d)/, '');
                if (!digits) digits = '0';

                // Trata os dígitos como centavos
                const cents = parseInt(digits, 10);
                const reais = Math.floor(cents / 100);
                const centavos = (cents % 100).toString().padStart(2, '0');

                // Formata a parte inteira com separador de milhar
                const reaisFormatado = reais.toLocaleString('pt-BR');

                valorField.value = `${reaisFormatado},${centavos}`;
            });

            // Posiciona o cursor sempre no final ao focar
            valorField.addEventListener('focus', () => {
                requestAnimationFrame(() => {
                    valorField.setSelectionRange(valorField.value.length, valorField.value.length);
                });
            });
        }

        if (addServiceForm) {
            addServiceForm.addEventListener('submit', async (e) => {
                e.preventDefault();

                const nome = document.getElementById('service-name').value.trim();
                const descricao = document.getElementById('service-description').value.trim();
                const valorStr = document.getElementById('service-value').value;
                const tempoMedioEmMinutosStr = document.getElementById('service-time').value;

                // O campo de valor usa máscara de moeda BR (ex: "1.250,90") — converte para número
                const valor = parseFloat(valorStr.replace(/\./g, '').replace(',', '.'));
                const tempoMedioEmMinutos = parseInt(tempoMedioEmMinutosStr);

                if (!nome || isNaN(valor) || valor <= 0 || isNaN(tempoMedioEmMinutos) || tempoMedioEmMinutos <= 0) {
                    showPopup('Erro de Validação', 'Por favor, preencha todos os campos corretamente. Valor e Tempo Médio devem ser números positivos.', true);
                    return;
                }

                const DESCRICAO_MIN = 10;
                const DESCRICAO_MAX = 500;
                if (descricao.length < DESCRICAO_MIN || descricao.length > DESCRICAO_MAX) {
                    showPopup(
                        'Erro de Validação',
                        `A descrição deve ter entre ${DESCRICAO_MIN} e ${DESCRICAO_MAX} caracteres. Atualmente tem ${descricao.length}.`,
                        true
                    );
                    return;
                }

                const serviceData = {
                    nome,
                    descricao,
                    valor,
                    tempoMedioEmMinutos
                };

                try {
                    const response = await authFetch(`${API_BASE_URL}/servicos`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(serviceData)
                    });

                    if (response.ok) {
                        hidePopup(); // Fecha o formulário modal
                        showPopup('Sucesso', 'Serviço adicionado com sucesso!');
                        carregarDados(); // Recarrega a lista de serviços
                    } else {
                        const errorText = await response.text();
                        let errorMessage = 'Erro ao adicionar serviço.';
                        try {
                            const errorData = JSON.parse(errorText);
                            if (errorData.errors && typeof errorData.errors === 'object') {
                                errorMessage = Object.values(errorData.errors).join(' ');
                            } else if (errorData.message) {
                                errorMessage = errorData.message;
                            }
                        } catch {
                            errorMessage = errorText || errorMessage;
                        }
                        showPopup('Erro de Validação', errorMessage, true);
                    }
                } catch (error) {
                    console.error('Erro ao adicionar serviço:', error);
                    showPopup('Erro de Conexão', 'Não foi possível conectar ao servidor ou erro inesperado.', true);
                }
            });
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', hidePopup);
        }
    }

    if (addServiceBtn) {
        addServiceBtn.addEventListener('click', handleAddService);
    }
    if (editServicesBtn) {
        editServicesBtn.addEventListener('click', () => {
            showPopup('Funcionalidade em Desenvolvimento', 'A tela de edição de serviços está em construção.');
        });
    }

    carregarDados();

    async function carregarDados() {
        try {
            // Busca serviços diretamente pelo usuário autenticado (rota correta do backend)
            const resServicos = await authFetch(`${API_BASE_URL}/servicos`);

            if (resServicos.ok) {
                const servicos = await resServicos.json();
                renderizarPaineisServicos(Array.isArray(servicos) ? servicos : []);
                if (metricServicosEl) metricServicosEl.innerText = (Array.isArray(servicos) ? servicos.length : 0).toString();

            } else if (resServicos.status === 204) {
                // Sem conteúdo — lista vazia, não é erro
                console.log('Nenhum serviço cadastrado ainda.');
                renderizarPaineisServicos([]);
                if (metricServicosEl) metricServicosEl.innerText = '0';

            } else {
                // Erro real do servidor (400, 500, etc.)
                console.error('Erro ao buscar serviços. Status:', resServicos.status);
                const errorText = await resServicos.text();
                let errorMessage = 'Erro ao carregar serviços. Tente novamente.';
                try {
                    const errorData = JSON.parse(errorText);
                    errorMessage = errorData.message || errorMessage;
                } catch {
                    errorMessage = errorText || errorMessage;
                }
                showPopup('Erro', errorMessage, true);
                renderizarPaineisServicos([]);
                if (metricServicosEl) metricServicosEl.innerText = '0';
            }
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            if (error.message !== 'Refresh Token inválido ou expirado') {
                showPopup('Erro de Conexão', 'Não foi possível conectar ao servidor ou erro inesperado.', true);
            }
            renderizarPaineisServicos([]);
            if (metricServicosEl) metricServicosEl.innerText = '0';
        }
    }

    function renderizarPaineisServicos(servicos) {
        const el = document.getElementById('servicePanelsContainer');
        if (!el) return;

        if (!Array.isArray(servicos)) {
            console.error('Dados de serviços recebidos não são um array:', servicos);
            el.innerHTML = '<div class="empty-state">Erro ao carregar serviços. Formato de dados inesperado.</div>';
            if (metricServicosEl) metricServicosEl.innerText = '0';
            return;
        }

        if (!servicos.length) {
            el.innerHTML = '<div class="empty-state">Nenhum serviço cadastrado para exibir.</div>';
            return;
        }

        el.innerHTML = servicos.map(s => {
            const nome = s.nome ?? 'Serviço sem nome';
            const descricao = s.descricao ?? 'Sem descrição.';

            // O backend pode retornar o valor com nomes de campo diferentes
            // dependendo da versão/rota da API. Tentamos as variações mais comuns
            // antes de cair em 0.
            const valorBruto = s.valor ?? s.preco ?? s.valorServico ?? s.valorUnitario ?? s.price;
            const valor = typeof valorBruto === 'number' ? valorBruto : parseFloat(valorBruto);
            const valorFinal = isNaN(valor) ? 0 : valor;

            if (isNaN(valor)) {
                console.warn('Não foi possível identificar o campo de valor do serviço. Objeto recebido:', s);
            }

            const status = s.status ?? 'Disponível';
            const statusClass = status.toLowerCase().replace(/\s+/g, '-');

            return `
                <article class="service-panel" data-id="${s.id}">
                    <div class="service-panel-head">
                        <div class="service-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
                            </svg>
                        </div>
                        <div class="service-actions">
                            <button class="btn-delete-service" type="button" data-id="${s.id}" title="Excluir serviço">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                                    <polyline points="3 6 5 6 21 6"/>
                                    <path d="M19 6l-1 14H6L5 6"/>
                                    <path d="M10 11v6M14 11v6"/>
                                    <path d="M9 6V4h6v2"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                    <h3>${nome}</h3>
                    <p>${descricao}</p>
                    <div class="service-details">
                        <span class="price"><small>R$</small>${valorFinal.toFixed(2).replace('.', ',')}</span>
                        <span class="status ${statusClass}">${status}</span>
                    </div>
                    <button class="btn-add-service" type="button">
                        <i class="ti ti-plus"></i> Adicionar à OS
                    </button>
                </article>
            `;
        }).join('');

        // Adiciona evento de deletar em cada botão
        el.querySelectorAll('.btn-delete-service').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.id;
                const nomeServico = btn.closest('article').querySelector('h3').innerText;
                confirmarDelecao(id, nomeServico);
            });
        });
    }

    // ─── Confirmação e deleção ────────────────────────────────────────────────
    function confirmarDelecao(id, nome) {
        const confirmHtml = `
            <p class="confirm-text">
                Tem certeza que deseja excluir o serviço<br>
                <strong>"${nome}"</strong>?<br>
                <span class="confirm-warning">Essa ação não pode ser desfeita.</span>
            </p>
            <div class="confirm-actions">
                <button id="cancel-delete-btn" class="btn-secondary">Cancelar</button>
                <button id="confirm-delete-btn" class="btn-danger">Excluir</button>
            </div>
        `;

        showPopup('Excluir Serviço', confirmHtml, true, true);

        document.getElementById('confirm-delete-btn').addEventListener('click', async () => {
            await deletarServico(id);
        });
        document.getElementById('cancel-delete-btn').addEventListener('click', hidePopup);
    }

    async function deletarServico(id) {
        try {
            const response = await authFetch(`${API_BASE_URL}/servicos/${id}`, {
                method: 'DELETE'
            });

            if (response.ok || response.status === 204) {
                hidePopup();
                showPopup('Sucesso', 'Serviço excluído com sucesso!');
                carregarDados();
            } else {
                const errorText = await response.text();
                let errorMessage = 'Erro ao excluir serviço.';
                try {
                    const errorData = JSON.parse(errorText);
                    errorMessage = errorData.message || errorMessage;
                } catch {
                    errorMessage = errorText || errorMessage;
                }
                showPopup('Erro', errorMessage, true);
            }
        } catch (error) {
            console.error('Erro ao deletar serviço:', error);
            showPopup('Erro de Conexão', 'Não foi possível conectar ao servidor.', true);
        }
    }
});