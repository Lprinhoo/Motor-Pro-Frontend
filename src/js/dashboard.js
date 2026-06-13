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
                        <textarea id="service-description" class="input" placeholder="Descrição detalhada do serviço" required></textarea>
                    </div>
                </div>
                <div class="field">
                    <label class="field-label" for="service-value">Valor (R$)</label>
                    <div class="input-wrap">
                        <input type="number" id="service-value" class="input" step="0.01" min="0.01" placeholder="Ex: 150.00" required>
                    </div>
                </div>
                <div class="field">
                    <label class="field-label" for="service-time">Tempo Médio (minutos)</label>
                    <div class="input-wrap">
                        <input type="number" id="service-time" class="input" min="1" placeholder="Ex: 60" required>
                    </div>
                </div>
                <div class="form-actions">
                    <button type="submit" class="btn-primary">Adicionar Serviço</button>
                    <button type="button" class="btn-secondary" id="cancel-add-service">Cancelar</button>
                </div>
            </form>
        `;

        showPopup('Adicionar Novo Serviço', formHtml, false, true);

        const addServiceForm = document.getElementById('add-service-form');
        const cancelBtn = document.getElementById('cancel-add-service');

        if (addServiceForm) {
            addServiceForm.addEventListener('submit', async (e) => {
                e.preventDefault();

                const nome = document.getElementById('service-name').value.trim();
                const descricao = document.getElementById('service-description').value.trim();
                const valorStr = document.getElementById('service-value').value;
                const tempoMedioEmMinutosStr = document.getElementById('service-time').value;

                const valor = parseFloat(valorStr);
                const tempoMedioEmMinutos = parseInt(tempoMedioEmMinutosStr);

                if (!nome || !descricao || isNaN(valor) || valor <= 0 || isNaN(tempoMedioEmMinutos) || tempoMedioEmMinutos <= 0) {
                    showPopup('Erro de Validação', 'Por favor, preencha todos os campos corretamente. Valor e Tempo Médio devem ser números positivos.', true);
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
                            errorMessage = errorData.message || errorMessage;
                        } catch {
                            errorMessage = errorText || errorMessage;
                        }
                        showPopup('Erro', errorMessage, true);
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
                console.log('Serviços recebidos da API:', servicos);
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
            const valor = typeof s.valor === 'number' ? s.valor : parseFloat(s.valor) || 0;
            const status = s.status ?? 'Disponível';
            const statusClass = status.toLowerCase().replace(/\s+/g, '-');

            return `
                <article class="service-panel" data-id="${s.id}">
                    <h3>${nome}</h3>
                    <p>${descricao}</p>
                    <div class="service-details">
                        <span class="price"><small>R$</small>${valor.toFixed(2).replace('.', ',')}</span>
                        <span class="status ${statusClass}">${status}</span>
                    </div>
                    <div class="service-actions">
                        <button class="btn-add-service" type="button">Adicionar à OS</button>
                        <button class="btn-delete-service" type="button" data-id="${s.id}" title="Excluir serviço">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                                <polyline points="3 6 5 6 21 6"/>
                                <path d="M19 6l-1 14H6L5 6"/>
                                <path d="M10 11v6M14 11v6"/>
                                <path d="M9 6V4h6v2"/>
                            </svg>
                            Excluir
                        </button>
                    </div>
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
            <p style="margin-bottom: 1.2rem; color: var(--text-mute); font-size: 13px; line-height: 1.6;">
                Tem certeza que deseja excluir o serviço<br>
                <strong style="color: var(--text);">"${nome}"</strong>?<br>
                <span style="color: var(--danger); font-size: 12px;">Essa ação não pode ser desfeita.</span>
            </p>
            <div style="display: flex; gap: 10px; justify-content: center;">
                <button id="confirm-delete-btn" style="
                    background: var(--danger); color: #fff; border: none;
                    border-radius: var(--radius); padding: 10px 22px;
                    font-family: 'Sora', sans-serif; font-size: 11px;
                    font-weight: 800; letter-spacing: 2px; text-transform: uppercase;
                    cursor: pointer;">
                    Excluir
                </button>
                <button id="cancel-delete-btn" style="
                    background: rgba(255,255,255,0.06); color: var(--text-mute);
                    border: 1px solid var(--border-2); border-radius: var(--radius);
                    padding: 10px 22px; font-family: 'Sora', sans-serif;
                    font-size: 11px; font-weight: 700; letter-spacing: 2px;
                    text-transform: uppercase; cursor: pointer;">
                    Cancelar
                </button>
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