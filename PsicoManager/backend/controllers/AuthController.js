/* ==========================================
   fetch.js - Lógica Visual e Conexão Supabase
   ========================================== */

// ==========================================
// 1. LÓGICA VISUAL (Mostrar/Ocultar Senha)
// ==========================================
function togglePassword(inputId, iconId) {
    const input = document.getElementById(inputId);
    const icon = document.getElementById(iconId);
    
    if (input && icon) {
        if (input.type === "password") {
            input.type = "text";
            icon.classList.remove("ph-eye");
            icon.classList.add("ph-eye-slash");
        } else {
            input.type = "password";
            icon.classList.remove("ph-eye-slash");
            icon.classList.add("ph-eye");
        }
    }
}




const defaultHeaders = {
    'apikey': process.env.SUPABASE_URL,
    'Authorization': `Bearer ${process.env.SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
};

// ==========================================
// 3. LÓGICA DE CADASTRO
// ==========================================
const formCadastro = document.getElementById('formCadastro');

if (formCadastro) {
    formCadastro.addEventListener('submit', async (e) => {
        e.preventDefault();

        const nome = document.getElementById('nome').value;
        const email = document.getElementById('email').value;
        const senha = document.getElementById('senha').value;
        const confirmaSenha = document.getElementById('confirmaSenha').value;

        if (senha !== confirmaSenha) {
            alert('As senhas não coincidem!');
            return;
        }

        try {
            const btn = document.getElementById('btnCadastrar');
            btn.innerText = 'Criando conta...';
            btn.disabled = true;

            const salt = dcodeIO.bcrypt.genSaltSync(10);
            const senha_hash = dcodeIO.bcrypt.hashSync(senha, salt);

            const response = await fetch(`${SUPABASE_URL}/rest/v1/usuarios`, {
                method: 'POST',
                headers: defaultHeaders,
                body: JSON.stringify({ nome, email, senha_hash })
            });

            const data = await response.json();

            if (!response.ok) {
                if (data.code === '23505') throw new Error('Este e-mail já está em uso.');
                throw new Error(data.message || 'Erro ao cadastrar.');
            }

            alert('Cadastro realizado com sucesso!');
            window.location.href = 'login.html';

        } catch (error) {
            alert('Erro: ' + error.message);
        } finally {
            const btn = document.getElementById('btnCadastrar');
            btn.innerText = 'Criar Conta';
            btn.disabled = false;
        }
    });
}

// ==========================================
// 4. LÓGICA DE LOGIN
// ==========================================
const formLogin = document.getElementById('formLogin');

if (formLogin) {
    formLogin.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('email').value;
        const senha = document.getElementById('senha').value;

        try {
            const btn = document.getElementById('btnLogin');
            btn.innerText = 'Entrando...';
            btn.disabled = true;

            const response = await fetch(`${SUPABASE_URL}/rest/v1/usuarios?email=eq.${encodeURIComponent(email)}`, {
                method: 'GET',
                headers: defaultHeaders
            });

            const usuarios = await response.json();

            if (!response.ok) throw new Error('Erro ao buscar dados no servidor.');
            if (usuarios.length === 0) throw new Error('E-mail ou senha incorretos.');

            const usuario = usuarios[0];
            const senhaValida = dcodeIO.bcrypt.compareSync(senha, usuario.senha_hash);

            if (!senhaValida) throw new Error('E-mail ou senha incorretos.');

            delete usuario.senha_hash;
            localStorage.setItem('usuarioLogado', JSON.stringify(usuario));

            alert(`Bem-vindo, ${usuario.nome}!`);
            window.location.href = '../index.html';

        } catch (error) {
            alert('Erro: ' + error.message);
        } finally {
            const btn = document.getElementById('btnLogin');
            btn.innerText = 'Entrar na Plataforma';
            btn.disabled = false;
        }
    });
}