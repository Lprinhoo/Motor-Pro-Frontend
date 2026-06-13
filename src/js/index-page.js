import { showPopup, hidePopup } from './utils.js'; // Import showPopup e hidePopup
import { authFetch, API_BASE_URL } from './script.js'; // Import authFetch e API_BASE_URL

document.addEventListener('DOMContentLoaded', () => {
    const flipper            = document.getElementById('flipper');
    const loginForm          = document.getElementById('login-form');
    const registerForm       = document.getElementById('register-form');
    const toggleAuthLogin    = document.getElementById('toggle-auth-login');
    const toggleAuthRegister = document.getElementById('toggle-auth-register');
    const forgotPass         = document.getElementById('forgot-pass');
    const cbRemember         = document.getElementById('cb-remember');

    // Adiciona console logs para verificar se os elementos são encontrados
    console.log('index-page.js: DOMContentLoaded - flipper:', flipper);
    console.log('index-page.js: DOMContentLoaded - loginForm:', loginForm);
    console.log('index-page.js: DOMContentLoaded - registerForm:', registerForm);
    console.log('index-page.js: DOMContentLoaded - toggleAuthLogin:', toggleAuthLogin);
    console.log('index-page.js: DOMContentLoaded - toggleAuthRegister:', toggleAuthRegister);
    console.log('index-page.js: DOMContentLoaded - forgotPass:', forgotPass);
    console.log('index-page.js: DOMContentLoaded - cbRemember:', cbRemember);

    // ─── Flip ─────────────────────────────────────────────────
    let isFlipping = false;

    const flipTo = (showBack) => {
        if (!flipper) {
            console.warn('index-page.js: flipper element not found for flipTo function.');
            return;
        }
        if (isFlipping) return;
        isFlipping = true;
        flipper.classList.toggle('flipped', showBack);
        setTimeout(() => { isFlipping = false; }, 650);
    };

    if (toggleAuthLogin) {
        toggleAuthLogin.addEventListener('click', (e) => { e.preventDefault(); flipTo(true); });
    } else {
        console.warn('index-page.js: toggleAuthLogin element not found. Skipping event listener.');
    }
    if (toggleAuthRegister) {
        toggleAuthRegister.addEventListener('click', (e) => { e.preventDefault(); flipTo(false); });
    } else {
        console.warn('index-page.js: toggleAuthRegister element not found. Skipping event listener.');
    }

    // ─── Checkbox "Lembrar-me" ────────────────────────────────
    if (cbRemember) {
        cbRemember.addEventListener('click', () => {
            const isChecked = cbRemember.classList.toggle('checked');
            cbRemember.setAttribute('aria-checked', isChecked);
        });
        cbRemember.addEventListener('keydown', (e) => {
            if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                cbRemember.click();
            }
        });
    } else {
        console.warn('index-page.js: cbRemember element not found. Skipping event listener.');
    }

    // ─── Mostrar/ocultar senha ────────────────────────────────
    document.querySelectorAll('.eye-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.dataset.target;
            const input    = document.getElementById(targetId);
            if (!input) {
                console.warn(`index-page.js: Input element with ID "${targetId}" not found for eye-btn.`);
                return;
            }
            const isPass = input.type === 'password';
            input.type = isPass ? 'text' : 'password';
            btn.querySelector('.eye-icon--show').style.display = isPass ? 'none' : '';
            btn.querySelector('.eye-icon--hide').style.display = isPass ? '' : 'none';
            btn.setAttribute('aria-label', isPass ? 'Ocultar senha' : 'Mostrar senha');
        });
    });

    // ─── Busca oficina do usuário após login ──────────────────
    async function buscarOficinaDoUsuario(token) {
        try {
            // Usando authFetch para esta requisição
            const response = await authFetch(`${API_BASE_URL}/oficinas/minha`);
            if (response.ok) {
                const oficina = await response.json();
                if (oficina && oficina.id) {
                    localStorage.setItem('oficinaId',   oficina.id);
                    localStorage.setItem('oficinaNome', oficina.nome || '');
                    return true;
                }
            }
        } catch (error) {
            console.error('Erro ao buscar oficina do usuário:', error);
        }
        return false;
    }

    // ─── Login ────────────────────────────────────────────────
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('username-login').value.trim();
            const password = document.getElementById('password-login').value;

            if (!username || !password) {
                showPopup('Atenção', 'Preencha usuário e senha.', true);
                return;
            }

            const btn = loginForm.querySelector('.btn-primary');
            btn.style.opacity = '0.7';
            btn.style.pointerEvents = 'none';

            try {
                const response = await fetch(`${API_BASE_URL}/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password }),
                });

                if (response.ok) {
                    const data = await response.json(); // Sempre espera JSON
                    const accessToken = data.accessToken;
                    const refreshToken = data.refreshToken;

                    if (!accessToken) {
                        showPopup('Erro de Login', 'Token de acesso não recebido na resposta do servidor.', true);
                        throw new Error('Token de acesso não recebido.');
                    }
                    if (!refreshToken) {
                        console.warn('Login: Refresh Token não recebido na resposta do servidor. Refresh automático não será possível.');
                    }

                    localStorage.setItem('jwtToken', accessToken);
                    localStorage.setItem('refreshToken', refreshToken || ''); // Salva o refreshToken ou uma string vazia
                    console.log('Login: Tokens recebidos e salvos.');
                    
                    const temOficina = await buscarOficinaDoUsuario(accessToken);
                    setTimeout(() => {
                        window.location.href = temOficina ? 'dashboard.html' : 'register-oficina.html';
                    }, 400);
                } else {
                    let errorMessage = 'Usuário ou senha incorretos.';
                    try {
                        const errorData = JSON.parse(await response.text());
                        errorMessage = errorData.message || errorMessage;
                    } catch {
                        errorMessage = await response.text() || errorMessage;
                    }
                    showPopup('Erro de acesso', errorMessage, true);
                }
            } catch (error) {
                console.error('Erro no login:', error);
                showPopup('Erro de Conexão', 'Não foi possível conectar ao servidor ou erro inesperado.', true);
            } finally {
                btn.style.opacity = '';
                btn.style.pointerEvents = '';
            }
        });
    } else {
        console.warn('index-page.js: loginForm element not found. Skipping event listener.');
    }

    // ─── Cadastro ─────────────────────────────────────────────
    if (registerForm) {
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
                showPopup('Senhas diferentes', 'As senhas digitadas não coincidem.', true);
                return;
            }
            if (password.length < 6) {
                showPopup('Senha fraca', 'A senha deve ter pelo menos 6 caracteres.', true);
                return;
            }

            const btn = registerForm.querySelector('.btn-primary');
            btn.style.opacity = '0.7';
            btn.style.pointerEvents = 'none';

            try {
                const regResponse = await fetch(`${API_BASE_URL}/auth/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, email, password }),
                });

                if (!regResponse.ok) {
                    let errorMessage = 'Erro ao criar conta. Tente novamente.';
                    try {
                        const errorData = JSON.parse(await regResponse.text());
                        errorMessage = errorData.message || errorMessage;
                    } catch {
                        errorMessage = await regResponse.text() || errorMessage;
                    }
                    showPopup('Erro no cadastro', errorMessage, true);
                    return;
                }

                // Login automático após cadastro
                const loginResponse = await fetch(`${API_BASE_URL}/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password }),
                });

                if (loginResponse.ok) {
                    const data = await loginResponse.json(); // Sempre espera JSON
                    const accessToken = data.accessToken;
                    const refreshToken = data.refreshToken;

                    if (!accessToken) {
                        showPopup('Erro no Cadastro', 'Token de acesso não recebido após cadastro.', true);
                        throw new Error('Token de acesso não recebido.');
                    }
                    if (!refreshToken) {
                        console.warn('Cadastro: Refresh Token não recebido na resposta do servidor. Refresh automático não será possível.');
                    }

                    localStorage.setItem('jwtToken', accessToken);
                    localStorage.setItem('refreshToken', refreshToken || ''); // Salva o refreshToken ou uma string vazia
                    console.log('Cadastro: Tokens recebidos e salvos.');
                    
                    const temOficina = await buscarOficinaDoUsuario(accessToken);
                    setTimeout(() => {
                        window.location.href = temOficina ? 'dashboard.html' : 'register-oficina.html';
                    }, 400);
                } else {
                    let errorMessage = 'Erro ao fazer login automático após cadastro.';
                    try {
                        const errorData = JSON.parse(await loginResponse.text());
                        errorMessage = errorData.message || errorMessage;
                    } catch {
                        errorMessage = await loginResponse.text() || errorMessage;
                    }
                    showPopup('Erro no login automático', errorMessage, true);
                    flipTo(false); // Volta para a tela de login
                }
            } catch (error) {
                console.error('Erro no cadastro ou login automático:', error);
                showPopup('Erro de Conexão', 'Não foi possível conectar ao servidor ou erro inesperado.', true);
            } finally {
                btn.style.opacity = '';
                btn.style.pointerEvents = '';
            }
        });
    } else {
        console.warn('index-page.js: registerForm element not found. Skipping event listener.');
    }

    // ─── Esqueceu a senha ─────────────────────────────────────
    if (forgotPass) {
        forgotPass.addEventListener('click', (e) => {
            e.preventDefault();
            showPopup('Indisponível', 'A redefinição de senha está temporariamente indisponível.', true);
        });
    } else {
        console.warn('index-page.js: forgotPass element not found. Skipping event listener.');
    }
});