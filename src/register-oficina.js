document.addEventListener('DOMContentLoaded', () => {
    const oficinaForm = document.getElementById('oficina-form');
    const popupOverlay  = document.getElementById('popup-overlay');
    const popupTitle    = document.getElementById('popup-title');
    const popupMessage  = document.getElementById('popup-message');
    const popupCloseBtn = document.getElementById('popup-close-btn');

    const API_BASE_URL = 'http://76.13.173.156:8080/api';

    const showPopup = (title, message, isError = false) => {
        popupTitle.innerText  = title;
        popupMessage.innerText = message;
        popupTitle.style.color = isError ? '#FF4D4D' : '#16BC4E';
        popupCloseBtn.style.backgroundColor = isError ? '#FF4D4D' : '#16BC4E';
        popupOverlay.classList.remove('hidden');
    };

    const hidePopup = () => popupOverlay.classList.add('hidden');
    popupCloseBtn.addEventListener('click', hidePopup);

    // Verifica autenticação ao carregar
    const token = localStorage.getItem('jwtToken');
    if (!token) {
        showPopup('Acesso Negado', 'Você não está logado. Redirecionando...', true);
        setTimeout(() => { window.location.href = 'index.html'; }, 2000);
        return;
    }

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

        try {
            const response = await fetch(`${API_BASE_URL}/oficinas`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ nome, endereco, telefone, email }),
            });

            if (response.ok) {
                const data = await response.json();
                localStorage.setItem('oficinaId', data.id);
                localStorage.setItem('oficinaNome', data.nome);
                showPopup('Sucesso', `Oficina "${data.nome}" cadastrada! Redirecionando...`);
                setTimeout(() => { hidePopup(); window.location.href = 'dashboard.html'; }, 1500);
            } else if (response.status === 403) {
                localStorage.removeItem('jwtToken');
                showPopup('Sessão Expirada', 'Sua sessão expirou. Redirecionando para o login.', true);
                setTimeout(() => { window.location.href = 'index.html'; }, 2000);
            } else {
                const errorText = await response.text();
                showPopup('Erro', errorText || 'Erro ao cadastrar oficina. Tente novamente.', true);
            }
        } catch {
            showPopup('Erro de Conexão', 'Não foi possível conectar ao servidor.', true);
        }
    });
});