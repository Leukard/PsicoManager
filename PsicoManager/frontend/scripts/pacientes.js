async function carregarPacientes(planoId = '') {
    try {
        const url = planoId ? `/api/pacientes?plano_id=${planoId}` : '/api/pacientes';
        const response = await fetch(url);
        if (!response.ok) throw new Error('Não foi possível carregar os pacientes');

        const pacientes = await response.json();
        const tabela = document.getElementById('tabelaPacientes');
        tabela.innerHTML = '';

        pacientes.forEach(paciente => {
            const linha = document.createElement('tr');
            linha.innerHTML = `
                <td>${paciente.nome}</td>
                <td>${paciente.email || '-'}</td>
                <td>${paciente.telefone || '-'}</td>
                <td>${paciente.data_nascimento ? new Date(paciente.data_nascimento).toLocaleDateString() : '-'}</td>
                <td>${paciente.plano?.nome || '-'}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary btn-ver-paciente" data-id="${paciente.id}">Ver</button>
                    <button class="btn btn-sm btn-outline-secondary btn-editar-paciente" data-id="${paciente.id}">Editar</button>
                    <button class="btn btn-sm btn-outline-danger btn-excluir-paciente" data-id="${paciente.id}">Excluir</button>
                </td>
            `;
            tabela.appendChild(linha);
        });

        document.querySelectorAll('.btn-ver-paciente').forEach(button => {
            button.addEventListener('click', async (event) => {
                const pacienteId = event.target.dataset.id;
                await exibirDetalhesPaciente(pacienteId);
            });
        });

        document.querySelectorAll('.btn-editar-paciente').forEach(button => {
            button.addEventListener('click', async (event) => {
                const pacienteId = event.target.dataset.id;
                await iniciarEdicaoPaciente(pacienteId);
            });
        });

        document.querySelectorAll('.btn-excluir-paciente').forEach(button => {
            button.addEventListener('click', async (event) => {
                const pacienteId = event.target.dataset.id;
                await deletarPaciente(pacienteId);
            });
        });
    } catch (error) {
        console.error(error);
        alert(error.message);
    }
}

async function criarPaciente(event) {
    event.preventDefault();

    const pacienteId = document.getElementById('pacienteId').value;
    const nome = document.getElementById('pacienteNome').value.trim();
    const email = document.getElementById('pacienteEmail').value.trim();
    const telefone = document.getElementById('pacienteTelefone').value.trim();
    const dataNascimento = document.getElementById('pacienteNascimento').value;
    const genero = document.getElementById('pacienteGenero').value;
    const observacoes = document.getElementById('pacienteObservacoes').value.trim();
    const planoId = document.getElementById('pacientePlano').value || null;

    try {
        const method = pacienteId ? 'PUT' : 'POST';
        const url = pacienteId ? `/api/pacientes/${pacienteId}` : '/api/pacientes';
        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nome,
                email,
                telefone,
                data_nascimento: dataNascimento,
                genero,
                observacoes,
                plano_id: planoId
            })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.erro || `Erro ao ${pacienteId ? 'atualizar' : 'cadastrar'} paciente.`);

        alert(`Paciente ${pacienteId ? 'atualizado' : 'cadastrado'} com sucesso!`);
        document.getElementById('formPaciente').reset();
        document.getElementById('pacienteId').value = '';
        document.getElementById('btnSalvarPaciente').textContent = 'Cadastrar paciente';
        document.getElementById('btnCancelarEdicao').classList.add('d-none');
        await carregarPacientes(document.getElementById('pacientesFiltroPlano')?.value);
    } catch (error) {
        console.error(error);
        alert(error.message);
    }
}

async function iniciarEdicaoPaciente(id) {
    try {
        const response = await fetch(`/api/pacientes/${id}`);
        if (!response.ok) throw new Error('Erro ao carregar paciente para edição');
        const paciente = await response.json();

        document.getElementById('pacienteId').value = paciente.id;
        document.getElementById('pacienteNome').value = paciente.nome || '';
        document.getElementById('pacienteEmail').value = paciente.email || '';
        document.getElementById('pacienteTelefone').value = paciente.telefone || '';
        document.getElementById('pacienteNascimento').value = paciente.data_nascimento || '';
        document.getElementById('pacienteGenero').value = paciente.genero || '';
        document.getElementById('pacienteObservacoes').value = paciente.observacoes || '';
        document.getElementById('pacientePlano').value = paciente.plano_id || '';
        document.getElementById('btnSalvarPaciente').textContent = 'Salvar alterações';
        document.getElementById('btnCancelarEdicao').classList.remove('d-none');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
        console.error(error);
        alert(error.message);
    }
}

