import React from 'react';
import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import ProtectedRoute from './ProtectedRoute';
import { renderRoutes, loginAs, ADMIN, CLIENTE } from '../../test/renderWithProviders';

const routes = [
  { path: '/login',           element: <p>Pantalla de login</p> },
  { path: '/catalogo',        element: <ProtectedRoute requiredRole="Usuario"><p>Catálogo privado</p></ProtectedRoute> },
  { path: '/admin/dashboard', element: <ProtectedRoute requiredRole="Admin"><p>Panel admin</p></ProtectedRoute> },
];

describe('ProtectedRoute', () => {
  it('sin sesión redirige a /login', () => {
    renderRoutes(routes, { initialPath: '/admin/dashboard' });
    expect(screen.getByText('Pantalla de login')).toBeInTheDocument();
    expect(screen.getByTestId('path')).toHaveTextContent('/login');
  });

  it('un Admin accede al panel de administración', () => {
    loginAs(ADMIN);
    renderRoutes(routes, { initialPath: '/admin/dashboard' });
    expect(screen.getByText('Panel admin')).toBeInTheDocument();
  });

  it('un Usuario que entra a una ruta de Admin es enviado a /catalogo', () => {
    loginAs(CLIENTE);
    renderRoutes(routes, { initialPath: '/admin/dashboard' });
    expect(screen.queryByText('Panel admin')).not.toBeInTheDocument();
    expect(screen.getByText('Catálogo privado')).toBeInTheDocument();
    expect(screen.getByTestId('path')).toHaveTextContent('/catalogo');
  });

  it('un Admin que entra al catálogo de clientes es enviado a su dashboard', () => {
    loginAs(ADMIN);
    renderRoutes(routes, { initialPath: '/catalogo' });
    expect(screen.getByTestId('path')).toHaveTextContent('/admin/dashboard');
  });

  it('descarta una sesión corrupta en localStorage', () => {
    localStorage.setItem('token', 'x');
    localStorage.setItem('user', '{no-es-json');
    renderRoutes(routes, { initialPath: '/catalogo' });
    expect(screen.getByTestId('path')).toHaveTextContent('/login');
    expect(localStorage.getItem('token')).toBeNull();
  });
});
