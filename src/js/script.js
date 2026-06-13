// Variáveis globais para controle de refresh de token
let isRefreshing = false;
let failedQueue = [];

// Função para processar a fila de requisições falhas
const processQueue = (error, token = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

// Função utilitária para requisições autenticadas com refresh de token
async function authFetch(url, options = {}) {
    let accessToken = localStorage.getItem('jwtToken');
    let refreshToken = localStorage.getItem('refreshToken');

    // Adiciona o Access Token ao cabeçalho da requisição
    if (accessToken) {
        options.headers = {
            ...options.headers,
            'Authorization': `Bearer ${accessToken}`
        };
    }

    let response = await fetch(url, options);

    // Se a resposta for 401 (Unauthorized) ou 403 (Forbidden, assumindo token expirado)
    if ((response.status === 401 || response.status === 403) && refreshToken && url !== `${API_BASE_URL}/auth/refresh`) {
        // Se já estiver em processo de refresh, adiciona a requisição à fila
        if (isRefreshing) {
            return new Promise(function(resolve, reject) {
                failedQueue.push({ resolve, reject });
            }).then(token => {
                options.headers['Authorization'] = 'Bearer ' + token;
                return fetch(url, options);
            }).catch(err => {
                return Promise.reject(err);
            });
        }

        isRefreshing = true;

        try {
            // Tenta obter um novo Access Token usando o Refresh Token
            const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${refreshToken}` // Envia o Refresh Token aqui
                }
            });

            if (refreshResponse.ok) {
                // Assumindo que o refresh endpoint retorna { accessToken, refreshToken }
                const { accessToken: newAccessToken, refreshToken: newRefreshToken } = await refreshResponse.json();
                localStorage.setItem('jwtToken', newAccessToken);
                localStorage.setItem('refreshToken', newRefreshToken); // Atualiza o Refresh Token também
                accessToken = newAccessToken;

                // Processa todas as requisições na fila com o novo token
                processQueue(null, newAccessToken);

                // Tenta a requisição original novamente com o novo Access Token
                options.headers['Authorization'] = 'Bearer ' + accessToken;
                response = await fetch(url, options);
            } else {
                // Refresh Token inválido ou expirado, força o logout
                processQueue(new Error('Refresh Token inválido ou expirado'));
                localStorage.clear();
                window.location.href = 'index.html';
                return Promise.reject('Refresh Token inválido ou expirado');
            }
        } catch (error) {
            processQueue(error);
            localStorage.clear();
            window.location.href = 'index.html';
            return Promise.reject(error);
        } finally {
            isRefreshing = false;
        }
    }

    return response;
}

export { authFetch }; // Export authFetch

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
            // Usando authFetch para esta requisição
            const response = await fetch(`${API_BASE_URL}/oficinas/minha`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
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
                let accessToken;
                let refreshToken = null;

                const text = await response.text(); // ← lê UMA vez como texto
                try {
                    const data = JSON.parse(text);  // ← tenta parsear como JSON
                    accessToken = data.accessToken;
                    refreshToken = data.refreshToken;
                } catch {
                    accessToken = text.trim();      // ← se não for JSON, usa como token puro
                    console.warn('Backend retornou token como texto puro.');
                }

                if (!accessToken) {
                    throw new Error('Token de acesso não recebido.');
                }

                localStorage.setItem('jwtToken', accessToken);
                if (refreshToken) {
                    localStorage.setItem('refreshToken', refreshToken);
                } else {
                    localStorage.removeItem('refreshToken'); // Garante que não haja refresh token antigo
                }
                
                const temOficina = await buscarOficinaDoUsuario(accessToken);
                setTimeout(() => {
                    window.location.href = temOficina ? 'dashboard.html' : 'register-oficina.html';
                }, 400);
            } else {
                let errorMessage = 'Usuário ou senha incorretos.';
                try {
                    const errorData = await response.json();
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
                let errorMessage = 'Erro ao criar conta. Tente novamente.';
                try {
                    const errorData = await regResponse.json();
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
                let accessToken;
                let refreshToken = null;

                const text = await loginResponse.text(); // ← lê UMA vez
                try {
                    const data = JSON.parse(text);       // ← tenta JSON
                    accessToken = data.accessToken;
                    refreshToken = data.refreshToken;
                } catch {
                    accessToken = text.trim();           // ← token puro
                    console.warn('Backend retornou token como texto puro após cadastro.');
                }

                if (!accessToken) {
                    throw new Error('Token de acesso não recebido após cadastro.');
                }

                localStorage.setItem('jwtToken', accessToken);
                if (refreshToken) {
                    localStorage.setItem('refreshToken', refreshToken);
                } else {
                    localStorage.removeItem('refreshToken');
                }
                
                setTimeout(() => { window.location.href = 'register-oficina.html'; }, 400);
            } else {
                let errorMessage = 'Erro ao fazer login automático após cadastro.';
                try {
                    const errorData = await loginResponse.json();
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

    // ─── Esqueceu a senha ─────────────────────────────────────
    forgotPass?.addEventListener('click', (e) => {
        e.preventDefault();
        showPopup('Indisponível', 'A redefinição de senha está temporariamente indisponível.', true);
    });
});