async function deletarPaciente(id) {
    if (!confirm('Deseja realmente excluir este paciente?')) return;
    try {
        const response = await fetch(`/api/pacientes/${id}`, { method: 'DELETE' });
        const data = await response.json();
        if (!response.ok) throw new Error(data.erro || 'Erro ao excluir paciente.');

        alert(data.mensagem || 'Paciente excluído com sucesso!');
        await carregarPacientes(document.getElementById('pacientesFiltroPlano')?.value);
        resetProntuarioForm();
    } catch (error) {
        console.error(error);
        alert(error.message);
    }
}

async function carregarPlanos() {
    try {
        const response = await fetch('/api/planos');
        if (!response.ok) return;

        const planos = await response.json();
        const selectCadastro = document.getElementById('pacientePlano');
        const selectFilter = document.getElementById('pacientesFiltroPlano');

        selectCadastro.innerHTML = '<option value="">Nenhum</option>';
        selectFilter.innerHTML = '<option value="">Todos os planos</option>';

        planos.forEach(plano => {
            const optionCadastro = document.createElement('option');
            optionCadastro.value = plano.id;
            optionCadastro.textContent = `${plano.nome} (${plano.total_sessoes} sessões)`;
            selectCadastro.appendChild(optionCadastro);

            if (selectFilter) {
                const optionFilter = document.createElement('option');
                optionFilter.value = plano.id;
                optionFilter.textContent = plano.nome;
                selectFilter.appendChild(optionFilter);
            }
        });
    } catch (error) {
        console.warn('Não foi possível carregar os planos:', error);
    }
}

async function carregarTerapeutas() {
    try {
        // Mudamos de /api/usuarios para /clientes
        const res = await fetch('/clientes'); 
        if (!res.ok) throw new Error('Erro ao carregar terapeutas');
        
        const terapeutas = await res.json();
        const select = document.getElementById('prontuarioTerapeuta');
        if (!select) return;

        select.innerHTML = '<option value="" selected disabled>Selecione o terapeuta...</option>';
        terapeutas.forEach(t => {
            const option = document.createElement('option');
            option.value = t.id; // ID do "Cliente" no banco
            option.textContent = t.nome; // Nome do "Cliente"
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Erro ao carregar terapeutas:', error);
    }
}

function resetProntuarioForm() {
    document.getElementById('prontuarioPacienteId').value = '';
    document.getElementById('prontuarioData').value = '';
    document.getElementById('prontuarioTerapeuta').value = '';
    document.getElementById('prontuarioStatus').value = 'Em andamento';
    document.getElementById('prontuarioObservacoes').value = '';
    document.getElementById('prontuarioAviso').innerText = 'Selecione um paciente para habilitar o formulário de prontuário.';
    document.querySelectorAll('#formProntuario input, #formProntuario textarea, #formProntuario select, #formProntuario button').forEach(el => el.disabled = true);
    document.getElementById('listaProntuarios').innerHTML = '';
}

function habilitarProntuarioForm(pacienteNome, pacienteId) {
    document.getElementById('prontuarioPacienteId').value = pacienteId;
    document.getElementById('prontuarioAviso').innerText = `Criando prontuário para ${pacienteNome}.`;
    document.querySelectorAll('#formProntuario input, #formProntuario textarea, #formProntuario select, #formProntuario button').forEach(el => el.disabled = false);
}

async function carregarProntuariosPaciente(pacienteId) {
    try {
        const response = await fetch(`/api/prontuarios?paciente_id=${pacienteId}`);
        if (!response.ok) throw new Error('Não foi possível carregar os prontuários.');

        const prontuarios = await response.json();
        const tbody = document.getElementById('listaProntuarios');
        tbody.innerHTML = '';

        if (!prontuarios.length) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-muted">Nenhum prontuário registrado para este paciente.</td></tr>';
            return;
        }

        prontuarios.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.data_sessao ? new Date(item.data_sessao).toLocaleDateString() : '-'}</td>
                <td>${item.terapeuta?.nome || item.terapeuta_id || '-'}</td>
                <td>${item.status_prontuario || '-'}</td>
                <td>${item.observacoes || '-'}</td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error(error);
        alert(error.message);
    }
}

