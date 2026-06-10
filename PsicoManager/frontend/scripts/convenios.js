async function carregarConvenios() {
    try {
        const response = await fetch('/api/convenios');
        if (!response.ok) throw new Error('Falha ao carregar convênios');
        const convenios = await response.json();
        const tbody = document.getElementById('tabelaConvenios');
        tbody.innerHTML = '';

        convenios.forEach(convenio => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${convenio.nome}</td>
                <td>${convenio.porcentagem_reembolso ?? '-'}%</td>
                <td>${convenio.coparticipacao || '-'}</td>
                <td>
                    <button class="btn btn-sm btn-outline-secondary me-2" data-id="${convenio.id}" data-action="editar">Editar</button>
                    <button class="btn btn-sm btn-outline-danger" data-id="${convenio.id}" data-action="deletar">Excluir</button>
                </td>
            `;
            tbody.appendChild(row);
        });

        tbody.querySelectorAll('button').forEach(button => {
            const id = button.dataset.id;
            const action = button.dataset.action;
            button.addEventListener('click', () => {
                if (action === 'editar') {
                    atualizarConvenio(id);
                } else {
                    deletarConvenio(id);
                }
            });
        });
    } catch (error) {
        console.error(error);
        alert(error.message);
    }
}

async function criarConvenio(event) {
    event.preventDefault();

    const nome = document.getElementById('convenioNome').value.trim();
    const descricao = document.getElementById('convenioDescricao').value.trim();
    const porcentagem_reembolso = document.getElementById('convenioReembolso').value;
    const coparticipacao = document.getElementById('convenioCoparticipacao').value.trim();

    try {
        const response = await fetch('/api/convenios', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome, descricao, porcentagem_reembolso, coparticipacao })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.erro || 'Erro ao criar convênio.');

        alert('Convênio criado com sucesso');
        document.getElementById('formConvenio').reset();
        carregarConvenios();
    } catch (error) {
        console.error(error);
        alert(error.message);
    }
}

async function atualizarConvenio(id) {
    try {
        const nome = prompt('Novo nome do convênio:');
        if (nome === null) return;
        const descricao = prompt('Nova descrição (deixe em branco para manter):');

        const body = { nome };
        if (descricao !== null && descricao !== '') body.descricao = descricao;

        const response = await fetch(`/api/convenios/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.erro || 'Erro ao atualizar convênio.');

        alert('Convênio atualizado');
        carregarConvenios();
    } catch (error) {
        console.error(error);
        alert(error.message);
    }
}

async function deletarConvenio(id) {
    if (!confirm('Excluir convênio? Essa ação não pode ser desfeita.')) return;
    try {
        const response = await fetch(`/api/convenios/${id}`, { method: 'DELETE' });
        const data = await response.json();
        if (!response.ok) throw new Error(data.erro || 'Erro ao excluir convênio.');

        alert(data.mensagem || 'Convênio excluído');
        carregarConvenios();
    } catch (error) {
        console.error(error);
        alert(error.message);
    }
}

document.getElementById('formConvenio')?.addEventListener('submit', criarConvenio);
window.addEventListener('load', () => {
    if (document.getElementById('tabelaConvenios')) {
        carregarConvenios();
    }
});
