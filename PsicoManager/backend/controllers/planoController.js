const supabase = require("../services/supabaseClient");

async function criarPlano(req, res) {
    try {
        const { nome, descricao, total_sessoes, desconto, saldo_sessoes } = req.body;
        if (!nome || !total_sessoes) {
            return res.status(400).json({ erro: "Nome e total de sessões são obrigatórios." });
        }

        const { data, error } = await supabase
            .from("planos")
            .insert([{ nome, descricao, total_sessoes, desconto: desconto || 0, saldo_sessoes: saldo_sessoes || total_sessoes }])
            .select()
            .single();

        if (error) throw error;
        res.status(201).json(data);
    } catch (error) {
        console.error("Erro ao criar plano:", error);
        res.status(500).json({ erro: "Erro ao criar plano." });
    }
}

async function listarPlanos(req, res) {
    try {
        const { data, error } = await supabase
            .from("planos")
            .select("*")
            .order("nome", { ascending: true });

        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error("Erro ao listar planos:", error);
        res.status(500).json({ erro: "Erro ao buscar planos." });
    }
}

module.exports = {
    criarPlano,
    listarPlanos
};
