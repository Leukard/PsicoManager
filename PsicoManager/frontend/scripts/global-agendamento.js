/**
 * Lógica Global para o Modal de Novo Agendamento
 * Este arquivo deve ser incluído em todas as páginas que utilizam o modal global.
 */

async function carregarDadosModalGlobal() {
    console.log("Carregando dados para o modal global...");
    try {
        // Carregar Pacientes (da tabela pacientes)
        const resPac = await fetch('/api/pacientes');
        if (resPac.ok) {
            const pacientes = await resPac.json();
            const selectPac = document.getElementById('selectClienteGlobal');
            if (selectPac) {
                selectPac.innerHTML = '<option value="" selected disabled>Selecione o paciente...</option>' +
                    pacientes.map(p => `<option value="${p.id}">${p.nome}</option>`).join('');
            }
        }

        // Carregar Espaços
        const resEsp = await fetch('/espacos');
        if (resEsp.ok) {
            const espacos = await resEsp.json();
            const selectEsp = document.getElementById('selectEspacoGlobal');
            if (selectEsp) {
                selectEsp.innerHTML = '<option value="" selected disabled>Selecione o local...</option>' +
                    espacos.map(e => `<option value="${e.id}">${e.nome}</option>`).join('');
            }
        }

        // Carregar Status
        const resStat = await fetch('/status');
        const selectStat = document.getElementById('selectStatusGlobal');
        if (resStat.ok) {
            const status = await resStat.json();
            if (selectStat) {
                selectStat.innerHTML = '<option value="" selected disabled>Selecione o status...</option>' +
                    status.map(s => `<option value="${s.id}">${s.nome}</option>`).join('');
            }
        } else {
            if (selectStat) {
                selectStat.innerHTML = `
                    <option value="" selected disabled>Selecione o status...</option>
                    <option value="1">Pendente</option>
                    <option value="2">Confirmado</option>
                    <option value="3">Cancelado</option>
                `;
            }
        }
    } catch (err) {
        console.error("Erro ao carregar dados do modal global:", err);
    }
}

async function inicializarModalGlobal() {
    const btnSalvarGlobal = document.getElementById('btnSalvarAgendamentoGlobal');
    if (btnSalvarGlobal) {
        // Remover listeners antigos para evitar duplicação
        const newBtnSalvar = btnSalvarGlobal.cloneNode(true);
        btnSalvarGlobal.parentNode.replaceChild(newBtnSalvar, btnSalvarGlobal);

        newBtnSalvar.addEventListener('click', async () => {
            const payload = {
                paciente_id: document.getElementById('selectClienteGlobal').value,
                espaco_id: document.getElementById('selectEspacoGlobal').value,
                status_id: document.getElementById('selectStatusGlobal').value,
                data_hora_inicio: document.getElementById('dataInicioGlobal').value,
                data_hora_fim: document.getElementById('dataFimGlobal').value,
                numero_pessoas: document.getElementById('numeroPessoasGlobal')?.value || 1,
                observacoes: document.getElementById('observacoesGlobal').value
            };

            if (!payload.paciente_id || !payload.espaco_id || !payload.status_id || !payload.data_hora_inicio || !payload.data_hora_fim) {
                alert('Preencha todos os campos obrigatórios!');
                return;
            }

            newBtnSalvar.disabled = true;
            newBtnSalvar.innerText = "Salvando...";

            try {
                const res = await fetch('/agendamentos', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.erro || 'Erro ao salvar');

                alert('Agendamento salvo com sucesso!');
                const modalEl = document.getElementById('modalNovoAgendamento');
                const modalInstance = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
                modalInstance.hide();
                document.getElementById('formAgendamentoGlobal').reset();
                
                // Se houver uma função de recarregamento específica da página, chame-a
                if (typeof renderizarCalendarioGlobal === 'function') {
                    renderizarCalendarioGlobal();
                } else if (typeof renderizarCalendario === 'function') {
                    renderizarCalendario();
                }
            } catch (err) {
                alert(err.message);
            } finally {
                newBtnSalvar.disabled = false;
                newBtnSalvar.innerText = "Salvar";
            }
        });
    }

    // Carregar dados quando o modal for aberto
    const modalAgendamento = document.getElementById('modalNovoAgendamento');
    if (modalAgendamento) {
        modalAgendamento.addEventListener('show.bs.modal', carregarDadosModalGlobal);
    }
}

// Inicializar ao carregar a página
document.addEventListener('DOMContentLoaded', inicializarModalGlobal);
