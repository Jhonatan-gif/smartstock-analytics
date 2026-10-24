// ============================================================
// Servidor Express - StockDinamico API
// ============================================================

require('dotenv').config();
const express    = require('express');
const helmet     = require('helmet');
const cors       = require('cors');
const rateLimit  = require('express-rate-limit');
const { closePool } = require('./config/database');

const authRoutes     = require('./routes/auth');
const productsRoutes = require('./routes/products');

const app  = express();
const PORT = process.env.PORT || 3001;

// ──────────────────────────────────────────────────────────────
// Middleware de seguridad
// ──────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin:      process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '10kb' }));

// Rate limiting global
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutos
  max:      100,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { success: false, error: 'Demasiadas peticiones, intenta más tarde' },
});
app.use('/api/', limiter);

// Rate limiting estricto para auth
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      10,
  message: { success: false, error: 'Demasiados intentos de login' },
});
app.use('/api/auth/login', authLimiter);

// ──────────────────────────────────────────────────────────────
// Rutas
// ──────────────────────────────────────────────────────────────
app.use('/api/auth',     authRoutes);
app.use('/api/products', productsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    service: 'StockDinamico API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, error: `Ruta no encontrada: ${req.method} ${req.path}` });
});

// Error handler global
app.use((err, req, res, next) => {
  console.error('Error no manejado:', err);
  res.status(500).json({ success: false, error: 'Error interno del servidor' });
});

// ──────────────────────────────────────────────────────────────
// Arranque
// ──────────────────────────────────────────────────────────────
// Solo escucha si se ejecuta directamente (node src/server.js);
// al importarse desde los tests se usa la app sin abrir el puerto.
if (require.main === module) {
  const server = app.listen(PORT, () => {
    console.log(`🚀 StockDinamico API corriendo en http://localhost:${PORT}`);
    console.log(`📊 Entorno: ${process.env.NODE_ENV || 'development'}`);
  });

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('📴 SIGTERM recibido, cerrando servidor...');
    server.close(async () => {
      await closePool();
      process.exit(0);
    });
  });

  process.on('SIGINT', async () => {
    await closePool();
    process.exit(0);
  });
}

module.exports = app;
