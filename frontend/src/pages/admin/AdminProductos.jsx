// ============================================================
// Página Admin: Productos (con lotes expandibles)
// ============================================================

import React, { useEffect, useState } from 'react';
import api from '../../utils/api';
import MainLayout from '../../components/layout/MainLayout';

const ESTADO_CONFIG = {
  sin_stock:        { label: 'Sin Stock',        cls: 'badge-red'    },
  critico:          { label: 'Stock Crítico',     cls: 'badge-red'    },
  caducidad_critica:{ label: 'Cad. Crítica',      cls: 'badge-red'    },
  caducidad_urgente:{ label: 'Cad. Urgente',      cls: 'badge-orange' },
  sobrestock:       { label: 'Sobrestock',        cls: 'badge-yellow' },
  normal:           { label: 'Normal',            cls: 'badge-green'  },
};

export default function AdminProductos() {
  const [productos,  setProductos]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [expanded,   setExpanded]   = useState({});
  const [search,     setSearch]     = useState('');

  useEffect(() => {
    api.get('/products').then(r => {
      setProductos(r.data.data || []);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const toggleExpand = (id) =>
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  const filtered = productos.filter(p =>
    p.Nombre?.toLowerCase().includes(search.toLowerCase()) ||
    p.SKU?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">📦 Productos y Stock</h1>
            <p className="text-sm text-gray-500 mt-1">Vista detallada con lotes (FEFO)</p>
          </div>
          <input
            type="text"
            placeholder="Buscar por nombre o SKU..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-60 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_,i) => (
              <div key={i} className="card animate-pulse h-16 bg-gray-100" />
            ))}
          </div>
        ) : (
          <div className="card p-0 overflow-hidden">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase w-8"/>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">SKU</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Producto</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Categoría</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Stock</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Precio Base</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Valor Costo</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Lotes</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(p => {
                  const est = ESTADO_CONFIG[p.estado] || ESTADO_CONFIG.normal;
                  const hasLotes = p.lotes?.length > 0;

                  return (
                    <React.Fragment key={p.productoId}>
                      <tr
                        className={`hover:bg-gray-50 ${hasLotes ? 'cursor-pointer' : ''}`}
                        onClick={() => hasLotes && toggleExpand(p.productoId)}
                      >
                        <td className="px-4 py-3 text-gray-400 text-center">
                          {hasLotes && (
                            <span className="text-xs">
                              {expanded[p.productoId] ? '▼' : '▶'}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.SKU}</td>
                        <td className="px-4 py-3 font-medium text-gray-800">{p.Nombre}</td>
                        <td className="px-4 py-3 text-gray-600">{p.Categoria}</td>
                        <td className="px-4 py-3 text-right font-medium text-gray-800">
                          {(p.stockDisponible || 0).toLocaleString()}
                          <span className="text-xs text-gray-400 ml-1">uds</span>
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-gray-800">
                          ${(p.PrecioBase || 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600">
                          ${(p.valorCosto || 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-center text-gray-500">{p.numeroLotes}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`badge ${est.cls}`}>{est.label}</span>
                        </td>
                      </tr>

                      {/* Lotes expandidos */}
                      {expanded[p.productoId] && p.lotes?.map(l => (
                        <tr key={l.loteId} className="bg-blue-50 text-xs">
                          <td className="px-4 py-2" />
                          <td colSpan={2} className="px-4 py-2 font-mono text-blue-700">
                            📦 {l.NumeroLote}
                          </td>
                          <td className="px-4 py-2 text-gray-500">
                            Vence: {new Date(l.FechaCaducidad).toLocaleDateString('es-EC')}
                          </td>
                          <td className="px-4 py-2 text-right text-gray-700">
                            {l.disponible} / {l.Cantidad}
                          </td>
                          <td className="px-4 py-2 text-right text-gray-500">
                            Costo: ${l.CostoUnitario}
                          </td>
                          <td className="px-4 py-2 text-right" />
                          <td colSpan={2} className="px-4 py-2 text-center">
                            <span className={`badge ${
                              l.diasParaVencer <= 3  ? 'badge-red'    :
                              l.diasParaVencer <= 7  ? 'badge-orange' :
                              l.diasParaVencer <= 15 ? 'badge-yellow' : 'badge-green'
                            }`}>
                              {l.diasParaVencer} días
                            </span>
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <span className="text-4xl block mb-2">🔍</span>
                No se encontraron productos
              </div>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
