document.addEventListener('DOMContentLoaded', () => {
    const popupOverlay  = document.getElementById('popup-overlay');
    const popupTitle    = document.getElementById('popup-title');
    const popupMessage  = document.getElementById('popup-message');
    const popupCloseBtn = document.getElementById('popup-close-btn');
    const logoutBtn     = document.getElementById('logoutBtn');

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

    // ─── Autenticação ─────────────────────────────────────────
    const token     = localStorage.getItem('jwtToken');
    const oficinaId = localStorage.getItem('oficinaId');

    if (!token) {
        setTimeout(() => { window.location.href = 'html/index.html'; }, 2000);
        return;
    }

    if (!oficinaId) {
        setTimeout(() => { window.location.href = 'html/register-oficina.html'; }, 2000);
        return;
    }

    // ─── Nome da oficina na sidebar ───────────────────────────
    const oficinaNome = localStorage.getItem('oficinaNome');
    document.getElementById('sbOficinaName').innerText = oficinaNome || `ID ${oficinaId}`;

    // ─── Navegação sidebar (estrutura para futuras páginas) ───
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            const page = item.dataset.page;
            if (page !== 'dashboard') {
                showPopup('Em breve', `A seção "${item.innerText.trim()}" estará disponível em breve.`);
            }
        });
    });

    // ─── Logout ───────────────────────────────────────────────
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('jwtToken');
        localStorage.removeItem('oficinaId');
        localStorage.removeItem('oficinaNome');
        window.location.href = 'html/index.html';
    });

    // ─── Carrega dados da API ─────────────────────────────────
    carregarDados();

    async function carregarDados() {
        try {
            const headers = { 'Authorization': `Bearer ${token}` };

            // Busca dados da oficina
            const resOficina = await fetch(`${API_BASE_URL}/oficinas/${oficinaId}`, { headers });

            if (resOficina.status === 403) {
                localStorage.removeItem('jwtToken');
                window.location.href = 'html/index.html';
                return;
            }

            // Por ora renderiza dados mockados até os endpoints de CRM existirem
            renderizarMetricas({ clientes: 0, os: 0, faturamento: 0, veiculos: 0 });
            renderizarClientesRecentes([]);
            renderizarOrdensRecentes([]);
            renderizarServicos([]);

        } catch {
            renderizarMetricas({ clientes: 0, os: 0, faturamento: 0, veiculos: 0 });
        }
    }

    // ─── Renderização ─────────────────────────────────────────
    function renderizarMetricas({ clientes, os, faturamento, veiculos }) {
        document.getElementById('metricClientes').innerText    = clientes;
        document.getElementById('metricOS').innerText          = os;
        document.getElementById('metricFaturamento').innerText = faturamento > 0
            ? `R$${(faturamento / 1000).toFixed(1)}k`
            : 'R$0';
        document.getElementById('metricVeiculos').innerText    = veiculos;
    }

    function renderizarClientesRecentes(clientes) {
        const el = document.getElementById('clientesRecentes');
        if (!clientes.length) {
            el.innerHTML = '<div class="empty-state">Nenhum cliente cadastrado ainda.</div>';
            return;
        }
        el.innerHTML = clientes.map(c => {
            const iniciais = c.nome.split(' ').map(n => n[0]).slice(0,2).join('').toUpperCase();
            return `
                <div class="client-item">
                    <div class="avatar">${iniciais}</div>
                    <div>
                        <div class="client-name">${c.nome}</div>
                        <div class="client-sub">${c.veiculo || ''} · OS #${c.osId || '—'}</div>
                    </div>
                    <span class="badge ${c.status}">${c.statusLabel}</span>
                </div>`;
        }).join('');
    }

    function renderizarOrdensRecentes(ordens) {
        const el = document.getElementById('ordensRecentes');
        if (!ordens.length) {
            el.innerHTML = '<div class="empty-state">Nenhuma ordem de serviço ainda.</div>';
            return;
        }
        el.innerHTML = ordens.map(o => `
            <div class="os-item">
                <div>
                    <div class="os-num">#${String(o.id).padStart(4,'0')}</div>
                    <div class="os-desc">${o.descricao}</div>
                    <div class="os-sub">${o.cliente} · ${o.veiculo}</div>
                </div>
                <div class="os-val">R$${o.valor}</div>
            </div>`
        ).join('');
    }

    function renderizarServicos(servicos) {
        const el = document.getElementById('servicosChart');
        if (!servicos.length) {
            el.innerHTML = '<div class="empty-state">Dados indisponíveis. Cadastre ordens de serviço para ver estatísticas.</div>';
            return;
        }
        const max = Math.max(...servicos.map(s => s.count));
        el.innerHTML = servicos.map(s => {
            const pct = Math.round((s.count / max) * 100);
            return `
                <div class="bar-row">
                    <span class="bar-label">${s.nome}</span>
                    <div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div>
                    <span class="bar-pct">${s.count}x</span>
                </div>`;
        }).join('');
    }
});