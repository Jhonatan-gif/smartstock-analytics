// ============================================================
// Controller: Autenticación
// POST /api/auth/login
// ============================================================

const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const { sql, getPool } = require('../config/database');

async function login(req, res) {
  const { email, password } = req.body;

  // Validación básica de entrada
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error:   'Email y contraseña son requeridos',
    });
  }

  try {
    const pool   = await getPool();
    const result = await pool.request()
      .input('email', sql.NVarChar(150), email.toLowerCase().trim())
      .query(`
        SELECT
          u.Id,
          u.Nombre,
          u.Email,
          u.PasswordHash,
          u.TipoNegocio,
          u.Activo,
          r.NombreRol AS Rol
        FROM dbo.Usuarios u
        INNER JOIN dbo.Roles r ON u.RolId = r.Id
        WHERE u.Email = @email
      `);

    const usuario = result.recordset[0];

    // Verificar existencia y estado activo
    if (!usuario || !usuario.Activo) {
      return res.status(401).json({
        success: false,
        error:   'Credenciales inválidas',
      });
    }

    // Comparar contraseña con hash
    const esValida = await bcrypt.compare(password, usuario.PasswordHash);
    if (!esValida) {
      return res.status(401).json({
        success: false,
        error:   'Credenciales inválidas',
      });
    }

    // Generar JWT con payload mínimo necesario
    const payload = {
      id:          usuario.Id,
      nombre:      usuario.Nombre,
      email:       usuario.Email,
      rol:         usuario.Rol,          // 'Admin' | 'Usuario'
      tipoNegocio: usuario.TipoNegocio,  // 'B2B' | 'B2C' | 'VIP'
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '8h',
    });

    // Respuesta — nunca enviar el hash de la contraseña
    return res.status(200).json({
      success: true,
      data: {
        token,
        usuario: {
          id:          usuario.Id,
          nombre:      usuario.Nombre,
          email:       usuario.Email,
          rol:         usuario.Rol,
          tipoNegocio: usuario.TipoNegocio,
        },
      },
    });

  } catch (err) {
    console.error('Error en login:', err);
    return res.status(500).json({
      success: false,
      error:   'Error interno del servidor',
    });
  }
}

module.exports = { login };
