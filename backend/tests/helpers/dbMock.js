// Mock de src/config/database: sustituye el pool de SQL Server (mssql).
// Uso en un test:
//   jest.mock('../../src/config/database', () => require('../helpers/dbMock'));
//   const db = require('../../src/config/database');
//   db.__mock.query.mockResolvedValueOnce({ recordset: [...] });
const query   = jest.fn();
const request = { input: jest.fn(), query };
request.input.mockReturnValue(request);

module.exports = {
  sql: {
    NVarChar: jest.fn((len) => `NVarChar(${len})`),
    Int:      'Int',
  },
  getPool:   jest.fn(async () => ({ request: () => request })),
  closePool: jest.fn(async () => {}),
  __mock: { query, request },
};
