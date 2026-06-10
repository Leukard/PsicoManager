const supabase = require("../services/supabaseClient");

async function criarPaciente(req, res) {
    try {
        const { nome, email, telefone, data_nascimento, genero, observacoes, plano_id, medico_id } = req.body;

        const { data, error } = await supabase
            .from("pacientes")
            .insert([{
                nome,
                email,
                telefone,
                data_nascimento,
                genero,
                observacoes,
                plano_id,
                medico_id
            }])
            .select()
            .single();

        if (error) throw error;
        res.status(201).json(data);
    } catch (error) {
        console.error("Erro ao criar paciente:", error);
        res.status(500).json({ erro: "Erro ao criar paciente." });
    }
}

async function listarPacientes(req, res) {
    try {
        const { plano_id } = req.query;
        let query = supabase
            .from("pacientes")
            .select("*, plano:planos(nome, descricao, total_sessoes, saldo_sessoes)")
            .order("nome", { ascending: true });

        if (plano_id) {
            query = query.eq("plano_id", plano_id);
        }

        const { data, error } = await query;

        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error("Erro ao listar pacientes:", error);
        res.status(500).json({ erro: "Erro ao buscar pacientes." });
    }
}

async function obterPaciente(req, res) {
    try {
        const { id } = req.params;
        const { data, error } = await supabase
            .from("pacientes")
            .select("*, plano:planos(nome, descricao, total_sessoes, saldo_sessoes), prontuarios(*)")
            .eq("id", id)
            .single();

        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error("Erro ao obter paciente:", error);
        res.status(500).json({ erro: "Erro ao buscar paciente." });
    }
}

async function atualizarPaciente(req, res) {
    try {
        const { id } = req.params;
        const { nome, email, telefone, data_nascimento, genero, observacoes, plano_id, medico_id, ativo } = req.body;

        const { data, error } = await supabase
            .from("pacientes")
            .update({
                nome,
                email,
                telefone,
                data_nascimento,
                genero,
                observacoes,
                plano_id,
                medico_id,
                ativo
            })
            .eq("id", id)
            .select()
            .single();

        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error("Erro ao atualizar paciente:", error);
        res.status(500).json({ erro: "Erro ao atualizar paciente." });
    }
}

async function deletarPaciente(req, res) {
    try {
        const { id } = req.params;
        const { error } = await supabase
            .from("pacientes")
            .delete()
            .eq("id", id);

        if (error) throw error;
        res.json({ mensagem: "Paciente excluído com sucesso." });
    } catch (error) {
        console.error("Erro ao excluir paciente:", error);
        res.status(500).json({ erro: "Erro ao excluir paciente." });
    }
}

async function criarProntuario(req, res) {
    try {
        const { paciente_id, data_sessao, terapeuta_id, observacoes, status_prontuario } = req.body;

        const { data, error } = await supabase
            .from("prontuarios")
            .insert([{
                paciente_id,
                data_sessao,
                terapeuta_id,
                observacoes,
                status_prontuario: status_prontuario || "Em andamento"
            }])
            .select()
            .single();

        if (error) throw error;
        res.status(201).json(data);
    } catch (error) {
        console.error("Erro ao criar prontuário:", error);
        res.status(500).json({ erro: "Erro ao criar prontuário." });
    }
}

async function listarProntuarios(req, res) {
    try {
        const { paciente_id } = req.query;
        let query = supabase.from("prontuarios").select(`*, paciente:pacientes(nome), terapeuta:clientes(nome)`);

        if (paciente_id) {
            query = query.eq("paciente_id", paciente_id);
        }

        const { data, error } = await query.order("data_sessao", { ascending: false });
        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error("Erro ao listar prontuários:", error);
        res.status(500).json({ erro: "Erro ao buscar prontuários." });
    }
}

module.exports = {
    criarPaciente,
    listarPacientes,
    obterPaciente,
    atualizarPaciente,
    deletarPaciente,
    criarProntuario,
    listarProntuarios
};
