document.addEventListener('DOMContentLoaded', () => {
    const oficinaForm = document.getElementById('oficina-form');

    // Elementos do Pop-up (reutilizados)
    const popupOverlay = document.getElementById('popup-overlay');
    const popupTitle = document.getElementById('popup-title');
    const popupMessage = document.getElementById('popup-message');
    const popupCloseBtn = document.getElementById('popup-close-btn');

    // Função para exibir o pop-up
    const showPopup = (title, message, isError = false) => {
        popupTitle.innerText = title;
        popupMessage.innerText = message;
        if (isError) {
            popupTitle.style.color = '#FF4D4D';
            popupCloseBtn.style.backgroundColor = '#FF4D4D';
        } else {
            popupTitle.style.color = '#16BC4E';
            popupCloseBtn.style.backgroundColor = '#16BC4E';
        }
        popupOverlay.classList.remove('hidden');
    };

    // Função para esconder o pop-up
    const hidePopup = () => {
        popupOverlay.classList.add('hidden');
    };

    // Event listener para fechar o pop-up
    popupCloseBtn.addEventListener('click', hidePopup);

    oficinaForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const nomeOficinaInput = document.getElementById('nomeOficina');
        const enderecoInput = document.getElementById('endereco');
        const telefoneInput = document.getElementById('telefone');
        const emailOficinaInput = document.getElementById('emailOficina');

        const nome = nomeOficinaInput.value;
        const endereco = enderecoInput.value;
        const telefone = telefoneInput.value;
        const email = emailOficinaInput.value; // O email pode ser vazio

        // Validação básica: email não é mais obrigatório
        if (!nome || !endereco || !telefone) {
            showPopup('Erro de Cadastro', 'Por favor, preencha os campos obrigatórios: Nome, Endereço e Telefone.', true);
            return;
        }

        const API_BASE_URL = 'http://76.13.173.156:8080';
        const endpoint = '/api/oficinas';
        const token = localStorage.getItem('jwtToken');

        if (!token) {
            showPopup('Erro de Autenticação', 'Você não está logado. Redirecionando para o login.', true);
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
            return;
        }

        const body = {
            nome: nome,
            endereco: endereco,
            telefone: telefone,
            email: email // Envia o email, mesmo que seja vazio
        };

        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(body),
            });

            console.log('Resposta completa da API (Cadastro Oficina):', response);

            if (response.ok) {
                const data = await response.json(); // API retorna JSON em sucesso
                localStorage.setItem('oficinaId', data.id); // Salva o ID da oficina
                console.log('ID da Oficina armazenado:', data.id);
                showPopup('Sucesso', `Oficina "${data.nome}" cadastrada com sucesso! Redirecionando para o Dashboard...`);
                setTimeout(() => {
                    hidePopup();
                    window.location.href = 'dashboard.html'; // Redireciona para o dashboard
                }, 1500);
            } else if (response.status === 403) {
                showPopup('Sessão Expirada', 'Sua sessão expirou. Por favor, faça login novamente.', true);
                localStorage.removeItem('jwtToken'); // Limpa o token inválido
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 2000);
            } else {
                const errorText = await response.text(); // Erros retornam texto puro
                console.log('Dados de erro da API (Cadastro Oficina - Texto):', errorText);
                showPopup('Erro', errorText || 'Erro ao cadastrar oficina. Tente novamente.', true);
            }
        } catch (error) {
            console.error('Erro na requisição de cadastro de oficina:', error);
            showPopup('Erro de Conexão', 'Não foi possível conectar ao servidor. Tente novamente mais tarde.', true);
        }
    });
});