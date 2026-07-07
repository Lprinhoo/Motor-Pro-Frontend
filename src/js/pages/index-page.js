import { authService, tokenStorage, oficinaApi } from '../app/container.js';
import { showPopup } from '../components/popup.js'; // hidePopup removido, pois não é usado diretamente aqui
import { bootDone } from './boot.js';
// API_BASE_URL removido, pois não é mais usado diretamente após a migração para authService/AuthApi

let autoLoginTimeout;

document.addEventListener('DOMContentLoaded', () => {
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
    const googleLoginBtn     = document.querySelector('.btn-google');
    const autoLoginStatus    = document.getElementById('auto-login-status');
    const switchAccountBtn   = document.getElementById('switch-account-btn');
    const googleSwitchAccountBtn = document.getElementById('google-switch-account-btn');

    // Password strength elements
    const passwordRegisterField = document.getElementById('password-register');
    const passwordStrengthBar = document.querySelector('#register-form .password-strength-bar');
    const passwordStrengthLabel = document.querySelector('#register-form .password-strength-label');

    // ─── Login automático: se "Lembrar-me" estava marcado e há um token salvo,
    // mostra a tela de auto-login com opção de trocar de conta.
    if (tokenStorage.isRemembered() && tokenStorage.get('jwtToken')) {
        if (flipper) flipper.style.display = 'none';
        if (autoLoginStatus) autoLoginStatus.style.display = 'block';

        bootDone(); // Libera a tela de boot mais cedo para mostrar o status de auto-login

        autoLoginTimeout = setTimeout(async () => {
            // Tenta buscar a oficina para redirecionar corretamente
            const temOficina = await buscarOficinaDoUsuario();
            window.location.href = temOficina ? 'dashboard.html' : 'register-oficina.html';
        }, 3000); // Redireciona automaticamente após 3 segundos

        if (switchAccountBtn) {
            switchAccountBtn.addEventListener('click', () => {
                clearTimeout(autoLoginTimeout); // Cancela o redirecionamento automático
                tokenStorage.clearAuth(); // Limpa os dados de autenticação
                localStorage.removeItem('googleRefreshToken'); // Garante que o refresh token do Google seja limpo
                if (autoLoginStatus) autoLoginStatus.style.display = 'none';
                if (flipper) flipper.style.display = 'block';
                // Não chama bootDone novamente, pois já foi chamado
            });
        }
    } else {
        // Se não há auto-login, mostra o flipper normalmente
        if (flipper) flipper.style.display = '';
        setTimeout(bootDone, 1800);
    }

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
            const response = await oficinaApi.buscarMinhaOficina();
            if (response.ok) {
                const oficina = await response.json();
                if (oficina && oficina.id) {
                    tokenStorage.setItem('oficinaId',   oficina.id);
                    tokenStorage.setItem('oficinaNome', oficina.nome || '');
                    return true;
                }
            } else if (response.status === 204) {
                return false;
            }
        } catch (error) {
            console.error('Erro ao buscar oficina do usuário:', error);
            // Erro silencioso — será tratado pelo redirecionamento
        }
        return false;
    }

    // ─── Login ────────────────────────────────────────────────
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
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
                await authService.login(username, password, remember);

                const temOficina = await buscarOficinaDoUsuario();
                setTimeout(() => {
                    window.location.href = temOficina ? 'dashboard.html' : 'register-oficina.html';
                }, 400);
            } catch (error) {
                if (error.message === 'Credenciais inválidas') {
                    showLoginError('Usuário ou senha incorretos.');
                } else {
                    showPopup('Erro de Conexão', 'Não foi possível conectar ao servidor ou erro inesperado.', true);
                }
            } finally {
                btn.style.opacity = '';
                btn.style.pointerEvents = '';
            }
        });
    }

    // ─── Indicador de Força de Senha ──────────────────────────
    function checkPasswordStrength() {
        const password = passwordRegisterField.value;
        let score = 0;
        const messages = [];
        const bar = passwordStrengthBar;
        const label = passwordStrengthLabel;

        // Critérios de força
        if (password.length >= 8) {
            score++;
            messages.push('Pelo menos 8 caracteres');
        } else {
            messages.push('Mínimo de 8 caracteres');
        }
        if (/[0-9]/.test(password)) {
            score++;
            messages.push('Contém números');
        }
        if (/[A-Z]/.test(password)) {
            score++;
            messages.push('Contém letras maiúsculas');
        }
        if (/[^A-Za-z0-9]/.test(password)) {
            score++;
            messages.push('Contém caracteres especiais');
        }

        // Atualiza a barra e o label
        let strengthText = '';
        let barWidth = 0;
        let barColor = '';

        if (password.length === 0) {
            strengthText = '';
            barWidth = 0;
            barColor = '';
        } else if (score <= 1) {
            strengthText = 'Fraca';
            barWidth = 25;
            barColor = 'var(--danger)';
        } else if (score === 2) {
            strengthText = 'Média';
            barWidth = 50;
            barColor = 'var(--warning)';
        } else if (score === 3) {
            strengthText = 'Boa';
            barWidth = 75;
            barColor = 'orange'; // Usar uma cor intermediária ou variável CSS
        } else { // score === 4
            strengthText = 'Forte';
            barWidth = 100;
            barColor = 'var(--success)';
        }

        if (bar) {
            bar.style.width = `${barWidth}%`;
            bar.style.backgroundColor = barColor;
        }
        if (label) {
            label.textContent = strengthText;
            label.style.color = barColor;
        }
    }

    if (passwordRegisterField) {
        passwordRegisterField.addEventListener('input', checkPasswordStrength);
    }

    // ─── Cadastro ─────────────────────────────────────────────
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username        = document.getElementById('username-register').value.trim();
            const email           = document.getElementById('email-register').value.trim();
            const password        = passwordRegisterField.value; // Usar a referência já existente
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
                await authService.register(username, email, password);
                await authService.login(username, password, false); // Login automático após cadastro

                const temOficina = await buscarOficinaDoUsuario();
                setTimeout(() => {
                    window.location.href = temOficina ? 'dashboard.html' : 'register-oficina.html';
                }, 400);
            } catch (error) {
                let errorMessage = 'Erro ao criar conta. Tente novamente.';
                if (error.message === 'Usuário já existe') {
                    errorMessage = 'Nome de usuário ou e-mail já cadastrado.';
                } else if (error.message === 'Erro de rede') {
                    errorMessage = 'Não foi possível conectar ao servidor.';
                }
                showPopup('Erro no cadastro', errorMessage, true);
                flipTo(false);
            } finally {
                btn.style.opacity = '';
                btn.style.pointerEvents = '';
            }
        });
    }

    // ─── Lógica de Login com Google ──────────────────────────
    if (googleLoginBtn) {
        // Função auxiliar para lidar com o login Google
        async function handleGoogleLogin(forceNewLogin = false) {
            try {
                let savedRefreshToken = null;
                if (!forceNewLogin) {
                    savedRefreshToken = tokenStorage.get('googleRefreshToken');
                }

                const { idToken, refreshToken } = await window.api.googleLogin(savedRefreshToken, forceNewLogin);

                // Salva o refresh_token para próximas vezes
                if (refreshToken) {
                    tokenStorage.setItem('googleRefreshToken', refreshToken);
                }

                await authService.googleAuth(idToken);

                const temOficina = await buscarOficinaDoUsuario();
                setTimeout(() => {
                    window.location.href = temOficina ? 'dashboard.html' : 'register-oficina.html';
                }, 400);
            } catch (error) {
                if (error.message === 'Login cancelado pelo usuário') return;
                console.error('Erro no login com Google:', error);
                showPopup('Erro no Login com Google', error.message || 'Não foi possível iniciar o login com Google.', true);
            }
        }

        // Event listener para o botão de login Google padrão (tenta auto-login primeiro)
        googleLoginBtn.addEventListener('click', () => handleGoogleLogin(false));

        // Event listener para o novo botão "Trocar Conta Google" (força um novo login interativo)
        if (googleSwitchAccountBtn) {
            googleSwitchAccountBtn.addEventListener('click', () => handleGoogleLogin(true));
        }
    }

    // ─── Esqueceu a senha ─────────────────────────────────────
    if (forgotPass) {
        forgotPass.addEventListener('click', (e) => {
            e.preventDefault();
            showPopup('Indisponível', 'A redefinição de senha está temporariamente indisponível.', true);
        });
    }
});