-- ============================================================
-- CONSULTAS SQL COMPLEJAS - Reportes para el Administrador
-- ============================================================

USE StockDinamico;
GO

-- ============================================================
-- CONSULTA A: Reporte de Alertas de Lotes Próximos a Vencer
-- con Sugerencia de Descuento Automático
-- Usa: JOINs, Subconsultas, CASE WHEN, GROUP BY, HAVING
-- ============================================================
PRINT '=== CONSULTA A: Alertas de Caducidad y Descuentos Sugeridos ===';

WITH StockPorProducto AS (
    -- CTE: stock total vigente por producto
    SELECT
        ProductoId,
        SUM(Cantidad - CantidadReservada) AS StockTotal
    FROM dbo.LotesInventario
    WHERE Activo = 1
      AND FechaCaducidad > CAST(GETDATE() AS DATE)
    GROUP BY ProductoId
),
DemandaSemanal AS (
    -- CTE: ventas de los últimos 7 días por producto
    SELECT
        ProductoId,
        SUM(Cantidad) AS VentasUltimos7Dias,
        COUNT(DISTINCT CAST(FechaVenta AS DATE)) AS DiasConVentas
    FROM dbo.HistorialVentas
    WHERE FechaVenta >= DATEADD(DAY, -7, GETDATE())
    GROUP BY ProductoId
),
LotesConRiesgo AS (
    -- CTE: todos los lotes con datos enriquecidos
    SELECT
        l.Id                                                        AS LoteId,
        l.NumeroLote,
        p.Id                                                        AS ProductoId,
        p.SKU,
        p.Nombre                                                    AS ProductoNombre,
        p.PrecioBase,
        l.Cantidad                                                  AS CantidadDisponible,
        l.CantidadReservada,
        l.Cantidad - l.CantidadReservada                           AS CantidadVendible,
        l.FechaCaducidad,
        DATEDIFF(DAY, CAST(GETDATE() AS DATE), l.FechaCaducidad)   AS DiasParaVencer,
        l.CostoUnitario,
        (l.Cantidad - l.CantidadReservada) * l.CostoUnitario       AS ValorCostoEnRiesgo,
        ISNULL(sp.StockTotal, 0)                                    AS StockTotalProducto,
        ISNULL(ds.VentasUltimos7Dias, 0)                            AS VentasUltimos7Dias,
        -- Días necesarios para vender todo al ritmo actual
        CASE
            WHEN ISNULL(ds.VentasUltimos7Dias, 0) = 0 THEN 9999
            ELSE CAST(ROUND(
                    (l.Cantidad - l.CantidadReservada) /
                    (CAST(ds.VentasUltimos7Dias AS FLOAT) / 7.0)
                 , 0) AS INT)
        END                                                         AS DiasParaAgotarAlRitmoActual
    FROM dbo.LotesInventario l
    INNER JOIN dbo.Productos p ON l.ProductoId = p.Id
    LEFT  JOIN StockPorProducto sp ON p.Id = sp.ProductoId
    LEFT  JOIN DemandaSemanal   ds ON p.Id = ds.ProductoId
    WHERE l.Activo = 1
      AND p.Activo = 1
      AND DATEDIFF(DAY, CAST(GETDATE() AS DATE), l.FechaCaducidad) BETWEEN 0 AND 30
      AND (l.Cantidad - l.CantidadReservada) > 0
)
SELECT
    -- Identificación
    lcr.LoteId,
    lcr.NumeroLote,
    lcr.SKU,
    lcr.ProductoNombre,

    -- Estado de caducidad
    lcr.FechaCaducidad,
    lcr.DiasParaVencer,
    CASE
        WHEN lcr.DiasParaVencer <= 3  THEN '🔴 CRÍTICO'
        WHEN lcr.DiasParaVencer <= 7  THEN '🟠 URGENTE'
        WHEN lcr.DiasParaVencer <= 15 THEN '🟡 ATENCIÓN'
        ELSE                               '🟢 VIGILANCIA'
    END                                 AS NivelAlerta,

    -- Stock y demanda
    lcr.CantidadVendible,
    lcr.StockTotalProducto,
    lcr.VentasUltimos7Dias,
    lcr.DiasParaAgotarAlRitmoActual,

    -- Análisis financiero
    lcr.PrecioBase,
    lcr.CostoUnitario,
    lcr.ValorCostoEnRiesgo,

    -- SUGERENCIA DE DESCUENTO AUTOMÁTICO
    -- Lógica: combina urgencia de caducidad + capacidad de venta actual
    CASE
        WHEN lcr.DiasParaVencer <= 3  THEN 50
        WHEN lcr.DiasParaVencer <= 7  AND lcr.DiasParaAgotarAlRitmoActual > lcr.DiasParaVencer THEN 40
        WHEN lcr.DiasParaVencer <= 7  THEN 30
        WHEN lcr.DiasParaVencer <= 15 AND lcr.DiasParaAgotarAlRitmoActual > lcr.DiasParaVencer THEN 20
        WHEN lcr.DiasParaVencer <= 15 THEN 10
        ELSE 5
    END                                 AS DescuentoSugeridoPct,

    ROUND(lcr.PrecioBase *
        CASE
            WHEN lcr.DiasParaVencer <= 3  THEN 0.50
            WHEN lcr.DiasParaVencer <= 7  AND lcr.DiasParaAgotarAlRitmoActual > lcr.DiasParaVencer THEN 0.60
            WHEN lcr.DiasParaVencer <= 7  THEN 0.70
            WHEN lcr.DiasParaVencer <= 15 AND lcr.DiasParaAgotarAlRitmoActual > lcr.DiasParaVencer THEN 0.80
            WHEN lcr.DiasParaVencer <= 15 THEN 0.90
            ELSE 0.95
        END, 2)                         AS PrecioSugerido,

    -- Pérdida potencial si no se vende a tiempo
    ROUND(
        (lcr.CantidadVendible * lcr.CostoUnitario) -
        (lcr.CantidadVendible * ROUND(lcr.PrecioBase *
            CASE
                WHEN lcr.DiasParaVencer <= 3  THEN 0.50
                WHEN lcr.DiasParaVencer <= 7  THEN 0.65
                WHEN lcr.DiasParaVencer <= 15 THEN 0.85
                ELSE 0.95
            END, 2))
    , 2)                                AS PerdidaEstimadaSiDescuenta,

    -- ¿Aplicar descuento ya o puede esperar?
    CASE
        WHEN lcr.DiasParaAgotarAlRitmoActual > lcr.DiasParaVencer
             THEN '⚡ APLICAR DESCUENTO INMEDIATO'
        WHEN lcr.DiasParaVencer <= 7
             THEN '⚠️  MONITOREAR DIARIAMENTE'
        ELSE      '📋 REVISIÓN SEMANAL'
    END                                 AS AccionRecomendada

