import { authService, oficinaApi, servicoApi, tokenStorage } from '../app/container.js';
import { bootDone } from '../boot.js';
import { ServicosSection } from './servicosSection.js';
import { ContatosSection } from './contatosSection.js';

document.addEventListener('DOMContentLoaded', () => {
    const logoutBtn  = document.getElementById('logoutBtn');
    const dbContent  = document.querySelector('.db-content');

    const token     = tokenStorage.get('jwtToken');
    const oficinaId = tokenStorage.get('oficinaId');

    if (!token) {
        window.location.href = 'index.html';
        return;
    }
    if (!oficinaId) {
        window.location.href = 'register-oficina.html';
        return;
    }

    setTimeout(bootDone, 1800);

    const oficinaNome = tokenStorage.get('oficinaNome') || `Oficina #${oficinaId}`;
    const nomeEl = document.getElementById('sbOficinaName');
    if (nomeEl) nomeEl.innerText = oficinaNome;

    const getOficinaId = () => tokenStorage.get('oficinaId');

    // ─── Registro de seções (OCP) ───────────────────────────────────────────
    // Cada chave corresponde ao `data-page` usado no HTML. Para habilitar uma
    // nova página, basta implementar a seção e registrá-la aqui — nenhuma
    // outra parte deste orquestrador precisa ser alterada.
    const sections = {
        dashboard: new ServicosSection(servicoApi),
        contatos: new ContatosSection(oficinaApi, getOficinaId),
    };

    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const page = item.dataset.page;
            const section = sections[page];

            // Ignora clique em páginas não implementadas (mesmo comportamento original)
            if (!section) return;

            document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');

            if (dbContent) dbContent.innerHTML = '';
            section.render(dbContent);
        });
    });

    logoutBtn?.addEventListener('click', () => {
        authService.logout();
        window.location.href = 'index.html';
    });

    // Seção inicial (equivalente ao "dashboard" carregado por padrão no HTML)
    sections.dashboard.render(dbContent);
});
