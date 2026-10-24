jest.mock('../../src/config/database', () => require('../helpers/dbMock'));

const db = require('../../src/config/database');
const {
  getProducts, getProductPrice, getAlerts, getInventoryReport,
} = require('../../src/controllers/productsController');
const { mockRes } = require('../helpers/http');

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

describe('getProducts', () => {
  test('Admin: devuelve stock detallado y convierte lotesJSON en un arreglo', async () => {
    db.__mock.query.mockResolvedValueOnce({
      recordset: [
        { productoId: 1, Nombre: 'Leche', lotesJSON: '[{"loteId":10,"disponible":35}]' },
        { productoId: 2, Nombre: 'Arroz', lotesJSON: null },
      ],
    });
    const res = mockRes();
    await getProducts({ user: { rol: 'Admin', id: 1 } }, res);

    const body = res.json.mock.calls[0][0];
    expect(res.status).toHaveBeenCalledWith(200);
    expect(body).toMatchObject({ success: true, rol: 'Admin', total: 2 });
    expect(body.data[0].lotes).toEqual([{ loteId: 10, disponible: 35 }]);
    expect(body.data[1].lotes).toEqual([]);
    expect(body.data[0].lotesJSON).toBeUndefined();
  });

  test('Usuario: consulta el precio dinámico con su propio id', async () => {
    db.__mock.query.mockResolvedValueOnce({ recordset: [{ productoId: 1, precio: 0.76 }] });
    const res = mockRes();
    await getProducts({ user: { rol: 'Usuario', id: 4 } }, res);

    expect(db.__mock.request.input).toHaveBeenCalledWith('usuarioId', 'Int', 4);
    expect(res.json.mock.calls[0][0]).toMatchObject({ rol: 'Usuario', total: 1 });
  });

  test('500 si la consulta falla', async () => {
    db.__mock.query.mockRejectedValueOnce(new Error('timeout'));
    const res = mockRes();
    await getProducts({ user: { rol: 'Admin', id: 1 } }, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('getProductPrice', () => {
  test('400 si el id no es numérico', async () => {
    const res = mockRes();
    await getProductPrice({ params: { id: 'abc' }, user: { id: 1 } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(db.getPool).not.toHaveBeenCalled();
  });

  test('404 si el producto no existe', async () => {
    db.__mock.query.mockResolvedValueOnce({ recordset: [] });
    const res = mockRes();
    await getProductPrice({ params: { id: '99' }, user: { id: 1 } }, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('200 con el desglose del precio', async () => {
    const detalle = { PrecioBase: 1.2, PrecioFinal: 0.76, TipoNegocio: 'VIP' };
    db.__mock.query.mockResolvedValueOnce({ recordset: [detalle] });
    const res = mockRes();
    await getProductPrice({ params: { id: '3' }, user: { id: 4 } }, res);

    expect(db.__mock.request.input).toHaveBeenCalledWith('productoId', 'Int', 3);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: detalle });
  });
});

describe('reportes (Admin)', () => {
  test('getInventoryReport suma las valorizaciones y unidades en riesgo', async () => {
    db.__mock.query.mockResolvedValueOnce({
      recordset: [
        { SKU: 'A', valorizacionCosto: 100, valorizacionVenta: 150, unidadesRiesgo: 10 },
        { SKU: 'B', valorizacionCosto: 50.5, valorizacionVenta: 80, unidadesRiesgo: 0 },
      ],
    });
    const res = mockRes();
    await getInventoryReport({}, res);

    expect(res.json.mock.calls[0][0].totales).toEqual({
      totalProductos: 2,
      totalValorizacionCosto: 150.5,
      totalValorizacionVenta: 230,
      totalUnidadesRiesgo: 10,
    });
  });

  test('getAlerts devuelve el total de lotes en alerta', async () => {
    db.__mock.query.mockResolvedValueOnce({ recordset: [{ loteId: 1, nivelAlerta: 'CRITICO' }] });
    const res = mockRes();
    await getAlerts({}, res);
    expect(res.json.mock.calls[0][0]).toMatchObject({ success: true, total: 1 });
  });

  test('getAlerts responde 500 si la consulta falla', async () => {
    db.__mock.query.mockRejectedValueOnce(new Error('boom'));
    const res = mockRes();
    await getAlerts({}, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
