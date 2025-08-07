const express = require('express');
const router = express.Router();
const { 
  obtenerCursos, 
  validarCodigo, 
  obtenerSedes,
  obtenerCursosCompletados 
} = require('../controllers/cursosController');

// Ruta GET para obtener todos los cursos
router.get('/', obtenerCursos);

// Ruta GET para obtener las sedes
router.get('/sedes', obtenerSedes);

// Ruta GET para obtener cursos completados por alumno
router.get('/completados/:alumnoId', obtenerCursosCompletados);

// Ruta POST para validar código de finalización
router.post('/validar', validarCodigo);

module.exports = router;