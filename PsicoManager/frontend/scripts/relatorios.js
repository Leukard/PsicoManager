async function carregarRelatorios() {
    try {
        const resFinanceiro = await fetch('/api/relatorios/financeiro');
        const resAtendimentos = await fetch('/api/relatorios/atendimentos');
        const resSemProntuario = await fetch('/api/relatorios/pacientes-sem-prontuario');

        if (!resFinanceiro.ok) throw new Error('Erro ao carregar relatório financeiro');
        if (!resAtendimentos.ok) throw new Error('Erro ao carregar relatório de atendimentos');
        if (!resSemProntuario.ok) throw new Error('Erro ao carregar pacientes sem prontuário');

        const financeiro = await resFinanceiro.json();
        const atendimentos = await resAtendimentos.json();
        const semProntuario = await resSemProntuario.json();

        document.getElementById('relatorioReceitas').innerText = `R$ ${Number(financeiro.totalReceita || 0).toFixed(2)}`;
        document.getElementById('relatorioDespesas').innerText = `R$ ${Number(financeiro.totalDespesa || 0).toFixed(2)}`;
        document.getElementById('relatorioLucro').innerText = `R$ ${Number(financeiro.lucro || 0).toFixed(2)}`;
        document.getElementById('relatorioAtendimentosTotal').innerText = atendimentos.totalAtendimentos || 0;

        const statusBody = document.getElementById('relatorioPorStatus');
        statusBody.innerHTML = '';
        Object.entries(atendimentos.porStatus || {}).forEach(([status, valor]) => {
            const row = document.createElement('tr');
            row.innerHTML = `<td>${status}</td><td>${valor}</td>`;
            statusBody.appendChild(row);
        });

        const semProntuarioBody = document.getElementById('pacientesSemProntuario');
        semProntuarioBody.innerHTML = '';
        semProntuario.forEach(paciente => {
            const row = document.createElement('tr');
            row.innerHTML = `<td>${paciente.nome}</td><td>${paciente.email || '-'}</td><td>${paciente.telefone || '-'}</td>`;
            semProntuarioBody.appendChild(row);
        });
    } catch (error) {
        console.error(error);
        alert(error.message);
    }
}

async function carregarLogsAuditoria() {
    try {
        const res = await fetch('/api/logs');
        if (!res.ok) throw new Error('Erro ao carregar logs de auditoria.');

        const logs = await res.json();
        const tabela = document.getElementById('auditoriaLogs');
        tabela.innerHTML = '';

        logs.forEach(log => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${log.usuario?.nome || log.usuario_id || '-'}</td>
                <td>${log.acao || '-'}</td>
                <td class="text-truncate" style="max-width: 150px;">${log.detalhes ? JSON.stringify(log.detalhes).substring(0, 50) + '...' : '-'}</td>
                <td>${new Date(log.created_at).toLocaleString('pt-BR')}</td>
                <td class="text-center">
                    <button class="btn btn-sm btn-outline-primary" onclick="visualizarLog('${log.id}', '${(log.usuario?.nome || log.usuario_id || '-').replace(/'/g, "\\'")}', '${(log.acao || '-').replace(/'/g, "\\'")}', '${new Date(log.created_at).toLocaleString('pt-BR')}', '${JSON.stringify(log.detalhes || {}).replace(/'/g, "\\'")}')" title="Visualizar">
                        <i class="ph ph-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="excluirLog('${log.id}')" title="Excluir">
                        <i class="ph ph-trash"></i>
                    </button>
                </td>
            `;
            tabela.appendChild(row);
        });
    } catch (error) {
        console.error(error);
    }
}

function visualizarLog(id, usuario, acao, data, detalhes) {
    document.getElementById('logUsuario').textContent = usuario;
    document.getElementById('logAcao').textContent = acao;
    document.getElementById('logData').textContent = data;
    
    try {
        const detalhesParsed = JSON.parse(detalhes);
        document.getElementById('logDetalhes').textContent = JSON.stringify(detalhesParsed, null, 2);
    } catch (e) {
        document.getElementById('logDetalhes').textContent = detalhes;
    }
    
    document.getElementById('btnExcluirLog').onclick = () => excluirLog(id);
    
    new bootstrap.Modal(document.getElementById('modalVisualizarLog')).show();
}

async function excluirLog(id) {
    if (!confirm('Tem certeza que deseja excluir este log? Esta ação não pode ser desfeita.')) return;

    try {
        const response = await fetch(`/api/logs/${id}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            const erro = await response.json();
            throw new Error(erro.erro || 'Erro ao excluir log');
        }

        // Fechar modal se estiver aberto
        const modal = bootstrap.Modal.getInstance(document.getElementById('modalVisualizarLog'));
        if (modal) modal.hide();

        alert('Log excluído com sucesso!');
        carregarLogsAuditoria();
    } catch (error) {
        alert('Erro ao excluir log: ' + error.message);
    }
}

async function exportarCSV(url, nomeArquivo) {
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error('Falha ao gerar o arquivo de exportação.');

        const blob = await res.blob();
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = nomeArquivo;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(link.href);
    } catch (error) {
        console.error(error);
        alert(error.message);
    }
}

window.addEventListener('load', () => {
    if (document.getElementById('relatorioReceitas')) {
        carregarRelatorios();
        carregarLogsAuditoria();
    }

    const btnExportAuditoriaCSV = document.getElementById('btnExportAuditoriaCSV');
    if (btnExportAuditoriaCSV) {
        btnExportAuditoriaCSV.addEventListener('click', () => {
            exportarCSV('/api/logs/export', 'logs_auditoria.csv');
        });
    }
});
