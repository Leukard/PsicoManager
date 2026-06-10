const supabase = require("../services/supabaseClient");
const fs = require("fs");
const path = require("path");

// Criar arquivo de logs
const logFile = path.join(__dirname, "../logs", "lembrete-errors.log");
const logDir = path.dirname(logFile);
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

// Função para logar erros em arquivo
function logError(mensagem, erro = null) {
    const timestamp = new Date().toISOString();
    const line = `[${timestamp}] ${mensagem}${erro ? "\n" + JSON.stringify(erro, null, 2) : ""}\n`;
    fs.appendFileSync(logFile, line, "utf8");
    console.log(mensagem);
    if (erro) console.error(erro);
}

// ============================================================
// [HUGO] SENDGRID - Serviço de envio de e-mail real
// Para ativar:
//   1. No terminal da pasta do projeto: npm install @sendgrid/mail
//   2. Crie uma conta gratuita em sendgrid.com
//   3. Gere uma API Key em Settings > API Keys
//   4. No arquivo .env adicione as duas linhas:
//        SENDGRID_API_KEY=sua_chave_aqui
//        EMAIL_REMETENTE=seuemail@dominio.com
// ============================================================
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

async function enviarEmail(destinatario, assunto, corpo) {
    const msg = {
        to: destinatario,
        from: process.env.EMAIL_REMETENTE,
        subject: assunto,
        text: corpo,
        html: `<pre style="font-family: Arial, sans-serif; font-size: 14px;">${corpo}</pre>`,
    };
    await sgMail.send(msg);
}

// ============================================================
// [HUGO] WEB PUSH - Notificações push no navegador
// Para ativar:
//   1. No terminal da pasta do projeto: npm install web-push
//   2. Rode uma vez para gerar as chaves:
//        npx web-push generate-vapid-keys
//   3. No arquivo .env adicione as três linhas geradas:
//        VAPID_PUBLIC_KEY=chave_publica_gerada
//        VAPID_PRIVATE_KEY=chave_privada_gerada
//        VAPID_EMAIL=mailto:seuemail@dominio.com
// ============================================================
const webpush = require('web-push');
webpush.setVapidDetails(
    process.env.VAPID_EMAIL,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
);

async function enviarPushNotification(subscription, titulo, corpo) {
    const payload = JSON.stringify({ title: titulo, body: corpo });
    await webpush.sendNotification(subscription, payload);
}


/* ==========================================
   CRUD DE LEMBRETES
   ========================================== */

async function criarLembrete(req, res) {
    try {
        const { titulo, mensagem, tipo, dias_antecedencia, hora_envio, ativo } = req.body;

        if (!titulo || !mensagem || !tipo) {
            return res.status(400).json({ erro: "Título, mensagem e tipo são obrigatórios." });
        }

        const { data, error } = await supabase
            .from("lembretes")
            .insert([{
                titulo,
                mensagem,
                tipo,
                dias_antecedencia: dias_antecedencia || 1,
                hora_envio: hora_envio || "09:00",
                ativo: ativo !== undefined ? ativo : true,
                criado_por: req.session.usuario.id
            }])
            .select()
            .single();

        if (error) throw error;
        res.status(201).json(data);
    } catch (error) {
        console.error("Erro ao criar lembrete:", error);
        res.status(500).json({ erro: "Erro ao criar lembrete." });
    }
}

async function listarLembretes(req, res) {
    try {
        const { tipo, ativo } = req.query;
        let query = supabase.from("lembretes").select(`*, autor:usuarios(nome)`);

        if (tipo) query = query.eq("tipo", tipo);
        if (ativo !== undefined) query = query.eq("ativo", ativo);

        const { data, error } = await query.order("created_at", { ascending: false });
        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error("Erro ao listar lembretes:", error);
        res.status(500).json({ erro: "Erro ao buscar lembretes." });
    }
}

async function atualizarLembrete(req, res) {
    const logPrefix = `[${new Date().toISOString()}] PUT /api/lembretes`;
    console.log(`🔵 ${logPrefix} - Requisição recebida`);
    
    try {
        const { id } = req.params;
        let { titulo, tipo, dias_antecedencia, hora_envio, ativo, mensagem } = req.body;

        logError(`${logPrefix} - ID: ${id}, Body recebido:`, { titulo, tipo, dias_antecedencia, hora_envio, ativo, mensagem });

        if (!id) {
            return res.status(400).json({ erro: "ID do lembrete é obrigatório." });
        }

        if (!titulo || !tipo || !mensagem) {
            return res.status(400).json({ erro: "Título, tipo e mensagem são obrigatórios." });
        }

        const dados = {
            titulo: String(titulo).trim(),
            tipo: String(tipo).trim(),
            mensagem: String(mensagem).trim(),
            hora_envio: String(hora_envio || "09:00"),
            ativo: Boolean(ativo)
        };

        if (dias_antecedencia !== undefined && dias_antecedencia !== null && dias_antecedencia !== "") {
            dados.dias_antecedencia = Math.max(0, parseInt(dias_antecedencia, 10));
        }

        logError(`${logPrefix} - Dados processados:`, dados);

        // TENTATIVA 1: Update simples (sem select)
        const { error: updateError } = await supabase
            .from("lembretes")
            .update(dados)
            .eq("id", id);

        if (updateError) {
            logError(`${logPrefix} - ❌ ERRO no UPDATE:`, updateError);
            throw updateError;
        }

        logError(`${logPrefix} - ✅ Update bem-sucedido`);

        // TENTATIVA 2: Buscar dados atualizados
        const { data, error: selectError } = await supabase
            .from("lembretes")
            .select("*")
            .eq("id", id)
            .single();

        if (selectError) {
            logError(`${logPrefix} - ⚠️ ERRO ao buscar (mas update OK):`, selectError);
            return res.json({ id, mensagem: "Lembrete atualizado com sucesso" });
        }

        logError(`${logPrefix} - ✅ Retornando dados:`, { id: data.id });
        res.json(data);
        
    } catch (error) {
        logError(`${logPrefix} - ❌ ERRO GERAL:`, error);
        
        res.status(500).json({ 
            erro: "Erro ao atualizar lembrete.",
            detalhes: error.message || String(error)
        });
    }
}

