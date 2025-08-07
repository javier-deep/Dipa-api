const db = require('../db/connection');

// Función auxiliar para convertir callbacks a promesas
const queryAsync = (query, params = []) => {
  return new Promise((resolve, reject) => {
    db.query(query, params, (err, results) => {
      if (err) {
        reject(err);
      } else {
        resolve(results);
      }
    });
  });
};

// Obtener datos del usuario
exports.getUserData = async (req, res) => {
  const matricula = req.params.matricula;

  try {
    const rows = await queryAsync(
      `SELECT 
         matricula,
         nombres,
         primer_apellido AS app,
         segundo_apellido AS apm,
         academia,
         no_generacion AS gen,
         sede
       FROM alumnos
       WHERE matricula = ?`,
      [matricula]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const user = {
      matricula: rows[0].matricula,
      nombres: rows[0].nombres,
      app: rows[0].app,
      apm: rows[0].apm,
      academia: rows[0].academia,
      gen: rows[0].gen,
      sede: rows[0].sede
    };

    res.json({ user });
  } catch (error) {
    console.error('Error al obtener datos:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Método para manejar avatares
exports.saveAvatar = async (req, res) => {
  try {
    const { matricula, avatarPng, avatarPngName, accessory } = req.body;

    if (!matricula || !avatarPng || !avatarPngName) {
      return res.status(400).json({ message: 'Datos incompletos' });
    }

    // Convertir imagen base64 a buffer
    const imagenBuffer = Buffer.from(avatarPng, 'base64');

    // Insertar avatar
    const query = ` 
     INSERT INTO avatar (imagen_png, nombre_imagen, accessory)
     VALUES (?, ?, ?)
     `;

    const insertResult = await queryAsync(query, [imagenBuffer, avatarPngName, accessory]);
    const idAvatar = insertResult.insertId;

    // Actualizar referencia en alumno
    const updateAlumnoQuery = `
      UPDATE alumnos
      SET id_avatar = ?
      WHERE matricula = ?`;

    const updateResult = await queryAsync(updateAlumnoQuery, [idAvatar, matricula]);

    if (updateResult.affectedRows === 0) {
      return res.status(404).json({ message: "Matrícula no encontrada" });
    }

    res.json({ 
      success: true, 
      message: 'Avatar guardado correctamente', 
      data: { 
        id_avatar: idAvatar, 
        affectedRows: updateResult.affectedRows 
      } 
    });
  } catch (error) {
    console.error('Error al guardar el avatar:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error del servidor al guardar el avatar.' 
    });
  }
};