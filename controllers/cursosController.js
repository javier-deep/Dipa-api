const db = require('../db/connection');

// Función auxiliar para comparar horas
const compareTimes = (time1, time2) => {
  const [h1, m1, s1] = time1.split(':').map(Number);
  const [h2, m2, s2] = time2.split(':').map(Number);
  
  if (h1 !== h2) return h1 - h2;
  if (m1 !== m2) return m1 - m2;
  return s1 - s2;
};

// Función para obtener todos los cursos (con filtro por sede)
const obtenerCursos = (req, res) => {
  const { sede } = req.query;
  
  let query = `
    SELECT t.*, s.nombre as nombre_sede 
    FROM talleres t 
    LEFT JOIN sedes s ON t.sede = s.id
  `;
  const params = [];
  
  // Validación mejorada
  if (sede && sede !== 'all') {
    const sedeId = parseInt(sede, 10);
    if (!isNaN(sedeId) && sedeId > 0) {
      query += ' WHERE t.sede = ?';
      params.push(sedeId);
    }
  }

  db.query(query, params, (err, results) => {
    if (err) {
      console.error('Error al obtener cursos:', err);
      return res.status(500).json({ 
        error: 'Error al obtener los cursos',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
    
    const cursosConSede = results.map(curso => ({
      ...curso,
      sede_nombre: curso.nombre_sede || 'Sin sede asignada'
    }));
    
    res.json(cursosConSede);
  });
};

// Función para validar código
const validarCodigo = async (req, res) => {
  const { codigo, alumnoId } = req.body;

  if (!codigo || typeof codigo !== 'string') {
    return res.status(400).json({ valid: false, message: 'Código requerido' });
  }

  if (!alumnoId) {
    return res.status(400).json({ valid: false, message: 'ID de alumno requerido' });
  }

  const codigoNormalizado = codigo.trim().toUpperCase();

  try {
    // Verificar si el alumno existe
    const [alumno] = await db.promise().query('SELECT id FROM alumnos WHERE id = ?', [alumnoId]);
    if (alumno.length === 0) {
      return res.status(404).json({ valid: false, message: 'Alumno no encontrado' });
    }

    // Buscar el taller con el código
    const [talleres] = await db.promise().query(
      'SELECT * FROM talleres WHERE codigo_finalizacion = ?',
      [codigoNormalizado]
    );

    if (talleres.length === 0) {
      return res.json({ valid: false, message: 'Código no encontrado' });
    }

    const taller = talleres[0];
    const ahora = new Date();
    
    // Validaciones de fecha y hora
    const fechaHoy = ahora.toLocaleDateString('en-CA');
    const fechaHabilitada = new Date(taller.fecha_habilitada).toLocaleDateString('en-CA');
    
    if (fechaHoy !== fechaHabilitada) {
      return res.json({
        valid: false,
        message: `Código válido solo el ${fechaHabilitada} (hoy es ${fechaHoy})`
      });
    }

    const horaAhora = ahora.toTimeString().substring(0, 8);
    
    if (compareTimes(horaAhora, taller.hora_inicio) < 0) {
      return res.json({
        valid: false,
        message: `El código será válido a partir de las ${taller.hora_inicio}`
      });
    }

    if (compareTimes(horaAhora, taller.hora_fin) > 0) {
      return res.json({
        valid: false,
        message: `El código era válido hasta las ${taller.hora_fin}`
      });
    }

    // Verificar si el alumno ya completó este taller
    const [completados] = await db.promise().query(
      'SELECT * FROM alumno_talleres WHERE id_alumno = ? AND id_taller = ?',
      [alumnoId, taller.id]
    );

    if (completados.length > 0) {
      return res.json({
        valid: false,
        message: `Ya has completado este taller: ${taller.titulo}`
      });
    }

    // Registrar el taller completado
    await db.promise().query(
      'INSERT INTO alumno_talleres (id_alumno, id_taller, codigo_ingresado, fecha_completado) VALUES (?, ?, ?, NOW())',
      [alumnoId, taller.id, codigoNormalizado]
    );

    res.json({
      valid: true,
      curso: {
        id: taller.id,
        titulo: taller.titulo,
        sede: taller.sede,
        horario: `${taller.hora_inicio} - ${taller.hora_fin}`,
        fecha: fechaHabilitada
      }
    });

  } catch (err) {
    console.error('Error al validar el código:', err);
    return res.status(500).json({ valid: false, message: 'Error en el servidor' });
  }
};

// Función para obtener todas las sedes
const obtenerSedes = (req, res) => {
  db.query('SELECT * FROM sedes WHERE status = "activo"', (err, results) => {
    if (err) {
      console.error('Error al obtener sedes:', err);
      return res.status(500).json({ 
        error: 'Error al obtener las sedes',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
    res.json(results);
  });
};

// Función para obtener cursos completados por alumno
const obtenerCursosCompletados = (req, res) => {
  const { alumnoId } = req.params;

  if (!alumnoId) {
    return res.status(400).json({ error: 'ID de alumno requerido' });
  }

  const query = `
    SELECT t.*, at.fecha_completado, at.codigo_ingresado, s.nombre as sede_nombre
    FROM alumno_talleres at
    JOIN talleres t ON at.id_taller = t.id
    LEFT JOIN sedes s ON t.sede = s.id
    WHERE at.id_alumno = ?
    ORDER BY at.fecha_completado DESC
  `;

  db.query(query, [alumnoId], (err, results) => {
    if (err) {
      console.error('Error al obtener cursos completados:', err);
      return res.status(500).json({ 
        error: 'Error al obtener los cursos completados',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
    
    res.json(results);
  });
};

// Exportar todas las funciones
module.exports = {
  obtenerCursos,
  validarCodigo,
  obtenerSedes,
  obtenerCursosCompletados
};