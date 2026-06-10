const supabase = require("../services/supabaseClient");

async function criarConvenio(req, res) {
    try {
        const { nome, descricao, porcentagem_reembolso, coparticipacao } = req.body;

        if (!nome) {
            return res.status(400).json({ erro: "Nome do convênio é obrigatório." });
        }

        const { data, error } = await supabase
            .from("convenios")
            .insert([{ nome, descricao, porcentagem_reembolso, coparticipacao }])
            .select()
            .single();

        if (error) throw error;
        res.status(201).json(data);
    } catch (error) {
        console.error("Erro ao criar convênio:", error);
        res.status(500).json({ erro: "Erro ao criar convênio." });
    }
}

async function listarConvenios(req, res) {
    try {
        const { data, error } = await supabase
            .from("convenios")
            .select("*")
            .order("nome", { ascending: true });

        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error("Erro ao listar convênios:", error);
        res.status(500).json({ erro: "Erro ao buscar convênios." });
    }
}

async function atualizarConvenio(req, res) {
    try {
        const { id } = req.params;
        const dados = req.body;

        const { data, error } = await supabase
            .from("convenios")
            .update(dados)
            .eq("id", id)
            .select()
            .single();

        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error("Erro ao atualizar convênio:", error);
        res.status(500).json({ erro: "Erro ao atualizar convênio." });
    }
}

async function deletarConvenio(req, res) {
    try {
        const { id } = req.params;
        const { error } = await supabase
            .from("convenios")
            .delete()
            .eq("id", id);

        if (error) throw error;
        res.json({ mensagem: "Convênio excluído com sucesso." });
    } catch (error) {
        console.error("Erro ao excluir convênio:", error);
        res.status(500).json({ erro: "Erro ao excluir convênio." });
    }
}

module.exports = {
    criarConvenio,
    listarConvenios,
    atualizarConvenio,
    deletarConvenio
};