FROM LotesConRiesgo lcr
ORDER BY
    lcr.DiasParaVencer ASC,
    lcr.ValorCostoEnRiesgo DESC;
GO

-- ============================================================
-- CONSULTA B: Balance de Inventario y Valorización del Stock
-- Reporte maestro para el administrador
-- Usa: JOINs múltiples, subconsultas correlacionadas, CASE WHEN, ROLLUP
-- ============================================================
PRINT '=== CONSULTA B: Balance de Inventario y Valorización ===';

WITH InventarioActivo AS (
    SELECT
        l.ProductoId,
        l.Id                                                        AS LoteId,
        l.NumeroLote,
        l.Cantidad                                                  AS CantidadTotal,
        l.CantidadReservada,
        l.Cantidad - l.CantidadReservada                           AS CantidadDisponible,
        l.FechaCaducidad,
        DATEDIFF(DAY, CAST(GETDATE() AS DATE), l.FechaCaducidad)   AS DiasParaVencer,
        l.CostoUnitario,
        (l.Cantidad - l.CantidadReservada) * l.CostoUnitario       AS ValorCosto,
        CASE
            WHEN DATEDIFF(DAY, CAST(GETDATE() AS DATE), l.FechaCaducidad) <= 3  THEN 'CRITICO'
            WHEN DATEDIFF(DAY, CAST(GETDATE() AS DATE), l.FechaCaducidad) <= 7  THEN 'URGENTE'
            WHEN DATEDIFF(DAY, CAST(GETDATE() AS DATE), l.FechaCaducidad) <= 15 THEN 'ATENCION'
            WHEN DATEDIFF(DAY, CAST(GETDATE() AS DATE), l.FechaCaducidad) <= 30 THEN 'VIGILANCIA'
            ELSE 'NORMAL'
        END                                                         AS EstadoCaducidad
    FROM dbo.LotesInventario l
    WHERE l.Activo = 1
      AND l.FechaCaducidad > CAST(GETDATE() AS DATE)
      AND (l.Cantidad - l.CantidadReservada) > 0
),
VentasRecientes AS (
    SELECT
        ProductoId,
        SUM(CASE WHEN FechaVenta >= DATEADD(DAY,-7,GETDATE())  THEN Cantidad ELSE 0 END) AS Ventas7Dias,
        SUM(CASE WHEN FechaVenta >= DATEADD(DAY,-30,GETDATE()) THEN Cantidad ELSE 0 END) AS Ventas30Dias,
        AVG(PrecioVenta)                                                                  AS PrecioPromedioVenta
    FROM dbo.HistorialVentas
    GROUP BY ProductoId
)
SELECT
    p.Categoria,
    p.SKU,
    p.Nombre                                                        AS Producto,
    p.PrecioBase,

    -- Stock consolidado
    SUM(ia.CantidadTotal)                                           AS StockBruto,
    SUM(ia.CantidadReservada)                                       AS StockReservado,
    SUM(ia.CantidadDisponible)                                      AS StockDisponible,
    COUNT(DISTINCT ia.LoteId)                                       AS NumeroLotes,

    -- Valorización a costo
    ROUND(SUM(ia.ValorCosto), 2)                                    AS ValorizacionCosto,

    -- Valorización potencial a precio de venta (precio base)
    ROUND(SUM(ia.CantidadDisponible * p.PrecioBase), 2)             AS ValorizacionPrecioBase,

    -- Margen bruto potencial
    ROUND(SUM(ia.CantidadDisponible * p.PrecioBase) -
          SUM(ia.ValorCosto), 2)                                    AS MargenBrutoPotencial,

    ROUND(
        ((SUM(ia.CantidadDisponible * p.PrecioBase) - SUM(ia.ValorCosto)) /
          NULLIF(SUM(ia.CantidadDisponible * p.PrecioBase), 0)) * 100
    , 2)                                                            AS PctMargenBruto,

    -- Estado de riesgo del inventario
    SUM(CASE WHEN ia.EstadoCaducidad = 'CRITICO'    THEN ia.CantidadDisponible ELSE 0 END) AS UnidadesCriticas,
    SUM(CASE WHEN ia.EstadoCaducidad = 'URGENTE'    THEN ia.CantidadDisponible ELSE 0 END) AS UnidadesUrgentes,
    SUM(CASE WHEN ia.EstadoCaducidad = 'ATENCION'   THEN ia.CantidadDisponible ELSE 0 END) AS UnidadesAtencion,
    SUM(CASE WHEN ia.EstadoCaducidad = 'NORMAL'     THEN ia.CantidadDisponible ELSE 0 END) AS UnidadesNormales,

    -- Valor en riesgo (stock que puede vencer pronto)
    ROUND(SUM(CASE WHEN ia.EstadoCaducidad IN ('CRITICO','URGENTE')
                   THEN ia.ValorCosto ELSE 0 END), 2)               AS ValorEnRiesgoInmediato,

    -- Demanda
    ISNULL(vr.Ventas7Dias,  0)                                      AS Ventas7Dias,
    ISNULL(vr.Ventas30Dias, 0)                                      AS Ventas30Dias,
    ISNULL(vr.PrecioPromedioVenta, p.PrecioBase)                    AS PrecioPromedioHistorico,

    -- Días para agotar al ritmo actual (7 días)
    CASE
        WHEN ISNULL(vr.Ventas7Dias, 0) = 0 THEN NULL
        ELSE CAST(ROUND(SUM(ia.CantidadDisponible) /
                        (CAST(vr.Ventas7Dias AS FLOAT) / 7.0), 0) AS INT)
    END                                                             AS DiasParaAgotarStock,

    -- Clasificación ABC del inventario
    CASE
        WHEN ROUND(SUM(ia.CantidadDisponible * p.PrecioBase), 2) >=
             (SELECT PERCENTILE_CONT(0.8) WITHIN GROUP (ORDER BY SUM(l2.Cantidad * p2.PrecioBase))
              FROM dbo.LotesInventario l2
              INNER JOIN dbo.Productos p2 ON l2.ProductoId = p2.Id
              WHERE l2.Activo = 1
              GROUP BY l2.ProductoId)
        THEN 'A - Alto Valor'
        WHEN ROUND(SUM(ia.CantidadDisponible * p.PrecioBase), 2) >=
             (SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY SUM(l2.Cantidad * p2.PrecioBase))
              FROM dbo.LotesInventario l2
              INNER JOIN dbo.Productos p2 ON l2.ProductoId = p2.Id
              WHERE l2.Activo = 1
              GROUP BY l2.ProductoId)
        THEN 'B - Valor Medio'
        ELSE 'C - Bajo Valor'
    END                                                             AS ClasificacionABC,

    -- Semáforo general del producto
    CASE
        WHEN SUM(ia.CantidadDisponible) = 0                         THEN '⛔ SIN STOCK'
        WHEN SUM(ia.CantidadDisponible) < 20                        THEN '🔴 STOCK CRÍTICO'
        WHEN SUM(CASE WHEN ia.EstadoCaducidad='CRITICO' THEN ia.CantidadDisponible ELSE 0 END) > 0
                                                                    THEN '🟠 CADUCIDAD CRÍTICA'
        WHEN SUM(ia.CantidadDisponible) > 300                       THEN '🟡 SOBRESTOCK'
        ELSE                                                              '🟢 NORMAL'
    END                                                             AS EstadoGeneral

FROM dbo.Productos p
LEFT  JOIN InventarioActivo ia ON p.Id = ia.ProductoId
LEFT  JOIN VentasRecientes  vr ON p.Id = vr.ProductoId
WHERE p.Activo = 1
GROUP BY
    p.Categoria,
    p.SKU,
    p.Nombre,
    p.PrecioBase,
    p.Id,
    vr.Ventas7Dias,
    vr.Ventas30Dias,
    vr.PrecioPromedioVenta

ORDER BY
    ValorizacionCosto DESC,
    p.Categoria,
    p.Nombre;
GO

PRINT '✅ Consultas complejas ejecutadas exitosamente';
GO
