import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginPage from './LoginPage';
import api from '../utils/api';
import { renderRoutes, ADMIN, CLIENTE } from '../test/renderWithProviders';

vi.mock('../utils/api', () => ({
  default: { post: vi.fn(), get: vi.fn(), defaults: { headers: { common: {} } } },
}));

const routes = [
  { path: '/login',           element: <LoginPage /> },
  { path: '/catalogo',        element: <p>Catálogo</p> },
  { path: '/admin/dashboard', element: <p>Dashboard</p> },
];

async function submit(email, password) {
  const user = userEvent.setup();
  await user.type(screen.getByPlaceholderText('usuario@ejemplo.com'), email);
  await user.type(screen.getByPlaceholderText('••••••••'), password);
  await user.click(screen.getByRole('button', { name: 'Ingresar' }));
}

beforeEach(() => vi.clearAllMocks());

describe('LoginPage', () => {
  it('un Admin inicia sesión y llega al dashboard con el token guardado', async () => {
    api.post.mockResolvedValueOnce({ data: { data: { token: 'jwt-admin', usuario: ADMIN } } });
    renderRoutes(routes, { initialPath: '/login' });

    await submit('admin@stockdinamico.com', 'Admin123!');

    expect(await screen.findByText('Dashboard')).toBeInTheDocument();
    expect(api.post).toHaveBeenCalledWith('/auth/login', { email: 'admin@stockdinamico.com', password: 'Admin123!' });
    expect(localStorage.getItem('token')).toBe('jwt-admin');
    expect(api.defaults.headers.common.Authorization).toBe('Bearer jwt-admin');
  });

  it('un cliente inicia sesión y llega al catálogo', async () => {
    api.post.mockResolvedValueOnce({ data: { data: { token: 'jwt-vip', usuario: CLIENTE } } });
    renderRoutes(routes, { initialPath: '/login' });

    await submit('vip@supercorp.com', 'User123!');

    expect(await screen.findByText('Catálogo')).toBeInTheDocument();
  });

  it('muestra el error devuelto por la API con credenciales inválidas', async () => {
    api.post.mockRejectedValueOnce({ response: { data: { error: 'Credenciales inválidas' } } });
    renderRoutes(routes, { initialPath: '/login' });

    await submit('ana@gmail.com', 'mala');

    expect(await screen.findByText('Credenciales inválidas')).toBeInTheDocument();
    expect(screen.getByTestId('path')).toHaveTextContent('/login');
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('los botones de cuentas de prueba rellenan el formulario', async () => {
    renderRoutes(routes, { initialPath: '/login' });
    await userEvent.setup().click(screen.getByText('vip@supercorp.com'));
    expect(screen.getByPlaceholderText('usuario@ejemplo.com')).toHaveValue('vip@supercorp.com');
    expect(screen.getByPlaceholderText('••••••••')).toHaveValue('User123!');
  });
});
