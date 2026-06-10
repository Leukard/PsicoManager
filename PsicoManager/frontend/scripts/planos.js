async function carregarPlanosLista() {
    try {
        const response = await fetch('/api/planos');
        if (!response.ok) throw new Error('Falha ao carregar planos');
        const planos = await response.json();
        const tbody = document.getElementById('tabelaPlanos');
        tbody.innerHTML = '';

        planos.forEach(plano => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${plano.nome}</td>
                <td>${plano.total_sessoes}</td>
                <td>${plano.saldo_sessoes ?? '-'} </td>
                <td>${plano.desconto ? `R$ ${Number(plano.desconto).toFixed(2)}` : '-'}</td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error(error);
        alert(error.message);
    }
}

async function criarPlano(event) {
    event.preventDefault();

    const nome = document.getElementById('planoNome').value.trim();
    const descricao = document.getElementById('planoDescricao').value.trim();
    const total_sessoes = Number(document.getElementById('planoTotalSessoes').value);
    const saldo_sessoes = document.getElementById('planoSaldoSessoes').value;
    const desconto = document.getElementById('planoDesconto').value;

    try {
        const response = await fetch('/api/planos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nome,
                descricao,
                total_sessoes,
                saldo_sessoes: saldo_sessoes !== '' ? Number(saldo_sessoes) : undefined,
                desconto: desconto !== '' ? Number(desconto) : undefined
            })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.erro || 'Erro ao criar plano.');

        alert('Plano cadastrado com sucesso');
        document.getElementById('formPlano').reset();
        carregarPlanosLista();
    } catch (error) {
        console.error(error);
        alert(error.message);
    }
}

document.getElementById('formPlano')?.addEventListener('submit', criarPlano);
window.addEventListener('load', () => {
    if (document.getElementById('tabelaPlanos')) {
        carregarPlanosLista();
    }
});
