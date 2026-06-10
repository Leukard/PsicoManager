// backend/services/backupService.js
const supabase = require("./supabaseClient");
const fs = require("fs");
const path = require("path");

// Tabelas que serão incluídas no backup
const TABELAS = [
    "usuarios",
    "pacientes",
    "agendamentos",
    "financeiro",
    "convenios",
    "planos",
    "tarefas",
    "documentos",
    "lembretes",
    "prontuarios",
    "logs_auditoria"
];

/**
 * Executa o backup de todas as tabelas e salva em arquivo JSON local.
 * Também faz upload do arquivo para o Supabase Storage (bucket 'backups').
 */
async function executarBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const nomeArquivo = `backup_${timestamp}.json`;
    const pastaLocal = path.join(__dirname, "..", "backups");
    const caminhoArquivo = path.join(pastaLocal, nomeArquivo);

    // Garante que a pasta local existe
    if (!fs.existsSync(pastaLocal)) {
        fs.mkdirSync(pastaLocal, { recursive: true });
    }

    const snapshot = {
        gerado_em: new Date().toISOString(),
        tabelas: {}
    };

    // Coleta os dados de cada tabela
    for (const tabela of TABELAS) {
        try {
            const { data, error } = await supabase.from(tabela).select("*");
            if (error) {
                console.warn(`⚠️ [BACKUP] Falha ao ler tabela "${tabela}":`, error.message);
                snapshot.tabelas[tabela] = { erro: error.message };
            } else {
                snapshot.tabelas[tabela] = data;
            }
        } catch (err) {
            console.warn(`⚠️ [BACKUP] Exceção na tabela "${tabela}":`, err.message);
            snapshot.tabelas[tabela] = { erro: err.message };
        }
    }

    // Salva arquivo JSON localmente
    fs.writeFileSync(caminhoArquivo, JSON.stringify(snapshot, null, 2), "utf-8");
    console.log(`✅ [BACKUP] Arquivo local criado: ${nomeArquivo}`);

    // Faz upload para o Supabase Storage (bucket 'backups')
    try {
        const conteudo = fs.readFileSync(caminhoArquivo);

        const { error: uploadError } = await supabase.storage
            .from("backups")
            .upload(nomeArquivo, conteudo, {
                contentType: "application/json",
                upsert: false
            });

        if (uploadError) {
            console.warn("⚠️ [BACKUP] Falha no upload para Storage:", uploadError.message);
        } else {
            console.log(`☁️  [BACKUP] Upload concluído: ${nomeArquivo}`);
        }
    } catch (err) {
        console.warn("⚠️ [BACKUP] Erro inesperado no upload:", err.message);
    }

    // Limpeza: mantém apenas os 7 backups locais mais recentes
    try {
        const arquivos = fs.readdirSync(pastaLocal)
            .filter(f => f.startsWith("backup_") && f.endsWith(".json"))
            .sort()
            .reverse(); // mais recentes primeiro

        const paraRemover = arquivos.slice(7); // mantém 7, remove o resto
        for (const arquivo of paraRemover) {
            fs.unlinkSync(path.join(pastaLocal, arquivo));
            console.log(`🗑️  [BACKUP] Arquivo antigo removido: ${arquivo}`);
        }
    } catch (err) {
        console.warn("⚠️ [BACKUP] Erro na limpeza de arquivos antigos:", err.message);
    }

    return nomeArquivo;
}

module.exports = { executarBackup };