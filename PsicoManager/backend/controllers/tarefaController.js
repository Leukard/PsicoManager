const supabase = require("../services/supabaseClient");

async function criarTarefa(req, res) {
    try {
        const { titulo, descricao, paciente_id, responsavel_id, prioridade, data_vencimento, concluido } = req.body;
        const { data, error } = await supabase
            .from("tarefas")
            .insert([{
                titulo,
                descricao,
                paciente_id,
                responsavel_id: responsavel_id || req.session.usuario.id,
                prioridade: prioridade || "normal",
                data_vencimento,
                concluido: !!concluido,
                criado_por: req.session.usuario.id
            }])
            .select()
            .single();

        if (error) throw error;
        res.status(201).json(data);
    } catch (error) {
        console.error("Erro ao criar tarefa:", error);
        res.status(500).json({ erro: "Erro ao criar tarefa." });
    }
}

async function listarTarefas(req, res) {
    try {
        const { paciente_id, responsavel_id, concluido } = req.query;
        let query = supabase.from("tarefas").select(`*, paciente:pacientes(nome), responsavel:usuarios!tarefas_responsavel_id_fkey(nome, perfil)`);

        if (paciente_id) query = query.eq("paciente_id", paciente_id);
        if (responsavel_id) query = query.eq("responsavel_id", responsavel_id);
        if (concluido !== undefined) query = query.eq("concluido", concluido === "true");

        const { data, error } = await query.order("data_vencimento", { ascending: true });
        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error("Erro ao listar tarefas:", error);
        res.status(500).json({ erro: "Erro ao buscar tarefas." });
    }
}

async function atualizarTarefa(req, res) {
    try {
        const { id } = req.params;
        const dados = req.body;

        const { data, error } = await supabase
            .from("tarefas")
            .update(dados)
            .eq("id", id)
            .select()
            .single();

        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error("Erro ao atualizar tarefa:", error);
        res.status(500).json({ erro: "Erro ao atualizar tarefa." });
    }
}

async function deletarTarefa(req, res) {
    try {
        const { id } = req.params;
        const { error } = await supabase
            .from("tarefas")
            .delete()
            .eq("id", id);

        if (error) throw error;
        res.json({ mensagem: "Tarefa excluída com sucesso." });
    } catch (error) {
        console.error("Erro ao excluir tarefa:", error);
        res.status(500).json({ erro: "Erro ao excluir tarefa." });
    }
}

module.exports = {
    criarTarefa,
    listarTarefas,
    atualizarTarefa,
    deletarTarefa
};
