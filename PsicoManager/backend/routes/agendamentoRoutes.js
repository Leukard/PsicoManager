const express = require("express");
const router = express.Router();

const { createClient } = require("@supabase/supabase-js");
const { ensureAuthenticated, authorizeRoles } = require("../middlewares/authMiddleware");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY/SUPABASE_KEY must be set in .env");
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn("⚠️ Using SUPABASE_KEY instead of SUPABASE_SERVICE_ROLE_KEY. Row-level security may block inserts.");
}

const supabase = createClient(
    supabaseUrl,
    supabaseKey
);

const {
criarAgendamento,
listarAgendamentos,
listarClientes,
listarEspacos,
listarStatus
} = require("../controllers/agendamentoController");

const { deletarEventoGoogle, listarEventosGoogle, atualizarEventoGoogle } = require("../services/googleCalendarService");

/* ==========================================
   AGENDAMENTOS
========================================== */
router.post("/agendamentos", ensureAuthenticated, criarAgendamento);
router.get("/agendamentos", ensureAuthenticated, listarAgendamentos);

router.put("/agendamentos/:id", ensureAuthenticated, async (req, res) => {
    try {
        const { id } = req.params;
        const { paciente_id, cliente_id, espaco_id, status_id, data_hora_inicio, data_hora_fim, observacoes, numero_pessoas } = req.body;
        const usuario_id = req.session.usuario.id;
        const nPessoas = parseInt(numero_pessoas) || 1;

        // 1. Buscar agendamento antigo para comparação e busca no Google
        const { data: agendamentoAntigo } = await supabase
            .from("agendamentos")
            .select(`
                *,
                pacientes ( nome ),
                clientes ( nome )
            `)
            .eq("id", id)
            .single();

        // 2. Validar conflito com bloqueios do próprio usuário
        const { data: bloqueios } = await supabase
            .from("horarios_bloqueados")
            .select("*")
            .eq("usuario_id", usuario_id)
            .lt("data_inicio", data_hora_fim)
            .gt("data_fim", data_hora_inicio);

        if (bloqueios && bloqueios.length > 0) {
            return res.status(400).json({ erro: "Este horário está bloqueado na sua agenda." });
        }

        // 2.1 Validar conflito de espaço com outros agendamentos e capacidade
        const { data: espacoInfo } = await supabase
            .from("espacos")
            .select("capacidade")
            .eq("id", espaco_id)
            .single();

        const capacidadeMaxima = espacoInfo?.capacidade || 1;

        const { data: ocupacao } = await supabase
            .from("agendamentos")
            .select(`
                numero_pessoas,
                status_agendamento ( nome )
            `)
            .neq("id", id)
            .eq("espaco_id", espaco_id)
            .lt("data_hora_inicio", data_hora_fim)
            .gt("data_fim", data_hora_inicio);

        const totalOcupado = (ocupacao || [])
            .filter(ag => ag.status_agendamento?.nome !== "Cancelado")
            .reduce((sum, ag) => sum + (ag.numero_pessoas || 1), 0);

        if (totalOcupado + nPessoas > capacidadeMaxima) {
            return res.status(400).json({ erro: `Capacidade excedida para este espaço. Vagas restantes: ${capacidadeMaxima - totalOcupado}` });
        }

        // 3. Atualizar no Supabase
        const { data, error } = await supabase
            .from("agendamentos")
            .update({
                paciente_id,
                cliente_id,
                espaco_id,
                status_id,
                data_hora_inicio,
                data_hora_fim,
                observacoes,
                numero_pessoas: nPessoas
            })
            .eq("id", id)
            .select(`
                *,
                pacientes ( nome ),
                clientes ( nome ),
                status_agendamento ( nome )
            `)
            .single();

        if (error) throw error;

        // 4. Verificar se o status mudou para "Concluído" para gerar documento
        if (data.status_agendamento?.nome === "Concluído") {
            try {
                // Verificar se já existe documento para este agendamento (opcional, mas bom evitar duplicatas)
                const { data: docExistente } = await supabase
                    .from("documentos")
                    .select("id")
                    .eq("paciente_id", data.paciente_id)
                    .eq("titulo", `Documento Automático - Atendimento ${new Date(data.data_hora_inicio).toLocaleDateString()}`)
                    .limit(1);

                if (!docExistente || docExistente.length === 0) {
                    await supabase.from("documentos").insert([{
                        paciente_id: data.paciente_id,
                        tipo: 'laudo', // Usando um tipo que já existe no templates
                        titulo: `Documento Automático - Atendimento ${new Date(data.data_hora_inicio).toLocaleDateString()}`,
                        conteudo: `Relatório de atendimento realizado em ${new Date(data.data_hora_inicio).toLocaleString()}.`,
                        criado_por: usuario_id
                    }]);
                }
            } catch (docErr) {
                console.error("Erro ao gerar documento automático:", docErr);
            }
        }

        // 4. Sincronizar com Google Calendar (Atualizar evento existente)
        if (req.session.tokens && agendamentoAntigo) {
            try {
                const eventos = await listarEventosGoogle(req.session.tokens);
                // Usar o nome do paciente no título do Google Calendar para ser mais informativo
                const tituloBusca = `Agendamento: ${agendamentoAntigo.pacientes?.nome}`;
                const dataInicioAntiga = new Date(agendamentoAntigo.data_hora_inicio).toISOString();

                const eventoGoogle = eventos.find(e =>
                    e.summary && e.summary.includes(tituloBusca) &&
                    new Date(e.start.dateTime || e.start.date).toISOString() === dataInicioAntiga
                );

                if (eventoGoogle) {
                    const novoTitulo = `Agendamento: ${data.pacientes?.nome} - ${data.status_agendamento?.nome || 'Confirmado'}`;
                    const novaDescricao = `Obs: ${data.observacoes || ''}\nTerapeuta: ${data.clientes?.nome || 'N/A'}`;
                    await atualizarEventoGoogle(
                        req.session.tokens,
                        eventoGoogle.id,
                        novoTitulo,
                        novaDescricao,
                        data.data_hora_inicio,
                        data.data_hora_fim
                    );
                }
            } catch (googleError) {
                console.warn("Aviso: Agendamento atualizado, mas erro ao sincronizar Google Calendar:", googleError.message);
            }
        }

        res.json(data);
    } catch (error) {
        console.error("Erro ao atualizar agendamento:", error);
        res.status(500).json({ erro: "Erro ao atualizar agendamento." });
    }
});

