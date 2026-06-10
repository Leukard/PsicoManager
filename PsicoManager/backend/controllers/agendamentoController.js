const { criarEventoGoogle } = require("../services/googleCalendarService");
const { registrarLog } = require('../services/logsService');
const supabase = require('../services/supabaseClient'); // ← importa o cliente centralizado

// ─────────────────────────────────────────
// CRIAR AGENDAMENTO
// ─────────────────────────────────────────
async function criarAgendamento(req, res) {
    try {
        const { paciente_id, cliente_id, espaco_id, data_hora_inicio, data_hora_fim, observacoes, status_id, numero_pessoas } = req.body;
        const usuario_id = req.session.usuario.id;
        const nPessoas = parseInt(numero_pessoas) || 1;

        // Se status_id não for fornecido, usar "Confirmado" como padrão
        let statusId = status_id;
        if (!statusId) {
            const { data: statusData, error: statusError } = await supabase
                .from("status_agendamento")
                .select("id")
                .eq("nome", "Confirmado")
                .single();

            if (statusError || !statusData) {
                throw new Error("Status 'Confirmado' não encontrado no banco de dados.");
            }
            statusId = statusData.id;
        }

        // Validar conflito com bloqueios do próprio usuário
        const { data: bloqueios } = await supabase
            .from("horarios_bloqueados")
            .select("*")
            .eq("usuario_id", usuario_id)
            .lt("data_inicio", data_hora_fim)
            .gt("data_fim", data_hora_inicio);

        if (bloqueios && bloqueios.length > 0) {
            return res.status(400).json({ erro: "Este horário está bloqueado na sua agenda." });
        }

        // 1. Buscar a capacidade do espaço
        const { data: espacoInfo } = await supabase
            .from("espacos")
            .select("capacidade")
            .eq("id", espaco_id)
            .single();

        const capacidadeMaxima = espacoInfo?.capacidade || 1;

        // 2. Verifique a ocupação atual no horário (considerando agendamentos que não estão cancelados)
        const { data: ocupacao } = await supabase
            .from("agendamentos")
            .select(`
                numero_pessoas,
                status_agendamento ( nome )
            `)
            .eq("espaco_id", espaco_id)
            .lt("data_hora_inicio", data_hora_fim)
            .gt("data_fim", data_hora_inicio);

        const totalOcupado = (ocupacao || [])
            .filter(ag => ag.status_agendamento?.nome !== "Cancelado")
            .reduce((sum, ag) => sum + (ag.numero_pessoas || 1), 0);

        if (totalOcupado + nPessoas > capacidadeMaxima) {
            return res.status(400).json({ erro: `Capacidade excedida para este espaço. Vagas restantes: ${capacidadeMaxima - totalOcupado}` });
        }

        // Inserir agendamento com paciente_id, cliente_id (terapeuta) e numero_pessoas
        const { data: novoAgendamento, error: erroInsert } = await supabase
            .from("agendamentos")
            .insert([{
                paciente_id,
                cliente_id,
                usuario_id,
                espaco_id,
                status_id: statusId,
                data_hora_inicio,
                data_hora_fim,
                observacoes,
                numero_pessoas: nPessoas
            }])
            .select(`
                *,
                pacientes ( nome ),
                clientes ( nome ),
                espacos ( nome )
            `)
            .single();

        if (erroInsert) throw erroInsert;

        await registrarLog(
            req.session.usuario.id,
            'CRIAR_AGENDAMENTO',
            { agendamento_id: novoAgendamento.id, paciente_id }
        );

        res.json({ mensagem: "Agendamento criado com sucesso!", agendamento: novoAgendamento });

    } catch (error) {
        console.error("Erro ao criar agendamento:", error);
        res.status(500).json({ erro: error.message || "Erro interno ao processar agendamento." });
    }
}

// ─────────────────────────────────────────
// LISTAR AGENDAMENTOS
// ─────────────────────────────────────────
async function listarAgendamentos(req, res) {
    try {
        const { data, error } = await supabase
            .from("agendamentos")
            .select(`
                *,
                pacientes ( nome ),
                clientes ( nome ),
                espacos ( nome ),
                status_agendamento ( nome )
            `)
            .eq('usuario_id', req.session.usuario.id)
            .order('data_hora_inicio', { ascending: true });

        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error("Erro ao listar agendamentos:", error);
        res.status(500).json({ erro: "Erro ao buscar agendamentos." });
    }
}

// ─────────────────────────────────────────
// LISTAR CLIENTES
// ─────────────────────────────────────────
async function listarClientes(req, res) {
    try {
        const { data, error } = await supabase.from("clientes").select("*").order('nome');
        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(500).json({ erro: "Erro ao buscar clientes." });
    }
}

// ─────────────────────────────────────────
// LISTAR ESPAÇOS
// ─────────────────────────────────────────
async function listarEspacos(req, res) {
    try {
        const { data, error } = await supabase.from("espacos").select("*").order('nome');
        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(500).json({ erro: "Erro ao buscar espaços." });
    }
}

// ─────────────────────────────────────────
// LISTAR STATUS
// ─────────────────────────────────────────
async function listarStatus(req, res) {
    try {
        const { data, error } = await supabase.from("status_agendamento").select("*").order('nome');
        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(500).json({ erro: "Erro ao buscar status." });
    }
}

