// ============================================================
// Página Admin: Reporte de Inventario y Valorización
// ============================================================

import React, { useEffect, useState } from 'react';
import api from '../../utils/api';
import MainLayout from '../../components/layout/MainLayout';

const ESTADO_CONFIG = {
  sin_stock:  { label: '⛔ Sin Stock',     cls: 'badge-red'    },
  critico:    { label: '🔴 Stock Crítico', cls: 'badge-red'    },
  sobrestock: { label: '🟡 Sobrestock',    cls: 'badge-yellow' },
  normal:     { label: '🟢 Normal',        cls: 'badge-green'  },
};

function StatCard({ label, value, sub, color }) {
  const colors = {
    blue:   'border-blue-400 bg-blue-50 text-blue-700',
    green:  'border-green-400 bg-green-50 text-green-700',
    orange: 'border-orange-400 bg-orange-50 text-orange-700',
    purple: 'border-purple-400 bg-purple-50 text-purple-700',
  };
  return (
    <div className={`rounded-xl border-l-4 p-4 ${colors[color]}`}>
      <p className="text-xs font-medium opacity-70">{label}</p>
      <p className="text-xl font-bold mt-1">{value}</p>
      {sub && <p className="text-xs opacity-60 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function AdminInventario() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [sort,    setSort]    = useState({ col: 'valorizacionCosto', dir: 'desc' });

  useEffect(() => {
    api.get('/products/reports/inventory')
       .then(r => setData(r.data))
       .catch(console.error)
       .finally(() => setLoading(false));
  }, []);

  function toggleSort(col) {
    setSort(prev => ({
      col,
      dir: prev.col === col && prev.dir === 'desc' ? 'asc' : 'desc',
    }));
  }

  const sorted = [...(data?.data || [])].sort((a, b) => {
    const va = a[sort.col] ?? 0;
    const vb = b[sort.col] ?? 0;
    return sort.dir === 'desc' ? vb - va : va - vb;
  });

  const SortIcon = ({ col }) => (
    <span className={`ml-1 text-xs ${sort.col === col ? 'text-blue-500' : 'text-gray-300'}`}>
      {sort.col === col ? (sort.dir === 'desc' ? '▼' : '▲') : '⇅'}
    </span>
  );

  const totales = data?.totales || {};
  const margen  = totales.totalValorizacionVenta > 0
    ? ((totales.totalValorizacionVenta - totales.totalValorizacionCosto) /
        totales.totalValorizacionVenta * 100).toFixed(1)
    : 0;

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">📋 Balance de Inventario</h1>
          <p className="text-sm text-gray-500 mt-1">Valorización y estado del stock actual</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_,i) => <div key={i} className="h-20 animate-pulse bg-gray-200 rounded-xl"/>)}
          </div>
        ) : (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                label="Valor a Costo"
                value={`$${(totales.totalValorizacionCosto||0).toLocaleString('es-EC',{minimumFractionDigits:2})}`}
                sub="Costo de adquisición"
                color="blue"
              />
              <StatCard
                label="Valor a Precio Venta"
                value={`$${(totales.totalValorizacionVenta||0).toLocaleString('es-EC',{minimumFractionDigits:2})}`}
                sub="Precio base sin descuentos"
                color="green"
              />
              <StatCard
                label="Margen Bruto Potencial"
                value={`${margen}%`}
                sub={`$${((totales.totalValorizacionVenta||0)-(totales.totalValorizacionCosto||0)).toFixed(2)}`}
                color="purple"
              />
              <StatCard
                label="Unidades en Riesgo"
                value={(totales.totalUnidadesRiesgo||0).toLocaleString()}
                sub="Vencen en ≤7 días"
                color="orange"
              />
            </div>

            {/* Tabla de inventario */}
            <div className="card p-0 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                <h2 className="font-semibold text-gray-700 text-sm">
                  Detalle por Producto — {sorted.length} productos
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">SKU</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Producto</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Cat.</th>
                      <th
                        className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase cursor-pointer hover:text-blue-600"
                        onClick={() => toggleSort('stockDisponible')}
                      >
                        Stock <SortIcon col="stockDisponible"/>
                      </th>
                      <th
                        className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase cursor-pointer hover:text-blue-600"
                        onClick={() => toggleSort('valorizacionCosto')}
                      >
                        Val. Costo <SortIcon col="valorizacionCosto"/>
                      </th>
                      <th
                        className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase cursor-pointer hover:text-blue-600"
                        onClick={() => toggleSort('valorizacionVenta')}
                      >
                        Val. Venta <SortIcon col="valorizacionVenta"/>
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
                        En Riesgo
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">
                        Estado
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {sorted.map(p => {
                      const est = ESTADO_CONFIG[p.estado] || ESTADO_CONFIG.normal;
                      const margenProd = p.valorizacionVenta > 0
                        ? ((p.valorizacionVenta - p.valorizacionCosto) / p.valorizacionVenta * 100).toFixed(1)
                        : 0;
                      return (
                        <tr key={p.SKU} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.SKU}</td>
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-800">{p.producto || p.Producto}</p>
                            <p className="text-xs text-gray-400">Margen: {margenProd}%</p>
                          </td>
                          <td className="px-4 py-3 text-gray-600 text-xs">{p.Categoria || p.categoria}</td>
                          <td className="px-4 py-3 text-right">
                            <span className="font-medium text-gray-800">
                              {(p.stockDisponible||0).toLocaleString()}
                            </span>
                            <span className="text-xs text-gray-400 ml-1">uds</span>
                          </td>
                          <td className="px-4 py-3 text-right text-gray-700">
                            ${(p.valorizacionCosto||0).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-right text-green-700 font-medium">
                            ${(p.valorizacionVenta||0).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {p.unidadesRiesgo > 0 ? (
                              <span className="text-red-600 font-medium">{p.unidadesRiesgo} uds</span>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`badge ${est.cls}`}>{est.label}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {/* Fila de totales */}
                  <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                    <tr>
                      <td colSpan={4} className="px-4 py-3 text-sm font-bold text-gray-700">
                        TOTALES
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-gray-800">
                        ${(totales.totalValorizacionCosto||0).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-green-700">
                        ${(totales.totalValorizacionVenta||0).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-red-600">
                        {(totales.totalUnidadesRiesgo||0)} uds
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
}
