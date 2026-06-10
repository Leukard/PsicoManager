async function carregarPacientesTarefa() {
    try {
        const response = await fetch('/api/pacientes');
        if (!response.ok) throw new Error('Falha ao carregar pacientes');
        const pacientes = await response.json();
        const select = document.getElementById('tarefaPaciente');
        select.innerHTML = '<option value="">Selecione o paciente</option>';
        pacientes.forEach(paciente => {
            const option = document.createElement('option');
            option.value = paciente.id;
            option.textContent = paciente.nome;
            select.appendChild(option);
        });
    } catch (error) {
        console.error(error);
    }
}

async function carregarTarefas() {
    try {
        const response = await fetch('/api/tarefas');
        if (!response.ok) throw new Error('Falha ao carregar tarefas');
        const tarefas = await response.json();
        const tbody = document.getElementById('tabelaTarefas');
        tbody.innerHTML = '';

        tarefas.forEach(tarefa => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${tarefa.titulo}</td>
                <td>${tarefa.paciente?.nome || '-'}</td>
                <td>${tarefa.prioridade}</td>
                <td>${tarefa.data_vencimento ? new Date(tarefa.data_vencimento).toLocaleDateString() : '-'}</td>
                <td>${tarefa.concluido ? 'Concluída' : 'Pendente'}</td>
                <td>
                    ${tarefa.concluido ? '' : `<button class="btn btn-sm btn-outline-success me-2" data-id="${tarefa.id}" data-action="concluir">Concluir</button>`}
                    <button class="btn btn-sm btn-outline-danger" data-id="${tarefa.id}" data-action="deletar">Excluir</button>
                </td>
            `;
            tbody.appendChild(row);
        });

        tbody.querySelectorAll('button').forEach(button => {
            const id = button.dataset.id;
            const action = button.dataset.action;
            button.addEventListener('click', () => {
                if (action === 'concluir') marcarTarefaConcluida(id);
                if (action === 'deletar') deletarTarefa(id);
            });
        });
    } catch (error) {
        console.error(error);
        alert(error.message);
    }
}

async function criarTarefa(event) {
    event.preventDefault();

    const titulo = document.getElementById('tarefaTitulo').value.trim();
    const descricao = document.getElementById('tarefaDescricao').value.trim();
    const paciente_id = document.getElementById('tarefaPaciente').value || null;
    const prioridade = document.getElementById('tarefaPrioridade').value;
    const data_vencimento = document.getElementById('tarefaVencimento').value;
    const concluido = document.getElementById('tarefaConcluido').checked;

    try {
        const response = await fetch('/api/tarefas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ titulo, descricao, paciente_id, prioridade, data_vencimento, concluido })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.erro || 'Erro ao criar tarefa.');

        alert('Tarefa criada com sucesso');
        document.getElementById('formTarefa').reset();
        carregarTarefas();
    } catch (error) {
        console.error(error);
        alert(error.message);
    }
}

async function marcarTarefaConcluida(id) {
    try {
        const response = await fetch(`/api/tarefas/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ concluido: true })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.erro || 'Erro ao atualizar tarefa.');

        carregarTarefas();
    } catch (error) {
        console.error(error);
        alert(error.message);
    }
}

async function deletarTarefa(id) {
    if (!confirm('Excluir tarefa?')) return;
    try {
        const response = await fetch(`/api/tarefas/${id}`, { method: 'DELETE' });
        const data = await response.json();
        if (!response.ok) throw new Error(data.erro || 'Erro ao excluir tarefa.');
        carregarTarefas();
    } catch (error) {
        console.error(error);
        alert(error.message);
    }
}

document.getElementById('formTarefa')?.addEventListener('submit', criarTarefa);
window.addEventListener('load', () => {
    if (document.getElementById('formTarefa')) {
        carregarPacientesTarefa();
        carregarTarefas();
    }
});
