import { authFetch } from './script.js'; // Import authFetch

document.addEventListener('DOMContentLoaded', () => {
    const popupOverlay  = document.getElementById('popup-overlay');
    const popupTitle    = document.getElementById('popup-title');
    const popupMessage  = document.getElementById('popup-message');
    const popupIcon     = document.getElementById('popup-icon'); // Adicionado
    const popupCloseBtn = document.getElementById('popup-close-btn');
    const logoutBtn     = document.getElementById('logoutBtn');

    // Reintroduzindo os botões de serviço
    const addServiceBtn   = document.getElementById('addServiceBtn');
    const editServicesBtn = document.getElementById('editServicesBtn');

    const API_BASE_URL = 'http://76.13.173.156:8080/api';

    // ─── Pop-up ───────────────────────────────────────────────
    const showPopup = (title, message, isError = false) => {
        popupTitle.innerText   = title;
        popupMessage.innerText = message;
        popupTitle.style.color = isError ? '#FF5252' : '#00E676'; // Usando nova cor da marca
        popupCloseBtn.style.background = isError ? '#FF5252' : 'linear-gradient(135deg, #00E676 0%, #00C853 100%)'; // Usando gradiente
        popupCloseBtn.style.color = isError ? '#fff' : '#0A0A0C'; // Usando bg-0 para texto escuro

        if (popupIcon) {
            popupIcon.style.background = isError
                ? 'rgba(255,82,82,0.15)' // Usando nova cor danger
                : 'rgba(0,230,118,0.15)'; // Usando nova cor brand-soft
            popupIcon.style.border = isError
                ? '1px solid rgba(255,82,82,0.25)'
                : '1px solid rgba(0,230,118,0.25)';
            popupIcon.innerHTML = isError
                ? '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FF5252" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>'
                : '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00E676" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/></svg>';
        }

        popupOverlay.classList.remove('hidden');
    };
    const hidePopup = () => popupOverlay.classList.add('hidden');

    popupCloseBtn.addEventListener('click', hidePopup);
    popupOverlay.addEventListener('click', (e) => {
        if (e.target === popupOverlay) hidePopup();
    });

    // ─── Autenticação ─────────────────────────────────────────
    const token     = localStorage.getItem('jwtToken');
    const oficinaId = localStorage.getItem('oficinaId');

    if (!token) {
        // Se não há token, redireciona para o login. authFetch não lida com token ausente, apenas expirado.
        setTimeout(() => { window.location.href = 'index.html'; }, 2000);
        return;
    }
    if (!oficinaId) {
        // Se não há oficina cadastrada, redireciona para o cadastro de oficina.
        setTimeout(() => { window.location.href = 'register-oficina.html'; }, 2000);
        return;
    }

    // ─── Nome da oficina + avatar com inicial ────────────────
    const oficinaNome = localStorage.getItem('oficinaNome') || `Oficina #${oficinaId}`;
    document.getElementById('sbOficinaName').innerText = oficinaNome;
    const avatarEl = document.getElementById('sbOficinaAvatar');
    if (avatarEl) avatarEl.innerText = (oficinaNome.trim()[0] || 'O').toUpperCase();

    // ─── Navegação sidebar ────────────────────────────────────
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

    // ─── Logout ───────────────────────────────────────────────
    logoutBtn.addEventListener('click', () => {
        localStorage.clear(); // Limpa todos os tokens e IDs
        window.location.href = 'index.html';
    });

    // ─── Função para adicionar serviço ────────────────────────
    async function handleAddService() {
        const nome = prompt('Digite o nome do serviço:');
        if (!nome) return;

        const descricao = prompt('Digite a descrição do serviço:');
        if (!descricao) return;

        const valorStr = prompt('Digite o valor do serviço (ex: 150.00):');
        const valor = parseFloat(valorStr);
        if (isNaN(valor) || valor <= 0) {
            showPopup('Erro', 'Valor inválido. Digite um número positivo.', true);
            return;
        }

        const tempoMedioEmMinutosStr = prompt('Digite o tempo médio em minutos (ex: 60):');
        const tempoMedioEmMinutos = parseInt(tempoMedioEmMinutosStr);
        if (isNaN(tempoMedioEmMinutos) || tempoMedioEmMinutos <= 0) {
            showPopup('Erro', 'Tempo médio inválido. Digite um número inteiro positivo.', true);
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
                showPopup('Sucesso', 'Serviço adicionado com sucesso!');
                // Opcionalmente, recarregue a lista de serviços aqui
                // carregarDados(); // Isso buscaria todos os dados novamente, incluindo os serviços
            } else {
                const errorData = await response.json();
                showPopup('Erro', errorData.message || 'Erro ao adicionar serviço.', true);
            }
        } catch (error) {
            console.error('Erro ao adicionar serviço:', error);
            showPopup('Erro de Conexão', 'Não foi possível conectar ao servidor ou erro inesperado.', true);
        }
    }

    // ─── Botões de Ação para Serviços ────────────────────────
    if (addServiceBtn) {
        addServiceBtn.addEventListener('click', handleAddService);
    }
    if (editServicesBtn) {
        editServicesBtn.addEventListener('click', () => {
            showPopup('Funcionalidade em Desenvolvimento', 'A tela de edição de serviços está em construção.');
        });
    }

    // ─── Dados mock ───────────────────────────────────────────
    const SERVICOS_MOCK = [
        { id: 1, nome: 'Troca de Óleo',              descricao: 'Serviço completo de troca de óleo e filtro.',                preco: 120.00, status: 'Disponível' },
        { id: 2, nome: 'Revisão de Freios',          descricao: 'Verificação e substituição de pastilhas e discos.',          preco: 250.00, status: 'Disponível' },
        { id: 3, nome: 'Alinhamento e Balanceamento',descricao: 'Ajuste da geometria e balanceamento das rodas.',             preco: 150.00, status: 'Disponível' },
        { id: 4, nome: 'Diagnóstico Eletrônico',     descricao: 'Verificação de falhas no sistema eletrônico do veículo.',    preco: 180.00, status: 'Disponível' },
        { id: 5, nome: 'Troca de Pneus',             descricao: 'Substituição e calibragem de pneus.',                        preco:  80.00, status: 'Disponível' },
        { id: 6, nome: 'Troca de Bateria',           descricao: 'Substituição e teste de bateria automotiva.',                preco: 300.00, status: 'Disponível' },
        { id: 7, nome: 'Revisão Geral',              descricao: 'Check-up completo do veículo, incluindo fluidos e componentes.', preco: 450.00, status: 'Disponível' }
    ];

    // ─── Carrega dados ────────────────────────────────────────
    carregarDados();

    async function carregarDados() {
        try {
            // Usando authFetch para a requisição
            const resOficina = await authFetch(`${API_BASE_URL}/oficinas/${oficinaId}`); // authFetch já adiciona o token

            if (resOficina.ok) {
                // Se a resposta for OK, não precisamos fazer nada aqui,
                // pois o objetivo era apenas verificar a autenticação e carregar dados mockados.
                // Em um cenário real, você processaria os dados da oficina aqui.
            } else {
                // authFetch já lida com 401/403 e redirecionamento.
                // Aqui tratamos outros erros da API.
                const errorData = await resOficina.json(); // Assumindo que a API retorna JSON para erros
                showPopup('Erro', errorData.message || 'Erro ao carregar dados da oficina. Tente novamente.', true);
            }
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            // Se o erro for do authFetch (ex: refresh token inválido), ele já redirecionou.
            // Outros erros de conexão serão tratados aqui.
            if (error.message !== 'Refresh Token inválido ou expirado') { // Evita pop-up duplicado se authFetch já redirecionou
                showPopup('Erro de Conexão', 'Não foi possível conectar ao servidor ou erro inesperado.', true);
            }
        } finally {
            // Renderiza os painéis de serviço com dados mockados, independentemente do sucesso da chamada à API
            renderizarPaineisServicos(SERVICOS_MOCK);
        }
    }

    // ─── Renderização ─────────────────────────────────────────
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
                    <span class="price"><small>R$</small>${s.preco.toFixed(2).replace('.', ',')}</span>
                    <span class="status ${s.status.toLowerCase().replace(/\s+/g, '-')}">${s.status}</span>
                </div>
                <button class="btn-add-service" type="button">Adicionar à OS</button>
            </article>
        `).join('');
    }
});