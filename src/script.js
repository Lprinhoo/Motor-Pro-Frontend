document.addEventListener('DOMContentLoaded', () => {
    const authTitle = document.getElementById('auth-title');
    const btnAuth = document.getElementById('btn-auth');
    const toggleText = document.getElementById('toggle-text');
    const confirmPasswordGroup = document.getElementById('confirm-password-group');
    const emailGroup = document.getElementById('email-group');
    const forgotPass = document.getElementById('forgot-pass'); // Link "Esqueceu sua senha?"
    const loginForm = document.getElementById('login-form');

    // Pop-up de Mensagens (já existente)
    const popupOverlay = document.getElementById('popup-overlay');
    const popupTitle = document.getElementById('popup-title');
    const popupMessage = document.getElementById('popup-message');
    const popupCloseBtn = document.getElementById('popup-close-btn');

    // Elementos do Pop-up de Redefinir Senha
    const forgotPasswordOverlay = document.getElementById('forgot-password-overlay');
    const forgotPasswordForm = document.getElementById('forgot-password-form');
    const forgotEmailInput = document.getElementById('forgot-email');
    const forgotPasswordCancelBtn = document.getElementById('forgot-password-cancel');

    const API_BASE_URL = 'http://76.13.173.156:8080/api';

    let isLogin = true;

    // ─── Pop-up de Mensagens ──────────────────────────────────
    const showPopup = (title, message, isError = false) => {
        popupTitle.innerText = title;
        popupMessage.innerText = message;
        popupTitle.style.color = isError ? '#FF4D4D' : '#16BC4E';
        popupCloseBtn.style.backgroundColor = isError ? '#FF4D4D' : '#16BC4E';
        popupOverlay.classList.remove('hidden');
    };

    const hidePopup = () => popupOverlay.classList.add('hidden');
    popupCloseBtn.addEventListener('click', hidePopup);

    // ─── Toggle login / cadastro ──────────────────────────────
    const setupToggleListener = () => {
        const span = document.getElementById('toggle-auth');
        if (span) span.addEventListener('click', () => {
            isLogin = !isLogin;
            updateUI();
        });
    };

    const updateUI = () => {
        if (isLogin) {
            authTitle.innerText = 'LOGIN';
            btnAuth.innerText = 'ACESSAR SISTEMA';
            toggleText.innerHTML = 'Não tem uma conta? <span id="toggle-auth">Cadastre-se</span>';
            confirmPasswordGroup.classList.add('hidden');
            emailGroup.classList.add('hidden');
            forgotPass.style.display = 'block';
        } else {
            authTitle.innerText = 'CADASTRO';
            btnAuth.innerText = 'CRIAR CONTA';
            toggleText.innerHTML = 'Já possui uma conta? <span id="toggle-auth">Faça Login</span>';
            confirmPasswordGroup.classList.remove('hidden');
            emailGroup.classList.remove('hidden');
            forgotPass.style.display = 'none';
        }
        setupToggleListener();
    };

    updateUI();

    // ─── Submit Login/Cadastro ────────────────────────────────
    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const username = document.getElementById('username').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirm-password').value;

        let endpoint = '';
        let body = {};

        if (isLogin) {
            if (!username || !password) {
                showPopup('Atenção', 'Preencha usuário e senha.', true);
                return;
            }
            endpoint = '/auth/login';
            body = { username, password };

        } else {
            if (!username || !email || !password || !confirmPassword) {
                showPopup('Atenção', 'Preencha todos os campos.', true);
                return;
            }
            if (password !== confirmPassword) {
                showPopup('Erro', 'As senhas não coincidem.', true);
                return;
            }
            endpoint = '/auth/register';
            body = { username, email, password };
        }

        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            const responseText = await response.text();

            if (response.ok) {
                if (isLogin) {
                    localStorage.setItem('jwtToken', responseText);
                    showPopup('Sucesso', 'Login realizado com sucesso! Redirecionando para o Dashboard...');
                    setTimeout(() => {
                        hidePopup();
                        window.location.href = 'dashboard.html';
                    }, 1500);
                } else {
                    showPopup('Sucesso', responseText || 'Cadastro de usuário realizado com sucesso! Redirecionando para cadastro de oficina...');
                    setTimeout(() => {
                        hidePopup();
                        window.location.href = 'register-oficina.html';
                    }, 1500);
                }
            } else {
                showPopup('Erro', responseText || 'Ocorreu um erro. Tente novamente.', true);
            }

        } catch (error) {
            console.error('Erro na requisição:', error);
            showPopup('Erro de Conexão', 'Não foi possível conectar ao servidor.', true);
        }
    });

    // ─── Esqueceu sua Senha? ──────────────────────────────────
    forgotPass.addEventListener('click', () => {
        forgotPasswordOverlay.classList.remove('hidden');
    });

    forgotPasswordCancelBtn.addEventListener('click', () => {
        forgotPasswordOverlay.classList.add('hidden');
        forgotPasswordForm.reset(); // Limpa o formulário ao cancelar
    });

    forgotPasswordForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const email = forgotEmailInput.value.trim();

        if (!email) {
            showPopup('Atenção', 'Por favor, digite seu email.', true);
            return;
        }

        const endpoint = '/auth/forgot-password'; // Endpoint assumido para redefinição de senha
        const body = { email };

        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            const responseText = await response.text();

            if (response.ok) {
                showPopup('Sucesso', responseText || 'Link de redefinição de senha enviado para o seu email!');
                forgotPasswordOverlay.classList.add('hidden'); // Esconde o modal após sucesso
                forgotPasswordForm.reset();
            } else {
                showPopup('Erro', responseText || 'Erro ao solicitar redefinição de senha. Verifique o email.', true);
            }
        } catch (error) {
            console.error('Erro na requisição de redefinição de senha:', error);
            showPopup('Erro de Conexão', 'Não foi possível conectar ao servidor para redefinir a senha.', true);
        }
    });
});