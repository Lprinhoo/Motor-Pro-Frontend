document.addEventListener('DOMContentLoaded', () => {
    const popupOverlay  = document.getElementById('popup-overlay');
    const popupTitle    = document.getElementById('popup-title');
    const popupMessage  = document.getElementById('popup-message');
    const popupCloseBtn = document.getElementById('popup-close-btn');
    const logoutBtn     = document.getElementById('logoutBtn');

    // Reintroduzindo os botões de serviço
    const addServiceBtn   = document.getElementById('addServiceBtn');
    const editServicesBtn = document.getElementById('editServicesBtn');

    const API_BASE_URL = 'http://76.13.173.156:8080/api';

    const showPopup = (title, message, isError = false) => {
        popupTitle.innerText   = title;
        popupMessage.innerText = message;
        popupTitle.style.color = isError ? '#FF4D4D' : '#16BC4E';
        popupCloseBtn.style.backgroundColor = isError ? '#FF4D4D' : '#16BC4E';
        popupOverlay.classList.remove('hidden');
    };
    const hidePopup = () => popupOverlay.classList.add('hidden');
    popupCloseBtn.addEventListener('click', hidePopup);
    popupOverlay.addEventListener('click', (e) => { if (e.target === popupOverlay) hidePopup(); });

    // ─── Autenticação ─────────────────────────────────────────
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
        localStorage.removeItem('jwtToken');
        localStorage.removeItem('oficinaId');
        localStorage.removeItem('oficinaNome');
        window.location.href = 'index.html';
    });

    // ─── Botões de Ação para Serviços ────────────────────────
    if (addServiceBtn) {
        addServiceBtn.addEventListener('click', () => {
            showPopup('Funcionalidade em Desenvolvimento', 'A tela de adicionar serviços está em construção.');
        });
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
            const headers = { 'Authorization': `Bearer ${token}` };
            const resOficina = await fetch(`${API_BASE_URL}/oficinas/${oficinaId}`, { headers });
            if (resOficina.status === 403) {
                localStorage.removeItem('jwtToken');
                window.location.href = 'index.html';
                return;
            }
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
        } finally {
            // Renderiza os painéis de serviço com dados mockados
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