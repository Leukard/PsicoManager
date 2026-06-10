// backend/routes/espacosRoutes.js
const express = require('express');
const router = express.Router();
const espacosController = require('../controllers/espacosController');
const { ensureAuthenticated, authorizeRoles } = require('../middlewares/authMiddleware');

// Qualquer usuário autenticado (Psicólogo ou Admin) pode listar os espaços
router.get('/', ensureAuthenticated, espacosController.listarEspacos);

// APENAS quem for 'admin' pode criar ou deletar um espaço físico
router.post('/', ensureAuthenticated, authorizeRoles('admin'), espacosController.criarEspaco);
router.delete('/:id', ensureAuthenticated, authorizeRoles('admin'), espacosController.deletarEspaco);

module.exports = router;