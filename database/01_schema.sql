-- ============================================================
-- SISTEMA DE GESTIÓN DE STOCK CON PRECIOS DINÁMICOS
-- Script DDL - SQL Server (T-SQL)
-- ============================================================

USE master;
GO

-- Crear base de datos si no existe
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'StockDinamico')
BEGIN
    CREATE DATABASE StockDinamico;
END
GO

USE StockDinamico;
GO

-- ============================================================
-- TABLA: Roles
-- ============================================================
IF OBJECT_ID('dbo.Roles', 'U') IS NOT NULL DROP TABLE dbo.Roles;
GO

CREATE TABLE dbo.Roles (
    Id      INT IDENTITY(1,1) PRIMARY KEY,
    NombreRol NVARCHAR(50) NOT NULL,
    CONSTRAINT UQ_Roles_NombreRol UNIQUE (NombreRol),
    CONSTRAINT CK_Roles_NombreRol CHECK (NombreRol IN ('Admin', 'Usuario'))
);
GO

-- ============================================================
-- TABLA: Usuarios
-- ============================================================
IF OBJECT_ID('dbo.Usuarios', 'U') IS NOT NULL DROP TABLE dbo.Usuarios;
GO

CREATE TABLE dbo.Usuarios (
    Id            INT IDENTITY(1,1) PRIMARY KEY,
    Nombre        NVARCHAR(100) NOT NULL,
    Email         NVARCHAR(150) NOT NULL,
    PasswordHash  NVARCHAR(255) NOT NULL,
    RolId         INT NOT NULL,
    TipoNegocio   NVARCHAR(10) NOT NULL DEFAULT 'B2C',
    FechaCreacion DATETIME2 NOT NULL DEFAULT GETDATE(),
    Activo        BIT NOT NULL DEFAULT 1,
    CONSTRAINT UQ_Usuarios_Email UNIQUE (Email),
    CONSTRAINT FK_Usuarios_Roles FOREIGN KEY (RolId) REFERENCES dbo.Roles(Id),
    CONSTRAINT CK_Usuarios_TipoNegocio CHECK (TipoNegocio IN ('B2B', 'B2C', 'VIP'))
);
GO

-- ============================================================
-- TABLA: Productos
-- ============================================================
IF OBJECT_ID('dbo.Productos', 'U') IS NOT NULL DROP TABLE dbo.Productos;
GO

CREATE TABLE dbo.Productos (
    Id            INT IDENTITY(1,1) PRIMARY KEY,
    SKU           NVARCHAR(50) NOT NULL,
    Nombre        NVARCHAR(200) NOT NULL,
    Descripcion   NVARCHAR(500) NULL,
    PrecioBase    DECIMAL(18,2) NOT NULL,
    Categoria     NVARCHAR(100) NULL,
    Activo        BIT NOT NULL DEFAULT 1,
    FechaCreacion DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT UQ_Productos_SKU UNIQUE (SKU),
    CONSTRAINT CK_Productos_PrecioBase CHECK (PrecioBase > 0)
);
GO

-- ============================================================
-- TABLA: LotesInventario
-- ============================================================
IF OBJECT_ID('dbo.LotesInventario', 'U') IS NOT NULL DROP TABLE dbo.LotesInventario;
GO

CREATE TABLE dbo.LotesInventario (
    Id              INT IDENTITY(1,1) PRIMARY KEY,
    ProductoId      INT NOT NULL,
    NumeroLote      NVARCHAR(50) NOT NULL,
    Cantidad        INT NOT NULL,
    CantidadReservada INT NOT NULL DEFAULT 0,
    FechaIngreso    DATETIME2 NOT NULL DEFAULT GETDATE(),
    FechaCaducidad  DATE NOT NULL,
    CostoUnitario   DECIMAL(18,2) NOT NULL,
    Activo          BIT NOT NULL DEFAULT 1,
    CONSTRAINT FK_Lotes_Productos FOREIGN KEY (ProductoId) REFERENCES dbo.Productos(Id),
    CONSTRAINT CK_Lotes_Cantidad CHECK (Cantidad >= 0),
    CONSTRAINT CK_Lotes_CantidadReservada CHECK (CantidadReservada >= 0),
    CONSTRAINT CK_Lotes_Stock CHECK (Cantidad >= CantidadReservada),
    CONSTRAINT CK_Lotes_Costo CHECK (CostoUnitario > 0),
    CONSTRAINT UQ_Lotes_NumeroLote UNIQUE (NumeroLote)
);
GO

