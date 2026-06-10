function ensureAuthenticated(req, res, next) {
    if (req.session && req.session.usuario) {
        return next();
    }
    return res.status(401).json({ erro: "Usuário não autenticado." });
}

function authorizeRoles(...allowedRoles) {
    return (req, res, next) => {
        if (!req.session || !req.session.usuario) {
            return res.status(401).json({ erro: "Usuário não autenticado." });
        }

        const perfil = req.session.usuario.perfil;
        if (!allowedRoles.includes(perfil)) {
            return res.status(403).json({ erro: "Permissão negada para este recurso." });
        }

        next();
    };
}

module.exports = {
    ensureAuthenticated,
    authorizeRoles
};