async function deletarLembrete(req, res) {
    try {
        const { id } = req.params;
        const { error } = await supabase
            .from("lembretes")
            .delete()
            .eq("id", id);

        if (error) throw error;
        res.json({ mensagem: "Lembrete excluído com sucesso." });
    } catch (error) {
        console.error("Erro ao excluir lembrete:", error);
        res.status(500).json({ erro: "Erro ao excluir lembrete." });
    }
}

/* ==========================================
   [HUGO] FUNÇÃO DE PROCESSAMENTO INTERNO
   Separada do endpoint HTTP para poder ser
   chamada também pelo cron job automaticamente
   ========================================== */
async function processar() {
    const { data: lembretes, error: lembretesError } = await supabase
        .from("lembretes")
        .select("*")
        .eq("ativo", true);

    if (lembretesError) throw lembretesError;

    const resultados = [];

    for (const lembrete of lembretes) {
        try {
            const dataAlvo = new Date();
            dataAlvo.setDate(dataAlvo.getDate() + lembrete.dias_antecedencia);

            const dataInicio = new Date(dataAlvo);
            dataInicio.setHours(0, 0, 0, 0);

            const dataFim = new Date(dataAlvo);
            dataFim.setHours(23, 59, 59, 999);

            const { data: agendamentos, error: agendamentosError } = await supabase
                .from("agendamentos")
                .select(`
                    *,
                    clientes!inner(email, nome),
                    espacos(nome)
                `)
                .gte("data_hora_inicio", dataInicio.toISOString())
                .lte("data_hora_inicio", dataFim.toISOString());

            if (agendamentosError) continue;

            for (const agendamento of agendamentos) {
                if (agendamento.clientes?.email) {
                    let mensagemPersonalizada = lembrete.mensagem
                        .replace('{{cliente}}', agendamento.clientes.nome)
                        .replace('{{data}}', new Date(agendamento.data_hora_inicio).toLocaleDateString('pt-BR'))
                        .replace('{{hora}}', new Date(agendamento.data_hora_inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }))
                        .replace('{{espaco}}', agendamento.espacos?.nome || 'Clínica');

                    // [HUGO] Envia o e-mail real via SendGrid
                    await enviarEmail(
                        agendamento.clientes.email,
                        lembrete.titulo,
                        mensagemPersonalizada
                    );

                    // [HUGO] Busca a subscription push do cliente no banco e envia notificação
                    const { data: sub } = await supabase
                        .from('push_subscriptions')
                        .select('subscription')
                        .eq('cliente_id', agendamento.clientes.id)
                        .single();

                    if (sub) {
                        await enviarPushNotification(
                            JSON.parse(sub.subscription),
                            lembrete.titulo,
                            mensagemPersonalizada
                        );
                    }

                    resultados.push({
                        lembrete: lembrete.titulo,
                        cliente: agendamento.clientes.nome,
                        email: agendamento.clientes.email,
                        status: 'enviado'
                    });
                }
            }
        } catch (erroLembrete) {
            console.error(`Erro ao processar lembrete ${lembrete.titulo}:`, erroLembrete);
        }
    }

    return resultados;
}

/* ==========================================
   ENDPOINT HTTP - Envio manual via dashboard
   ========================================== */
async function enviarLembretesAutomaticos(req, res) {
    try {
        // [HUGO] Chama a função processar() que é a mesma usada
        // pelo cron job, evitando duplicação de código
        const resultados = await processar();

        res.json({
            mensagem: "Lembretes processados com sucesso",
            enviados: resultados.length,
            detalhes: resultados
        });
    } catch (error) {
        console.error("Erro ao enviar lembretes automáticos:", error);
        res.status(500).json({ erro: "Erro ao processar lembretes automáticos." });
    }
}

module.exports = {
    criarLembrete,
    listarLembretes,
    atualizarLembrete,
    deletarLembrete,
    enviarLembretesAutomaticos,
    processar // [HUGO] exportado para uso no cron job do server.js
};