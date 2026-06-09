document.addEventListener('DOMContentLoaded', () => {
    const flipper            = document.getElementById('flipper');
    const loginForm          = document.getElementById('login-form');
    const registerForm       = document.getElementById('register-form');
    const toggleAuthLogin    = document.getElementById('toggle-auth-login');
    const toggleAuthRegister = document.getElementById('toggle-auth-register');
    const forgotPass         = document.getElementById('forgot-pass');
    const popupOverlay       = document.getElementById('popup-overlay');
    const popupTitle         = document.getElementById('popup-title');
    const popupMessage       = document.getElementById('popup-message');
    const popupIcon          = document.getElementById('popup-icon');
    const popupCloseBtn      = document.getElementById('popup-close-btn');
    const cbRemember         = document.getElementById('cb-remember');

    const API_BASE_URL = 'http://76.13.173.156:8080/api';

    // ─── Pop-up ───────────────────────────────────────────────
    const showPopup = (title, message, isError = false) => {
        popupTitle.innerText   = title;
        popupMessage.innerText = message;
        popupTitle.style.color = isError ? '#FF4D4D' : '#16BC4E';
        popupCloseBtn.style.background = isError ? '#FF4D4D' : '#16BC4E';
        popupCloseBtn.style.color = isError ? '#fff' : '#042B12';

        if (popupIcon) {
            popupIcon.style.background = isError
                ? 'rgba(255,77,77,0.12)'
                : 'rgba(22,188,78,0.12)';
            popupIcon.style.border = isError
                ? '1px solid rgba(255,77,77,0.25)'
                : '1px solid rgba(22,188,78,0.25)';
            popupIcon.innerHTML = isError
                ? '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FF4D4D" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>'
                : '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#16BC4E" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/></svg>';
        }

        popupOverlay.classList.remove('hidden');
    };
    const hidePopup = () => popupOverlay.classList.add('hidden');

    popupCloseBtn.addEventListener('click', hidePopup);
    popupOverlay.addEventListener('click', (e) => {
        if (e.target === popupOverlay) hidePopup();
    });

    // ─── Flip ─────────────────────────────────────────────────
    let isFlipping = false;

    const flipTo = (showBack) => {
        if (isFlipping) return;
        isFlipping = true;
        flipper.classList.toggle('flipped', showBack);
        setTimeout(() => { isFlipping = false; }, 650);
    };

    toggleAuthLogin?.addEventListener('click', (e) => { e.preventDefault(); flipTo(true); });
    toggleAuthRegister?.addEventListener('click', (e) => { e.preventDefault(); flipTo(false); });

    // ─── Checkbox "Lembrar-me" ────────────────────────────────
    cbRemember?.addEventListener('click', () => {
        const isChecked = cbRemember.classList.toggle('checked');
        cbRemember.setAttribute('aria-checked', isChecked);
    });
    cbRemember?.addEventListener('keydown', (e) => {
        if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            cbRemember.click();
        }
    });

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
    async function buscarOficinaDoUsuario(token) {
        try {
            const response = await fetch(`${API_BASE_URL}/oficinas/minha`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const oficina = await response.json();
                if (oficina && oficina.id) {
                    localStorage.setItem('oficinaId',   oficina.id);
                    localStorage.setItem('oficinaNome', oficina.nome || '');
                    return true;
                }
            }
        } catch {
            // silencioso
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

        const btn = loginForm.querySelector('.btn-primary');
        btn.style.opacity = '0.7';
        btn.style.pointerEvents = 'none';

        try {
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });
            const text = await response.text();

            if (response.ok) {
                localStorage.setItem('jwtToken', text);
                const temOficina = await buscarOficinaDoUsuario(text);
                setTimeout(() => {
                    window.location.href = temOficina ? 'dashboard.html' : 'register-oficina.html';
                }, 400);
            } else {
                showPopup('Erro de acesso', text || 'Usuário ou senha incorretos.', true);
            }
        } catch {
            showPopup('Erro de Conexão', 'Não foi possível conectar ao servidor.', true);
        } finally {
            btn.style.opacity = '';
            btn.style.pointerEvents = '';
        }
    });

    // ─── Cadastro ─────────────────────────────────────────────
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
                const err = await regResponse.text();
                showPopup('Erro no cadastro', err || 'Erro ao criar conta. Tente novamente.', true);
                return;
            }

            // Login automático após cadastro
            const loginResponse = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });

            if (loginResponse.ok) {
                const token = await loginResponse.text();
                localStorage.setItem('jwtToken', token);
                setTimeout(() => { window.location.href = 'register-oficina.html'; }, 400);
            } else {
                flipTo(false);
            }
        } catch {
            showPopup('Erro de Conexão', 'Não foi possível conectar ao servidor.', true);
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