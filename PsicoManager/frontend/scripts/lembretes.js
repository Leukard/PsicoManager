/* ==========================================
   LEMBRETES - PsicoManager
   ========================================== */

function getLoginUrl(){
    if (window.location.pathname.includes('/pages/')) {
        return 'login.html';
    }
    return 'pages/login.html';
}

async function logout(){
    try{
        const res = await fetch('/logout', {
            method: 'POST'
        });

        if(!res.ok){
            throw new Error('Erro ao fazer logout');
        }

        window.location.href = getLoginUrl();

    }catch(error){
        console.error('Erro no logout:', error);
        alert('Erro ao sair do sistema');
    }
}

/* =========================
   VERIFICAR USUÁRIO LOGADO
========================= */
async function verificarUsuario(){
    try{
        const res = await fetch('/usuario-logado');

        if(!res.ok){
            throw new Error('Erro ao verificar sessão');
        }

        const data = await res.json();

        if(!data.logado){
            window.location.href = getLoginUrl();
            return;
        }

        const usuario = data.usuario;

        /* ===== NOME ===== */
        const nomeEl = document.getElementById('nomeUsuario');
        if(nomeEl){
            nomeEl.innerText = usuario.nome || "Usuário";
        }

        /* ===== FOTO ===== */
        const fotoEl = document.getElementById('fotoUsuario');
        if(fotoEl){
            fotoEl.src = usuario.foto
                ? usuario.foto
                : `https://ui-avatars.com/api/?name=${encodeURIComponent(usuario.nome || "User")}`;
        }

    }catch(error){
        console.error('Erro ao verificar usuário:', error);
        window.location.href = getLoginUrl();
    }
}

/* =========================
   CARREGAR LEMBRETES
========================= */
async function carregarLembretes(){
    try{
        const res = await fetch('/api/lembretes');

        if(!res.ok){
            throw new Error('Erro ao buscar lembretes');
        }

        const lembretes = await res.json();

        const lista = document.getElementById('listaLembretes');
        if(!lista) return;

        if(lembretes.length === 0){
            lista.innerHTML = '<p class="text-muted text-center my-4">Nenhum lembrete configurado.</p>';
            atualizarContadoresLembretes([]);
            return;
        }

        let html = '';
        lembretes.forEach(lembrete => {
            const statusBadge = lembrete.ativo
                ? '<span class="badge bg-success">Ativo</span>'
                : '<span class="badge bg-secondary">Inativo</span>';

            const tipoBadge = getTipoBadge(lembrete.tipo);

            html += `
                <div class="card border-0 shadow-sm rounded-4 p-3 mb-3">
                    <div class="d-flex justify-content-between align-items-start">
                        <div class="flex-grow-1">
                            <h6 class="fw-bold mb-2">${lembrete.titulo}</h6>
                            <div class="d-flex gap-2 mb-2">
                                ${tipoBadge}
                                ${statusBadge}
                            </div>
                            <p class="text-muted small mb-2">
                                <i class="ph ph-clock me-1"></i>
                                ${lembrete.dias_antecedencia} dias de antecedência às ${lembrete.hora_envio}
                            </p>
                            <p class="text-muted small mb-0">${lembrete.mensagem.substring(0, 100)}${lembrete.mensagem.length > 100 ? '...' : ''}</p>
                        </div>
                        <div class="d-flex flex-column gap-2 ms-3">
                            <button class="btn btn-sm btn-outline-primary" onclick="prepararEdicaoLembrete('${lembrete.id}')" title="Editar">
                                <i class="ph ph-pencil-simple"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger" onclick="excluirLembrete('${lembrete.id}')" title="Excluir">
                                <i class="ph ph-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });

        lista.innerHTML = html;
        atualizarContadoresLembretes(lembretes);

    }catch(error){
        console.error('Erro ao carregar lembretes:', error);
        const lista = document.getElementById('listaLembretes');
        if(lista){
            lista.innerHTML = '<p class="text-muted text-center my-4">Erro ao carregar lembretes.</p>';
        }
    }
}

function getTipoBadge(tipo) {
    const tipos = {
        'consulta': '<span class="badge bg-info">Consulta</span>',
        'pagamento': '<span class="badge bg-warning text-dark">Pagamento</span>',
        'aniversario': '<span class="badge bg-success">Aniversário</span>',
        'retorno': '<span class="badge bg-primary">Retorno</span>',
        'personalizado': '<span class="badge bg-secondary">Personalizado</span>'
    };
    return tipos[tipo] || '<span class="badge bg-secondary">Outro</span>';
}

function atualizarContadoresLembretes(lembretes) {
    const ativos = lembretes.filter(l => l.ativo).length;
    document.getElementById('qtdLembretesAtivos').innerText = ativos;

    // Simulação - em produção, buscar dados reais
    document.getElementById('qtdEnviadosHoje').innerText = '0';
    document.getElementById('qtdProximosEnvios').innerText = ativos;
}

/* =========================
   CRIAR LEMBRETE
========================= */
async function criarLembrete() {
    const titulo = document.getElementById('tituloLembrete').value;
    const tipo = document.getElementById('tipoLembrete').value;
    const dias_antecedencia = parseInt(document.getElementById('diasAntecedencia').value);
    const hora_envio = document.getElementById('horaEnvio').value;
    const ativo = document.getElementById('ativoLembrete').checked;
    const mensagem = document.getElementById('mensagemLembrete').value;

    if(!titulo || !tipo || !mensagem){
        alert('Preencha todos os campos obrigatórios!');
        return;
    }

    try {
        const response = await fetch('/api/lembretes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                titulo,
                tipo,
                dias_antecedencia,
                hora_envio,
                ativo,
                mensagem
            })
        });

        const data = await response.json();
        if(!response.ok) throw new Error(data.erro || 'Erro ao salvar');

        alert('Lembrete criado com sucesso!');
        bootstrap.Modal.getInstance(document.getElementById('modalNovoLembrete')).hide();
        document.getElementById('formLembrete').reset();
        carregarLembretes();
    } catch (err) {
        alert(err.message);
    }
}

/* =========================
   EXCLUIR LEMBRETE
========================= */
async function excluirLembrete(id) {
    if (!confirm('Tem certeza que deseja excluir este lembrete?')) return;

    try {
        const response = await fetch(`/api/lembretes/${id}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.erro || 'Erro ao excluir');
        }

        alert('Lembrete excluído com sucesso!');
        carregarLembretes();
    } catch (err) {
        alert(err.message);
    }
}

