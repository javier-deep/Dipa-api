const db = require('../db/connection');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

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

exports.registerPassword = async (req, res) => {
  const { matricula, password } = req.body;

  try {
    const alumno = await queryAsync('SELECT * FROM alumnos WHERE matricula = ?', [matricula]);
    
    if (alumno.length === 0) {
      return res.status(404).json({ error: 'Matrícula no encontrada' });
    }
    
    if (alumno[0].password) {
      return res.status(400).json({ error: 'La matrícula ya tiene una contraseña registrada' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    await queryAsync('UPDATE alumnos SET password = ? WHERE matricula = ?', [hashedPassword, matricula]);
    
    res.status(200).json({ message: 'Contraseña registrada exitosamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al registrar contraseña' });
  }
};

exports.checkMatricula = async (req, res) => {
  try {
    const { matricula } = req.body;
    
    if (!matricula) {
      return res.status(400).json({ success: false, message: 'La matrícula es requerida' });
    }
    
    const rows = await queryAsync('SELECT id FROM alumnos WHERE matricula = ?', [matricula.trim().toUpperCase()]);
    
    if (rows.length > 0) {
      return res.status(409).json({ success: false, message: 'Esta matrícula ya está registrada' });
    }
    
    res.json({ success: true, message: 'Matrícula disponible' });
  } catch (error) {
    console.error('Error verificando matrícula:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

// Obtener configuración del avatar
exports.getAvatar = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const result = await queryAsync(
      'SELECT avatar_accessories, avatar_base FROM alumnos WHERE id = ?',
      [userId]
    );

    if (result.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const avatarData = result[0];
    let avatarConfig = null;

    // Parse del JSON si existe
    if (avatarData.avatar_accessories) {
      try {
        avatarConfig = JSON.parse(avatarData.avatar_accessories);
      } catch (parseError) {
        console.error('Error parsing avatar config:', parseError);
        avatarConfig = null;
      }
    }

    res.json({
      success: true,
      avatarConfig: avatarConfig,
      avatarBase: avatarData.avatar_base || 'leon'
    });
  } catch (error) {
    console.error('Error getting avatar:', error);
    res.status(500).json({ error: 'Error al obtener avatar' });
  }
};

// Iniciar sesión
exports.login = async (req, res) => {
  console.log('[DEBUG] JWT_SECRET:', process.env.JWT_SECRET ? 'OK' : 'FALTA');
  
  try {
    const { matricula, password } = req.body;

    // Validación básica
    if (!matricula || !password) {
      return res.status(400).json({ error: 'Matrícula y contraseña requeridas' });
    }

    // Usar queryAsync en lugar de db.promise().query
    const alumno = await queryAsync(
      'SELECT * FROM alumnos WHERE matricula = ?', 
      [matricula.trim().toUpperCase()]
    );

    if (!alumno.length) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    const user = alumno[0];
    const isMatch = await bcrypt.compare(password, user.password || '');

    if (!isMatch) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    // Verificación explícita de la clave
    if (!process.env.JWT_SECRET) {
      console.error('ERROR: JWT_SECRET no configurado');
      return res.status(500).json({ error: 'Error de configuración del servidor' });
    }

    const token = jwt.sign(
      { id: user.id, matricula: user.matricula },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    // Parse del avatar si existe
    let avatarConfig = null;
    if (user.avatar_accessories) {
      try {
        avatarConfig = JSON.parse(user.avatar_accessories);
      } catch (parseError) {
        console.error('Error parsing avatar config:', parseError);
      }
    }
    
    return res.json({ 
      token,
      user: {
        id: user.id,
        matricula: user.matricula,
        nombres: user.nombres,
        primer_apellido: user.primer_apellido,
        segundo_apellido: user.segundo_apellido,
        no_generacion: user.no_generacion,
        sede: user.sede,
        academia: user.academia,
      }
    });
  } catch (error) {
    console.error('Error en login:', error);
    return res.status(500).json({ 
      error: 'Error interno del servidor',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.getCurrentUser = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No autorizado' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Usar queryAsync en lugar de db.promise().query
    const user = await queryAsync(
      'SELECT id, matricula FROM alumnos WHERE id = ?',
      [decoded.id]
    );

    if (user.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({ user: user[0] });
  } catch (error) {
    console.error('Error getting current user:', error);
    res.status(500).json({ error: 'Error al obtener usuario' });
  }
};