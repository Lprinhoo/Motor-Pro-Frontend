document.addEventListener('DOMContentLoaded', () => {
    const jwtTokenDisplay = document.getElementById('jwtTokenDisplay');
    const oficinaIdDisplay = document.getElementById('oficinaIdDisplay');
    const logoutBtn = document.getElementById('logoutBtn');

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

    const token = localStorage.getItem('jwtToken');
    const oficinaId = localStorage.getItem('oficinaId');

    if (!token) {
        showPopup('Acesso Negado', 'Você não está logado. Redirecionando para o login.', true);
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
        return;
    }

    // Exibe o token e o ID da oficina (se existirem)
    jwtTokenDisplay.innerText = token ? token.substring(0, 30) + '...' : 'N/A'; // Mostra só o começo do token
    oficinaIdDisplay.innerText = oficinaId || 'N/A';

    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('jwtToken');
        localStorage.removeItem('oficinaId');
        showPopup('Logout', 'Você foi desconectado com sucesso!');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1500);
    });
});