async function criarProntuario(event) {
    event.preventDefault();

    const paciente_id = document.getElementById('prontuarioPacienteId').value;
    if (!paciente_id) {
        alert('Selecione um paciente antes de criar um prontuário.');
        return;
    }

    const data_sessao = document.getElementById('prontuarioData').value;
    const terapeuta_id = document.getElementById('prontuarioTerapeuta').value.trim() || null;
    const status_prontuario = document.getElementById('prontuarioStatus').value;
    const observacoes = document.getElementById('prontuarioObservacoes').value.trim();

    try {
        const response = await fetch('/api/prontuarios', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paciente_id, data_sessao, terapeuta_id, status_prontuario, observacoes })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.erro || 'Erro ao cadastrar prontuário.');

        alert('Prontuário criado com sucesso!');
        document.getElementById('formProntuario').reset();
        habilitarProntuarioForm(document.getElementById('detalhesPaciente').querySelector('h5')?.textContent.replace('Detalhes de ', ''), paciente_id);
        carregarProntuariosPaciente(paciente_id);
    } catch (error) {
        console.error(error);
        alert(error.message);
    }
}

async function exibirDetalhesPaciente(id) {
    try {
        const response = await fetch(`/api/pacientes/${id}`);
        if (!response.ok) throw new Error('Não foi possível carregar o paciente.');

        const paciente = await response.json();
        const detalhes = document.getElementById('detalhesPaciente');
        detalhes.innerHTML = `
            <h5>Detalhes de ${paciente.nome}</h5>
            <p><strong>Email:</strong> ${paciente.email || '-'}</p>
            <p><strong>Telefone:</strong> ${paciente.telefone || '-'}</p>
            <p><strong>Data de nascimento:</strong> ${paciente.data_nascimento ? new Date(paciente.data_nascimento).toLocaleDateString() : '-'}</p>
            <p><strong>Gênero:</strong> ${paciente.genero || '-'}</p>
            <p><strong>Plano:</strong> ${paciente.plano?.nome || 'Nenhum'}</p>
            <p><strong>Observações:</strong> ${paciente.observacoes || 'Nenhuma'}</p>
        `;

        habilitarProntuarioForm(paciente.nome, paciente.id);
        carregarProntuariosPaciente(paciente.id);
    } catch (error) {
        console.error(error);
        alert(error.message);
    }
}

const formPaciente = document.getElementById('formPaciente');
if (formPaciente) {
    formPaciente.addEventListener('submit', criarPaciente);
}

const formProntuario = document.getElementById('formProntuario');
if (formProntuario) {
    formProntuario.addEventListener('submit', criarProntuario);
}

window.addEventListener('load', () => {
    if (document.getElementById('tabelaPacientes')) {
        carregarPacientes();
        carregarPlanos();
        carregarTerapeutas(); // Chamada adicionada aqui
    }
    if (document.getElementById('formProntuario')) {
        resetProntuarioForm();
    }

    const filtroPlano = document.getElementById('pacientesFiltroPlano');
    const botaoLimparFiltro = document.getElementById('btnLimparFiltro');
    const botaoCancelarEdicao = document.getElementById('btnCancelarEdicao');

    if (filtroPlano) {
        filtroPlano.addEventListener('change', async () => {
            await carregarPacientes(filtroPlano.value);
        });
    }

    if (botaoLimparFiltro) {
        botaoLimparFiltro.addEventListener('click', async () => {
            if (filtroPlano) {
                filtroPlano.value = '';
            }
            await carregarPacientes();
        });
    }

    if (botaoCancelarEdicao) {
        botaoCancelarEdicao.addEventListener('click', () => {
            document.getElementById('formPaciente').reset();
            document.getElementById('pacienteId').value = '';
            document.getElementById('btnSalvarPaciente').textContent = 'Cadastrar paciente';
            botaoCancelarEdicao.classList.add('d-none');
        });
    }
});