import { authFetch, API_BASE_URL } from './script.js';
import { showPopup, hidePopup } from './utils.js'; // Import showPopup e hidePopup

document.addEventListener('DOMContentLoaded', () => {
    const oficinaForm   = document.getElementById('oficina-form');

    // A função validatePhoneNumber e suas chamadas foram removidas, pois o telefone não é mais enviado diretamente.

    oficinaForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const nome     = document.getElementById('nomeOficina').value.trim();
        const endereco = document.getElementById('endereco').value.trim();
        // Telefone e email foram removidos do formulário e não são mais coletados aqui.

        if (!nome || !endereco) { // A validação agora é apenas para nome e endereço
            showPopup('Atenção', 'Preencha os campos obrigatórios: Nome e Endereço.', true);
            return;
        }

        const btn = oficinaForm.querySelector('.btn-primary');
        btn.style.opacity = '0.7';
        btn.style.pointerEvents = 'none';

        try {
            const response = await authFetch(`${API_BASE_URL}/oficinas`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ nome, endereco }), // Envia apenas nome e endereço
            });

            if (response.ok) {
                const data = await response.json();
                localStorage.setItem('oficinaId', data.id);
                localStorage.setItem('oficinaNome', data.nome);
                showPopup('Sucesso', `Oficina "${data.nome}" cadastrada! Redirecionando...`);
                setTimeout(() => { hidePopup(); window.location.href = 'dashboard.html'; }, 1500);
            } else {
                const errorText = await response.text();
                let errorMessage = 'Erro ao cadastrar oficina. Tente novamente.';
                try {
                    const errorData = JSON.parse(errorText);
                    errorMessage = errorData.message || errorMessage;
                } catch {
                    errorMessage = errorText || errorMessage;
                }
                showPopup('Erro', errorMessage, true);
            }
        } catch (error) {
            console.error('Erro ao cadastrar oficina:', error);
            if (error.message !== 'Refresh Token inválido ou expirado') {
                showPopup('Erro de Conexão', 'Não foi possível conectar ao servidor ou erro inesperado.', true);
            }
        } finally {
            btn.style.opacity = '';
            btn.style.pointerEvents = '';
        }
    });
});