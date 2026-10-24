// ============================================================
// Controller: Productos
// GET /api/products  → comportamiento diferente por rol
//   Admin   → stock detallado por lotes
//   Usuario → catálogo con precio dinámico personalizado
// ============================================================

const { sql, getPool } = require('../config/database');

// ──────────────────────────────────────────────────────────────
// GET /api/products
// ──────────────────────────────────────────────────────────────
async function getProducts(req, res) {
  const { rol, id: usuarioId } = req.user;

  try {
    if (rol === 'Admin') {
      return await getProductsAdmin(req, res);
    } else {
      return await getProductsUsuario(req, res, usuarioId);
    }
  } catch (err) {
    console.error('Error en getProducts:', err);
    return res.status(500).json({
      success: false,
      error:   'Error al obtener productos',
    });
  }
}

// ──────────────────────────────────────────────────────────────
// Vista Administrador: stock completo con desglose por lotes
// ──────────────────────────────────────────────────────────────
async function getProductsAdmin(req, res) {
  const pool = await getPool();

  const result = await pool.request().query(`
    SELECT
      p.Id                                                          AS productoId,
      p.SKU,
      p.Nombre,
      p.Descripcion,
      p.Categoria,
      p.PrecioBase,

      -- Totales consolidados
      ISNULL(SUM(l.Cantidad - l.CantidadReservada), 0)             AS stockDisponible,
      ISNULL(SUM(l.Cantidad), 0)                                    AS stockBruto,
      ISNULL(SUM(l.CantidadReservada), 0)                          AS stockReservado,
      COUNT(l.Id)                                                   AS numeroLotes,

      -- Valorización
      ISNULL(ROUND(SUM((l.Cantidad - l.CantidadReservada) * l.CostoUnitario), 2), 0)  AS valorCosto,
      ISNULL(ROUND(SUM((l.Cantidad - l.CantidadReservada) * p.PrecioBase), 2), 0)     AS valorPrecioBase,

      -- Próximo vencimiento
      MIN(CASE WHEN (l.Cantidad - l.CantidadReservada) > 0
               THEN l.FechaCaducidad END)                          AS proximaFechaCaducidad,
      MIN(CASE WHEN (l.Cantidad - l.CantidadReservada) > 0
               THEN DATEDIFF(DAY, CAST(GETDATE() AS DATE), l.FechaCaducidad)
           END)                                                     AS diasAlProximoVencimiento,

      -- Ventas recientes
      ISNULL((
        SELECT SUM(hv.Cantidad)
        FROM dbo.HistorialVentas hv
        WHERE hv.ProductoId = p.Id
          AND hv.FechaVenta >= DATEADD(DAY,-7,GETDATE())
      ), 0)                                                         AS ventas7Dias,

      -- Estado semáforo
      CASE
        WHEN ISNULL(SUM(l.Cantidad - l.CantidadReservada), 0) = 0           THEN 'sin_stock'
        WHEN ISNULL(SUM(l.Cantidad - l.CantidadReservada), 0) < 20          THEN 'critico'
        WHEN MIN(DATEDIFF(DAY, CAST(GETDATE() AS DATE), l.FechaCaducidad)) <= 3 THEN 'caducidad_critica'
        WHEN MIN(DATEDIFF(DAY, CAST(GETDATE() AS DATE), l.FechaCaducidad)) <= 7 THEN 'caducidad_urgente'
        WHEN ISNULL(SUM(l.Cantidad - l.CantidadReservada), 0) > 300         THEN 'sobrestock'
        ELSE 'normal'
      END                                                           AS estado,

      -- Lotes como JSON (para la tabla expandible del admin)
      (
        SELECT
          l2.Id            AS loteId,
          l2.NumeroLote,
          l2.Cantidad,
          l2.CantidadReservada,
          l2.Cantidad - l2.CantidadReservada AS disponible,
          l2.FechaIngreso,
          l2.FechaCaducidad,
          DATEDIFF(DAY, CAST(GETDATE() AS DATE), l2.FechaCaducidad) AS diasParaVencer,
          l2.CostoUnitario
        FROM dbo.LotesInventario l2
        WHERE l2.ProductoId = p.Id
          AND l2.Activo = 1
          AND l2.FechaCaducidad > CAST(GETDATE() AS DATE)
        ORDER BY l2.FechaCaducidad ASC
        FOR JSON PATH
      )                                                             AS lotesJSON

    FROM dbo.Productos p
    LEFT JOIN dbo.LotesInventario l
           ON l.ProductoId = p.Id
          AND l.Activo = 1
          AND l.FechaCaducidad > CAST(GETDATE() AS DATE)
    WHERE p.Activo = 1
    GROUP BY p.Id, p.SKU, p.Nombre, p.Descripcion, p.Categoria, p.PrecioBase
    ORDER BY p.Categoria, p.Nombre
  `);

  // Parsear el JSON de lotes
  const productos = result.recordset.map((p) => ({
    ...p,
    lotes: p.lotesJSON ? JSON.parse(p.lotesJSON) : [],
    lotesJSON: undefined,
  }));

  return res.status(200).json({
    success: true,
    rol:     'Admin',
    total:   productos.length,
    data:    productos,
  });
}

