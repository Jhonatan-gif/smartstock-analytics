// Pruebas de las rutas Express completas (middleware + routers) con supertest
jest.mock('../src/config/database', () => require('./helpers/dbMock'));

const request = require('supertest');
const jwt     = require('jsonwebtoken');
const db      = require('../src/config/database');
const app     = require('../src/server');

const tokenFor = (rol) =>
  jwt.sign({ id: 1, nombre: 'Test', email: 't@t.com', rol, tipoNegocio: 'B2C' }, process.env.JWT_SECRET);

beforeEach(() => jest.clearAllMocks());

describe('API StockDinamico', () => {
  test('GET /api/health responde sin autenticación', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true, service: 'StockDinamico API' });
  });

  test('ruta inexistente → 404 JSON', async () => {
    const res = await request(app).get('/api/no-existe');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  test('GET /api/products sin token → 401', async () => {
    const res = await request(app).get('/api/products');
    expect(res.status).toBe(401);
  });

  test('GET /api/products con token de Admin → 200', async () => {
    db.__mock.query.mockResolvedValueOnce({ recordset: [] });
    const res = await request(app).get('/api/products').set('Authorization', `Bearer ${tokenFor('Admin')}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true, rol: 'Admin', total: 0 });
  });

  test('reportes de Admin bloqueados para rol Usuario → 403', async () => {
    const res = await request(app)
      .get('/api/products/reports/alerts')
      .set('Authorization', `Bearer ${tokenFor('Usuario')}`);
    expect(res.status).toBe(403);
    expect(db.getPool).not.toHaveBeenCalled();
  });

  test('POST /api/auth/login sin cuerpo → 400', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    expect(res.status).toBe(400);
  });
});
