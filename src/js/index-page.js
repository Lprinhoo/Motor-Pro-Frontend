import { showPopup, hidePopup } from './utils.js';
import { authFetch, API_BASE_URL } from './script.js';

document.addEventListener('DOMContentLoaded', () => {
    const flipper            = document.getElementById('flipper');
    const loginForm          = document.getElementById('login-form');
    const registerForm       = document.getElementById('register-form');
    const toggleAuthLogin    = document.getElementById('toggle-auth-login');
    const toggleAuthRegister = document.getElementById('toggle-auth-register');
    const forgotPass         = document.getElementById('forgot-pass');
    const cbRemember         = document.getElementById('cb-remember');

    // ─── Flip ─────────────────────────────────────────────────
    let isFlipping = false;

    const flipTo = (showBack) => {
        if (!flipper) return;
        if (isFlipping) return;
        isFlipping = true;
        flipper.classList.toggle('flipped', showBack);
        setTimeout(() => { isFlipping = false; }, 650);
    };

    if (toggleAuthLogin) toggleAuthLogin.addEventListener('click', (e) => { e.preventDefault(); flipTo(true); });
    if (toggleAuthRegister) toggleAuthRegister.addEventListener('click', (e) => { e.preventDefault(); flipTo(false); });

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
    }

    // ─── Mostrar/ocultar senha ────────────────────────────────
    document.querySelectorAll('.eye-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.dataset.target;
            const input    = document.getElementById(targetId);
            if (!input) return;
            const isPass = input.type === 'password';
            input.type = isPass ? 'text' : 'password';
            btn.querySelector('.eye-icon--show').style.display = isPass ? 'none' : '';
            btn.querySelector('.eye-icon--hide').style.display = isPass ? '' : 'none';
            btn.setAttribute('aria-label', isPass ? 'Ocultar senha' : 'Mostrar senha');
        });
    });

    // ─── Busca oficina do usuário após login ──────────────────
    async function buscarOficinaDoUsuario() {
        try {
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
            // Erro silencioso — será tratado pelo redirecionamento
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
                    const data = await response.json();
                    const accessToken  = data.accessToken;
                    const refreshToken = data.refreshToken;

                    if (!accessToken) {
                        showPopup('Erro de Login', 'Token de acesso não recebido na resposta do servidor.', true);
                        return;
                    }

                    localStorage.setItem('jwtToken',      accessToken);
                    localStorage.setItem('refreshToken',  refreshToken || '');

                    const temOficina = await buscarOficinaDoUsuario();
                    setTimeout(() => {
                        window.location.href = temOficina ? 'dashboard.html' : 'register-oficina.html';
                    }, 400);
                } else {
                    let errorMessage = 'Usuário ou senha incorretos.';
                    try {
                        const errorText = await response.text();
                        const errorData = JSON.parse(errorText);
                        errorMessage = errorData.message || errorText || errorMessage;
                    } catch { /* mantém padrão */ }
                    showPopup('Erro de acesso', errorMessage, true);
                }
            } catch (error) {
                showPopup('Erro de Conexão', 'Não foi possível conectar ao servidor ou erro inesperado.', true);
            } finally {
                btn.style.opacity = '';
                btn.style.pointerEvents = '';
            }
        });
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
            // Mínimo elevado de 6 para 8 caracteres (ponto médio da análise de segurança)
            if (password.length < 8) {
                showPopup('Senha fraca', 'A senha deve ter pelo menos 8 caracteres.', true);
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
                        const errorText = await regResponse.text();
                        const errorData = JSON.parse(errorText);
                        errorMessage = errorData.message || errorText || errorMessage;
                    } catch { /* mantém padrão */ }
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
                    const data = await loginResponse.json();
                    const accessToken  = data.accessToken;
                    const refreshToken = data.refreshToken;

                    if (!accessToken) {
                        showPopup('Erro no Cadastro', 'Token de acesso não recebido após cadastro.', true);
                        return;
                    }

                    localStorage.setItem('jwtToken',      accessToken);
                    localStorage.setItem('refreshToken',  refreshToken || '');

                    const temOficina = await buscarOficinaDoUsuario();
                    setTimeout(() => {
                        window.location.href = temOficina ? 'dashboard.html' : 'register-oficina.html';
                    }, 400);
                } else {
                    let errorMessage = 'Erro ao fazer login automático após cadastro.';
                    try {
                        const errorText = await loginResponse.text();
                        const errorData = JSON.parse(errorText);
                        errorMessage = errorData.message || errorText || errorMessage;
                    } catch { /* mantém padrão */ }
                    showPopup('Erro no login automático', errorMessage, true);
                    flipTo(false);
                }
            } catch (error) {
                showPopup('Erro de Conexão', 'Não foi possível conectar ao servidor ou erro inesperado.', true);
            } finally {
                btn.style.opacity = '';
                btn.style.pointerEvents = '';
            }
        });
    }

    // ─── Esqueceu a senha ─────────────────────────────────────
    if (forgotPass) {
        forgotPass.addEventListener('click', (e) => {
            e.preventDefault();
            showPopup('Indisponível', 'A redefinição de senha está temporariamente indisponível.', true);
        });
    }
});
