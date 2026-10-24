const sql = require('mssql');
require('dotenv').config();

const config = {
  server:   process.env.DB_SERVER || 'localhost',
  port:     parseInt(process.env.DB_PORT, 10) || 1433,
  database: process.env.DB_NAME || 'StockDinamico',
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: {
    encrypt:                false,
    trustServerCertificate: true,
    enableArithAbort:       true,
  },
  pool: {
    max:               10,
    min:               2,
    idleTimeoutMillis: 30000,
  },
};

let pool = null;

async function getPool() {
  if (pool) return pool;
  try {
    pool = await new sql.ConnectionPool(config).connect();
    console.log('✅ Conexión a SQL Server establecida');
    pool.on('error', (err) => {
      console.error('❌ Error en el pool:', err);
      pool = null;
    });
    return pool;
  } catch (err) {
    console.error('❌ No se pudo conectar a SQL Server:', err.message);
    throw err;
  }
}

async function closePool() {
  if (pool) {
    await pool.close();
    pool = null;
  }
}

module.exports = { sql, getPool, closePool };