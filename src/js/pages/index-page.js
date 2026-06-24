import { showPopup, hidePopup } from '../components/popup.js';
import { authService, oficinaApi, tokenStorage } from '../app/container.js';
import { bootDone } from '../boot.js';
import { parseApiError } from '../services/apiErrorParser.js';

// ─── Login automático: se "Lembrar-me" estava marcado e há um token salvo,
// pula a tela de login e vai direto pro dashboard ──────────────────────────
if (authService.isRemembered() && authService.isAuthenticated()) {
    window.location.href = 'dashboard.html';
}

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(bootDone, 1800);

    const flipper            = document.getElementById('flipper');
    const loginForm          = document.getElementById('login-form');
    const registerForm       = document.getElementById('register-form');
    const toggleAuthLogin    = document.getElementById('toggle-auth-login');
    const toggleAuthRegister = document.getElementById('toggle-auth-register');
    const forgotPass         = document.getElementById('forgot-pass');
    const cbRemember         = document.getElementById('cb-remember');
    const loginError         = document.getElementById('login-error');
    const usernameLoginField = document.getElementById('username-login');
    const passwordLoginField = document.getElementById('password-login');

    function showLoginError(message) {
        if (loginError) {
            loginError.textContent = message;
            loginError.style.display = 'block';
        }
        usernameLoginField?.classList.add('input--error');
        passwordLoginField?.classList.add('input--error');
    }

    function clearLoginError() {
        if (loginError) {
            loginError.textContent = '';
            loginError.style.display = 'none';
        }
        usernameLoginField?.classList.remove('input--error');
        passwordLoginField?.classList.remove('input--error');
    }

    usernameLoginField?.addEventListener('input', clearLoginError);
    passwordLoginField?.addEventListener('input', clearLoginError);

    // ─── Flip ─────────────────────────────────────────────────
    let isFlipping = false;
    const flipTo = (showBack) => {
        if (!flipper || isFlipping) return;
        isFlipping = true;
        flipper.classList.toggle('flipped', showBack);
        setTimeout(() => { isFlipping = false; }, 650);
    };

    toggleAuthLogin?.addEventListener('click', (e) => { e.preventDefault(); flipTo(true); });
    toggleAuthRegister?.addEventListener('click', (e) => { e.preventDefault(); flipTo(false); });

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
            const input = document.getElementById(btn.dataset.target);
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
            const response = await oficinaApi.buscarMinhaOficina();
            if (response.ok) {
                const oficina = await response.json();
                if (oficina && oficina.id) {
                    tokenStorage.setItem('oficinaId', oficina.id);
                    tokenStorage.setItem('oficinaNome', oficina.nome || '');
                    return true;
                }
            }
        } catch {
            // Erro silencioso — será tratado pelo redirecionamento
        }
        return false;
    }

    function redirecionarPosLogin(temOficina) {
        setTimeout(() => {
            window.location.href = temOficina ? 'dashboard.html' : 'register-oficina.html';
        }, 400);
    }

    // ─── Login ────────────────────────────────────────────────
    loginForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearLoginError();
        const username = document.getElementById('username-login').value.trim();
        const password = document.getElementById('password-login').value;

        if (!username || !password) {
            showLoginError('Preencha usuário e senha.');
            return;
        }

        const btn = loginForm.querySelector('.btn-primary');
        btn.style.opacity = '0.7';
        btn.style.pointerEvents = 'none';

        try {
            const remember = cbRemember?.classList.contains('checked') ?? false;
            const result = await authService.login(username, password, remember);

            if (!result.ok) {
                if (result.missingToken) {
                    showPopup('Erro de Login', 'Token de acesso não recebido na resposta do servidor.', true);
                } else {
                    showLoginError('Usuário ou senha incorretos.');
                }
                return;
            }

            const temOficina = await buscarOficinaDoUsuario();
            redirecionarPosLogin(temOficina);
        } catch {
            showPopup('Erro de Conexão', 'Não foi possível conectar ao servidor ou erro inesperado.', true);
        } finally {
            btn.style.opacity = '';
            btn.style.pointerEvents = '';
        }
    });

    // ─── Cadastro ─────────────────────────────────────────────
    registerForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username        = document.getElementById('username-register').value.trim();
        const email            = document.getElementById('email-register').value.trim();
        const password         = document.getElementById('password-register').value;
        const confirmPassword  = document.getElementById('confirm-password-register').value;

        if (!username || !email || !password || !confirmPassword) {
            showPopup('Atenção', 'Preencha todos os campos.', true);
            return;
        }
        if (password !== confirmPassword) {
            showPopup('Senhas diferentes', 'As senhas digitadas não coincidem.', true);
            return;
        }
        if (password.length < 8) {
            showPopup('Senha fraca', 'A senha deve ter pelo menos 8 caracteres.', true);
            return;
        }

        const btn = registerForm.querySelector('.btn-primary');
        btn.style.opacity = '0.7';
        btn.style.pointerEvents = 'none';

        try {
            const { ok: registered, response: regResponse } = await authService.register(username, email, password);
            if (!registered) {
                showPopup('Erro no cadastro', await parseApiError(regResponse, 'Erro ao criar conta. Tente novamente.'), true);
                return;
            }

            // Login automático após cadastro (mantém o login ativo apenas nesta sessão, como no original)
            const loginResult = await authService.login(username, password, false);

            if (!loginResult.ok) {
                const message = loginResult.missingToken
                    ? 'Token de acesso não recebido após cadastro.'
                    : await parseApiError(loginResult.response, 'Erro ao fazer login automático após cadastro.');
                showPopup('Erro no Cadastro', message, true);
                if (!loginResult.missingToken) flipTo(false);
                return;
            }

            const temOficina = await buscarOficinaDoUsuario();
            redirecionarPosLogin(temOficina);
        } catch {
            showPopup('Erro de Conexão', 'Não foi possível conectar ao servidor ou erro inesperado.', true);
        } finally {
            btn.style.opacity = '';
            btn.style.pointerEvents = '';
        }
    });

    // ─── Esqueceu a senha ─────────────────────────────────────
    forgotPass?.addEventListener('click', (e) => {
        e.preventDefault();
        showPopup('Indisponível', 'A redefinição de senha está temporariamente indisponível.', true);
    });
});
