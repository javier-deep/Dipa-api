const verifyMatricula = (req, res, next) => {
  const { matricula } = req.body;
  
  if (!matricula) {
    return res.status(400).json({
      success: false,
      error: 'Matrícula es requerida'
    });
  }

  if (req.user && req.user.matricula !== matricula) {
    return res.status(403).json({
      success: false,
      error: 'Matrícula no coincide con usuario autenticado'
    });
  }
  
  next();
};

module.exports = verifyMatricula;