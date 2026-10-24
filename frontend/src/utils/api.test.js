import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import api from './api';

// Manejador de errores registrado por el interceptor de respuestas
const onError = api.interceptors.response.handlers[0].rejected;

describe('interceptor 401 de api', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    localStorage.setItem('token', 't');
    localStorage.setItem('user', '{}');
    api.defaults.headers.common.Authorization = 'Bearer t';
    // jsdom no permite navegar: sustituimos location para observar la redirección
    Object.defineProperty(window, 'location', { configurable: true, value: { href: '/catalogo' } });
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', { configurable: true, value: originalLocation });
    vi.restoreAllMocks();
  });

  it('un 401 de una ruta protegida cierra la sesión y redirige a /login', async () => {
    const error = { config: { url: '/products' }, response: { status: 401 } };
    await expect(onError(error)).rejects.toBe(error);
    expect(localStorage.getItem('token')).toBeNull();
    expect(api.defaults.headers.common.Authorization).toBeUndefined();
    expect(window.location.href).toBe('/login');
  });

  it('un 401 del login (credenciales inválidas) no recarga la página', async () => {
    const error = { config: { url: '/auth/login' }, response: { status: 401 } };
    await expect(onError(error)).rejects.toBe(error);
    expect(window.location.href).toBe('/catalogo');
  });

  it('otros errores se propagan sin tocar la sesión', async () => {
    const error = { config: { url: '/products' }, response: { status: 500 } };
    await expect(onError(error)).rejects.toBe(error);
    expect(localStorage.getItem('token')).toBe('t');
  });
});
