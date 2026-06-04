import { API_BASE_URL } from './config.js';
import { showPopup, hidePopup } from './utils.js';

document.addEventListener('DOMContentLoaded', () => {
    const oficinaForm = document.getElementById('oficina-form');

    // Verifica autenticação ao carregar
    const token = localStorage.getItem('jwtToken');
    if (!token) {
        // Redirecionamento direto sem popup
        window.location.href = 'index.html';
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
            const response = await fetch(`${API_BASE_URL}/api/oficinas`, {
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
                // Redirecionamento direto após cadastro bem-sucedido
                window.location.href = 'dashboard.html';
            } else if (response.status === 403) {
                localStorage.removeItem('jwtToken');
                // Redirecionamento direto sem popup
                window.location.href = 'index.html';
            } else {
                const errorText = await response.text();
                showPopup('Erro', errorText || 'Erro ao cadastrar oficina. Tente novamente.', true);
            }
        } catch {
            showPopup('Erro de Conexão', 'Não foi possível conectar ao servidor.', true);
        }
    });
});