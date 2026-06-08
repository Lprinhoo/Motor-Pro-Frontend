document.addEventListener('DOMContentLoaded', () => {
    const cardFlipContainer  = document.querySelector('.card-flip-container');
    const frontFace          = document.querySelector('.front-face');
    const backFace           = document.querySelector('.back-face');
    const loginForm          = document.getElementById('login-form');
    const registerForm       = document.getElementById('register-form');
    const toggleAuthLogin    = document.getElementById('toggle-auth-login');
    const toggleAuthRegister = document.getElementById('toggle-auth-register');
    const forgotPass         = document.getElementById('forgot-pass');
    const popupOverlay       = document.getElementById('popup-overlay');
    const popupTitle         = document.getElementById('popup-title');
    const popupMessage       = document.getElementById('popup-message');
    const popupCloseBtn      = document.getElementById('popup-close-btn');

    const API_BASE_URL = 'http://76.13.173.156:8080/api';
    let isAnimating = false;

    // ─── Pop-up ───────────────────────────────────────────────
    const showPopup = (title, message, isError = false) => {
        popupTitle.innerText   = title;
        popupMessage.innerText = message;
        popupTitle.style.color = isError ? '#FF4D4D' : '#16BC4E';
        popupCloseBtn.style.backgroundColor = isError ? '#FF4D4D' : '#16BC4E';
        popupOverlay.classList.remove('hidden');
    };
    const hidePopup = () => popupOverlay.classList.add('hidden');
    popupCloseBtn.addEventListener('click', hidePopup);

    // ─── Flip ─────────────────────────────────────────────────
    const HALF  = 120;
    const PIVOT = 85;

    const flipTo = (showRegister) => {
        if (isAnimating) return;
        isAnimating = true;

        const leaving  = showRegister ? frontFace : backFace;
        const entering = showRegister ? backFace   : frontFace;

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
            const response = await fetch(`${API_BASE_URL}/oficinas/minha`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                // A API retorna a oficina do usuário logado
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
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });
            const text = await response.text();

            if (response.ok) {
                localStorage.setItem('jwtToken', text);

                // Busca a oficina do usuário na API
                const temOficina = await buscarOficinaDoUsuario(text);

                // showPopup('Sucesso', 'Login realizado! Redirecionando...'); // Removido popup
                setTimeout(() => {
                    // hidePopup(); // Removido popup
                    window.location.href = temOficina ? 'dashboard.html' : 'register-oficina.html'; // Caminho corrigido
                }, 500); // Reduzido o tempo para redirecionar mais rápido
            } else {
                showPopup('Erro', text || 'Usuário ou senha incorretos.', true);
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
            const regResponse = await fetch(`${API_BASE_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password }),
            });

            if (!regResponse.ok) {
                const err = await regResponse.text();
                showPopup('Erro', err || 'Erro ao criar conta. Tente novamente.', true);
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
                // showPopup('Sucesso', 'Conta criada! Agora cadastre sua oficina.'); // Removido popup
                setTimeout(() => { /* hidePopup(); */ window.location.href = 'register-oficina.html'; }, 500); // Caminho corrigido
            } else {
                // showPopup('Conta criada!', 'Faça login para continuar.'); // Removido popup
                setTimeout(() => { /* hidePopup(); */ flipTo(false); }, 500); // Reduzido o tempo
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