/* =========================
   PREPARAR EDIÇÃO
========================= */
async function prepararEdicaoLembrete(id) {
    try {
        const res = await fetch('/api/lembretes');
        const lembretes = await res.json();
        const lembrete = lembretes.find(l => l.id === id);

        if (!lembrete) return;

        document.getElementById('idLembreteEditar').value = lembrete.id;
        document.getElementById('tituloLembreteEditar').value = lembrete.titulo;
        document.getElementById('tipoLembreteEditar').value = lembrete.tipo;
        document.getElementById('diasAntecedenciaEditar').value = lembrete.dias_antecedencia;
        document.getElementById('horaEnvioEditar').value = lembrete.hora_envio;
        document.getElementById('ativoLembreteEditar').checked = lembrete.ativo;
        document.getElementById('mensagemLembreteEditar').value = lembrete.mensagem;

        const modal = new bootstrap.Modal(document.getElementById('modalEditarLembrete'));
        modal.show();
    } catch (err) {
        console.error('Erro ao preparar edição:', err);
    }
}

/* =========================
   SALVAR EDIÇÃO
========================= */
async function salvarEdicaoLembrete() {
    const id = document.getElementById('idLembreteEditar').value;
    const titulo = document.getElementById('tituloLembreteEditar').value;
    const tipo = document.getElementById('tipoLembreteEditar').value;
    const dias_antecedencia = parseInt(document.getElementById('diasAntecedenciaEditar').value);
    const hora_envio = document.getElementById('horaEnvioEditar').value;
    const ativo = document.getElementById('ativoLembreteEditar').checked;
    const mensagem = document.getElementById('mensagemLembreteEditar').value;

    if(!titulo || !tipo || !mensagem){
        alert('Preencha todos os campos obrigatórios!');
        return;
    }

    try {
        const response = await fetch(`/api/lembretes/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                titulo,
                tipo,
                dias_antecedencia,
                hora_envio,
                ativo,
                mensagem
            })
        });

        if(!response.ok) {
            const data = await response.json();
            throw new Error(data.erro || 'Erro ao salvar');
        }

        alert('Lembrete atualizado com sucesso!');
        bootstrap.Modal.getInstance(document.getElementById('modalEditarLembrete')).hide();
        carregarLembretes();
    } catch (err) {
        alert(err.message);
    }
}

/* =========================
   ENVIAR LEMBRETES AUTOMÁTICOS
========================= */
async function enviarLembretesAutomaticos() {
    if (!confirm('Deseja enviar lembretes automáticos agora? Esta ação processará todos os lembretes ativos.')) return;

    try {
        const response = await fetch('/api/lembretes/enviar-automaticos', {
            method: 'POST'
        });

        const data = await response.json();
        if(!response.ok) throw new Error(data.erro || 'Erro ao enviar lembretes');

        alert(`Lembretes processados! ${data.enviados} lembretes foram enviados.`);
        console.log('Detalhes:', data.detalhes);
    } catch (err) {
        alert('Erro ao enviar lembretes: ' + err.message);
    }
}

/* =========================
   BUSCA
========================= */
function configurarBusca() {
    const buscaInput = document.getElementById('buscaLembretes');
    if (buscaInput) {
        buscaInput.addEventListener('input', function() {
            const termo = this.value.toLowerCase();
            const cards = document.querySelectorAll('#listaLembretes .card');

            cards.forEach(card => {
                const texto = card.textContent.toLowerCase();
                card.style.display = texto.includes(termo) ? '' : 'none';
            });
        });
    }
}

/* =========================
   EVENTOS
========================= */
function iniciarEventos(){
    // Botão salvar lembrete
    const btnSalvar = document.getElementById('btnSalvarLembrete');
    if(btnSalvar){
        btnSalvar.addEventListener('click', criarLembrete);
    }

    // Botão salvar edição
    const btnSalvarEdit = document.getElementById('btnSalvarEdicaoLembrete');
    if(btnSalvarEdit){
        btnSalvarEdit.addEventListener('click', salvarEdicaoLembrete);
    }

    // Botões de logout
    const botoesLogout = document.querySelectorAll('.btn-logout');
    botoesLogout.forEach(btn => {
        btn.addEventListener('click', logout);
    });

    // Configurar busca
    configurarBusca();
}

/* =========================
   INICIALIZAÇÃO
========================= */
document.addEventListener('DOMContentLoaded', () => {
    verificarUsuario();
    carregarLembretes();
    iniciarEventos();
});
