const express = require("express");
const router = express.Router();

const { ensureAuthenticated } = require("../middlewares/authMiddleware");
const { isAdmin, isAdminOrPsicologo } = require("../middlewares/roleMiddleware");
const {
    listarUsuarios,
    obterPerfil,
    atualizarPerfil,
    criarUsuarioAdmin
} = require("../controllers/userController");
const {
    criarPaciente,
    listarPacientes,
    obterPaciente,
    atualizarPaciente,
    deletarPaciente,
    criarProntuario,
    listarProntuarios
} = require("../controllers/pacienteController");
const {
    criarTransacao,
    listarTransacoes,
    resumoFinanceiro
} = require("../controllers/financeiroController");
const {
    criarConvenio,
    listarConvenios,
    atualizarConvenio,
    deletarConvenio
} = require("../controllers/convenioController");
const {
    criarTarefa,
    listarTarefas,
    atualizarTarefa,
    deletarTarefa
} = require("../controllers/tarefaController");
const {
    criarPlano,
    listarPlanos
} = require("../controllers/planoController");
const {
    criarDocumento,
    listarDocumentos,
    obterDocumento,
    atualizarDocumento,
    deletarDocumento,
    gerarDocumentoPDF,
    salvarNoStorage,
    assinarDocumento,
    listarVersoes,
    restaurarVersao,
    listarTemplates
} = require("../controllers/documentoController");
const {
    criarLembrete,
    listarLembretes,
    atualizarLembrete,
    deletarLembrete,
    enviarLembretesAutomaticos
} = require("../controllers/lembreteController");
const {
    relatorioFinanceiro,
    relatorioAtendimentos,
    relatorioPacientesSemProntuario,
    exportarRelatorioFinanceiroCSV
} = require("../controllers/relatorioController");
const {
    listarLogs,
    exportarLogsCSV,
    deletarLog
} = require("../controllers/logController");

/* USUÁRIOS */
router.get("/usuarios", ensureAuthenticated, isAdmin, listarUsuarios);
router.get("/usuarios/perfil", ensureAuthenticated, obterPerfil);
router.put("/usuarios/perfil", ensureAuthenticated, atualizarPerfil);
router.post("/usuarios", ensureAuthenticated, isAdmin, criarUsuarioAdmin);

/* PACIENTES E PRONTUÁRIOS */
router.post("/pacientes", ensureAuthenticated, criarPaciente);
router.get("/pacientes", ensureAuthenticated, listarPacientes);
router.get("/pacientes/:id", ensureAuthenticated, obterPaciente);
router.put("/pacientes/:id", ensureAuthenticated, atualizarPaciente);
router.delete("/pacientes/:id", ensureAuthenticated, deletarPaciente);
router.post("/prontuarios", ensureAuthenticated, isAdminOrPsicologo, criarProntuario);
router.get("/prontuarios", ensureAuthenticated, listarProntuarios);

/* FINANCEIRO */
router.post("/financeiro", ensureAuthenticated, isAdmin, criarTransacao);
router.get("/financeiro", ensureAuthenticated, isAdmin, listarTransacoes);
router.get("/financeiro/resumo", ensureAuthenticated, isAdmin, resumoFinanceiro);

/* CONVÊNIO */
router.post("/convenios", ensureAuthenticated, isAdmin, criarConvenio);
router.get("/convenios", ensureAuthenticated, listarConvenios);
router.put("/convenios/:id", ensureAuthenticated, isAdmin, atualizarConvenio);
router.delete("/convenios/:id", ensureAuthenticated, isAdmin, deletarConvenio);

/* PLANOS */
router.post("/planos", ensureAuthenticated, isAdmin, criarPlano);
router.get("/planos", ensureAuthenticated, listarPlanos);

/* TAREFAS */
router.post("/tarefas", ensureAuthenticated, criarTarefa);
router.get("/tarefas", ensureAuthenticated, listarTarefas);
router.put("/tarefas/:id", ensureAuthenticated, atualizarTarefa);
router.delete("/tarefas/:id", ensureAuthenticated, deletarTarefa);

/* DOCUMENTOS */
router.post("/documentos", ensureAuthenticated, isAdminOrPsicologo, criarDocumento);
router.get("/documentos", ensureAuthenticated, listarDocumentos);
router.get("/documentos/:id", ensureAuthenticated, obterDocumento);
router.put("/documentos/:id", ensureAuthenticated, isAdminOrPsicologo, atualizarDocumento);
router.delete("/documentos/:id", ensureAuthenticated, isAdminOrPsicologo, deletarDocumento);
router.get("/documentos/:id/pdf", ensureAuthenticated, gerarDocumentoPDF);
router.post("/documentos/:id/salvar", ensureAuthenticated, isAdminOrPsicologo, salvarNoStorage);
router.post("/documentos/:id/assinar", ensureAuthenticated, isAdminOrPsicologo, assinarDocumento);
router.get("/documentos/:id/versoes", ensureAuthenticated, listarVersoes);
router.post("/documentos/:id/restaurar/:versaoId", ensureAuthenticated, isAdminOrPsicologo, restaurarVersao);
router.get("/documentos/templates/listar", ensureAuthenticated, listarTemplates);

/* RELATÓRIOS */
router.get("/relatorios/financeiro", ensureAuthenticated, isAdmin, relatorioFinanceiro);
router.get("/relatorios/financeiro/export", ensureAuthenticated, isAdmin, exportarRelatorioFinanceiroCSV);
router.get("/relatorios/atendimentos", ensureAuthenticated, isAdminOrPsicologo, relatorioAtendimentos);
router.get("/relatorios/pacientes-sem-prontuario", ensureAuthenticated, isAdminOrPsicologo, relatorioPacientesSemProntuario);
/* AUDITORIA */
router.get("/logs", ensureAuthenticated, isAdmin, listarLogs);
router.get("/logs/export", ensureAuthenticated, isAdmin, exportarLogsCSV);
router.delete("/logs/:id", ensureAuthenticated, isAdmin, deletarLog);
/* LEMBRETES */
router.post("/lembretes", ensureAuthenticated, isAdmin, criarLembrete);
router.get("/lembretes", ensureAuthenticated, listarLembretes);
router.put("/lembretes/:id", ensureAuthenticated, isAdminOrPsicologo, atualizarLembrete);
router.delete("/lembretes/:id", ensureAuthenticated, isAdminOrPsicologo, deletarLembrete);
router.post("/lembretes/enviar-automaticos", ensureAuthenticated, isAdmin, enviarLembretesAutomaticos);

module.exports = router;
