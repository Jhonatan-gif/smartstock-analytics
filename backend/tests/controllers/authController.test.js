jest.mock('../../src/config/database', () => require('../helpers/dbMock'));

const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const db     = require('../../src/config/database');
const { login } = require('../../src/controllers/authController');
const { mockRes } = require('../helpers/http');

const hash = bcrypt.hashSync('Admin123!', 4);
const usuarioDb = {
  Id: 1, Nombre: 'Administrador', Email: 'admin@stockdinamico.com',
  PasswordHash: hash, TipoNegocio: 'B2B', Activo: true, Rol: 'Admin',
};

beforeEach(() => jest.clearAllMocks());

describe('POST /api/auth/login (controller)', () => {
  test('400 si falta email o contraseña', async () => {
    const res = mockRes();
    await login({ body: { email: 'a@b.com' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(db.getPool).not.toHaveBeenCalled();
  });

  test('normaliza el email (minúsculas y sin espacios) antes de consultar', async () => {
    db.__mock.query.mockResolvedValueOnce({ recordset: [] });
    await login({ body: { email: '  ADMIN@StockDinamico.com ', password: 'x' } }, mockRes());
    expect(db.__mock.request.input).toHaveBeenCalledWith('email', expect.anything(), 'admin@stockdinamico.com');
  });

  test('401 si el usuario no existe', async () => {
    db.__mock.query.mockResolvedValueOnce({ recordset: [] });
    const res = mockRes();
    await login({ body: { email: 'nadie@x.com', password: 'x' } }, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('401 si el usuario está inactivo', async () => {
    db.__mock.query.mockResolvedValueOnce({ recordset: [{ ...usuarioDb, Activo: false }] });
    const res = mockRes();
    await login({ body: { email: usuarioDb.Email, password: 'Admin123!' } }, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('401 si la contraseña es incorrecta', async () => {
    db.__mock.query.mockResolvedValueOnce({ recordset: [usuarioDb] });
    const res = mockRes();
    await login({ body: { email: usuarioDb.Email, password: 'incorrecta' } }, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('200 con JWT válido y sin exponer el hash', async () => {
    db.__mock.query.mockResolvedValueOnce({ recordset: [usuarioDb] });
    const res = mockRes();
    await login({ body: { email: usuarioDb.Email, password: 'Admin123!' } }, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const body = res.json.mock.calls[0][0];
    expect(body.data.usuario).toEqual({
      id: 1, nombre: 'Administrador', email: 'admin@stockdinamico.com', rol: 'Admin', tipoNegocio: 'B2B',
    });
    expect(JSON.stringify(body)).not.toContain(hash);
    expect(jwt.verify(body.data.token, process.env.JWT_SECRET)).toMatchObject({ id: 1, rol: 'Admin' });
  });

  test('500 si falla la base de datos', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    db.getPool.mockRejectedValueOnce(new Error('ECONNREFUSED'));
    const res = mockRes();
    await login({ body: { email: 'a@b.com', password: 'x' } }, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
