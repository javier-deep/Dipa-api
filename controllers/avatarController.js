const db = require('../db/connection');

exports.getUserByMatricula = async (req, res) => {
  try {
    const { matricula } = req.params;
    
    const [user] = await db.promise().query(
      `SELECT 
        id,
        matricula,
        nombres,
        primer_apellido,
        segundo_apellido,
        no_generacion,
        academia,
        sede,
        id_avatar
      FROM alumnos 
      WHERE matricula = ?`,
      [matricula]
    );

    if (user.length === 0) {
      return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
    }

    let avatarData = null;
    if (user[0].id_avatar) {
      const [avatar] = await db.promise().query(
        `SELECT 
          id_avatar,
          imagen_png,
          nombre_imagen,
          accessory,
          fecha_creacion
        FROM avatar
        WHERE id_avatar = ?`,
        [user[0].id_avatar]
      );
      
      if (avatar.length > 0) {
        avatarData = {
          id: avatar[0].id_avatar,
          imagen_png: avatar[0].imagen_png.toString('base64'),
          nombre_imagen: avatar[0].nombre_imagen,
          accessory: avatar[0].accessory,
          fecha_creacion: avatar[0].fecha_creacion
        };
      }
    }

    res.json({
      success: true,
      user: {
        id: user[0].id,
        matricula: user[0].matricula,
        nombres: user[0].nombres,
        primer_apellido: user[0].primer_apellido,
        segundo_apellido: user[0].segundo_apellido,
        generacion: user[0].no_generacion,
        academia: user[0].academia,
        sede: user[0].sede,
        hasAvatar: !!user[0].id_avatar,
        avatarData: avatarData
      }
    });
  } catch (error) {
    console.error('Error al obtener usuario:', error);
    res.status(500).json({ success: false, error: 'Error del servidor' });
  }
};

exports.updateAvatar = async (req, res) => {
  try {
    const { userId, avatarConfig, imagen_png, nombre_imagen } = req.body;

    if (!userId || !imagen_png || !nombre_imagen || !avatarConfig?.accessory) {
      console.log('Datos recibidos:', req.body);
      return res.status(400).json({ 
        success: false, 
        error: 'Datos incompletos',
        requiredFields: ['userId', 'avatarConfig.accessory', 'imagen_png', 'nombre_imagen']
      });
    }

    const [user] = await db.promise().query(
      'SELECT id FROM alumnos WHERE matricula = ?',
      [userId]
    );

    if (user.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Usuario no encontrado' 
      });
    }

    const userIdDb = user[0].id;

    await db.promise().beginTransaction();

    try {
      let avatarId = null;
      
      if (user[0].id_avatar) {
        avatarId = user[0].id_avatar;
        await db.promise().query(
          `UPDATE avatar 
          SET 
            imagen_png = ?, 
            nombre_imagen = ?, 
            accessory = ?,
            fecha_actualizacion = CURRENT_TIMESTAMP()
          WHERE id_avatar = ?`,
          [Buffer.from(imagen_png, 'base64'), nombre_imagen, avatarConfig.accessory, avatarId]
        );
      } else {
        const [result] = await db.promise().query(
          `INSERT INTO avatar 
          (imagen_png, nombre_imagen, accessory, id_alumno) 
          VALUES (?, ?, ?, ?)`,
          [Buffer.from(imagen_png, 'base64'), nombre_imagen, avatarConfig.accessory, userIdDb]
        );
        avatarId = result.insertId;
      }

      await db.promise().query(
        'UPDATE alumnos SET id_avatar = ? WHERE id = ?',
        [avatarId, userIdDb]
      );

      await db.promise().commit();

      res.json({
        success: true,
        message: 'Avatar guardado correctamente',
        data: {
          userId: userId,
          avatarId: avatarId,
          imagenGuardada: true,
          accessory: avatarConfig.accessory
        }
      });
    } catch (error) {
      await db.promise().rollback();
      throw error;
    }
  } catch (error) {
    console.error('Error al guardar avatar:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error al guardar avatar',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};