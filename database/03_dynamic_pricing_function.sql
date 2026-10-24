-- ============================================================
-- FUNCIÓN: fn_CalcularPrecioDinamico
-- Core de Precios Dinámicos
-- Evalúa: tipo negocio + stock + caducidad + demanda
-- Retorna tabla con precio final y desglose de factores
-- ============================================================

USE StockDinamico;
GO

-- Primero creamos un tipo de tabla auxiliar para el retorno
IF TYPE_ID('dbo.PrecioDesglosado') IS NOT NULL
    DROP TYPE dbo.PrecioDesglosado;
GO

-- ============================================================
-- FUNCIÓN ESCALAR: fn_CalcularPrecioDinamico
-- Retorna DECIMAL con el precio final calculado
-- ============================================================
IF OBJECT_ID('dbo.fn_CalcularPrecioDinamico', 'FN') IS NOT NULL
    DROP FUNCTION dbo.fn_CalcularPrecioDinamico;
GO

CREATE FUNCTION dbo.fn_CalcularPrecioDinamico
(
    @ProductoId INT,
    @UsuarioId  INT
)
RETURNS DECIMAL(18,2)
AS
BEGIN
    -- ==========================================================
    -- Variables de trabajo
    -- ==========================================================
    DECLARE @PrecioBase          DECIMAL(18,2) = 0;
    DECLARE @PrecioFinal         DECIMAL(18,2) = 0;
    DECLARE @TipoNegocio         NVARCHAR(10)  = 'B2C';

    -- Factores multiplicadores (cada uno modifica el precio base)
    DECLARE @FactorTipoNegocio   DECIMAL(10,4) = 1.0;
    DECLARE @FactorStock         DECIMAL(10,4) = 1.0;
    DECLARE @FactorCaducidad     DECIMAL(10,4) = 1.0;
    DECLARE @FactorDemanda       DECIMAL(10,4) = 1.0;

    -- Variables de análisis
    DECLARE @StockTotal          INT           = 0;
    DECLARE @DiasParaVencer      INT           = 9999;
    DECLARE @VentasUltimos7Dias  INT           = 0;
    DECLARE @LoteMasProximoId    INT           = NULL;

    -- ==========================================================
    -- PASO 1: Obtener precio base del producto
    -- ==========================================================
    SELECT @PrecioBase = PrecioBase
    FROM   dbo.Productos
    WHERE  Id = @ProductoId AND Activo = 1;

    -- Si el producto no existe, retornar 0
    IF @PrecioBase IS NULL OR @PrecioBase = 0
        RETURN 0;

    -- ==========================================================
    -- PASO 2: Obtener tipo de negocio del usuario
    -- ==========================================================
    SELECT @TipoNegocio = TipoNegocio
    FROM   dbo.Usuarios
    WHERE  Id = @UsuarioId AND Activo = 1;

    -- Si el usuario no existe, usar B2C por defecto
    IF @TipoNegocio IS NULL
        SET @TipoNegocio = 'B2C';

    -- ==========================================================
    -- PASO 3: Calcular stock total disponible
    -- ==========================================================
    SELECT @StockTotal = ISNULL(SUM(Cantidad - CantidadReservada), 0)
    FROM   dbo.LotesInventario
    WHERE  ProductoId = @ProductoId
      AND  Activo = 1
      AND  FechaCaducidad > CAST(GETDATE() AS DATE);  -- solo lotes no vencidos

    -- ==========================================================
    -- PASO 4: Obtener el lote más próximo a vencer (FEFO)
    -- First Expired, First Out — el que se debe vender primero
    -- ==========================================================
    SELECT TOP 1
        @LoteMasProximoId = Id,
        @DiasParaVencer   = DATEDIFF(DAY, CAST(GETDATE() AS DATE), FechaCaducidad)
    FROM   dbo.LotesInventario
    WHERE  ProductoId = @ProductoId
      AND  Activo = 1
      AND  (Cantidad - CantidadReservada) > 0
      AND  FechaCaducidad > CAST(GETDATE() AS DATE)
    ORDER BY FechaCaducidad ASC;  -- el que vence antes primero

    -- ==========================================================
    -- PASO 5: Calcular ventas de los últimos 7 días (demanda)
    -- ==========================================================
    SELECT @VentasUltimos7Dias = ISNULL(SUM(Cantidad), 0)
    FROM   dbo.HistorialVentas
    WHERE  ProductoId = @ProductoId
      AND  FechaVenta >= DATEADD(DAY, -7, GETDATE());

    -- ==========================================================
    -- PASO 6: Determinar FACTOR por Tipo de Negocio
    -- Regla: cada tipo de cliente tiene su multiplicador base
    -- ==========================================================
    SELECT @FactorTipoNegocio = FactorMultiplicador
    FROM   dbo.ReglasPrecios
    WHERE  TipoRegla = CASE @TipoNegocio
                            WHEN 'B2B' THEN 'TIPO_NEGOCIO_B2B'
                            WHEN 'B2C' THEN 'TIPO_NEGOCIO_B2C'
                            WHEN 'VIP' THEN 'TIPO_NEGOCIO_VIP'
                            ELSE            'TIPO_NEGOCIO_B2C'
                       END
      AND  Activo = 1;

    IF @FactorTipoNegocio IS NULL SET @FactorTipoNegocio = 1.0;

    -- ==========================================================
    -- PASO 7: Determinar FACTOR por Stock (oferta/demanda)
    -- Regla: stock bajo → precio sube | sobrestock → precio baja
    -- ==========================================================
    SET @FactorStock =
        CASE
            WHEN @StockTotal < 50  THEN
                ISNULL((SELECT TOP 1 FactorMultiplicador FROM dbo.ReglasPrecios
                        WHERE TipoRegla = 'STOCK_BAJO' AND Activo = 1), 1.20)
            WHEN @StockTotal > 300 THEN
                ISNULL((SELECT TOP 1 FactorMultiplicador FROM dbo.ReglasPrecios
                        WHERE TipoRegla = 'SOBRESTOCK' AND Activo = 1), 0.80)
            ELSE 1.0
        END;

    -- ==========================================================
    -- PASO 8: Determinar FACTOR por Caducidad (descuento progresivo)
    -- Regla: cuanto más próximo a vencer, mayor el descuento
    -- ==========================================================
    SET @FactorCaducidad =
        CASE
            WHEN @DiasParaVencer <= 3  THEN
                ISNULL((SELECT TOP 1 FactorMultiplicador FROM dbo.ReglasPrecios
                        WHERE TipoRegla = 'CADUCIDAD_CRITICA' AND Activo = 1), 0.50)
            WHEN @DiasParaVencer <= 7  THEN
                ISNULL((SELECT TOP 1 FactorMultiplicador FROM dbo.ReglasPrecios
                        WHERE TipoRegla = 'CADUCIDAD_PRONTO' AND Activo = 1), 0.70)
            WHEN @DiasParaVencer <= 15 THEN
                ISNULL((SELECT TOP 1 FactorMultiplicador FROM dbo.ReglasPrecios
                        WHERE TipoRegla = 'CADUCIDAD_NORMAL' AND Activo = 1), 0.90)
            ELSE 1.0
        END;

    -- ==========================================================
    -- PASO 9: Determinar FACTOR por Demanda
    -- Regla: alta demanda → recargo | baja demanda → descuento
    -- ==========================================================
    SET @FactorDemanda =
        CASE
            WHEN @VentasUltimos7Dias > 100 THEN
                ISNULL((SELECT TOP 1 FactorMultiplicador FROM dbo.ReglasPrecios
                        WHERE TipoRegla = 'ALTA_DEMANDA' AND Activo = 1), 1.15)
            WHEN @VentasUltimos7Dias < 10  THEN
                ISNULL((SELECT TOP 1 FactorMultiplicador FROM dbo.ReglasPrecios
                        WHERE TipoRegla = 'BAJA_DEMANDA' AND Activo = 1), 0.95)
            ELSE 1.0
        END;

    -- ==========================================================
    -- PASO 10: Calcular precio final
    -- Fórmula: PrecioBase × TipoNegocio × Stock × Caducidad × Demanda
    -- ==========================================================
    SET @PrecioFinal = @PrecioBase
                     * @FactorTipoNegocio
                     * @FactorStock
                     * @FactorCaducidad
                     * @FactorDemanda;

    -- Asegurar precio mínimo (no puede ser negativo ni cero)
    IF @PrecioFinal <= 0 SET @PrecioFinal = @PrecioBase * 0.10;

    RETURN ROUND(@PrecioFinal, 2);
