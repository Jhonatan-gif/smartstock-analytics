-- ============================================================
-- DATOS DE PRUEBA - StockDinamico
-- PasswordHash: bcrypt de 'Admin123!' y 'User123!'
-- Para generar en Node: bcrypt.hashSync('Admin123!', 10)
-- ============================================================

USE StockDinamico;
GO

-- ============================================================
-- ROLES
-- ============================================================
SET IDENTITY_INSERT dbo.Roles ON;
INSERT INTO dbo.Roles (Id, NombreRol) VALUES
    (1, 'Admin'),
    (2, 'Usuario');
SET IDENTITY_INSERT dbo.Roles OFF;
GO

-- ============================================================
-- USUARIOS
-- Hash: bcrypt de 'Admin123!' rounds=10
-- Hash: bcrypt de 'User123!'  rounds=10
-- Los hashes reales se generan al desplegar (ver backend/src/scripts/seedHashedPasswords.js)
-- ============================================================
INSERT INTO dbo.Usuarios (Nombre, Email, PasswordHash, RolId, TipoNegocio) VALUES
    ('Administrador Sistema',  'admin@stockdinamico.com',   '$2b$10$PLACEHOLDER_ADMIN_HASH_REPLACE', 1, 'B2B'),
    ('Carlos Distribuidor',    'carlos@distribuidora.com',  '$2b$10$PLACEHOLDER_B2B_HASH_REPLACE',   2, 'B2B'),
    ('Ana Cliente Final',      'ana@gmail.com',             '$2b$10$PLACEHOLDER_B2C_HASH_REPLACE',   2, 'B2C'),
    ('SuperVIP Corp',          'vip@supercorp.com',         '$2b$10$PLACEHOLDER_VIP_HASH_REPLACE',   2, 'VIP');
GO

-- ============================================================
-- PRODUCTOS
-- ============================================================
INSERT INTO dbo.Productos (SKU, Nombre, Descripcion, PrecioBase, Categoria) VALUES
    ('PRD-001', 'Leche Entera 1L',        'Leche entera pasteurizada de 1 litro',         1.20, 'Lácteos'),
    ('PRD-002', 'Queso Mozzarella 500g',  'Queso mozzarella fresco en bloque de 500g',    4.50, 'Lácteos'),
    ('PRD-003', 'Yogur Natural 400g',     'Yogur natural sin azúcar añadida',             2.80, 'Lácteos'),
    ('PRD-004', 'Mantequilla 250g',       'Mantequilla sin sal en barra',                 3.20, 'Lácteos'),
    ('PRD-005', 'Crema de Leche 200ml',   'Crema de leche para cocinar 35% grasa',        2.10, 'Lácteos'),
    ('PRD-006', 'Jugo de Naranja 1L',     'Jugo natural de naranja sin conservantes',     2.50, 'Bebidas'),
    ('PRD-007', 'Pan Integral 500g',      'Pan integral de trigo con semillas',           1.80, 'Panadería'),
    ('PRD-008', 'Pollo Entero 1.5kg',     'Pollo fresco entero refrigerado aprox 1.5kg',  6.00, 'Carnes');
GO

-- ============================================================
-- LOTES DE INVENTARIO
-- Escenarios variados: stock normal, stock bajo, sobrestock,
-- lotes próximos a caducar, lotes con fecha lejana
-- ============================================================

-- PRD-001: Leche - escenario stock bajo (total < 50 unidades)
INSERT INTO dbo.LotesInventario (ProductoId, NumeroLote, Cantidad, FechaIngreso, FechaCaducidad, CostoUnitario) VALUES
    (1, 'LOT-001-A', 15, DATEADD(DAY,-10,GETDATE()), DATEADD(DAY, 5, GETDATE()),  0.85),  -- vence en 5 días
    (1, 'LOT-001-B', 20, DATEADD(DAY, -5,GETDATE()), DATEADD(DAY,20, GETDATE()),  0.85);  -- stock bajo total=35

