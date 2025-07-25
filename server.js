require('dotenv').config();
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();

const app = express();

// Middleware (sin cambios)
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Rutas (agregando solo las nuevas)
const avatarRoutes = require('./routes/avatarRoutes');  // ✅ Nueva ruta del avatar
const cursosRoutes = require('./routes/cursos');
const bannersRoutes = require('./routes/banners');
const authRoutes = require('./routes/authRoutes');

// Registrar rutas (agregando la nueva)
app.use('/api/cursos', cursosRoutes);
app.use('/api/banners', bannersRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/avatar', avatarRoutes);  // ✅ Nueva ruta registrada

// Puerto (sin cambios)
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Servidor escuchando en http://localhost:${PORT}`);
});