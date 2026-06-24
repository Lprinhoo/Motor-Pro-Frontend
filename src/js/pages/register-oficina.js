import { oficinaApi, tokenStorage } from '../app/container.js';
import { showPopup, hidePopup } from '../components/popup.js';
import { parseApiError } from '../services/apiErrorParser.js';

document.addEventListener('DOMContentLoaded', () => {
    const oficinaForm = document.getElementById('oficina-form');
    if (!oficinaForm) return;

    oficinaForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const nome     = document.getElementById('nomeOficina').value.trim();
        const endereco = document.getElementById('endereco').value.trim();

        if (!nome || !endereco) {
            showPopup('Atenção', 'Preencha os campos obrigatórios: Nome e Endereço.', true);
            return;
        }

        const btn = oficinaForm.querySelector('.btn-primary');
        btn.style.opacity = '0.7';
        btn.style.pointerEvents = 'none';

        try {
            const response = await oficinaApi.criarOficina({ nome, endereco });

            if (response.ok) {
                const data = await response.json();
                tokenStorage.setItem('oficinaId', data.id);
                tokenStorage.setItem('oficinaNome', data.nome);
                showPopup('Sucesso', `Oficina "${data.nome}" cadastrada! Redirecionando...`);
                setTimeout(() => { hidePopup(); window.location.href = 'dashboard.html'; }, 1500);
            } else {
                showPopup('Erro', await parseApiError(response, 'Erro ao cadastrar oficina. Tente novamente.'), true);
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
