const db = require('../db/connection');

// Obtener datos del usuario (Reemplazada por la de server.js)
exports.getUserData = async (req, res) => {
  const matricula = req.params.matricula;

  try {
    const [rows] = await db.promise().query(
      `SELECT 
         matricula,
         nombres,
         primer_apellido,
         segundo_apellido,
         no_generacion,
         academia, 
         ciudad,
         estado,
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
      nombre: rows[0].nombres,
      app: rows[0].primer_apellido,
      apm: rows[0].segundo_apellido,
      gen: rows[0].no_generacion,
      ciudad: rows[0].ciudad,
      estado: rows[0].estado,
    };

    res.json({ user });
  } catch (error) {
    console.error('Error al obtener datos:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Nuevo método para manejar avatares
exports.saveAvatar = async (req, res) => {
  try {
    const { matricula, avatarPng, avatarPngName, accessory } = req.body;

    if (!matricula) {
      return res.status(400).json({ message: 'Falta la matrícula' });
    }

    const query = ` 
     INSERT INTO avatar (imagen_png, nombre_imagen, accessory)
     VALUES (?, ?, ?)
     `;

    const [insertResult] = await db.promise().query(query, [avatarPng, avatarPngName, accessory]);
    const idAvatar = insertResult.insertId;

    const updateAlumnoQuery = `
    UPDATE alumnos
    SET id_avatar = ?
    WHERE matricula = ?`;

    const [updateResult] = await db.promise().query(updateAlumnoQuery, [idAvatar, matricula]);

    if(updateResult.affectedRows === 0){
      return res.status(404).json({message: "Matrícula no encontrada"});
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