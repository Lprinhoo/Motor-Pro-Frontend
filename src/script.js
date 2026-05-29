document.addEventListener('DOMContentLoaded', () => {
    const authCard = document.getElementById('auth-card');
    const toggleAuthSpan = document.getElementById('toggle-auth');
    const authTitle = document.getElementById('auth-title');
    const btnAuth = document.getElementById('btn-auth');
    const toggleTextParagraph = document.getElementById('toggle-text');
    const confirmPasswordGroup = document.getElementById('confirm-password-group');
    const emailGroup = document.getElementById('email-group'); // Novo
    const forgotPass = document.getElementById('forgot-pass');
    const loginForm = document.getElementById('login-form');
    const usernameInput = document.getElementById('username');
    const emailInput = document.getElementById('email'); // Novo
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirm-password'); // Novo

    let isLogin = true;

    // Função para atualizar o listener do toggleAuth
    const updateToggleAuthListener = () => {
        const newToggleAuthSpan = document.getElementById('toggle-auth');
        if (newToggleAuthSpan) {
            newToggleAuthSpan.removeEventListener('click', handleToggleAuth); // Remove o antigo, se houver
            newToggleAuthSpan.addEventListener('click', handleToggleAuth); // Adiciona o novo
        }
    };

    const handleToggleAuth = () => {
        isLogin = !isLogin;

        if (isLogin) {
            authTitle.innerText = 'LOGIN';
            btnAuth.innerText = 'ACESSAR SISTEMA';
            toggleTextParagraph.innerHTML = 'Não tem uma conta? <span id="toggle-auth">Cadastre-se</span>';
            confirmPasswordGroup.classList.add('hidden');
            emailGroup.classList.add('hidden'); // Oculta o campo de e-mail no login
            forgotPass.style.display = 'block';
        } else {
            authTitle.innerText = 'CADASTRO';
            btnAuth.innerText = 'CRIAR CONTA';
            toggleTextParagraph.innerHTML = 'Já possui uma conta? <span id="toggle-auth">Faça Login</span>';
            confirmPasswordGroup.classList.remove('hidden');
            emailGroup.classList.remove('hidden'); // Mostra o campo de e-mail no cadastro
            forgotPass.style.display = 'none';
        }
        updateToggleAuthListener(); // Reatribui o evento de clique
    };

    // Adiciona o listener inicial
    toggleAuthSpan.addEventListener('click', handleToggleAuth);

    // Lógica de Login e Cadastro
    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault(); // Previne o envio padrão do formulário

        const username = usernameInput.value;
        const password = passwordInput.value;

        if (isLogin) {
            // Lógica de Login
            if (!username || !password) {
                alert('Por favor, preencha todos os campos.');
                return;
            }

            try {
                const response = await fetch('http://76.13.173.156:8080/api/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ username, password }),
                });

                if (response.ok) {
                    const data = await response.json();
                    const jwtToken = data.token; // Supondo que o JWT venha em uma propriedade 'token'
                    localStorage.setItem('jwtToken', jwtToken); // Armazena o JWT no localStorage
                    alert('Login bem-sucedido! Token armazenado.');
                    // Redirecionar para outra página ou atualizar a UI
                } else {
                    const errorData = await response.json();
                    alert(`Erro no login: ${errorData.message || 'Credenciais inválidas.'}`);
                }
            } catch (error) {
                console.error('Erro ao tentar fazer login:', error);
                alert('Ocorreu um erro ao tentar conectar ao servidor. Tente novamente mais tarde.');
            }
        } else {
            // Lógica de Cadastro
            const email = emailInput.value;
            const confirmPassword = confirmPasswordInput.value;

            if (!username || !email || !password || !confirmPassword) {
                alert('Por favor, preencha todos os campos.');
                return;
            }

            if (password !== confirmPassword) {
                alert('As senhas não coincidem.');
                return;
            }

            try {
                const response = await fetch('http://76.13.173.156:8080/api/auth/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ username, email, password }),
                });

                if (response.ok) {
                    const data = await response.json();
                    alert(`Cadastro realizado com sucesso! Usuário: ${data.username}`);
                    // Opcional: Mudar para o modo de login após o cadastro
                    isLogin = true;
                    handleToggleAuth();
                } else {
                    const errorData = await response.json();
                    alert(`Erro no cadastro: ${errorData.message || 'Ocorreu um erro ao tentar cadastrar.'}`);
                }
            } catch (error) {
                console.error('Erro ao tentar fazer cadastro:', error);
                alert('Ocorreu um erro ao tentar conectar ao servidor para cadastro. Tente novamente mais tarde.');
            }
        }
    });
});