router.delete("/agendamentos/:id", ensureAuthenticated, async (req, res) => {
    try {
        const { id } = req.params;

        // 1. Buscar dados do agendamento antes de deletar
        const { data: agendamento, error: fetchError } = await supabase
            .from("agendamentos")
            .select(`
                *,
                clientes ( nome )
            `)
            .eq("id", id)
            .single();

        if (fetchError || !agendamento) {
            return res.status(404).json({ erro: "Agendamento não encontrado." });
        }

        // 2. Deletar do Supabase
        const { error: deleteError } = await supabase
            .from("agendamentos")
            .delete()
            .eq("id", id);

        if (deleteError) throw deleteError;

        // 3. Tentar deletar do Google Calendar se houver tokens
        if (req.session.tokens) {
            try {
                const eventos = await listarEventosGoogle(req.session.tokens);
                const tituloBusca = `Agendamento: ${agendamento.clientes?.nome}`;
                const eventoGoogle = eventos.find(e =>
                    e.summary && e.summary.includes(tituloBusca) &&
                    new Date(e.start.dateTime || e.start.date).toISOString() === new Date(agendamento.data_hora_inicio).toISOString()
                );

                if (eventoGoogle) {
                    await deletarEventoGoogle(req.session.tokens, eventoGoogle.id);
                }
            } catch (googleError) {
                console.warn("Aviso: Agendamento excluído, mas erro ao remover do Google Calendar:", googleError.message);
            }
        }

        res.json({ mensagem: "Agendamento excluído com sucesso." });
    } catch (error) {
        console.error("Erro ao excluir agendamento:", error);
        res.status(500).json({ erro: "Erro ao excluir agendamento." });
    }
});

/* ==========================================
   CLIENTES
========================================== */
router.get("/clientes", ensureAuthenticated, listarClientes);

