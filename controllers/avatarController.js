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

exports.getUserByMatricula = async (req, res) => {
  try {
    const { matricula } = req.params;

    const rows = await queryAsync(
      `SELECT 
        a.nombres, 
        a.primer_apellido,
        a.segundo_apellido,
        v.imagen_png,
        v.nombre_imagen,
        v.accessory
      FROM alumnos a
      LEFT JOIN avatar v ON a.id_avatar = v.id_avatar
      WHERE a.matricula = ?`,
      [matricula]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const avatarConfig = rows[0].accessory 
      ? { accessory: rows[0].accessory } 
      : { accessory: 'default' };
    
    const avatarBase = rows[0].nombre_imagen || 'LeonSimple';

    const userData = {
      nombres: rows[0].nombres,
      primer_apellido: rows[0].primer_apellido,
      segundo_apellido: rows[0].segundo_apellido,
      avatarBase,
      avatarConfig
    };

    console.log('getUserByMatricula - userData:', JSON.stringify(userData, null, 2));
    res.json(userData);
  } catch (error) {
    console.error('Error al obtener el usuario:', error);
    res.status(500).json({ error: 'Error al obtener el usuario' });
  }
};

exports.getAvatarByAlumno = async (req, res) => {
  try {
    const { alumnoId } = req.params;
    
    console.log('=== DEBUG getAvatarByAlumno ===');
    console.log('🔍 Buscando avatar para alumnoId:', alumnoId);
    
    const query = `
      SELECT 
        a.id_avatar,
        a.imagen_png,
        a.nombre_imagen,
        a.accessory,
        a.fecha_creacion,
        a.fecha_actualizacion,
        al.nombres,
        al.primer_apellido,
        al.segundo_apellido
      FROM avatar a
      INNER JOIN alumnos al ON a.id_alumno = al.id
      WHERE a.id_alumno = ?
      ORDER BY a.fecha_creacion DESC
      LIMIT 1
    `;
    
    console.log('📡 Ejecutando query:', query);
    console.log('📡 Con parámetro alumnoId:', alumnoId);
    
    const rows = await queryAsync(query, [alumnoId]);
    
    console.log('📡 Resultados encontrados:', rows.length);
    console.log('📡 Datos completos:', JSON.stringify(rows, null, 2));
    
    if (rows.length === 0) {
      console.log('⚠️ No se encontró avatar para el usuario');
      return res.status(404).json({
        success: false,
        message: 'No se encontró avatar para este usuario'
      });
    }
    
    const avatar = rows[0];
    
    console.log('✅ Avatar encontrado:');
    console.log('  - id_avatar:', avatar.id_avatar);
    console.log('  - accessory:', avatar.accessory);
    console.log('  - nombre_imagen:', avatar.nombre_imagen);
    console.log('  - imagen_png length:', avatar.imagen_png ? avatar.imagen_png.length : 'No existe');
    
    const responseData = {
      success: true,
      data: {
        avatarId: avatar.id_avatar,
        imagenPng: avatar.imagen_png,
        nombreImagen: avatar.nombre_imagen,
        accessory: avatar.accessory || 'default',
        fechaCreacion: avatar.fecha_creacion,
        fechaActualizacion: avatar.fecha_actualizacion,
        alumno: {
          nombres: avatar.nombres,
          primer_apellido: avatar.primer_apellido,
          segundo_apellido: avatar.segundo_apellido
        }
      }
    };
    
    console.log('📤 Enviando respuesta:', JSON.stringify(responseData, null, 2));
    res.json(responseData);
    
  } catch (error) {
    console.error('❌ Error al obtener avatar:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

exports.updateAvatar = async (req, res) => {
  try {
    const { matricula, avatarConfig, imagen_png, nombre_imagen } = req.body;

    if (!matricula || !avatarConfig || !imagen_png || !nombre_imagen) {
      return res.status(400).json({ error: 'Datos incompletos' });
    }

    // Buscar alumno por matrícula
    const user = await queryAsync(
      'SELECT id, id_avatar FROM alumnos WHERE matricula = ?',
      [matricula]
    );

    if (user.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const userId = user[0].id;
    const currentAvatarId = user[0].id_avatar;

    // Extraer accessory del avatarConfig
    const accessory = avatarConfig.accessory || 'default';

    if (currentAvatarId) {
      // Actualizar avatar existente en la tabla avatar
      await queryAsync(
        `UPDATE avatar 
         SET imagen_png = ?, nombre_imagen = ?, accessory = ?, fecha_actualizacion = CURRENT_TIMESTAMP
         WHERE id_avatar = ?`,
        [Buffer.from(imagen_png, 'base64'), nombre_imagen, accessory, currentAvatarId]
      );
    } else {
      // Crear nuevo avatar
      const insertResult = await queryAsync(
        `INSERT INTO avatar (imagen_png, nombre_imagen, accessory, id_alumno, fecha_creacion, fecha_actualizacion)
         VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [Buffer.from(imagen_png, 'base64'), nombre_imagen, accessory, userId]
      );
      
      // Actualizar la referencia id_avatar en la tabla alumnos
      await queryAsync(
        'UPDATE alumnos SET id_avatar = ? WHERE id = ?',
        [insertResult.insertId, userId]
      );
    }

    res.json({ success: true, message: 'Avatar actualizado correctamente' });

  } catch (error) {
    console.error('Error updating avatar:', error);
    res.status(500).json({ error: 'Error al guardar avatar' });
  }
};