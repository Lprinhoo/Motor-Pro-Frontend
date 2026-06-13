import { authFetch, API_BASE_URL } from './script.js';
import { showPopup, hidePopup } from './utils.js'; // Import showPopup e hidePopup

document.addEventListener('DOMContentLoaded', () => {
    const oficinaForm   = document.getElementById('oficina-form');

    // Função de validação de telefone
    const validatePhoneNumber = (phoneNumber) => {
        // Regex para validar formatos de telefone brasileiro:
        // (DD) 9XXXX-XXXX ou (DD) XXXX-XXXX
        // DD9XXXX-XXXX ou DDXXXX-XXXX
        // 9XXXX-XXXX ou XXXX-XXXX (sem DDD, assume-se local)
        // Aceita espaços, hífens e parênteses opcionais
        const regex = /^\(?(?:[14689][1-9]|2[12478]|3[1234578]|5[1345]|6[1-9]|7[134579]|8[123456789])\)?\s?(?:[2-8]|9[1-9])[0-9]{3}\-?[0-9]{4}$|^\(?[1-9][0-9]\)?\s?[9][0-9]{4}\-?[0-9]{4}$|^[9][0-9]{4}\-?[0-9]{4}$|^[2-8][0-9]{3}\-?[0-9]{4}$/;
        // Uma regex mais simples e abrangente para números com 8 ou 9 dígitos, com ou sem DDD, e com ou sem formatação
        const simpleRegex = /^\(?[1-9]{2}\)?\s?9?[0-9]{4}\-?[0-9]{4}$/;
        // Regex para aceitar apenas números e ter entre 8 e 11 dígitos (considerando DDD e 9 extra)
        const digitsOnlyRegex = /^[0-9]{8,11}$/;

        // Remove tudo que não for dígito para validação final
        const cleanPhoneNumber = phoneNumber.replace(/\D/g, '');

        // Valida se tem entre 8 e 11 dígitos (ex: 9999-9999, 99999-9999, 11999999999)
        return digitsOnlyRegex.test(cleanPhoneNumber);
    };

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

        if (!validatePhoneNumber(telefone)) {
            showPopup('Erro de Validação', 'Por favor, insira um número de telefone válido (ex: (XX) 9XXXX-XXXX ou XXXXX-XXXX).', true);
            return;
        }

        const btn = oficinaForm.querySelector('.btn-primary');
        btn.style.opacity = '0.7';
        btn.style.pointerEvents = 'none';

        try {
            const response = await authFetch(`${API_BASE_URL}/api/oficinas`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
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