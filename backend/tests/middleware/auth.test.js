const jwt = require('jsonwebtoken');
const { authMiddleware, requireRole } = require('../../src/middleware/auth');
const { mockRes } = require('../helpers/http');

const payload = { id: 1, nombre: 'Admin', email: 'admin@test.com', rol: 'Admin', tipoNegocio: 'B2B' };

describe('authMiddleware', () => {
  test('responde 401 si no hay token', () => {
    const res = mockRes(), next = jest.fn();
    authMiddleware({ headers: {} }, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('responde 403 si el token es inválido', () => {
    const res = mockRes(), next = jest.fn();
    authMiddleware({ headers: { authorization: 'Bearer no-es-un-jwt' } }, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Token inválido' });
  });

  test('responde 401 si el token expiró', () => {
    const token = jwt.sign({ ...payload, exp: Math.floor(Date.now() / 1000) - 60 }, process.env.JWT_SECRET);
    const res = mockRes(), next = jest.fn();
    authMiddleware({ headers: { authorization: `Bearer ${token}` } }, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Token expirado' });
  });

  test('con token válido adjunta req.user y llama a next()', () => {
    const token = jwt.sign(payload, process.env.JWT_SECRET);
    const req = { headers: { authorization: `Bearer ${token}` } };
    const next = jest.fn();
    authMiddleware(req, mockRes(), next);
    expect(next).toHaveBeenCalled();
    expect(req.user).toMatchObject(payload);
  });
});

describe('requireRole', () => {
  test('responde 401 si no hay usuario autenticado', () => {
    const res = mockRes();
    requireRole('Admin')({}, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('responde 403 si el rol no está permitido', () => {
    const res = mockRes(), next = jest.fn();
    requireRole('Admin')({ user: { rol: 'Usuario' } }, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  test('deja pasar si el rol coincide con alguno de los permitidos', () => {
    const next = jest.fn();
    requireRole('Admin', 'Usuario')({ user: { rol: 'Usuario' } }, mockRes(), next);
    expect(next).toHaveBeenCalled();
  });
});
