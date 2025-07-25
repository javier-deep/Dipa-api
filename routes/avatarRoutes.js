const express = require('express');
const router = express.Router();
const avatarController = require('../controllers/avatarController');

// Obtener información de usuario por matrícula
router.get('/auth/user/:matricula', avatarController.getUserByMatricula);

// Actualizar avatar
router.post('/update', avatarController.updateAvatar);

module.exports = router;