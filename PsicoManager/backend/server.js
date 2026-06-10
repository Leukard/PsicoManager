const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const { executarBackup } = require('./services/backupService');

const { createClient } = require("@supabase/supabase-js");
const express = require("express");
const bcrypt = require("bcrypt");
const session = require("express-session");
const cors = require("cors");
const googleRoutes = require("./routes/googleRoutes");
const agendamentoRoutes = require("./routes/agendamentoRoutes");
const systemRoutes = require("./routes/systemRoutes");
const espacoRoutes = require("./routes/espacoRoutes");

// [HUGO] Cron job para envio automático de lembretes
// Para ativar: npm install node-cron
const cron = require('node-cron');
const { processar } = require('./controllers/lembreteController');

const app = express();
const port = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV === 'production';
const sessionSecret = process.env.SESSION_SECRET || 'psicomanager';

const allowedOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim())
    : (isProduction ? [] : ['http://localhost:5000', 'http://127.0.0.1:5000']);

if (isProduction) {
    app.set('trust proxy', 1);
}

app.use(cors({
    origin: function (origin, callback) {
        if (!origin) {
            return callback(null, true);
        }

        if (allowedOrigins.length === 0) {
            console.warn('⚠️ CORS_ORIGINS não definido. Permitindo todas as origens em produção. Configure CORS_ORIGINS no Render.');
            return callback(null, true);
        }

        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true
}));

app.use(express.json());
/* =========================
   SUPABASE
========================= */

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Supabase URL and service role key must be set in the .env file");
    process.exit(1);
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn("⚠️ Using SUPABASE_KEY instead of SUPABASE_SERVICE_ROLE_KEY. Row-level security may block inserts.");
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log("✅ Conexão com Supabase configurada!");

/* =========================
   MIDDLEWARES
========================= */

app.use(session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: isProduction,
        httpOnly: true,
        sameSite: isProduction ? 'none' : 'lax',
        maxAge: 24 * 60 * 60 * 1000
    }
}));

if (isProduction && !process.env.SESSION_SECRET) {
    console.warn('⚠️ SESSION_SECRET is not set. Configure SESSION_SECRET for production environments.');
}

/* =========================
   ROTAS PÚBLICAS 
========================= */

app.use(googleRoutes);

/* =========================
   VERIFICAR USUÁRIO LOGADO
========================= */

app.get('/usuario-logado', (req, res) => {
    if (req.session.usuario) {
        return res.json({
            logado: true,
            usuario: req.session.usuario
        });
    }

    res.json({ logado: false });
});

/* =========================
   LOGOUT 
========================= */

app.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({
                erro: 'Erro ao fazer logout'
            });
        }

        res.json({ mensagem: 'Logout realizado com sucesso' });
    });
});

/* =========================
   PROTEÇÃO DE ROTAS
========================= */

app.use((req, res, next) => {
        console.log('[AUTH MIDDLEWARE] path=', req.path, 'accept=', req.headers.accept, 'sessionUser=', !!(req.session && req.session.usuario));

   const rotasLiberadas = [
    '/pages/login.html',
    '/pages/cadastro.html',
    '/api/login',
    '/api/cadastro',
    '/logout' 
];

    if (
        rotasLiberadas.includes(req.path) ||
        req.path.startsWith('/auth') ||
        req.path.startsWith('/styles') ||
        req.path.startsWith('/scripts') ||
        req.path.startsWith('/images') ||
        req.path.startsWith('/usuario-logado')
    ) {
        return next();
    }

    if (!req.session.usuario) {
        if (req.path.startsWith('/api')) {
            return res.status(401).json({ erro: 'Usuário não autenticado.' });
        }

        return res.redirect('/pages/login.html');
    }

    next();
});

/* =========================
   ROTAS PRIVADAS
========================= */

app.use('/api', systemRoutes);
app.use(agendamentoRoutes);
app.use('/api/espacos', espacoRoutes);

/* =========================
   FRONTEND
========================= */

const pastaFrontend = path.join(__dirname, "../frontend");

app.use(express.static(pastaFrontend, { index: false }));

app.get("/", (req, res) => {
    res.sendFile(path.join(pastaFrontend, "pages/login.html"));
});

/* =========================
   CADASTRO
========================= */

app.post('/api/cadastro', async (req, res) => {
    const { nome, email, senha } = req.body;

    try {
        const senha_hash = await bcrypt.hash(senha, 10);

        const { data, error } = await supabase
            .from('usuarios')
            .insert([{ nome, email, senha_hash }])
            .select();

        if (error) {
            if (error.code === '23505') {
                return res.status(400).json({
                    erro: 'Este e-mail já está em uso.'
                });
            }
            throw error;
        }

        res.status(201).json({
            mensagem: 'Usuário cadastrado com sucesso!',
            usuario: data[0]
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            erro: 'Erro interno no servidor'
        });
    }
});

/* =========================
   LOGIN
========================= */

app.post('/api/login', async (req, res) => {
    const { email, senha } = req.body;

    try {
        const { data: usuarios, error } = await supabase
            .from('usuarios')
            .select('*')
            .eq('email', email);

        if (error) throw error;

        if (usuarios.length === 0) {
            return res.status(401).json({
                erro: 'E-mail ou senha incorretos.'
            });
        }

        const usuario = usuarios[0];

        const senhaValida = await bcrypt.compare(senha, usuario.senha_hash);

        if (!senhaValida) {
            return res.status(401).json({
                erro: 'E-mail ou senha incorretos.'
            });
        }

        delete usuario.senha_hash;

        req.session.usuario = usuario;

        res.status(200).json({
            mensagem: 'Login realizado com sucesso!',
            usuario
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            erro: 'Erro interno no servidor'
        });
    }
});

/* =========================
   SERVER
========================= */

if (require.main === module) {
    app.listen(port, () => {
        console.log(`🌐 Servidor rodando em: http://localhost:${port}`);
    });
}

module.exports = app;

if (require.main === module) {
    /* =========================
       [HUGO] CRON JOB - Envio automático de lembretes
       Executa todos os dias às 08:00 da manhã
       O formato cron é: 'minuto hora * * *'
       Então '0 8 * * *' = todo dia às 08:00
    ========================= */
    cron.schedule('0 8 * * *', async () => {
        console.log('[CRON] Iniciando envio automático de lembretes...');
        try {
            const resultados = await processar();
            console.log(`[CRON] ${resultados.length} lembretes enviados com sucesso.`);
        } catch (err) {
            console.error('[CRON] Erro ao enviar lembretes:', err.message);
        }
    });

    // Adicionar junto com o outro cron.schedule, no final do arquivo
    cron.schedule('0 3 * * *', async () => {
        console.log('[CRON] Iniciando backup automático...');
        try {
            const arquivo = await executarBackup();
            console.log(`[CRON] Backup concluído: ${arquivo}`);
        } catch (err) {
            console.error('[CRON] Erro no backup:', err.message);
        }
    });
}
