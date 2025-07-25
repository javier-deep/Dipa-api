const db = require('../db/connection');

// Obtener todos los banners activos
const obtenerBanners = (req, res) => {
  db.query(
    'SELECT id, imagen, orden FROM banners WHERE status = "activo" ORDER BY orden',
    (err, results) => {
      if (err) {
        console.error('Error al obtener banners:', err);
        return res.status(500).json({ 
          error: 'Error al obtener los banners',
          details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
      }

      // Convertir el LONGBLOB a base64
      const banners = results.map(banner => ({
        id: banner.id,
        imagen: banner.imagen.toString('base64'),
        orden: banner.orden
      }));

      res.json(banners);
    }
  );
};

// Crear un nuevo banner
const crearBanner = (req, res) => {
  const { imagen, orden } = req.body;

  if (!imagen) {
    return res.status(400).json({ error: 'La imagen es requerida' });
  }

  // Convertir base64 a Buffer
  const imagenBuffer = Buffer.from(imagen, 'base64');

  db.query(
    'INSERT INTO banners (imagen, orden) VALUES (?, ?)',
    [imagenBuffer, orden || 0],
    (err, result) => {
      if (err) {
        console.error('Error al crear banner:', err);
        return res.status(500).json({ 
          error: 'Error al crear el banner',
          details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
      }

      res.status(201).json({ 
        id: result.insertId,
        message: 'Banner creado exitosamente' 
      });
    }
  );
};

// Actualizar un banner
const actualizarBanner = (req, res) => {
  const { id } = req.params;
  const { imagen, orden, status } = req.body;

  let query = 'UPDATE banners SET ';
  const params = [];
  let updates = [];

  if (imagen) {
    updates.push('imagen = ?');
    params.push(Buffer.from(imagen, 'base64'));
  }

  if (orden !== undefined) {
    updates.push('orden = ?');
    params.push(orden);
  }

  if (status) {
    updates.push('status = ?');
    params.push(status);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No hay datos para actualizar' });
  }

  query += updates.join(', ') + ' WHERE id = ?';
  params.push(id);

  db.query(query, params, (err, result) => {
    if (err) {
      console.error('Error al actualizar banner:', err);
      return res.status(500).json({ 
        error: 'Error al actualizar el banner',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Banner no encontrado' });
    }

    res.json({ message: 'Banner actualizado exitosamente' });
  });
};

// Eliminar un banner (cambiar status a inactivo)
const eliminarBanner = (req, res) => {
  const { id } = req.params;

  db.query(
    'UPDATE banners SET status = "inactivo" WHERE id = ?',
    [id],
    (err, result) => {
      if (err) {
        console.error('Error al eliminar banner:', err);
        return res.status(500).json({ 
          error: 'Error al eliminar el banner',
          details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Banner no encontrado' });
      }

      res.json({ message: 'Banner eliminado exitosamente' });
    }
  );
};

module.exports = {
  obtenerBanners,
  crearBanner,
  actualizarBanner,
  eliminarBanner
};