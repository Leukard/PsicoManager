/* ==========================================
   DASHBOARD - PsicoManager
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
   CARREGAR PACIENTES
========================= */
async function carregarClientes() {
    try {
        const res = await fetch('/api/pacientes');

        if (!res.ok) {
            throw new Error('Erro ao buscar pacientes');
        }

        const pacientes = await res.json();

        const selects = [document.getElementById('selectCliente'), document.getElementById('editSelectCliente')];
        
        selects.forEach(select => {
            if (!select) return;
            select.innerHTML = '<option disabled selected>Selecione o paciente...</option>';
            pacientes.forEach(paciente => {
                const option = document.createElement('option');
                option.value = paciente.id;
                option.textContent = paciente.nome;
                select.appendChild(option);
            });
        });

    } catch (error) {
        console.error('Erro ao carregar pacientes:', error);
    }
}


/* =========================
   CARREGAR ESPAÇOS
========================= */
async function carregarEspacos(){
    try{
        const res = await fetch('/espacos');

        if(!res.ok){
            throw new Error('Erro ao buscar espaços');
        }

        const espacos = await res.json();

        const selects = [document.getElementById('selectEspaco'), document.getElementById('editSelectEspaco')];

        selects.forEach(select => {
            if(!select) return;
            select.innerHTML = '<option disabled selected>Selecione o local...</option>';
            espacos.forEach(espaco => {
                const option = document.createElement('option');
                option.value = espaco.id;
                option.textContent = espaco.nome;
                select.appendChild(option);
            });
        });

    }catch(error){
        console.error('Erro ao carregar espaços:', error);
    }
}


/* =========================
   CARREGAR STATUS
========================= */
let statusMap = {};
async function carregarStatus(){
    try{
        const res = await fetch('/status');

        if(!res.ok){
            throw new Error('Erro ao buscar status');
        }

        const statusList = await res.json();

        statusMap = {};
        statusList.forEach(status => {
            statusMap[status.id] = status.nome;
        });

        const selects = [document.getElementById('selectStatus'), document.getElementById('editSelectStatus')];

        selects.forEach(select => {
            if(!select) return;
            select.innerHTML = '<option disabled selected>Selecione o status...</option>';
            statusList.forEach(status => {
                const option = document.createElement('option');
                option.value = status.id;
                option.textContent = status.nome;
                select.appendChild(option);
            });
        });

    }catch(error){
        console.error('Erro ao carregar status:', error);
    }
}


/* =========================
   CARREGAR COMPROMISSOS
========================= */
async function carregarCompromissos(){
    try{
        const res = await fetch('/agendamentos');

        if(!res.ok){
            throw new Error('Erro ao buscar compromissos');
        }

        const compromissos = await res.json();

        const lista = document.getElementById('listaCompromissos');
        if(!lista) return;

        if(compromissos.length === 0){
            lista.innerHTML = '<p class="text-muted text-center my-4">Nenhum compromisso encontrado.</p>';
            return;
        }

        let html = '';
        compromissos.forEach(compromisso => {
            // Função para garantir que a data seja lida corretamente sem distorção de fuso horário
            const formatarDataHora = (isoString) => {
                const d = new Date(isoString);
                if (isNaN(d.getTime())) return { data: 'Data Inválida', hora: '--:--' };
                
                // Usamos os métodos getUTC para exibir exatamente o que está no banco
                const dia = String(d.getUTCDate()).padStart(2, '0');
                const mes = String(d.getUTCMonth() + 1).padStart(2, '0');
                const ano = d.getUTCFullYear();
                const hora = String(d.getUTCHours()).padStart(2, '0');
                const min = String(d.getUTCMinutes()).padStart(2, '0');
                
                return {
                    data: `${dia}/${mes}/${ano}`,
                    hora: `${hora}:${min}`
                };
            };

            const { data, hora } = formatarDataHora(compromisso.data_hora_inicio);
        const statusNome = compromisso.status_agendamento?.nome || statusMap[compromisso.status_id] || 'Desconhecido';
        const cliente = compromisso.pacientes?.nome || compromisso.clientes?.nome || 'Paciente';
        const espaco = compromisso.espacos?.nome || 'Espaço';

            // Definir cor baseada no status
            let corClasse = '';
            switch(statusNome.toLowerCase()){
                case 'confirmado':
                    corClasse = 'border-success';
                    break;
                case 'pendente':
                    corClasse = 'border-warning';
                    break;
                case 'cancelado':
                    corClasse = 'border-danger';
                    break;
                default:
                    corClasse = 'border-secondary';
            }

            html += `
                <div class="card border-0 shadow-sm rounded-4 p-3 mb-3 border-start border-4 ${corClasse}">
                    <div class="d-flex justify-content-between align-items-start">
                        <div>
                            <h6 class="fw-bold mb-1">${cliente}</h6>
                            <p class="text-muted small mb-1">${espaco}</p>
                            <p class="text-muted small mb-0">${data} às ${hora}</p>
                        </div>
                        <div class="d-flex flex-column align-items-end gap-2">
                            <span class="badge bg-${corClasse.replace('border-', '')} text-white">${statusNome}</span>
                            <div class="d-flex gap-2">
                                <button class="btn btn-sm btn-outline-primary py-0 px-2" onclick="prepararEdicao('${compromisso.id}')" title="Editar">
                                    <i class="ph ph-pencil-simple"></i>
                                </button>
                                <button class="btn btn-sm btn-outline-danger py-0 px-2" onclick="excluirAgendamento('${compromisso.id}')" title="Excluir">
                                    <i class="ph ph-trash"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                    ${compromisso.observacoes ? `<p class="text-muted small mt-2">${compromisso.observacoes}</p>` : ''}
                </div>
            `;
        });

        lista.innerHTML = html;

    }catch(error){
        console.error('Erro ao carregar compromissos:', error);
        const lista = document.getElementById('listaCompromissos');
        if(lista){
            lista.innerHTML = '<p class="text-muted text-center my-4">Erro ao carregar compromissos.</p>';
        }
    }
}