router.post("/clientes", ensureAuthenticated, async (req, res) => {
    try {
        const { nome, email } = req.body;

        if (!nome) {
            return res.status(400).json({ erro: "Nome do cliente é obrigatório." });
        }

        const { data, error } = await supabase
            .from("clientes")
            .insert([{
                nome,
                email
            }])
            .select()
            .single();

        if (error) {
            console.error("Erro ao inserir cliente no Supabase:", error);
            return res.status(500).json({ erro: error.message });
        }

        res.json(data);
    } catch (err) {
        console.error("Erro interno ao criar cliente:", err);
        res.status(500).json({ erro: "Erro interno ao criar cliente." });
    }
});

router.put("/clientes/:id", ensureAuthenticated, async (req, res) => {
    try {
        const { id } = req.params;
        const { nome, email } = req.body;

        const { data, error } = await supabase
            .from("clientes")
            .update({ nome, email })
            .eq("id", id)
            .select()
            .single();

        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error("Erro ao atualizar cliente:", error);
        res.status(500).json({ erro: "Erro ao atualizar cliente." });
    }
});

// Apenas admin pode deletar clientes
router.delete("/clientes/:id", ensureAuthenticated, authorizeRoles('admin', 'administrador'), async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabase
            .from("clientes")
            .delete()
            .eq("id", id);

        if (error) throw error;
        res.json({ mensagem: "Cliente excluído com sucesso." });
    } catch (error) {
        console.error("Erro ao excluir cliente:", error);
        res.status(500).json({ erro: "Erro ao excluir cliente." });
    }
});

/* ==========================================
   ESPAÇOS
========================================== */
router.get("/espacos", ensureAuthenticated, listarEspacos);

// Apenas admin pode criar, editar e deletar espaços
router.post("/espacos", ensureAuthenticated, authorizeRoles('admin', 'administrador'), async (req, res) => {
    try {
        const { nome, descricao } = req.body;

        if (!nome) {
            return res.status(400).json({ erro: "Nome do espaço é obrigatório." });
        }

        const { data, error } = await supabase
            .from("espacos")
            .insert([{ nome, descricao }])
            .select()
            .single();

        if (error) {
            console.error("Erro ao inserir espaço no Supabase:", error);
            return res.status(500).json({ erro: error.message });
        }

        res.json(data);
    } catch (err) {
        console.error("Erro interno ao criar espaço:", err);
        res.status(500).json({ erro: "Erro interno ao criar espaço." });
    }
});

router.put("/espacos/:id", ensureAuthenticated, authorizeRoles('admin', 'administrador'), async (req, res) => {
    try {
        const { id } = req.params;
        const { nome, descricao, capacidade } = req.body;

        if (!nome) {
            return res.status(400).json({ erro: "Nome do espaço é obrigatório." });
        }

        const dados = {
            nome,
            descricao: descricao || null
        };

        if (capacidade !== undefined && capacidade !== null) {
            dados.capacidade = Math.max(1, parseInt(capacidade, 10));
        }

        const { data, error } = await supabase
            .from("espacos")
            .update(dados)
            .eq("id", id)
            .select();

        if (error) throw error;
        
        if (!data || data.length === 0) {
            return res.status(404).json({ erro: "Espaço não encontrado." });
        }

        res.json(data[0]);
    } catch (error) {
        console.error("Erro ao atualizar espaço:", error);
        res.status(500).json({ erro: "Erro ao atualizar espaço." });
    }
});

router.delete("/espacos/:id", ensureAuthenticated, authorizeRoles('admin', 'administrador'), async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabase
            .from("espacos")
            .delete()
            .eq("id", id);

        if (error) throw error;
        res.json({ mensagem: "Espaço excluído com sucesso." });
    } catch (error) {
        console.error("Erro ao excluir espaço:", error);
        res.status(500).json({ erro: "Erro ao excluir espaço." });
    }
});

/* ==========================================
   STATUS
========================================== */
router.get("/status", ensureAuthenticated, listarStatus);

