const supabase = require("../services/supabaseClient");

async function relatorioFinanceiro(req, res) {
    try {
        const { data_inicio, data_fim } = req.query;
        let query = supabase.from("financeiro").select("tipo, valor");

        if (data_inicio) query = query.gte("data_movimento", data_inicio);
        if (data_fim) query = query.lte("data_movimento", data_fim);

        const { data, error } = await query;
        if (error) throw error;

        const totalReceita = data.filter(item => item.tipo === "receita").reduce((sum, item) => sum + Number(item.valor || 0), 0);
        const totalDespesa = data.filter(item => item.tipo === "despesa").reduce((sum, item) => sum + Number(item.valor || 0), 0);

        res.json({ totalReceita, totalDespesa, lucro: totalReceita - totalDespesa });
    } catch (error) {
        console.error("Erro ao gerar relatório financeiro:", error);
        res.status(500).json({ erro: "Erro ao gerar relatório financeiro." });
    }
}

async function relatorioAtendimentos(req, res) {
    try {
        const { data_inicio, data_fim } = req.query;
        let query = supabase.from("agendamentos").select(`*, cliente:clientes(nome), status:status_agendamento(nome), terapeuta:usuarios(nome)`);

        if (data_inicio) query = query.gte("data_hora_inicio", data_inicio);
        if (data_fim) query = query.lte("data_hora_inicio", data_fim);

        const { data, error } = await query.order("data_hora_inicio", { ascending: true });
        if (error) throw error;

        const totalAtendimentos = data.length;
        const porStatus = data.reduce((acc, item) => {
            const status = item.status?.nome || "Sem status";
            acc[status] = (acc[status] || 0) + 1;
            return acc;
        }, {});

        res.json({ totalAtendimentos, porStatus, atendimentos: data });
    } catch (error) {
        console.error("Erro ao gerar relatório de atendimentos:", error);
        res.status(500).json({ erro: "Erro ao gerar relatório de atendimentos." });
    }
}

async function relatorioPacientesSemProntuario(req, res) {
    try {
        const { data, error } = await supabase
            .from("pacientes")
            .select(`*, prontuarios(id)`)
            .is("prontuarios", null);

        if (error) throw error;

        res.json(data);
    } catch (error) {
        console.error("Erro ao gerar relatório de pacientes sem prontuário:", error);
        res.status(500).json({ erro: "Erro ao gerar relatório de pacientes sem prontuário." });
    }
}

async function exportarRelatorioFinanceiroCSV(req, res) {
    try {
        const { data, error } = await supabase
            .from("financeiro")
            .select("id, tipo, valor, descricao, data_movimento, cliente_id, agendamento_id")
            .order("data_movimento", { ascending: true });

        if (error) throw error;

        const headers = ["id", "tipo", "valor", "descricao", "data_movimento", "cliente_id", "agendamento_id"];
        const rows = data.map(item => {
            const descricao = item.descricao ? item.descricao.replace(/"/g, '""') : "";
            return [
                item.id,
                item.tipo,
                item.valor,
                `"${descricao}"`,
                item.data_movimento,
                item.cliente_id || "",
                item.agendamento_id || ""
            ].join(",");
        });

        const csv = [headers.join(","), ...rows].join("\n");
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", "attachment; filename=relatorio_financeiro.csv");
        res.send(csv);
    } catch (error) {
        console.error("Erro ao exportar relatório financeiro:", error);
        res.status(500).json({ erro: "Erro ao exportar relatório financeiro." });
    }
}

module.exports = {
    relatorioFinanceiro,
    relatorioAtendimentos,
    relatorioPacientesSemProntuario,
    exportarRelatorioFinanceiroCSV
};
