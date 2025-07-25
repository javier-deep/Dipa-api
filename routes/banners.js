const express = require('express');
const router = express.Router();
const {
  obtenerBanners,
  crearBanner,
  actualizarBanner,
  eliminarBanner
} = require('../controllers/bannersController');

// Obtener todos los banners activos
router.get('/', obtenerBanners);

// Crear un nuevo banner
router.post('/', crearBanner);

// Actualizar un banner
router.put('/:id', actualizarBanner);

// Eliminar un banner (marcar como inactivo)
router.delete('/:id', eliminarBanner);

module.exports = router;