async function carregarTarefasDashboard() {
    try {
        const res = await fetch('/api/tarefas');
        if(!res.ok) {
            throw new Error('Erro ao buscar tarefas');
        }

        const tarefas = await res.json();
        const hoje = new Date();

        const pendentes = tarefas.filter(t => !t.concluido);
        const concluidas = tarefas.filter(t => t.concluido);
        const vencidas = tarefas.filter(t => {
            if (!t.data_vencimento) return false;
            const vencimento = new Date(t.data_vencimento);
            return vencimento < hoje && !t.concluido;
        });

        document.getElementById('qtdTarefasPendentes').innerText = pendentes.length;
        document.getElementById('qtdTarefasConcluidas').innerText = concluidas.length;
        document.getElementById('qtdTarefasVencidas').innerText = vencidas.length;

        const lista = document.getElementById('listaTarefasDashboard');
        if (!lista) return;

        if (tarefas.length === 0) {
            lista.innerHTML = '<p class="text-muted text-center my-4">Nenhuma tarefa registrada.</p>';
            return;
        }

        const proximas = tarefas
            .sort((a, b) => new Date(a.data_vencimento || 0) - new Date(b.data_vencimento || 0))
            .slice(0, 3);

        lista.innerHTML = proximas.map(tarefa => {
            const vencimento = tarefa.data_vencimento ? new Date(tarefa.data_vencimento).toLocaleDateString() : 'Sem data';
            const paciente = tarefa.paciente?.nome || 'Sem paciente';
            const status = tarefa.concluido ? 'Concluída' : 'Pendente';
            return `
                <div class="card border-0 shadow-sm rounded-4 p-3">
                    <div class="d-flex justify-content-between align-items-start gap-3">
                        <div>
                            <h6 class="fw-semibold mb-1">${tarefa.titulo}</h6>
                            <p class="text-muted small mb-1">${paciente} · ${vencimento}</p>
                            <p class="text-muted small mb-0">${tarefa.descricao || 'Sem descrição'}</p>
                        </div>
                        <span class="badge ${tarefa.concluido ? 'bg-success' : 'bg-warning text-dark'}">${status}</span>
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Erro ao carregar tarefas:', error);
        const lista = document.getElementById('listaTarefasDashboard');
        if(lista){
            lista.innerHTML = '<p class="text-muted text-center my-4">Erro ao carregar tarefas.</p>';
        }
    }
}
async function criarAgendamento() {
    const cliente_id = document.getElementById('selectCliente').value;
    const espaco_id = document.getElementById('selectEspaco').value;
    const status_id = document.getElementById('selectStatus').value;
    const data_hora_inicio = document.getElementById('dataInicio').value;
    const data_hora_fim = document.getElementById('dataFim').value;
    const observacoes = document.getElementById('observacoes').value;

    if(cliente_id === "" || cliente_id === "Selecione o cliente..." || !espaco_id || !status_id || !data_hora_inicio || !data_hora_fim){
        alert('Preencha todos os campos corretamente!');
        return;
    }

    try {
        const response = await fetch('/agendamentos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cliente_id, espaco_id, status_id, data_hora_inicio, data_hora_fim, observacoes })
        });

        const data = await response.json();
        if(!response.ok) throw new Error(data.erro || 'Erro ao salvar');
        
        // Sincronizar com Google Calendar (apenas o novo agendamento)
        try {
            await fetch('/sync-google-calendar-agendamentos');
        } catch (syncError) {
            console.error('Erro na sincronização:', syncError);
        }
        
        alert('Agendamento salvo com sucesso!');
        // Fechar modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('modalNovoAgendamento'));
        if(modal) modal.hide();
        
        // Recarregar a lista de compromissos
        carregarCompromissos();
    } catch (err) {
        alert(err.message);
    }
}


async function excluirAgendamento(id) {
    if (!confirm('Tem certeza que deseja excluir este agendamento?')) return;

    try {
        const response = await fetch(`/agendamentos/${id}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.erro || 'Erro ao excluir');
        }

        alert('Agendamento excluído com sucesso!');
        carregarCompromissos();
    } catch (err) {
        alert(err.message);
    }
}

