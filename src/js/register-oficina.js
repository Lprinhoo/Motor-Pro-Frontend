document.addEventListener('DOMContentLoaded', () => {
    const oficinaForm   = document.getElementById('oficina-form');
    const popupOverlay  = document.getElementById('popup-overlay');
    const popupTitle    = document.getElementById('popup-title');
    const popupMessage  = document.getElementById('popup-message');
    const popupIcon     = document.getElementById('popup-icon');
    const popupCloseBtn = document.getElementById('popup-close-btn');

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

    // Removida a verificação inicial de token. authFetch lidará com isso.

    oficinaForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const nome     = document.getElementById('nomeOficina').value.trim();
        const endereco = document.getElementById('endereco').value.trim();
        const telefone = document.getElementById('telefone').value.trim();
        const email    = document.getElementById('emailOficina').value.trim();

        if (!nome || !endereco || !telefone) {
            showPopup('Atenção', 'Preencha os campos obrigatórios: Nome, Endereço e Telefone.', true);
            return;
        }

        const btn = oficinaForm.querySelector('.btn-primary');
        btn.style.opacity = '0.7';
        btn.style.pointerEvents = 'none';

        try {
            // Usando authFetch para a requisição
            const response = await authFetch(`${API_BASE_URL}/oficinas`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // O cabeçalho Authorization é adicionado automaticamente por authFetch
                },
                body: JSON.stringify({ nome, endereco, telefone, email }),
            });

            if (response.ok) {
                const data = await response.json();
                localStorage.setItem('oficinaId', data.id);
                localStorage.setItem('oficinaNome', data.nome);
                showPopup('Sucesso', `Oficina "${data.nome}" cadastrada! Redirecionando...`);
                setTimeout(() => { hidePopup(); window.location.href = 'dashboard.html'; }, 1500);
            } else {
                // authFetch já lida com 401/403 e redirecionamento.
                // Aqui tratamos outros erros da API.
                const errorData = await response.json(); // Assumindo que a API retorna JSON para erros
                showPopup('Erro', errorData.message || 'Erro ao cadastrar oficina. Tente novamente.', true);
            }
        } catch (error) {
            console.error('Erro ao cadastrar oficina:', error);
            // Se o erro for do authFetch (ex: refresh token inválido), ele já redirecionou.
            // Outros erros de conexão serão tratados aqui.
            if (error.message !== 'Refresh Token inválido ou expirado') { // Evita pop-up duplicado se authFetch já redirecionou
                showPopup('Erro de Conexão', 'Não foi possível conectar ao servidor ou erro inesperado.', true);
            }
        } finally {
            btn.style.opacity = '';
            btn.style.pointerEvents = '';
        }
    });
});