-- PRD-002: Queso - escenario normal
INSERT INTO dbo.LotesInventario (ProductoId, NumeroLote, Cantidad, FechaIngreso, FechaCaducidad, CostoUnitario) VALUES
    (2, 'LOT-002-A', 80,  DATEADD(DAY,-15,GETDATE()), DATEADD(DAY, 8, GETDATE()),  3.10), -- vence en 8 días
    (2, 'LOT-002-B', 120, DATEADD(DAY, -3,GETDATE()), DATEADD(DAY,45, GETDATE()),  3.10); -- normal

-- PRD-003: Yogur - sobrestock (>200 unidades)
INSERT INTO dbo.LotesInventario (ProductoId, NumeroLote, Cantidad, FechaIngreso, FechaCaducidad, CostoUnitario) VALUES
    (3, 'LOT-003-A', 100, DATEADD(DAY,-20,GETDATE()), DATEADD(DAY, 3, GETDATE()),  1.90), -- crítico: 3 días
    (3, 'LOT-003-B', 150, DATEADD(DAY, -7,GETDATE()), DATEADD(DAY,12, GETDATE()),  1.90),
    (3, 'LOT-003-C', 200, DATEADD(DAY, -1,GETDATE()), DATEADD(DAY,60, GETDATE()),  1.90); -- sobrestock total=450

-- PRD-004: Mantequilla - normal
INSERT INTO dbo.LotesInventario (ProductoId, NumeroLote, Cantidad, FechaIngreso, FechaCaducidad, CostoUnitario) VALUES
    (4, 'LOT-004-A', 60, DATEADD(DAY,-8,GETDATE()),  DATEADD(DAY,30, GETDATE()),  2.20),
    (4, 'LOT-004-B', 40, DATEADD(DAY,-2,GETDATE()),  DATEADD(DAY,90, GETDATE()),  2.20);

-- PRD-005: Crema - vence pronto
INSERT INTO dbo.LotesInventario (ProductoId, NumeroLote, Cantidad, FechaIngreso, FechaCaducidad, CostoUnitario) VALUES
    (5, 'LOT-005-A', 25, DATEADD(DAY,-12,GETDATE()), DATEADD(DAY, 6, GETDATE()),  1.40), -- pronto
    (5, 'LOT-005-B', 70, DATEADD(DAY, -3,GETDATE()), DATEADD(DAY,25, GETDATE()),  1.40);

-- PRD-006: Jugo - normal
INSERT INTO dbo.LotesInventario (ProductoId, NumeroLote, Cantidad, FechaIngreso, FechaCaducidad, CostoUnitario) VALUES
    (6, 'LOT-006-A', 90, DATEADD(DAY,-5,GETDATE()),  DATEADD(DAY,14, GETDATE()),  1.60);

-- PRD-007: Pan - crítico
INSERT INTO dbo.LotesInventario (ProductoId, NumeroLote, Cantidad, FechaIngreso, FechaCaducidad, CostoUnitario) VALUES
    (7, 'LOT-007-A', 30, DATEADD(DAY,-3,GETDATE()),  DATEADD(DAY, 2, GETDATE()),  1.10), -- 2 días!
    (7, 'LOT-007-B', 50, DATEADD(DAY,-1,GETDATE()),  DATEADD(DAY, 7, GETDATE()),  1.10);

-- PRD-008: Pollo - stock muy bajo
INSERT INTO dbo.LotesInventario (ProductoId, NumeroLote, Cantidad, FechaIngreso, FechaCaducidad, CostoUnitario) VALUES
    (8, 'LOT-008-A', 10, DATEADD(DAY,-2,GETDATE()),  DATEADD(DAY, 4, GETDATE()),  4.00); -- stock bajo + pronto a vencer
GO

