// ============================================================
// Rutas: Productos
// Todas requieren JWT. Algunas solo Admin.
// ============================================================
const express  = require('express');
const router   = express.Router();
const { authMiddleware, requireRole } = require('../middleware/auth');
const {
  getProducts,
  getProductPrice,
  getAlerts,
  getInventoryReport,
} = require('../controllers/productsController');

// GET /api/products → Admin ve stock detallado; Usuario ve precios dinámicos
router.get('/', authMiddleware, getProducts);

// GET /api/products/:id/price → precio puntual para el usuario autenticado
router.get('/:id/price', authMiddleware, getProductPrice);

// GET /api/products/reports/alerts → solo Admin
router.get('/reports/alerts', authMiddleware, requireRole('Admin'), getAlerts);

// GET /api/products/reports/inventory → solo Admin
router.get('/reports/inventory', authMiddleware, requireRole('Admin'), getInventoryReport);

module.exports = router;