let idAgendamentoEmEdicao = null;

async function prepararEdicao(id) {
    try {
        const res = await fetch('/agendamentos');
        const agendamentos = await res.json();
        const ag = agendamentos.find(a => a.id === id);

        if (!ag) return;

        idAgendamentoEmEdicao = id;
        
        // Preencher o modal de edição
        document.getElementById('editSelectCliente').value = ag.paciente_id || ag.cliente_id;
        document.getElementById('editSelectEspaco').value = ag.espaco_id;
        document.getElementById('editSelectStatus').value = ag.status_id;
        document.getElementById('editNumeroPessoas').value = ag.numero_pessoas || 1;
        
        // Formatar datas para o input datetime-local
        const formatarData = (iso) => {
            if (!iso) return '';
            const d = new Date(iso);
            return d.toISOString().slice(0, 16);
        };
        
        document.getElementById('editDataInicio').value = formatarData(ag.data_hora_inicio);
        document.getElementById('editDataFim').value = formatarData(ag.data_hora_fim);
        document.getElementById('editObservacoes').value = ag.observacoes || '';

        // Abrir modal
        const modal = new bootstrap.Modal(document.getElementById('modalEditarAgendamento'));
        modal.show();
    } catch (err) {
        console.error('Erro ao preparar edição:', err);
    }
}

