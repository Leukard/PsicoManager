const supabase = require("../services/supabaseClient");

async function listarEspacos(req, res) {
    try {
        const { data, error } = await supabase
            .from("espacos")
            .select("*")
            .order("nome", { ascending: true });

        if (error) throw error;

        res.json(data);
    } catch (error) {
        console.error("Erro ao listar espaços:", error);
        res.status(500).json({ erro: "Erro ao listar espaços." });
    }
}

async function criarEspaco(req, res) {
    try {
        const { nome, descricao, capacidade } = req.body;

        const { data, error } = await supabase
            .from("espacos")
            .insert([{ nome, descricao, capacidade: parseInt(capacidade) || 1 }])
            .select()
            .single();

        if (error) throw error;

        res.status(201).json(data);
    } catch (error) {
        console.error("Erro ao criar espaço:", error);
        res.status(500).json({ erro: "Erro ao criar espaço." });
    }
}

async function deletarEspaco(req, res) {
    try {
        const { id } = req.params;

        const { error } = await supabase
            .from("espacos")
            .delete()
            .eq("id", id);

        if (error) throw error;

        res.json({ mensagem: "Espaço removido com sucesso." });
    } catch (error) {
        console.error("Erro ao deletar espaço:", error);
        res.status(500).json({ erro: "Erro ao deletar espaço." });
    }
}

async function atualizarEspaco(req, res) {
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
}

module.exports = {
    listarEspacos,
    criarEspaco,
    atualizarEspaco,
    deletarEspaco
};
