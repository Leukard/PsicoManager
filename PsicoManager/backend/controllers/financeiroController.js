const supabase = require("../services/supabaseClient");

async function criarTransacao(req, res) {
    try {
        const { tipo, descricao, valor, data_movimento, paciente_id, agendamento_id, convenio_id } = req.body;

        if (!tipo || !descricao || !valor || !data_movimento) {
            return res.status(400).json({ erro: "Tipo, descrição, valor e data são obrigatórios." });
        }

        const { data, error } = await supabase
            .from("financeiro")
            .insert([{
                tipo,
                descricao,
                valor,
                data_movimento,
                paciente_id,
                agendamento_id,
                convenio_id,
                criado_por: req.session.usuario.id
            }])
            .select()
            .single();

        if (error) throw error;
        res.status(201).json(data);
    } catch (error) {
        console.error("Erro ao criar transação financeira:", error);
        res.status(500).json({ erro: "Erro ao criar transação financeira." });
    }
}

async function listarTransacoes(req, res) {
    try {
        const { tipo, paciente_id, data_inicio, data_fim } = req.query;
        let query = supabase.from("financeiro").select(`*, paciente:pacientes(nome), convenio:convenios(nome)`);

        if (tipo) query = query.eq("tipo", tipo);
        if (paciente_id) query = query.eq("paciente_id", paciente_id);
        if (data_inicio) query = query.gte("data_movimento", data_inicio);
        if (data_fim) query = query.lte("data_movimento", data_fim);

        const { data, error } = await query.order("data_movimento", { ascending: false });
        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error("Erro ao listar transações financeiras:", error);
        res.status(500).json({ erro: "Erro ao buscar transações financeiras." });
    }
}

async function resumoFinanceiro(req, res) {
    try {
        const { data_inicio, data_fim } = req.query;

        let queryReceita = supabase.from("financeiro").select("valor").eq("tipo", "receita");
        let queryDespesa = supabase.from("financeiro").select("valor").eq("tipo", "despesa");

        if (data_inicio) {
            queryReceita = queryReceita.gte("data_movimento", data_inicio);
            queryDespesa = queryDespesa.gte("data_movimento", data_inicio);
        }
        if (data_fim) {
            queryReceita = queryReceita.lte("data_movimento", data_fim);
            queryDespesa = queryDespesa.lte("data_movimento", data_fim);
        }

        const [{ data: receitas, error: receitaError }, { data: despesas, error: despesaError }] = await Promise.all([
            queryReceita.order("data_movimento", { ascending: true }),
            queryDespesa.order("data_movimento", { ascending: true })
        ]);

        if (receitaError) throw receitaError;
        if (despesaError) throw despesaError;

        const totalReceitas = receitas.reduce((sum, row) => sum + Number(row.valor || 0), 0);
        const totalDespesas = despesas.reduce((sum, row) => sum + Number(row.valor || 0), 0);
        const saldo = totalReceitas - totalDespesas;

        res.json({ totalReceitas, totalDespesas, saldo });
    } catch (error) {
        console.error("Erro ao calcular resumo financeiro:", error);
        res.status(500).json({ erro: "Erro ao gerar resumo financeiro." });
    }
}

module.exports = {
    criarTransacao,
    listarTransacoes,
    resumoFinanceiro
};
