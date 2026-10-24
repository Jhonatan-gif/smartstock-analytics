// Renderiza un árbol de rutas con AuthProvider + MemoryRouter.
// `user` simula una sesión guardada en localStorage (como tras un login real).
import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';

export const ADMIN   = { id: 1, nombre: 'Administrador', email: 'admin@stockdinamico.com', rol: 'Admin',   tipoNegocio: 'B2B' };
export const CLIENTE = { id: 4, nombre: 'Cliente VIP',   email: 'vip@supercorp.com',       rol: 'Usuario', tipoNegocio: 'VIP' };

export function loginAs(user) {
  localStorage.setItem('token', 'test-token');
  localStorage.setItem('user', JSON.stringify(user));
}

// Muestra la ruta actual para poder verificar redirecciones
export function CurrentPath() {
  return <span data-testid="path">{useLocation().pathname}</span>;
}

export function renderRoutes(routes, { initialPath = '/' } = {}) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AuthProvider>
        <Routes>
          {routes.map(({ path, element }) => (
            <Route key={path} path={path} element={element} />
          ))}
        </Routes>
        <CurrentPath />
      </AuthProvider>
    </MemoryRouter>
  );
}
