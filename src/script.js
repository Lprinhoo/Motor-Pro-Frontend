document.addEventListener('DOMContentLoaded', () => {
    const toggleAuth = document.getElementById('toggle-auth');
    const authTitle = document.getElementById('auth-title');
    const btnAuth = document.getElementById('btn-auth');
    const toggleText = document.getElementById('toggle-text');
    const confirmPasswordGroup = document.getElementById('confirm-password-group');
    const forgotPass = document.getElementById('forgot-pass');
    
    let isLogin = true;

    toggleAuth.addEventListener('click', () => {
        isLogin = !isLogin;

        if (isLogin) {
            authTitle.innerText = 'LOGIN';
            btnAuth.innerText = 'ACESSAR SISTEMA';
            toggleText.innerHTML = 'Não tem uma conta? <span id="toggle-auth">Cadastre-se</span>';
            confirmPasswordGroup.classList.add('hidden');
            forgotPass.style.display = 'block';
        } else {
            authTitle.innerText = 'CADASTRO';
            btnAuth.innerText = 'CRIAR CONTA';
            toggleText.innerHTML = 'Já possui uma conta? <span id="toggle-auth">Faça Login</span>';
            confirmPasswordGroup.classList.remove('hidden');
            forgotPass.style.display = 'none';
        }

        // Reatribui o evento de clique ao novo span criado pelo innerHTML
        document.getElementById('toggle-auth').addEventListener('click', arguments.callee);
    });
});
