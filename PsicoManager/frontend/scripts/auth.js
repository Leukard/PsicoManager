/* ==========================================
   frontend/scripts/auth.js
   Responsável pelo envio de cadastro e login para o backend.
   ========================================== */

// MOSTRAR/OCULTAR SENHA
function togglePassword(inputId, iconId) {
    const input = document.getElementById(inputId);
    const icon = document.getElementById(iconId);

    if (!input || !icon) return;

    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('ph-eye');
        icon.classList.add('ph-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('ph-eye-slash');
        icon.classList.add('ph-eye');
    }
}


/* ==========================================
   VERIFICAR SE JÁ ESTÁ LOGADO
   ========================================== */

async function verificarUsuarioLogado() {
    try {
        const response = await fetch('/usuario-logado');
        const data = await response.json();

        if (data.logado) {
            // Se já estiver logado, manda direto pro dashboard
            window.location.href = '/';
        }

    } catch (error) {
        console.log('Erro ao verificar login:', error);
    }
}

// Executa automaticamente
verificarUsuarioLogado();


/* ==========================================
   CADASTRO
   ========================================== */

const formCadastro = document.getElementById('formCadastro');

if (formCadastro) {
    formCadastro.addEventListener('submit', async (event) => {
        event.preventDefault();

        const nome = document.getElementById('nome').value.trim();
        const email = document.getElementById('email').value.trim();
        const senha = document.getElementById('senha').value;
        const confirmaSenha = document.getElementById('confirmaSenha').value;

        if (senha !== confirmaSenha) {
            alert('As senhas não coincidem!');
            return;
        }

        const btnCadastrar = document.getElementById('btnCadastrar');
        btnCadastrar.innerText = 'Criando conta...';
        btnCadastrar.disabled = true;

        try {
            const response = await fetch('/api/cadastro', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ nome, email, senha })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.erro || data.message || 'Erro ao cadastrar.');
            }

            alert('Cadastro realizado com sucesso! Faça login agora.');
            window.location.href = 'login.html';

        } catch (error) {
            alert('Erro: ' + error.message);
        } finally {
            btnCadastrar.innerText = 'Criar Conta';
            btnCadastrar.disabled = false;
        }
    });
}


/* ==========================================
   LOGIN TRADICIONAL
   ========================================== */

const formLogin = document.getElementById('formLogin');

if (formLogin) {
    formLogin.addEventListener('submit', async (event) => {
        event.preventDefault();

        const email = document.getElementById('email').value.trim();
        const senha = document.getElementById('senha').value;

        const btnLogin = document.getElementById('btnLogin');
        btnLogin.innerText = 'Entrando...';
        btnLogin.disabled = true;

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, senha })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.erro || data.message || 'Erro ao fazer login.');
            }

            alert('Login realizado com sucesso!');
            window.location.href = '/';

        } catch (error) {
            alert('Erro: ' + error.message);
        } finally {
            btnLogin.innerText = 'Entrar na Plataforma';
            btnLogin.disabled = false;
        }
    });
}
