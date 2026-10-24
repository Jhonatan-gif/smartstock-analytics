import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CatalogoPage from './CatalogoPage';
import api from '../../utils/api';
import { renderRoutes, loginAs, CLIENTE } from '../../test/renderWithProviders';

vi.mock('../../utils/api', () => ({
  default: { get: vi.fn(), post: vi.fn(), defaults: { headers: { common: {} } } },
}));

const PRODUCTOS = [
  {
    productoId: 1, SKU: 'PRD-001', Nombre: 'Leche Entera 1L', Categoria: 'Lácteos',
    precio: 0.76, PrecioBase: 1.2, PorcentajeVariacion: -37,
    etiquetaPromocion: 'Gran Oferta', mensajeUrgencia: 'Oferta por tiempo limitado',
    stockDisponible: 35, DiasParaVencer: 5,
  },
  {
    productoId: 2, SKU: 'PRD-006', Nombre: 'Jugo de Naranja 1L', Categoria: 'Bebidas',
    precio: 1.6, PrecioBase: 2.5, PorcentajeVariacion: -36,
    stockDisponible: 90, DiasParaVencer: 14,
  },
];

function renderCatalogo() {
  loginAs(CLIENTE);
  return renderRoutes([{ path: '/catalogo', element: <CatalogoPage /> }], { initialPath: '/catalogo' });
}

beforeEach(() => {
  vi.clearAllMocks();
  api.get.mockResolvedValue({ data: { data: PRODUCTOS } });
});

describe('CatalogoPage', () => {
  it('muestra el precio dinámico personalizado y el precio base tachado', async () => {
    renderCatalogo();

    const tarjeta = (await screen.findByText('Leche Entera 1L')).closest('.card');
    expect(api.get).toHaveBeenCalledWith('/products');
    expect(within(tarjeta).getByText('$0.76')).toBeInTheDocument();
    expect(within(tarjeta).getByText('$1.20')).toHaveClass('line-through');
    expect(within(tarjeta).getByText('▼ 37.0%')).toBeInTheDocument();
    expect(within(tarjeta).getByText(/Gran Oferta/)).toBeInTheDocument();
  });

  it('indica el perfil del cliente (VIP)', async () => {
    renderCatalogo();
    await screen.findByText('Leche Entera 1L');
    expect(screen.getByText(/⭐ VIP/)).toBeInTheDocument();
  });

  it('filtra por texto de búsqueda (nombre o SKU)', async () => {
    renderCatalogo();
    await screen.findByText('Leche Entera 1L');

    await userEvent.setup().type(screen.getByPlaceholderText('Buscar producto...'), 'prd-006');

    expect(screen.queryByText('Leche Entera 1L')).not.toBeInTheDocument();
    expect(screen.getByText('Jugo de Naranja 1L')).toBeInTheDocument();
  });

  it('filtra por categoría', async () => {
    renderCatalogo();
    await screen.findByText('Leche Entera 1L');

    await userEvent.setup().click(screen.getByRole('button', { name: 'Bebidas' }));

    expect(screen.queryByText('Leche Entera 1L')).not.toBeInTheDocument();
    expect(screen.getByText('Jugo de Naranja 1L')).toBeInTheDocument();
  });

  it('muestra un mensaje cuando ningún producto coincide', async () => {
    renderCatalogo();
    await screen.findByText('Leche Entera 1L');

    await userEvent.setup().type(screen.getByPlaceholderText('Buscar producto...'), 'zzz');

    expect(screen.getByText('No se encontraron productos')).toBeInTheDocument();
  });
});
