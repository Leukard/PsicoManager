async function carregarPacientesFinanceiro() {
    try {
        const response = await fetch('/api/pacientes');
        if (!response.ok) throw new Error('Falha ao carregar pacientes');
        const pacientes = await response.json();
        const select = document.getElementById('financeiroPaciente');
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

async function carregarConveniosFinanceiro() {
    try {
        const response = await fetch('/api/convenios');
        if (!response.ok) throw new Error('Falha ao carregar convênios');
        const convenios = await response.json();
        const select = document.getElementById('financeiroConvenio');
        select.innerHTML = '<option value="">Selecione o convênio</option>';
        convenios.forEach(convenio => {
            const option = document.createElement('option');
            option.value = convenio.id;
            option.textContent = convenio.nome;
            select.appendChild(option);
        });
    } catch (error) {
        console.error(error);
    }
}

async function carregarResumoFinanceiro() {
    try {
        const response = await fetch('/api/financeiro/resumo');
        if (!response.ok) throw new Error('Falha ao carregar resumo financeiro');
        const data = await response.json();
        document.getElementById('totalReceitas').innerText = `R$ ${Number(data.totalReceitas || 0).toFixed(2)}`;
        document.getElementById('totalDespesas').innerText = `R$ ${Number(data.totalDespesas || 0).toFixed(2)}`;
        document.getElementById('saldoFinanceiro').innerText = `R$ ${Number(data.saldo || 0).toFixed(2)}`;
    } catch (error) {
        console.error(error);
    }
}

async function carregarTransacoes() {
    try {
        const response = await fetch('/api/financeiro');
        if (!response.ok) throw new Error('Falha ao listar transações');
        const transacoes = await response.json();
        const tbody = document.getElementById('tabelaTransacoes');
        tbody.innerHTML = '';

        transacoes.forEach(item => {
            const linha = document.createElement('tr');
            linha.innerHTML = `
                <td>${item.tipo}</td>
                <td>${item.descricao}</td>
                <td>R$ ${Number(item.valor || 0).toFixed(2)}</td>
                <td>${item.paciente?.nome || '-'}</td>
                <td>${item.convenio?.nome || '-'}</td>
                <td>${item.data_movimento ? new Date(item.data_movimento).toLocaleDateString() : '-'}</td>
            `;
            tbody.appendChild(linha);
        });
    } catch (error) {
        console.error(error);
    }
}

async function criarTransacao(event) {
    event.preventDefault();

    const tipo = document.getElementById('financeiroTipo').value;
    const descricao = document.getElementById('financeiroDescricao').value.trim();
    const valor = Number(document.getElementById('financeiroValor').value);
    const dataMovimento = document.getElementById('financeiroData').value;
    const pacienteId = document.getElementById('financeiroPaciente').value || null;
    const convenioId = document.getElementById('financeiroConvenio').value || null;

    try {
        const response = await fetch('/api/financeiro', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                tipo,
                descricao,
                valor,
                data_movimento: dataMovimento,
                paciente_id: pacienteId,
                convenio_id: convenioId
            })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.erro || 'Erro ao salvar transação.');

        alert('Transação salva com sucesso');
        document.getElementById('formFinanceiro').reset();
        await carregarResumoFinanceiro();
        await carregarTransacoes();
    } catch (error) {
        console.error(error);
        alert(error.message);
    }
}

const formFinanceiro = document.getElementById('formFinanceiro');
if (formFinanceiro) {
    formFinanceiro.addEventListener('submit', criarTransacao);
}

window.addEventListener('load', () => {
    if (document.getElementById('formFinanceiro')) {
        carregarPacientesFinanceiro();
        carregarConveniosFinanceiro();
        carregarResumoFinanceiro();
        carregarTransacoes();
    }
});