// ─────────────────────────────────────────
// SYNC GOOGLE CALENDAR (Bloqueios)
// Versão única e mais completa, com refresh de token
// ─────────────────────────────────────────
async function syncGoogleCalendar(req, res) {
    try {
        if (!req.session || !req.session.usuario || !req.session.tokens) {
            return res.status(401).json({ erro: "Usuário ou tokens não encontrados na sessão." });
        }

        const usuario_id = req.session.usuario.id;

        // Refresh do token se estiver próximo de expirar
        const oauth2Client = require("../config/google");
        oauth2Client.setCredentials(req.session.tokens);
        if (req.session.tokens.expiry_date && req.session.tokens.expiry_date < Date.now() + 60000) {
            try {
                const { credentials } = await oauth2Client.refreshAccessToken();
                req.session.tokens = credentials;
            } catch (refreshError) {
                console.error("Erro ao refresh token:", refreshError);
                // Continua com o token antigo
            }
        }

        const { data: bloqueios, error } = await supabase
            .from("horarios_bloqueados")
            .select("*")
            .eq("usuario_id", usuario_id)
            .order("data_inicio", { ascending: true });

        if (error) throw error;

        if (!bloqueios || bloqueios.length === 0) {
            return res.json({ mensagem: "Nenhum bloqueio para sincronizar.", sincronizados: 0 });
        }

        let sincronizados = 0;
        const falhas = [];

        for (const bloqueio of bloqueios) {
            try {
                await criarEventoGoogle(
                    req.session.tokens,
                    `Bloqueio: ${bloqueio.descricao}`,
                    `Horário bloqueado via PsicoManager`,
                    bloqueio.data_inicio,
                    bloqueio.data_fim
                );
                sincronizados += 1;
            } catch (googleError) {
                falhas.push({ id: bloqueio.id, erro: googleError.message });
            }
        }

        if (falhas.length > 0) {
            console.warn("Alguns bloqueios não foram sincronizados:", falhas);
            return res.status(200).json({
                mensagem: `Sincronização parcial: ${sincronizados} sincronizados, ${falhas.length} falhas.`,
                sincronizados,
                falhas
            });
        }

        res.json({ mensagem: "Sincronização de bloqueios concluída.", sincronizados });
    } catch (error) {
        console.error("Erro ao sincronizar bloqueios:", error);
        res.status(500).json({ erro: error.message || "Erro ao sincronizar com o Google Calendar." });
    }
}

// ─────────────────────────────────────────
// SYNC GOOGLE CALENDAR (Agendamentos)
// ─────────────────────────────────────────
async function syncGoogleCalendarAgendamentos(req, res) {
    try {
        if (!req.session || !req.session.usuario || !req.session.tokens) {
            return res.status(401).json({ erro: "Usuário ou tokens não encontrados na sessão." });
        }

        const usuario_id = req.session.usuario.id;

        // Refresh do token se estiver próximo de expirar
        const oauth2Client = require("../config/google");
        oauth2Client.setCredentials(req.session.tokens);
        if (req.session.tokens.expiry_date && req.session.tokens.expiry_date < Date.now() + 60000) {
            try {
                const { credentials } = await oauth2Client.refreshAccessToken();
                req.session.tokens = credentials;
            } catch (refreshError) {
                console.error("Erro ao refresh token:", refreshError);
                // Continua com o token antigo
            }
        }

        let agendamentos;
        try {
            const { data, error } = await supabase
                .from("agendamentos")
                .select(`
                    *,
                    pacientes ( nome ),
                    status_agendamento ( nome )
                `)
                .eq("usuario_id", usuario_id)
                .order("data_hora_inicio", { ascending: true });

            if (error) throw error;
            agendamentos = data;
        } catch (selectError) {
            console.error("Erro na consulta de agendamentos:", selectError);
            return res.status(200).json({ mensagem: "Erro ao buscar agendamentos para sincronização.", erro: selectError.message });
        }

        if (!agendamentos || agendamentos.length === 0) {
            return res.json({ mensagem: "Nenhum agendamento para sincronizar.", sincronizados: 0 });
        }

        let sincronizados = 0;
        const falhas = [];

        // Buscar eventos existentes no Google para evitar duplicatas
        let eventosGoogle = [];
        try {
            const { listarEventosGoogle } = require("../services/googleCalendarService");
            eventosGoogle = await listarEventosGoogle(req.session.tokens);
        } catch (e) {
            console.error("Erro ao listar eventos para evitar duplicatas:", e);
        }

        for (const agendamento of agendamentos) {
            try {
                const titulo = `Agendamento: ${agendamento.pacientes?.nome || 'Paciente'} - ${agendamento.status_agendamento?.nome || 'Confirmado'}`;
                const descricao = `Obs: ${agendamento.observacoes || ''}`;

                // Verificar se já existe um evento com mesmo título e horário
                const jaExiste = eventosGoogle.find(e =>
                    e.summary === titulo &&
                    new Date(e.start.dateTime || e.start.date).toISOString() === new Date(agendamento.data_hora_inicio).toISOString()
                );

                if (!jaExiste) {
                    await criarEventoGoogle(
                        req.session.tokens,
                        titulo,
                        descricao,
                        agendamento.data_hora_inicio,
                        agendamento.data_hora_fim
                    );
                    sincronizados += 1;
                }
            } catch (googleError) {
                falhas.push({ id: agendamento.id, erro: googleError.message });
            }
        }

        if (falhas.length > 0) {
            console.warn("Alguns agendamentos não foram sincronizados:", falhas);
            return res.status(200).json({
                mensagem: `Sincronização parcial: ${sincronizados} sincronizados, ${falhas.length} falhas.`,
                sincronizados,
                falhas
            });
        }

        res.json({ mensagem: "Sincronização de agendamentos concluída.", sincronizados });
    } catch (error) {
        console.error("Erro geral na sincronização de agendamentos:", error);
        res.status(500).json({ erro: error.message || "Erro interno na sincronização." });
    }
}

module.exports = {
    criarAgendamento,
    listarAgendamentos,
    listarClientes,
    listarEspacos,
    listarStatus,
    syncGoogleCalendar,
    syncGoogleCalendarAgendamentos
};
