const supabase = require("../services/supabaseClient");

async function listarLogs(req, res) {
    try {
        const { data, error } = await supabase
            .from("logs_auditoria")
            .select(`*, usuario:usuarios(nome)`)
            .order("created_at", { ascending: false })
            .limit(100);

        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error("Erro ao listar logs de auditoria:", error);
        res.status(500).json({ erro: "Erro ao carregar logs de auditoria." });
    }
}

async function exportarLogsCSV(req, res) {
    try {
        const { data, error } = await supabase
            .from("logs_auditoria")
            .select(`id, usuario_id, acao, detalhes, created_at, usuario:usuarios(nome)`)
            .order("created_at", { ascending: false })
            .limit(1000);

        if (error) throw error;

        const cabecalho = ["id", "usuario", "acao", "detalhes", "data_criacao"];
        const linhas = data.map(item => {
            const detalhes = item.detalhes ? JSON.stringify(item.detalhes).replace(/"/g, '""') : "";
            return [
                item.id,
                item.usuario?.nome || item.usuario_id || "",
                item.acao,
                `"${detalhes}"`,
                item.created_at
            ].join(",");
        });

        const csv = [cabecalho.join(","), ...linhas].join("\n");

        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", "attachment; filename=logs_auditoria.csv");
        res.send(csv);
    } catch (error) {
        console.error("Erro ao exportar logs de auditoria:", error);
        res.status(500).json({ erro: "Erro ao exportar logs de auditoria." });
    }
}

async function deletarLog(req, res) {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({ erro: "ID do log é obrigatório." });
        }

        const { error } = await supabase
            .from("logs_auditoria")
            .delete()
            .eq("id", id);

        if (error) throw error;

        res.json({ mensagem: "Log excluído com sucesso." });
    } catch (error) {
        console.error("Erro ao deletar log de auditoria:", error);
        res.status(500).json({ erro: "Erro ao deletar log de auditoria." });
    }
}

module.exports = {
    listarLogs,
    exportarLogsCSV,
    deletarLog
};