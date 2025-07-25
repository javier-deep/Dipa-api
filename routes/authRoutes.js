const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const userController = require('../controllers/userController');

// Registrar contraseña (pantalla Continuar)
router.post('/register', authController.registerPassword);

// Iniciar sesión (pantalla Login)
router.post('/login', authController.login);

// Actualizar avatar del usuario

// Obtener configuración del avatar

// Obtener datos del usuario (pantalla Datos)
router.get('/user/:matricula', userController.getUserData);

router.get('/current-user', authController.getCurrentUser);

module.exports = router;