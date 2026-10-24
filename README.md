# 📦 StockDinámico — Sistema de Gestión de Stock con Precios Dinámicos

Sistema web completo para gestión de inventario con un **motor de precios dinámicos** que ajusta precios en tiempo real según tipo de cliente, niveles de stock y fechas de caducidad.

## 🏗️ Stack Tecnológico

| Capa       | Tecnología                         |
|------------|------------------------------------|
| Base datos | **SQL Server** (T-SQL puro, UDFs)  |
| Backend    | **Node.js + Express** (`mssql`)    |
| Frontend   | **React + Vite + Tailwind CSS**    |
| Auth       | JWT (jsonwebtoken + bcryptjs)      |

---

## 📁 Estructura del Proyecto

```
stock-system/
├── database/
│   ├── 01_schema.sql                    # DDL: tablas, PKs, FKs, CHECKs
│   ├── 02_seed_data.sql                 # Datos de prueba
│   ├── 03_dynamic_pricing_function.sql  # fn_CalcularPrecioDinamico (UDF)
│   └── 04_complex_queries.sql           # Consulta A (alertas) + Consulta B (balance)
│
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── database.js              # Pool mssql con reconexión
│   │   ├── controllers/
│   │   │   ├── authController.js        # POST /api/auth/login
│   │   │   └── productsController.js   # GET /api/products (bifurcado por rol)
│   │   ├── middleware/
│   │   │   └── auth.js                  # authMiddleware + requireRole()
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   └── products.js
│   │   ├── scripts/
│   │   │   └── generatePasswords.js     # Genera hashes bcrypt para seed
│   │   └── server.js                    # Express + helmet + cors + rate-limit
│   ├── .env.example
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── auth/
    │   │   │   └── ProtectedRoute.jsx   # ⭐ Guarda de rutas por rol
    │   │   └── layout/
    │   │       └── MainLayout.jsx       # Sidebar + header responsivo
    │   ├── context/
    │   │   └── AuthContext.jsx          # Estado global de autenticación
    │   ├── pages/
    │   │   ├── LoginPage.jsx
    │   │   ├── admin/
    │   │   │   ├── AdminDashboard.jsx   # KPIs + alertas recientes
    │   │   │   ├── AdminProductos.jsx   # Stock con lotes expandibles
    │   │   │   ├── AdminAlertas.jsx     # Alertas de caducidad + descuentos
    │   │   │   ├── AdminInventario.jsx  # Balance y valorización
    │   │   │   └── AdminReglas.jsx      # Visualización de reglas de precio
    │   │   └── client/
    │   │       └── CatalogoPage.jsx     # Catálogo con precio dinámico personal
    │   ├── utils/
    │   │   └── api.js                   # Axios con interceptor 401
    │   └── App.jsx                      # Rutas protegidas por rol
    └── package.json
```

---

## 🚀 Instalación Paso a Paso

### 1. Prerrequisitos
- **SQL Server** 2019+ (Express Edition gratuito funciona)
- **Node.js** 18+
- **SQL Server Management Studio** (SSMS) o Azure Data Studio

### 2. Base de Datos

Abre SSMS y ejecuta los scripts **en orden**:

```sql
-- 1. Crear esquema y tablas
-- Archivo: database/01_schema.sql

-- 2. Insertar datos de prueba (sin hashes aún)
-- Archivo: database/02_seed_data.sql

-- 3. Crear funciones de precio dinámico
-- Archivo: database/03_dynamic_pricing_function.sql

-- 4. (Opcional) Probar las consultas de reporte
-- Archivo: database/04_complex_queries.sql
```

### 3. Backend

```bash
cd backend

# Instalar dependencias
npm install

# Crear archivo de configuración
cp .env.example .env

# ⚠️ EDITAR .env con tus credenciales de SQL Server:
# DB_SERVER, DB_USER, DB_PASSWORD, JWT_SECRET

# Generar hashes bcrypt y actualizar la BD
npm run seed

# Iniciar en desarrollo
npm run dev
```

El servidor arranca en `http://localhost:3001`

### 4. Frontend

```bash
cd frontend

# Instalar dependencias
npm install

# Iniciar Vite dev server
npm run dev
```

La app arranca en `http://localhost:5173`

---

## 👥 Cuentas de Prueba

