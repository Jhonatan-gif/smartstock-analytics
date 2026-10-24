// ============================================================
// Layout con Sidebar — usado por Admin y Usuario
// ============================================================

import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const NAV_ADMIN = [
  { to: '/admin/dashboard',  icon: '📊', label: 'Dashboard'    },
  { to: '/admin/productos',  icon: '📦', label: 'Productos'    },
  { to: '/admin/alertas',    icon: '🚨', label: 'Alertas'      },
  { to: '/admin/inventario', icon: '📋', label: 'Inventario'   },
  { to: '/admin/reglas',     icon: '⚙️', label: 'Reglas Precio'},
];

const NAV_USUARIO = [
  { to: '/catalogo', icon: '🛒', label: 'Catálogo' },
];

export default function MainLayout({ children }) {
  const { user, logout, isAdmin } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const navItems = isAdmin ? NAV_ADMIN : NAV_USUARIO;

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  const rolBadge = {
    Admin:   'badge-purple',
    Usuario: user?.tipoNegocio === 'VIP' ? 'badge-yellow' :
             user?.tipoNegocio === 'B2B' ? 'badge-blue'   : 'badge-green',
  }[user?.rol] || 'badge-green';

  const rolLabel = user?.rol === 'Admin' ? '👑 Admin' : `${user?.tipoNegocio}`;

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Overlay móvil */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-30 w-64 bg-blue-900 text-white flex flex-col
        transform transition-transform duration-200 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:relative lg:translate-x-0 lg:flex
      `}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-blue-800">
          <span className="text-2xl">📦</span>
          <div>
            <p className="font-bold text-white leading-tight">StockDinámico</p>
            <p className="text-xs text-blue-300">Gestión de Inventario</p>
          </div>
        </div>

        {/* Perfil del usuario */}
        <div className="px-6 py-4 border-b border-blue-800">
          <p className="text-sm font-medium text-white truncate">{user?.nombre}</p>
          <p className="text-xs text-blue-300 truncate">{user?.email}</p>
          <span className={`mt-2 inline-block badge ${rolBadge}`}>{rolLabel}</span>
        </div>

        {/* Navegación */}
        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          {navItems.map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                 ${isActive
                   ? 'bg-blue-700 text-white'
                   : 'text-blue-200 hover:bg-blue-800 hover:text-white'
                 }`
              }
            >
              <span className="text-base">{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Cerrar sesión */}
        <div className="px-4 py-4 border-t border-blue-800">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm
                       text-blue-200 hover:bg-red-700 hover:text-white transition-colors"
          >
            <span>🚪</span>
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Contenido principal */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header top bar */}
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/>
            </svg>
          </button>
          <div className="flex-1" />
          <span className="text-sm text-gray-500">
            Hola, <strong>{user?.nombre?.split(' ')[0]}</strong>
          </span>
        </header>

        {/* Área de contenido con scroll */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
