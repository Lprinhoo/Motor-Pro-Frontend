import { authFetch, API_BASE_URL } from './script.js';
import { showPopup, hidePopup } from './utils.js'; // Import showPopup e hidePopup

document.addEventListener('DOMContentLoaded', () => {
    const logoutBtn     = document.getElementById('logoutBtn');
    const addServiceBtn   = document.getElementById('addServiceBtn');
    const editServicesBtn = document.getElementById('editServicesBtn');

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

        showPopup('Adicionar Novo Serviço', formHtml);

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
                    const response = await authFetch(`${API_BASE_URL}/api/servicos`, { // Adicionado '/api'
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
            // Primeiro, verifica se a oficina existe e o token é válido
            const resOficina = await authFetch(`${API_BASE_URL}/api/oficinas/${oficinaId}`); // Adicionado '/api'

            if (!resOficina.ok) {
                const errorText = await resOficina.text();
                let errorMessage = 'Erro ao carregar dados da oficina. Tente novamente.';
                try {
                    const errorData = JSON.parse(errorText);
                    errorMessage = errorData.message || errorMessage;
                } catch {
                    errorMessage = errorText || errorMessage;
                }
                showPopup('Erro', errorMessage, true);
                renderizarPaineisServicos([]); // Renderiza vazio em caso de erro na oficina
                return;
            }

            // Se a oficina existe e o token é válido, busca os serviços
            const resServicos = await authFetch(`${API_BASE_URL}/api/oficinas/${oficinaId}/servicos`); // Adicionado '/api'

            if (resServicos.ok) {
                const servicos = await resServicos.json();
                renderizarPaineisServicos(servicos); // Renderiza os serviços reais
            } else {
                const errorText = await resServicos.text();
                let errorMessage = 'Erro ao carregar serviços. Tente novamente.';
                try {
                    const errorData = JSON.parse(errorText);
                    errorMessage = errorData.message || errorMessage;
                } catch {
                    errorMessage = errorText || errorMessage;
                }
                showPopup('Erro', errorMessage, true);
                renderizarPaineisServicos([]); // Renderiza vazio em caso de erro nos serviços
            }
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            // Se o erro for do authFetch (ex: refresh token inválido), ele já redirecionou.
            // Outros erros de conexão serão tratados aqui.
            if (error.message !== 'Refresh Token inválido ou expirado') {
                showPopup('Erro de Conexão', 'Não foi possível conectar ao servidor ou erro inesperado.', true);
            }
            renderizarPaineisServicos([]); // Renderiza vazio em caso de erro de conexão
        }
    }

    function renderizarPaineisServicos(servicos) {
        const el = document.getElementById('servicePanelsContainer');
        if (!el) return;
        if (!servicos.length) {
            el.innerHTML = '<div class="empty-state">Nenhum serviço cadastrado para exibir.</div>';
            return;
        }
        el.innerHTML = servicos.map(s => `
            <article class="service-panel">
                <h3>${s.nome}</h3>
                <p>${s.descricao}</p>
                <div class="service-details">
                    <span class="price"><small>R$</small>${s.valor.toFixed(2).replace('.', ',')}</span>
                    <span class="status ${s.status ? s.status.toLowerCase().replace(/\s+/g, '-') : 'disponivel'}">${s.status || 'Disponível'}</span>
                </div>
                <button class="btn-add-service" type="button">Adicionar à OS</button>
            </article>
        `).join('');
    }
});