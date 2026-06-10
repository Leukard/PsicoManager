const supabase = require("../services/supabaseClient");
/**
 * Salva um log de auditoria no banco de dados.
 * @param {string} usuarioId - ID do usuário que realizou a ação.
 * @param {string} acao - Nome da ação (ex: 'CRIAR_AGENDAMENTO').
 * @param {Object} detalhes - Dados extras relevantes sobre a ação.
 */
async function registrarLog(usuarioId, acao, detalhes = {}) {
    try {
        const { error } = await supabase
            .from("logs_auditoria")
            .insert([{
                usuario_id: usuarioId,
                acao: acao,
                detalhes: detalhes
            }]);

        if (error) throw error;
    } catch (err) {
        // Logamos no console para não quebrar a requisição do usuário caso o log falhe
        console.error("⚠️ Falha crítica ao gravar log de auditoria:", err.message);
    }
}

module.exports = { registrarLog };