// ============================================================
// App.jsx — Enrutamiento principal con protección por rol
// ============================================================

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';

// Páginas públicas
import LoginPage from './pages/LoginPage';

// Páginas Admin
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminProductos  from './pages/admin/AdminProductos';
import AdminAlertas    from './pages/admin/AdminAlertas';
import AdminInventario from './pages/admin/AdminInventario';
import AdminReglas     from './pages/admin/AdminReglas';

// Páginas Usuario/Cliente
import CatalogoPage from './pages/client/CatalogoPage';

// Redirección inteligente según rol
function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.rol === 'Admin' ? '/admin/dashboard' : '/catalogo'} replace />;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Pública */}
      <Route path="/login" element={<LoginPage />} />

      {/* Raíz → redirección inteligente */}
      <Route path="/" element={<HomeRedirect />} />

      {/* ── RUTAS ADMIN ── */}
      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute requiredRole="Admin">
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/productos"
        element={
          <ProtectedRoute requiredRole="Admin">
            <AdminProductos />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/alertas"
        element={
          <ProtectedRoute requiredRole="Admin">
            <AdminAlertas />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/inventario"
        element={
          <ProtectedRoute requiredRole="Admin">
            <AdminInventario />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/reglas"
        element={
          <ProtectedRoute requiredRole="Admin">
            <AdminReglas />
          </ProtectedRoute>
        }
      />

      {/* ── RUTAS USUARIO/CLIENTE ── */}
      <Route
        path="/catalogo"
        element={
          <ProtectedRoute requiredRole="Usuario">
            <CatalogoPage />
          </ProtectedRoute>
        }
      />

      {/* 404 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
