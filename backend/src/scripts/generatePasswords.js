// ============================================================
// Script: Generar hashes bcrypt para los usuarios de prueba
// Ejecutar: node src/scripts/generatePasswords.js
// Luego copia los hashes al 02_seed_data.sql
// ============================================================

const bcrypt = require('bcryptjs');
const { sql, getPool, closePool } = require('../config/database');

const USUARIOS = [
  { email: 'admin@stockdinamico.com',  password: 'Admin123!' },
  { email: 'carlos@distribuidora.com', password: 'User123!'  },
  { email: 'ana@gmail.com',            password: 'User123!'  },
  { email: 'vip@supercorp.com',        password: 'User123!'  },
];

async function generateAndUpdate() {
  console.log('🔐 Generando hashes bcrypt...\n');

  for (const u of USUARIOS) {
    const hash = await bcrypt.hash(u.password, 10);
    console.log(`Email:    ${u.email}`);
    console.log(`Password: ${u.password}`);
    console.log(`Hash:     ${hash}\n`);
  }

  console.log('📋 SQL para actualizar hashes:');
  console.log('-- Ejecuta esto en SQL Server Management Studio:\n');

  for (const u of USUARIOS) {
    const hash = await bcrypt.hash(u.password, 10);
    console.log(`UPDATE dbo.Usuarios SET PasswordHash = '${hash}' WHERE Email = '${u.email}';`);
  }

  // Opcional: actualizar directamente en la BD
  try {
    const pool = await getPool();
    console.log('\n⚡ Actualizando en base de datos...');

    for (const u of USUARIOS) {
      const hash = await bcrypt.hash(u.password, 10);
      await pool.request()
        .input('hash',  sql.NVarChar(255), hash)
        .input('email', sql.NVarChar(150), u.email)
        .query('UPDATE dbo.Usuarios SET PasswordHash = @hash WHERE Email = @email');
      console.log(`✅ Actualizado: ${u.email}`);
    }

    await closePool();
    console.log('\n✅ Todos los hashes actualizados correctamente');
  } catch (err) {
    console.log(`\n⚠️  No se pudo conectar a la BD (${err.message}). Usa los hashes SQL de arriba manualmente.`);
  }
}

generateAndUpdate();
