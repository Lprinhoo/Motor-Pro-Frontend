import { API_BASE_URL } from './config.js';
import { showPopup, hidePopup } from './utils.js';

document.addEventListener('DOMContentLoaded', () => {
    const cardFlipContainer  = document.querySelector('.card-flip-container');
    const frontFace          = document.querySelector('.front-face');
    const backFace           = document.querySelector('.back-face');
    const loginForm          = document.getElementById('login-form');
    const registerForm       = document.getElementById('register-form');
    const toggleAuthLogin    = document.getElementById('toggle-auth-login');
    const toggleAuthRegister = document.getElementById('toggle-auth-register');
    const forgotPass         = document.getElementById('forgot-pass');

    let isAnimating = false;

    // ─── Flip ─────────────────────────────────────────────────
    const HALF  = 120;
    const PIVOT = 85;

    const flipTo = (showRegister) => {
        if (isAnimating) return;
        isAnimating = true;

        const leaving  = showRegister ? frontFace : backFace;
        const entering = showRegister ? backFace  : frontFace;

        cardFlipContainer.style.height = leaving.offsetHeight + 'px';

        entering.style.cssText = `
            position: absolute; top: 0; left: 0; width: 100%;
            opacity: 1; pointer-events: none;
            transform: perspective(900px) rotateY(90deg);
            transition: none;
        `;

        leaving.style.transition = `transform ${HALF}ms ease-in`;
        leaving.style.transform  = 'perspective(900px) rotateY(-90deg)';

        setTimeout(() => {
            leaving.style.cssText = `
                position: absolute; top: 0; left: 0; width: 100%;
                opacity: 0; pointer-events: none;
                transform: perspective(900px) rotateY(-90deg); transition: none;
            `;
            entering.style.cssText = `
                position: relative; opacity: 1; pointer-events: all;
                transform: perspective(900px) rotateY(90deg); transition: none;
            `;
            cardFlipContainer.style.height = entering.offsetHeight + 'px';

            setTimeout(() => {
                entering.style.transition = `transform ${HALF}ms ease-out`;
                entering.style.transform  = 'perspective(900px) rotateY(0deg)';

                setTimeout(() => {
                    cardFlipContainer.classList.toggle('flipped', showRegister);
                    leaving.style.cssText  = '';
                    entering.style.cssText = '';
                    cardFlipContainer.style.height = '';
                    isAnimating = false;
                }, HALF + 20);
            }, 16);
        }, PIVOT);
    };

    toggleAuthLogin.addEventListener('click', (e) => { e.preventDefault(); flipTo(true); });
    toggleAuthRegister.addEventListener('click', (e) => { e.preventDefault(); flipTo(false); });

    // ─── Busca oficina do usuário na API após login ───────────
    async function buscarOficinaDoUsuario(token) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/oficinas/minha`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                const oficina = data;
                if (oficina && oficina.id) {
                    localStorage.setItem('oficinaId', oficina.id);
                    localStorage.setItem('oficinaNome', oficina.nome || '');
                    return true;
                }
            }
        } catch {
            // ignora erro silenciosamente
        }
        return false;
    }

    // ─── Login ────────────────────────────────────────────────
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('username-login').value.trim();
        const password = document.getElementById('password-login').value;

        if (!username || !password) {
            showPopup('Atenção', 'Preencha usuário e senha.', true);
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });
            const data = await response.json(); // Altera para await response.json()

            if (response.ok) {
                localStorage.setItem('jwtToken', data.token); // Pega a propriedade 'token' do objeto JSON

                const temOficina = await buscarOficinaDoUsuario(data.token); // Usa o token do objeto JSON

                // Redirecionamento direto após login bem-sucedido
                window.location.href = temOficina ? 'dashboard.html' : 'register-oficina.html';
            } else {
                // Para erros, o backend ainda pode retornar uma string simples ou um JSON de erro.
                // Se for uma string simples, response.text() é melhor. Se for JSON de erro, response.json().
                // Por enquanto, vamos assumir que pode ser uma string simples para a mensagem de erro.
                // Se o backend começar a retornar JSON para erros, você precisará ajustar aqui também.
                showPopup('Erro', data.message || 'Usuário ou senha incorretos.', true); // Assumindo que a mensagem de erro pode vir em 'data.message'
            }
        } catch {
            showPopup('Erro de Conexão', 'Não foi possível conectar ao servidor.', true);
        }
    });

    // ─── Cadastro: registra e já faz login automaticamente ────
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username        = document.getElementById('username-register').value.trim();
        const email           = document.getElementById('email-register').value.trim();
        const password        = document.getElementById('password-register').value;
        const confirmPassword = document.getElementById('confirm-password-register').value;

        if (!username || !email || !password || !confirmPassword) {
            showPopup('Atenção', 'Preencha todos os campos.', true);
            return;
        }
        if (password !== confirmPassword) {
            showPopup('Erro', 'As senhas não coincidem.', true);
            return;
        }

        try {
            const regResponse = await fetch(`${API_BASE_URL}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password }),
            });

            if (!regResponse.ok) {
                const err = await regResponse.text();
                showPopup('Erro', err || 'Erro ao criar conta. Tente novamente.', true);
                return;
            }

            const loginResponse = await fetch(`${API_BASE_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });

            if (loginResponse.ok) {
                const loginData = await loginResponse.json(); // Altera para await loginResponse.json()
                localStorage.setItem('jwtToken', loginData.token); // Pega a propriedade 'token' do objeto JSON
                // Redirecionamento direto após cadastro e login bem-sucedidos
                window.location.href = 'register-oficina.html';
            } else {
                // Se o login automático falhar, apenas redireciona para a tela de login
                flipTo(false);
            }
        } catch {
            showPopup('Erro de Conexão', 'Não foi possível conectar ao servidor.', true);
        }
    });

    // ─── Esqueceu a senha ─────────────────────────────────────
    forgotPass.addEventListener('click', (e) => {
        e.preventDefault();
        showPopup('Indisponível', 'A redefinição de senha está temporariamente indisponível.', true);
    });
});