// ──────────────────────────────────────────────────────────────
// Vista Usuario: catálogo con precio dinámico por cliente
// Consume fn_CalcularPrecioDinamicoDetalle para cada producto
// ──────────────────────────────────────────────────────────────
async function getProductsUsuario(req, res, usuarioId) {
  const pool = await getPool();

  // Obtener todos los productos activos con precio dinámico calculado
  // Usamos CROSS APPLY con la función de tabla para eficiencia
  const result = await pool.request()
    .input('usuarioId', sql.Int, usuarioId)
    .query(`
      SELECT
        p.Id                AS productoId,
        p.SKU,
        p.Nombre,
        p.Descripcion,
        p.Categoria,

        -- Precio dinámico calculado con todos los factores
        dpd.PrecioFinal     AS precio,
        dpd.PrecioBase,
        dpd.TipoNegocio,
        dpd.StockTotal      AS stockDisponible,
        dpd.DiasParaVencer,
        dpd.Disponible      AS disponible,
        dpd.PorcentajeVariacion,

        -- Etiqueta de descuento para mostrar en UI
        CASE
          WHEN dpd.PorcentajeVariacion <= -30 THEN 'Gran Oferta'
          WHEN dpd.PorcentajeVariacion <= -10 THEN 'Descuento'
          WHEN dpd.PorcentajeVariacion >= 10  THEN 'Alta Demanda'
          ELSE NULL
        END                 AS etiquetaPromocion,

        -- Indicador de urgencia (solo si hay oferta por caducidad)
        CASE
          WHEN dpd.DiasParaVencer <= 3  THEN 'Últimas horas'
          WHEN dpd.DiasParaVencer <= 7  THEN 'Oferta por tiempo limitado'
          WHEN dpd.DiasParaVencer <= 15 THEN 'Próximo a vencer'
          ELSE NULL
        END                 AS mensajeUrgencia

      FROM dbo.Productos p
      CROSS APPLY dbo.fn_CalcularPrecioDinamicoDetalle(p.Id, @usuarioId) dpd
      WHERE p.Activo = 1
        AND dpd.Disponible = 1
      ORDER BY p.Categoria, p.Nombre
    `);

  return res.status(200).json({
    success: true,
    rol:     'Usuario',
    total:   result.recordset.length,
    data:    result.recordset,
  });
}

// ──────────────────────────────────────────────────────────────
// GET /api/products/:id/price  → precio puntual de un producto
// ──────────────────────────────────────────────────────────────
async function getProductPrice(req, res) {
  const { id: productoId } = req.params;
  const { id: usuarioId }  = req.user;

  if (isNaN(parseInt(productoId))) {
    return res.status(400).json({ success: false, error: 'ID de producto inválido' });
  }

  try {
    const pool   = await getPool();
    const result = await pool.request()
      .input('productoId', sql.Int, parseInt(productoId))
      .input('usuarioId',  sql.Int, usuarioId)
      .query(`
        SELECT * FROM dbo.fn_CalcularPrecioDinamicoDetalle(@productoId, @usuarioId)
      `);

    if (!result.recordset[0]) {
      return res.status(404).json({ success: false, error: 'Producto no encontrado' });
    }

    return res.status(200).json({
      success: true,
      data:    result.recordset[0],
    });
  } catch (err) {
    console.error('Error en getProductPrice:', err);
    return res.status(500).json({ success: false, error: 'Error al calcular precio' });
  }
}