/* ==========================================
   BLOQUEIOS
========================================== */
router.post("/bloqueios", ensureAuthenticated, async (req, res) => {
    try {
        const { data_inicio, data_fim, descricao } = req.body;
        const usuario_id = req.session.usuario.id;

        // Validar conflito com agendamentos existentes
        const { data: agendamentosExistentes } = await supabase
            .from("agendamentos")
            .select("id")
            .eq("usuario_id", usuario_id)
            .lt("data_hora_inicio", data_fim)
            .gt("data_hora_fim", data_inicio);

        if (agendamentosExistentes && agendamentosExistentes.length > 0) {
            return res.status(400).json({ erro: "Existem agendamentos neste horário. Remova-os ou altere-os antes de bloquear." });
        }

        const { data, error } = await supabase
            .from("horarios_bloqueados")
            .insert([{ usuario_id, data_inicio, data_fim, descricao }])
            .select()
            .single();

        if (error) {
            console.error("Erro Supabase ao criar bloqueio:", error);
            return res.status(500).json({ erro: error.message || "Erro ao criar bloqueio." });
        }

        res.json(data);
    } catch (err) {
        console.error("Erro interno ao criar bloqueio:", err);
        res.status(500).json({ erro: "Erro interno ao processar bloqueio." });
    }
});

router.put("/bloqueios/:id", ensureAuthenticated, async (req, res) => {
    try {
        const { id } = req.params;
        const { data_inicio, data_fim, descricao } = req.body;
        const usuario_id = req.session.usuario.id;

        // Validar conflito com agendamentos existentes
        const { data: agendamentosExistentes } = await supabase
            .from("agendamentos")
            .select("id")
            .eq("usuario_id", usuario_id)
            .lt("data_hora_inicio", data_fim)
            .gt("data_hora_fim", data_inicio);

        if (agendamentosExistentes && agendamentosExistentes.length > 0) {
            return res.status(400).json({ erro: "Existem agendamentos neste horário. Remova-os ou altere-os antes de bloquear." });
        }

        const { data, error } = await supabase
            .from("horarios_bloqueados")
            .update({ data_inicio, data_fim, descricao })
            .eq("id", id)
            .eq("usuario_id", usuario_id) // Garantir que só o dono possa editar
            .select()
            .single();

        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error("Erro ao atualizar bloqueio:", error);
        res.status(500).json({ erro: "Erro ao atualizar bloqueio." });
    }
});

router.delete("/bloqueios/:id", ensureAuthenticated, async (req, res) => {
    try {
        const { id } = req.params;
        const usuario_id = req.session.usuario.id;

        const { error } = await supabase
            .from("horarios_bloqueados")
            .delete()
            .eq("id", id)
            .eq("usuario_id", usuario_id);

        if (error) throw error;
        res.json({ mensagem: "Bloqueio excluído com sucesso." });
    } catch (error) {
        console.error("Erro ao excluir bloqueio:", error);
        res.status(500).json({ erro: "Erro ao excluir bloqueio." });
    }
});

router.get("/bloqueios", ensureAuthenticated, async (req, res) => {
    const usuario_id = req.session.usuario.id;

    const { data, error } = await supabase
        .from("horarios_bloqueados")
        .select("*")
        .eq("usuario_id", usuario_id)
        .order("data_inicio");

    if (error) {
        return res.status(500).json({ erro: error.message || "Erro ao buscar bloqueios." });
    }

    res.json(data);
});

/* ==========================================
   LEMBRETES
========================================== */
router.get("/lembretes-amanha", ensureAuthenticated, async (req, res) => {
    try {
        const usuario_id = req.session.usuario.id;

        const agora = new Date();
        const amanhaFim = new Date(agora);
        amanhaFim.setDate(agora.getDate() + 1);
        amanhaFim.setHours(23, 59, 59, 999);

        const { data, error } = await supabase
            .from("agendamentos")
            .select(`
                *,
                pacientes (nome),
                clientes (nome),
                espacos (nome)
            `)
            .eq("usuario_id", usuario_id)
            .gte("data_hora_inicio", agora.toISOString())
            .lte("data_hora_inicio", amanhaFim.toISOString())
            .order("data_hora_inicio");

        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error("Erro ao buscar lembretes:", error);
        res.status(500).json({ erro: "Erro ao buscar lembretes." });
    }
});

module.exports = router;