END
GO

-- ============================================================
-- FUNCIÓN DE TABLA: fn_CalcularPrecioDinamicoDetalle
-- Versión con desglose completo para transparencia al admin
-- ============================================================
IF OBJECT_ID('dbo.fn_CalcularPrecioDinamicoDetalle', 'TF') IS NOT NULL
    DROP FUNCTION dbo.fn_CalcularPrecioDinamicoDetalle;
GO

CREATE FUNCTION dbo.fn_CalcularPrecioDinamicoDetalle
(
    @ProductoId INT,
    @UsuarioId  INT
)
RETURNS @Resultado TABLE
(
    ProductoId          INT,
    ProductoNombre      NVARCHAR(200),
    SKU                 NVARCHAR(50),
    PrecioBase          DECIMAL(18,2),
    TipoNegocio         NVARCHAR(10),
    FactorTipoNegocio   DECIMAL(10,4),
    StockTotal          INT,
    FactorStock         DECIMAL(10,4),
    DiasParaVencer      INT,
    LoteMasProximoId    INT,
    FactorCaducidad     DECIMAL(10,4),
    VentasUltimos7Dias  INT,
    FactorDemanda       DECIMAL(10,4),
    PrecioFinal         DECIMAL(18,2),
    PorcentajeVariacion DECIMAL(10,2),
    Disponible          BIT
)
AS
BEGIN
    DECLARE @PrecioBase          DECIMAL(18,2) = 0;
    DECLARE @ProductoNombre      NVARCHAR(200) = '';
    DECLARE @SKU                 NVARCHAR(50)  = '';
    DECLARE @TipoNegocio         NVARCHAR(10)  = 'B2C';
    DECLARE @FactorTipoNegocio   DECIMAL(10,4) = 1.0;
    DECLARE @FactorStock         DECIMAL(10,4) = 1.0;
    DECLARE @FactorCaducidad     DECIMAL(10,4) = 1.0;
    DECLARE @FactorDemanda       DECIMAL(10,4) = 1.0;
    DECLARE @StockTotal          INT           = 0;
    DECLARE @DiasParaVencer      INT           = 9999;
    DECLARE @VentasUltimos7Dias  INT           = 0;
    DECLARE @LoteMasProximoId    INT           = NULL;
    DECLARE @PrecioFinal         DECIMAL(18,2) = 0;

    SELECT @PrecioBase = PrecioBase, @ProductoNombre = Nombre, @SKU = SKU
    FROM   dbo.Productos WHERE Id = @ProductoId AND Activo = 1;

    IF @PrecioBase IS NULL
    BEGIN
        INSERT INTO @Resultado VALUES (@ProductoId, 'No encontrado', '', 0, 'N/A', 1, 0, 1, 0, NULL, 1, 0, 1, 0, 0, 0);
        RETURN;
    END

    SELECT @TipoNegocio = ISNULL(TipoNegocio, 'B2C')
    FROM   dbo.Usuarios WHERE Id = @UsuarioId AND Activo = 1;
    IF @TipoNegocio IS NULL SET @TipoNegocio = 'B2C';

    SELECT @StockTotal = ISNULL(SUM(Cantidad - CantidadReservada), 0)
    FROM   dbo.LotesInventario
    WHERE  ProductoId = @ProductoId AND Activo = 1
      AND  FechaCaducidad > CAST(GETDATE() AS DATE);

    SELECT TOP 1
        @LoteMasProximoId = Id,
        @DiasParaVencer   = DATEDIFF(DAY, CAST(GETDATE() AS DATE), FechaCaducidad)
    FROM   dbo.LotesInventario
    WHERE  ProductoId = @ProductoId AND Activo = 1
      AND  (Cantidad - CantidadReservada) > 0
      AND  FechaCaducidad > CAST(GETDATE() AS DATE)
    ORDER BY FechaCaducidad ASC;

    SELECT @VentasUltimos7Dias = ISNULL(SUM(Cantidad), 0)
    FROM   dbo.HistorialVentas
    WHERE  ProductoId = @ProductoId
      AND  FechaVenta >= DATEADD(DAY, -7, GETDATE());

    SELECT @FactorTipoNegocio = ISNULL(FactorMultiplicador, 1.0)
    FROM   dbo.ReglasPrecios
    WHERE  TipoRegla = CASE @TipoNegocio
                            WHEN 'B2B' THEN 'TIPO_NEGOCIO_B2B'
                            WHEN 'VIP' THEN 'TIPO_NEGOCIO_VIP'
                            ELSE 'TIPO_NEGOCIO_B2C'
                       END AND Activo = 1;

    SET @FactorStock = CASE
        WHEN @StockTotal < 50  THEN ISNULL((SELECT TOP 1 FactorMultiplicador FROM dbo.ReglasPrecios WHERE TipoRegla='STOCK_BAJO' AND Activo=1), 1.20)
        WHEN @StockTotal > 300 THEN ISNULL((SELECT TOP 1 FactorMultiplicador FROM dbo.ReglasPrecios WHERE TipoRegla='SOBRESTOCK' AND Activo=1), 0.80)
        ELSE 1.0 END;

    SET @FactorCaducidad = CASE
        WHEN @DiasParaVencer <= 3  THEN ISNULL((SELECT TOP 1 FactorMultiplicador FROM dbo.ReglasPrecios WHERE TipoRegla='CADUCIDAD_CRITICA' AND Activo=1), 0.50)
        WHEN @DiasParaVencer <= 7  THEN ISNULL((SELECT TOP 1 FactorMultiplicador FROM dbo.ReglasPrecios WHERE TipoRegla='CADUCIDAD_PRONTO' AND Activo=1), 0.70)
        WHEN @DiasParaVencer <= 15 THEN ISNULL((SELECT TOP 1 FactorMultiplicador FROM dbo.ReglasPrecios WHERE TipoRegla='CADUCIDAD_NORMAL' AND Activo=1), 0.90)
        ELSE 1.0 END;

    SET @FactorDemanda = CASE
        WHEN @VentasUltimos7Dias > 100 THEN ISNULL((SELECT TOP 1 FactorMultiplicador FROM dbo.ReglasPrecios WHERE TipoRegla='ALTA_DEMANDA' AND Activo=1), 1.15)
        WHEN @VentasUltimos7Dias < 10  THEN ISNULL((SELECT TOP 1 FactorMultiplicador FROM dbo.ReglasPrecios WHERE TipoRegla='BAJA_DEMANDA' AND Activo=1), 0.95)
        ELSE 1.0 END;

    SET @PrecioFinal = ROUND(@PrecioBase * @FactorTipoNegocio * @FactorStock * @FactorCaducidad * @FactorDemanda, 2);
    IF @PrecioFinal <= 0 SET @PrecioFinal = @PrecioBase * 0.10;

    INSERT INTO @Resultado
    SELECT
        @ProductoId,
        @ProductoNombre,
        @SKU,
        @PrecioBase,
        @TipoNegocio,
        @FactorTipoNegocio,
        @StockTotal,
        @FactorStock,
        CASE WHEN @DiasParaVencer = 9999 THEN NULL ELSE @DiasParaVencer END,
        @LoteMasProximoId,
        @FactorCaducidad,
        @VentasUltimos7Dias,
        @FactorDemanda,
        @PrecioFinal,
        ROUND(((@PrecioFinal - @PrecioBase) / @PrecioBase) * 100, 2),
        CASE WHEN @StockTotal > 0 THEN 1 ELSE 0 END;

    RETURN;
END
GO

PRINT '✅ Funciones de precios dinámicos creadas exitosamente';
GO

-- ============================================================
-- TEST: Verificar función para los 4 usuarios de prueba
-- ============================================================
PRINT '--- TEST fn_CalcularPrecioDinamico (precio escalar) ---';
SELECT
    u.Nombre,
    u.TipoNegocio,
    p.Nombre AS Producto,
    p.PrecioBase,
    dbo.fn_CalcularPrecioDinamico(p.Id, u.Id) AS PrecioDinamico
FROM dbo.Usuarios u
CROSS JOIN dbo.Productos p
WHERE u.Id IN (1,2,3,4) AND p.Id IN (1,3,8)
ORDER BY p.Id, u.TipoNegocio;
GO

PRINT '--- TEST fn_CalcularPrecioDinamicoDetalle (con desglose) ---';
SELECT * FROM dbo.fn_CalcularPrecioDinamicoDetalle(1, 3);  -- Leche para cliente B2C
SELECT * FROM dbo.fn_CalcularPrecioDinamicoDetalle(3, 4);  -- Yogur para cliente VIP
SELECT * FROM dbo.fn_CalcularPrecioDinamicoDetalle(8, 2);  -- Pollo para cliente B2B
GO