-- ============================================================
-- TABLA: ReglasPrecios
-- ============================================================
IF OBJECT_ID('dbo.ReglasPrecios', 'U') IS NOT NULL DROP TABLE dbo.ReglasPrecios;
GO

CREATE TABLE dbo.ReglasPrecios (
    Id                  INT IDENTITY(1,1) PRIMARY KEY,
    Descripcion         NVARCHAR(200) NOT NULL,
    TipoRegla           NVARCHAR(50) NOT NULL,
    FactorMultiplicador DECIMAL(10,4) NOT NULL,
    Condicion           NVARCHAR(500) NULL,
    Prioridad           INT NOT NULL DEFAULT 10,
    Activo              BIT NOT NULL DEFAULT 1,
    FechaCreacion       DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT CK_Reglas_TipoRegla CHECK (TipoRegla IN (
        'TIPO_NEGOCIO_B2B',
        'TIPO_NEGOCIO_B2C',
        'TIPO_NEGOCIO_VIP',
        'STOCK_BAJO',
        'SOBRESTOCK',
        'CADUCIDAD_CRITICA',
        'CADUCIDAD_PRONTO',
        'CADUCIDAD_NORMAL',
        'ALTA_DEMANDA',
        'BAJA_DEMANDA'
    )),
    CONSTRAINT CK_Reglas_Factor CHECK (FactorMultiplicador > 0 AND FactorMultiplicador <= 5)
);
GO

-- ============================================================
-- TABLA: HistorialVentas
-- ============================================================
IF OBJECT_ID('dbo.HistorialVentas', 'U') IS NOT NULL DROP TABLE dbo.HistorialVentas;
GO

CREATE TABLE dbo.HistorialVentas (
    Id          INT IDENTITY(1,1) PRIMARY KEY,
    ProductoId  INT NOT NULL,
    UsuarioId   INT NULL,
    Cantidad    INT NOT NULL,
    PrecioVenta DECIMAL(18,2) NOT NULL,
    FechaVenta  DATETIME2 NOT NULL DEFAULT GETDATE(),
    LoteId      INT NULL,
    CONSTRAINT FK_Ventas_Productos FOREIGN KEY (ProductoId) REFERENCES dbo.Productos(Id),
    CONSTRAINT FK_Ventas_Usuarios FOREIGN KEY (UsuarioId) REFERENCES dbo.Usuarios(Id),
    CONSTRAINT FK_Ventas_Lotes FOREIGN KEY (LoteId) REFERENCES dbo.LotesInventario(Id),
    CONSTRAINT CK_Ventas_Cantidad CHECK (Cantidad > 0),
    CONSTRAINT CK_Ventas_Precio CHECK (PrecioVenta > 0)
);
GO

-- ============================================================
-- ÍNDICES para performance
-- ============================================================
CREATE NONCLUSTERED INDEX IX_LotesInventario_ProductoId_FechaCaducidad
    ON dbo.LotesInventario(ProductoId, FechaCaducidad)
    INCLUDE (Cantidad, Activo);
GO

CREATE NONCLUSTERED INDEX IX_HistorialVentas_ProductoId_FechaVenta
    ON dbo.HistorialVentas(ProductoId, FechaVenta)
    INCLUDE (Cantidad);
GO

CREATE NONCLUSTERED INDEX IX_Usuarios_Email
    ON dbo.Usuarios(Email)
    INCLUDE (PasswordHash, RolId, TipoNegocio, Activo);
GO

PRINT '✅ Schema creado exitosamente';
GO
