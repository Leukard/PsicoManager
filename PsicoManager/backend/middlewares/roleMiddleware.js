const { authorizeRoles } = require("./authMiddleware");

module.exports = {
    isAdmin: authorizeRoles("administrador"),
    isPsicologo: authorizeRoles("psicologo"),
    isAtendente: authorizeRoles("atendente"),
    isAdminOrPsicologo: authorizeRoles("administrador", "psicologo")
};