// ──────────────────────────────────────────────────────────────
// GET /api/products/reports/alerts  → solo Admin
// ──────────────────────────────────────────────────────────────
async function getAlerts(req, res) {
  try {
    const pool   = await getPool();
    const result = await pool.request().query(`
      WITH DemandaSemanal AS (
        SELECT ProductoId, SUM(Cantidad) AS VentasUltimos7Dias
        FROM dbo.HistorialVentas
        WHERE FechaVenta >= DATEADD(DAY,-7,GETDATE())
        GROUP BY ProductoId
      )
      SELECT
        l.Id AS loteId,
        l.NumeroLote,
        p.SKU,
        p.Nombre AS producto,
        p.PrecioBase,
        l.Cantidad - l.CantidadReservada AS cantidadVendible,
        l.FechaCaducidad,
        DATEDIFF(DAY, CAST(GETDATE() AS DATE), l.FechaCaducidad) AS diasParaVencer,
        l.CostoUnitario,
        (l.Cantidad - l.CantidadReservada) * l.CostoUnitario AS valorEnRiesgo,
        ISNULL(ds.VentasUltimos7Dias, 0) AS ventas7Dias,
        CASE
          WHEN DATEDIFF(DAY,CAST(GETDATE() AS DATE),l.FechaCaducidad) <= 3  THEN 'CRITICO'
          WHEN DATEDIFF(DAY,CAST(GETDATE() AS DATE),l.FechaCaducidad) <= 7  THEN 'URGENTE'
          WHEN DATEDIFF(DAY,CAST(GETDATE() AS DATE),l.FechaCaducidad) <= 15 THEN 'ATENCION'
          ELSE 'VIGILANCIA'
        END AS nivelAlerta,
        CASE
          WHEN DATEDIFF(DAY,CAST(GETDATE() AS DATE),l.FechaCaducidad) <= 3  THEN 50
          WHEN DATEDIFF(DAY,CAST(GETDATE() AS DATE),l.FechaCaducidad) <= 7  THEN 30
          WHEN DATEDIFF(DAY,CAST(GETDATE() AS DATE),l.FechaCaducidad) <= 15 THEN 10
          ELSE 5
        END AS descuentoSugeridoPct,
        ROUND(p.PrecioBase * CASE
          WHEN DATEDIFF(DAY,CAST(GETDATE() AS DATE),l.FechaCaducidad) <= 3  THEN 0.50
          WHEN DATEDIFF(DAY,CAST(GETDATE() AS DATE),l.FechaCaducidad) <= 7  THEN 0.70
          WHEN DATEDIFF(DAY,CAST(GETDATE() AS DATE),l.FechaCaducidad) <= 15 THEN 0.90
          ELSE 0.95
        END, 2) AS precioSugerido
      FROM dbo.LotesInventario l
      INNER JOIN dbo.Productos p ON l.ProductoId = p.Id
      LEFT  JOIN DemandaSemanal ds ON p.Id = ds.ProductoId
      WHERE l.Activo = 1 AND p.Activo = 1
        AND DATEDIFF(DAY,CAST(GETDATE() AS DATE),l.FechaCaducidad) BETWEEN 0 AND 30
        AND (l.Cantidad - l.CantidadReservada) > 0
      ORDER BY diasParaVencer ASC, valorEnRiesgo DESC
    `);

    return res.status(200).json({
      success: true,
      total:   result.recordset.length,
      data:    result.recordset,
    });
  } catch (err) {
    console.error('Error en getAlerts:', err);
    return res.status(500).json({ success: false, error: 'Error al obtener alertas' });
  }
}

// ──────────────────────────────────────────────────────────────
// GET /api/products/reports/inventory  → solo Admin
// ──────────────────────────────────────────────────────────────
async function getInventoryReport(req, res) {
  try {
    const pool   = await getPool();
    const result = await pool.request().query(`
      SELECT
        p.Categoria,
        p.SKU,
        p.Nombre AS producto,
        p.PrecioBase,
        ISNULL(SUM(l.Cantidad - l.CantidadReservada), 0) AS stockDisponible,
        COUNT(l.Id) AS numeroLotes,
        ISNULL(ROUND(SUM((l.Cantidad-l.CantidadReservada)*l.CostoUnitario),2),0) AS valorizacionCosto,
        ISNULL(ROUND(SUM((l.Cantidad-l.CantidadReservada)*p.PrecioBase),2),0)    AS valorizacionVenta,
        ISNULL(SUM(CASE WHEN DATEDIFF(DAY,CAST(GETDATE() AS DATE),l.FechaCaducidad)<=7
                        THEN l.Cantidad-l.CantidadReservada ELSE 0 END),0) AS unidadesRiesgo,
        CASE
          WHEN ISNULL(SUM(l.Cantidad-l.CantidadReservada),0) = 0   THEN 'sin_stock'
          WHEN ISNULL(SUM(l.Cantidad-l.CantidadReservada),0) < 20  THEN 'critico'
          WHEN ISNULL(SUM(l.Cantidad-l.CantidadReservada),0) > 300 THEN 'sobrestock'
          ELSE 'normal'
        END AS estado
      FROM dbo.Productos p
      LEFT JOIN dbo.LotesInventario l
             ON l.ProductoId = p.Id AND l.Activo = 1
            AND l.FechaCaducidad > CAST(GETDATE() AS DATE)
      WHERE p.Activo = 1
      GROUP BY p.Id, p.Categoria, p.SKU, p.Nombre, p.PrecioBase
      ORDER BY valorizacionCosto DESC
    `);

    const totales = {
      totalProductos:        result.recordset.length,
      totalValorizacionCosto: result.recordset.reduce((s, r) => s + r.valorizacionCosto, 0),
      totalValorizacionVenta: result.recordset.reduce((s, r) => s + r.valorizacionVenta, 0),
      totalUnidadesRiesgo:    result.recordset.reduce((s, r) => s + r.unidadesRiesgo, 0),
    };

    return res.status(200).json({
      success: true,
      totales,
      data:    result.recordset,
    });
  } catch (err) {
    console.error('Error en getInventoryReport:', err);
    return res.status(500).json({ success: false, error: 'Error al obtener reporte' });
  }
}

module.exports = {
  getProducts,
  getProductPrice,
  getAlerts,
  getInventoryReport,
};
