// ============================================================
// ProtectedRoute — Guarda de Rutas por Autenticación y Rol
//
// Uso:
//   <ProtectedRoute>                          → solo autenticado
//   <ProtectedRoute requiredRole="Admin">     → solo Admin
//   <ProtectedRoute requiredRole="Usuario">   → solo Usuario
// ============================================================

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function ProtectedRoute({ children, requiredRole }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Mientras se restaura la sesión desde localStorage, mostrar spinner
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-sm text-gray-500">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  // No autenticado → redirigir al login guardando la ruta intentada
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Rol insuficiente → redirigir al dashboard apropiado
  if (requiredRole && user.rol !== requiredRole) {
    const redirectTo = user.rol === 'Admin' ? '/admin/dashboard' : '/catalogo';
    return <Navigate to={redirectTo} replace />;
  }

  return children;
}