| Email                         | Password   | Rol     | Tipo    |
|-------------------------------|------------|---------|---------|
| `admin@stockdinamico.com`     | `Admin123!`| Admin   | B2B     |
| `carlos@distribuidora.com`    | `User123!` | Usuario | B2B     |
| `ana@gmail.com`               | `User123!` | Usuario | B2C     |
| `vip@supercorp.com`           | `User123!` | Usuario | VIP     |

---

## 💡 Motor de Precios Dinámicos

### Fórmula

```
PrecioFinal = PrecioBase × F_TipoCliente × F_Stock × F_Caducidad × F_Demanda
```

### Factores

| Factor           | Condición                  | Multiplicador |
|------------------|----------------------------|---------------|
| **Tipo cliente** | B2C (base)                 | × 1.00        |
|                  | B2B (distribuidores)       | × 0.85 (-15%) |
|                  | VIP (corporativo)          | × 0.75 (-25%) |
| **Stock**        | Stock < 50 uds (escasez)   | × 1.20 (+20%) |
|                  | Stock > 300 uds (exceso)   | × 0.80 (-20%) |
| **Caducidad**    | Vence en ≤ 3 días          | × 0.50 (-50%) |
|                  | Vence en ≤ 7 días          | × 0.70 (-30%) |
|                  | Vence en ≤ 15 días         | × 0.90 (-10%) |
| **Demanda**      | > 100 ventas en 7 días     | × 1.15 (+15%) |
|                  | < 10 ventas en 7 días      | × 0.95 (-5%)  |

### Ejemplo real

Leche Entera (precio base: $1.20) para cliente VIP:
- Stock total: 35 uds → escasez
- Vence en 5 días → descuento pronto
- Ventas 7 días: 88 → demanda normal

```
$1.20 × 0.75 (VIP) × 1.20 (stock bajo) × 0.70 (pronto a vencer) × 1.00
= $1.20 × 0.63
= $0.756 ≈ $0.76
```

---

## 🔒 Protección de Rutas (React)

```jsx
// Solo Admin puede ver el dashboard de administración
<Route
  path="/admin/dashboard"
  element={
    <ProtectedRoute requiredRole="Admin">
      <AdminDashboard />
    </ProtectedRoute>
  }
/>

// Solo Usuario puede ver el catálogo personalizado
<Route
  path="/catalogo"
  element={
    <ProtectedRoute requiredRole="Usuario">
      <CatalogoPage />
    </ProtectedRoute>
  }
/>
```

`ProtectedRoute` verifica:
1. Si hay token JWT en localStorage → si no, redirige a `/login`
2. Si el rol coincide → si no, redirige al panel correcto según su rol

---

## 📡 Endpoints de la API

| Método | Ruta                              | Auth | Rol     | Descripción                              |
|--------|-----------------------------------|------|---------|------------------------------------------|
| POST   | `/api/auth/login`                 | No   | Todos   | Login, retorna JWT + datos de usuario    |
| GET    | `/api/products`                   | JWT  | Ambos   | Admin: stock detallado · Usuario: precios|
| GET    | `/api/products/:id/price`         | JWT  | Ambos   | Precio dinámico de un producto           |
| GET    | `/api/products/reports/alerts`    | JWT  | Admin   | Alertas de caducidad con descuentos      |
| GET    | `/api/products/reports/inventory` | JWT  | Admin   | Balance de inventario y valorización     |
| GET    | `/api/health`                     | No   | Todos   | Health check del servidor                |

---

## ⚠️ Acciones Manuales Necesarias

> Estas acciones no se pueden automatizar desde este entorno:

1. **Instalar SQL Server** en tu máquina o servidor (gratuito: SQL Server Express)
2. **Ejecutar los 4 scripts SQL** en SSMS en el orden indicado
3. **Editar `backend/.env`** con las credenciales de tu instancia SQL Server
4. **Ejecutar `npm run seed`** para generar y guardar los hashes bcrypt en la BD

---

## 🛠️ Troubleshooting

### Error de conexión a SQL Server
```
Error: Failed to connect to localhost:1433
```
- Verifica que SQL Server está corriendo: `services.msc` → SQL Server (MSSQLSERVER)
- Habilita TCP/IP en SQL Server Configuration Manager
- Asegúrate de que el puerto 1433 no está bloqueado por el firewall

### Error de autenticación
```
Login failed for user 'sa'
```
- Verifica que SQL Server está en modo "SQL Server and Windows Authentication"
- SSMS → Server Properties → Security → SQL Server and Windows Authentication mode

### Los hashes de contraseña son PLACEHOLDER
Ejecuta `cd backend && npm run seed` para generar y aplicar los hashes reales.
