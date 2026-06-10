const bcrypt = require("bcrypt");
const supabase = require("../services/supabaseClient");

async function listarUsuarios(req, res) {
    try {
        const { data, error } = await supabase
            .from("usuarios")
            .select("id, nome, email, perfil, criado_em")
            .order("nome", { ascending: true });

        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error("Erro ao listar usuários:", error);
        res.status(500).json({ erro: "Erro ao buscar usuários." });
    }
}

async function obterPerfil(req, res) {
    if (!req.session || !req.session.usuario) {
        return res.status(401).json({ erro: "Usuário não autenticado." });
    }

    res.json(req.session.usuario);
}

async function atualizarPerfil(req, res) {
    try {
        const { nome, email, perfil } = req.body;
        const usuarioLogado = req.session.usuario;

        if (!usuarioLogado) {
            return res.status(401).json({ erro: "Usuário não autenticado." });
        }

        const atualizacao = { nome, email };
        if (perfil && usuarioLogado.perfil === "administrador") {
            atualizacao.perfil = perfil;
        }

        const { data, error } = await supabase
            .from("usuarios")
            .update(atualizacao)
            .eq("id", usuarioLogado.id)
            .select("id, nome, email, perfil")
            .single();

        if (error) throw error;

        req.session.usuario = data;
        res.json(data);
    } catch (error) {
        console.error("Erro ao atualizar perfil:", error);
        res.status(500).json({ erro: "Erro ao atualizar perfil." });
    }
}

async function criarUsuarioAdmin(req, res) {
    try {
        const { nome, email, senha, perfil } = req.body;
        if (!nome || !email || !senha) {
            return res.status(400).json({ erro: "Nome, email e senha são obrigatórios." });
        }

        const senha_hash = await bcrypt.hash(senha, 10);
        const { data, error } = await supabase
            .from("usuarios")
            .insert([{ nome, email, senha_hash, perfil: perfil || "psicologo" }])
            .select("id, nome, email, perfil")
            .single();

        if (error) throw error;
        res.status(201).json(data);
    } catch (error) {
        console.error("Erro ao criar usuário:", error);
        res.status(500).json({ erro: "Erro ao criar usuário." });
    }
}

module.exports = {
    listarUsuarios,
    obterPerfil,
    atualizarPerfil,
    criarUsuarioAdmin
};