-- ============================================================
-- REGLAS DE PRECIOS
-- ============================================================
INSERT INTO dbo.ReglasPrecios (Descripcion, TipoRegla, FactorMultiplicador, Condicion, Prioridad) VALUES
    -- Factor base por tipo de negocio
    ('Precio estándar consumidor final',     'TIPO_NEGOCIO_B2C', 1.0000, 'TipoNegocio = B2C', 1),
    ('Descuento distribuidores B2B (15%)',   'TIPO_NEGOCIO_B2B', 0.8500, 'TipoNegocio = B2B', 1),
    ('Precio preferencial VIP (25% desc.)',  'TIPO_NEGOCIO_VIP', 0.7500, 'TipoNegocio = VIP', 1),

    -- Factor por nivel de stock
    ('Recargo stock crítico (<50 unid)',     'STOCK_BAJO',       1.2000, 'StockTotal < 50',   2),
    ('Descuento liquidación sobrestock',     'SOBRESTOCK',       0.8000, 'StockTotal > 300',  2),

    -- Factor por caducidad (días para vencer)
    ('Descuento urgente: vence en 1-3 días', 'CADUCIDAD_CRITICA', 0.5000, 'DiasParaVencer <= 3',  3),
    ('Descuento pronto: vence en 4-7 días',  'CADUCIDAD_PRONTO',  0.7000, 'DiasParaVencer <= 7',  3),
    ('Descuento moderado: vence en 8-15 días','CADUCIDAD_NORMAL', 0.9000, 'DiasParaVencer <= 15', 3),

    -- Factor por demanda (ventas últimos 7 días)
    ('Recargo alta demanda (>100 ventas/7d)', 'ALTA_DEMANDA',    1.1500, 'VentasUltimos7Dias > 100', 4),
    ('Descuento baja demanda (<10 ventas/7d)','BAJA_DEMANDA',    0.9500, 'VentasUltimos7Dias < 10',  4);
GO

-- ============================================================
-- HISTORIAL DE VENTAS (datos simulados últimos 30 días)
-- ============================================================
-- Producto 1 (Leche): alta demanda
INSERT INTO dbo.HistorialVentas (ProductoId, UsuarioId, Cantidad, PrecioVenta, FechaVenta, LoteId) VALUES
    (1, 2, 10, 1.20, DATEADD(DAY,-1, GETDATE()), 1),
    (1, 3, 5,  1.20, DATEADD(DAY,-2, GETDATE()), 1),
    (1, 4, 20, 1.02, DATEADD(DAY,-3, GETDATE()), 1),
    (1, 2, 8,  1.20, DATEADD(DAY,-4, GETDATE()), 1),
    (1, 3, 15, 1.20, DATEADD(DAY,-5, GETDATE()), 2),
    (1, 4, 12, 1.02, DATEADD(DAY,-6, GETDATE()), 2),
    (1, 2, 18, 1.20, DATEADD(DAY,-7, GETDATE()), 2);

-- Producto 3 (Yogur): baja demanda (sobrestock)
INSERT INTO dbo.HistorialVentas (ProductoId, UsuarioId, Cantidad, PrecioVenta, FechaVenta, LoteId) VALUES
    (3, 3, 2, 2.80, DATEADD(DAY,-2, GETDATE()), 5),
    (3, 4, 1, 2.10, DATEADD(DAY,-5, GETDATE()), 5),
    (3, 2, 3, 2.38, DATEADD(DAY,-7, GETDATE()), 5);

-- Producto 8 (Pollo): alta demanda + stock bajo
INSERT INTO dbo.HistorialVentas (ProductoId, UsuarioId, Cantidad, PrecioVenta, FechaVenta, LoteId) VALUES
    (8, 2, 5, 6.00, DATEADD(DAY,-1, GETDATE()), 13),
    (8, 3, 3, 6.00, DATEADD(DAY,-2, GETDATE()), 13),
    (8, 4, 2, 4.50, DATEADD(DAY,-3, GETDATE()), 13);
GO

PRINT '✅ Datos de prueba insertados exitosamente';
PRINT '⚠️  IMPORTANTE: Actualiza los PasswordHash con bcrypt real antes de usar en producción';
PRINT '   Ver: backend/src/scripts/generatePasswords.js';
GO