async function salvarEdicao() {
    const paciente_id = document.getElementById('editSelectCliente').value;
    const espaco_id = document.getElementById('editSelectEspaco').value;
    const status_id = document.getElementById('editSelectStatus').value;
    const data_hora_inicio = document.getElementById('editDataInicio').value;
    const data_hora_fim = document.getElementById('editDataFim').value;
    const observacoes = document.getElementById('editObservacoes').value;
    const numero_pessoas = document.getElementById('editNumeroPessoas').value;

    if (!paciente_id || !espaco_id || !status_id || !data_hora_inicio || !data_hora_fim) {
        alert('Preencha todos os campos corretamente!');
        return;
    }

    try {
        const response = await fetch(`/agendamentos/${idAgendamentoEmEdicao}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paciente_id, espaco_id, status_id, data_hora_inicio, data_hora_fim, observacoes, numero_pessoas })
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.erro || 'Erro ao salvar');
        }
        
        alert('Agendamento atualizado com sucesso!');
        bootstrap.Modal.getInstance(document.getElementById('modalEditarAgendamento')).hide();
        carregarCompromissos();
    } catch (err) {
        alert(err.message);
    }
}

/* =========================
   EVENTOS
========================= */
function iniciarEventos(){

    // botão salvar agendamento
    const btnSalvar = document.getElementById('btnSalvarAgendamento');
    if(btnSalvar){
        btnSalvar.addEventListener('click', criarAgendamento);
    }

    // botão salvar edição
    const btnSalvarEdit = document.getElementById('btnSalvarEdicao');
    if(btnSalvarEdit){
        btnSalvarEdit.addEventListener('click', salvarEdicao);
    }

    // botões de logout
    const botoesLogout = document.querySelectorAll('.btn-logout');
    botoesLogout.forEach(btn => {
        btn.addEventListener('click', logout);
    });
}


/* =========================
   VERIFICAR LEMBRETES (TEMPO REAL)
========================= */
async function verificarLembretes() {
    try {
        const res = await fetch('/lembretes-amanha');
        if (!res.ok) return;

        const agendamentos = await res.json();
        if (agendamentos.length === 0) return;

        const agora = new Date();
        const vinteQuatroHorasEmMs = 24 * 60 * 60 * 1000;
        
        // Recuperar IDs já notificados do localStorage
        let notificados = JSON.parse(localStorage.getItem('agendamentosNotificados') || '[]');
        
        // Filtrar agendamentos que estão dentro da janela de 24h e ainda não foram notificados
        const pendentesNotificacao = agendamentos.filter(ag => {
            const dataInicio = new Date(ag.data_hora_inicio);
            const tempoAteInicio = dataInicio.getTime() - agora.getTime();
            
            // Regra: Notificar se faltar 24h ou menos, mas o agendamento ainda não começou
            return tempoAteInicio <= vinteQuatroHorasEmMs && tempoAteInicio > 0 && !notificados.includes(ag.id);
        });

        if (pendentesNotificacao.length === 0) return;

        const corpo = document.getElementById('corpoLembrete');
        if (!corpo) return;

        let html = `<p class="mb-3"><strong>Atenção!</strong> Você tem compromissos se aproximando (nas próximas 24h):</p><ul class="list-group list-group-flush">`;

        pendentesNotificacao.forEach(l => {
            const dataObj = new Date(l.data_hora_inicio);
            const hoje = new Date();
            const amanha = new Date(hoje);
            amanha.setDate(hoje.getDate() + 1);

            let diaTexto = "";
            if (dataObj.getUTCDate() === hoje.getUTCDate() && dataObj.getUTCMonth() === hoje.getUTCMonth()) {
                diaTexto = "Hoje";
            } else if (dataObj.getUTCDate() === amanha.getUTCDate() && dataObj.getUTCMonth() === amanha.getUTCMonth()) {
                diaTexto = "Amanhã";
            } else {
                diaTexto = `${String(dataObj.getUTCDate()).padStart(2, '0')}/${String(dataObj.getUTCMonth() + 1).padStart(2, '0')}`;
            }

            const hora = String(dataObj.getUTCHours()).padStart(2, '0') + ':' + String(dataObj.getUTCMinutes()).padStart(2, '0');
            
            html += `
                <li class="list-group-item px-0 py-2 bg-transparent border-0">
                    <div class="d-flex align-items-center gap-2">
                        <i class="ph ph-bell-ringing text-danger fs-5"></i>
                        <div>
                            <span class="fw-bold d-block">${l.pacientes?.nome || l.clientes?.nome || 'Paciente'}</span>
                            <small class="text-muted">${l.espacos?.nome || 'Espaço'} - <strong>${diaTexto}</strong> às ${hora}</small>
                        </div>
                    </div>
                </li>
            `;
            
            // Adicionar ao array de notificados
            notificados.push(l.id);
        });

        html += '</ul>';
        corpo.innerHTML = html;

        // Mostrar o modal
        const modal = new bootstrap.Modal(document.getElementById('modalLembrete'));
        modal.show();

        // Salvar IDs atualizados no localStorage
        localStorage.setItem('agendamentosNotificados', JSON.stringify(notificados));

    } catch (error) {
        console.error('Erro ao verificar lembretes:', error);
    }
}


/* =========================
   INICIALIZAÇÃO
========================= */
document.addEventListener('DOMContentLoaded', () => {

    verificarUsuario();
    carregarClientes();
    carregarEspacos();
    carregarStatus();
    carregarCompromissos();
    carregarTarefasDashboard();
    iniciarEventos();
    
    // Verificar lembretes imediatamente ao carregar
    verificarLembretes();
    
    // Configurar verificação periódica (a cada 1 minuto)
    setInterval(verificarLembretes, 60000);

});
