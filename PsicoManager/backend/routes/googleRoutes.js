const express = require("express");
const router = express.Router();
const oauth2Client = require("../config/google");
const { ensureAuthenticated } = require("../middlewares/authMiddleware");
const { google } = require("googleapis");
const { createClient } = require("@supabase/supabase-js");

const { syncGoogleCalendar, syncGoogleCalendarAgendamentos } = require("../controllers/agendamentoController");
const { listarEventosGoogle } = require("../services/googleCalendarService");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY/SUPABASE_KEY must be set in .env");
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn("⚠️ Using SUPABASE_KEY instead of SUPABASE_SERVICE_ROLE_KEY. Row-level security may block inserts.");
}

/* SUPABASE */
const supabase = createClient(
    supabaseUrl,
    supabaseKey
);

/* ==========================================
   LOGIN GOOGLE 
========================================== */
router.get("/auth/google", (req, res) => {

    const url = oauth2Client.generateAuthUrl({
        access_type: "offline",
        prompt: "consent",
        scope: [
            "https://www.googleapis.com/auth/calendar",
            "https://www.googleapis.com/auth/userinfo.email",
            "https://www.googleapis.com/auth/userinfo.profile"
        ]
    });

    res.redirect(url);
});


/* ==========================================
   CALLBACK GOOGLE
========================================== */
router.get("/auth/google/callback", async (req, res) => {
    try {

        const code = req.query.code;

        if (!code) {
            return res.status(400).send("Código OAuth não recebido.");
        }

        // 🔑 TOKEN
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);

        // 👤 PEGAR DADOS DO USUÁRIO
        const oauth2 = google.oauth2({
            auth: oauth2Client,
            version: "v2"
        });

        const userInfo = await oauth2.userinfo.get();

        const email = userInfo.data.email;
        const nome = userInfo.data.name;
        const foto = userInfo.data.picture;

        // 🔎 VERIFICA SE USUÁRIO EXISTE
        let { data: usuarioExistente, error } = await supabase
            .from("usuarios")
            .select("*")
            .eq("email", email)
            .maybeSingle();

        let usuario;

        // 🆕 SE NÃO EXISTE → CRIA
        if (!usuarioExistente) {

            const { data, error: insertError } = await supabase
                .from("usuarios")
                .insert([{
                    nome: nome,
                    email: email,
                    senha_hash: "google_login",
                    perfil: "administrador"
                }])
                .select()
                .single();

            if (insertError) throw insertError;

            usuario = data;

        } else {
            usuario = usuarioExistente;
        }

        // 💾 SALVA NA SESSÃO
        req.session.tokens = tokens;

        req.session.usuario = {
            id: usuario.id,
            nome: nome,
            email: email,
            foto: foto,
            perfil: usuario.perfil  // [HUGO] corrigido: salva o perfil na sessão para o middleware de permissões funcionar
        };

        console.log("✅ Google conectado com sucesso");
        console.log("👤 Usuário:", email, "| Perfil:", usuario.perfil);

        // 🔁 REDIRECIONA PRO DASHBOARD
        res.redirect("/index.html");

    } catch (error) {
        console.error("❌ Erro OAuth Google:", error);
        res.status(500).send("Erro ao conectar com Google");
    }
});

router.get("/sync-google-calendar", ensureAuthenticated, syncGoogleCalendar);
router.get("/sync-google-calendar-agendamentos", ensureAuthenticated, syncGoogleCalendarAgendamentos);
router.get("/google-events", ensureAuthenticated, async (req, res) => {
    try {
        if (!req.session || !req.session.tokens) {
            return res.status(401).json({ erro: "Google não conectado." });
        }

        const eventos = await listarEventosGoogle(req.session.tokens);
        res.json(eventos);
    } catch (error) {
        console.error("Erro ao buscar eventos do Google:", error);
        res.status(500).json({ erro: "Erro ao buscar eventos do Google." });
    }
});

module.exports = router;