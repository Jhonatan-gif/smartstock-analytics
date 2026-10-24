// ============================================================
// Página Admin: Alertas de Caducidad
// ============================================================

import React, { useEffect, useState } from 'react';
import api from '../../utils/api';
import MainLayout from '../../components/layout/MainLayout';

const NIVEL = {
  CRITICO:    { cls: 'badge-red',    icon: '🔴' },
  URGENTE:    { cls: 'badge-orange', icon: '🟠' },
  ATENCION:   { cls: 'badge-yellow', icon: '🟡' },
  VIGILANCIA: { cls: 'badge-blue',   icon: '🟢' },
};

export default function AdminAlertas() {
  const [alertas,  setAlertas]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [filtro,   setFiltro]   = useState('TODOS');

  useEffect(() => {
    api.get('/products/reports/alerts')
       .then(r => setAlertas(r.data.data || []))
       .catch(console.error)
       .finally(() => setLoading(false));
  }, []);

  const filtradas = filtro === 'TODOS'
    ? alertas
    : alertas.filter(a => (a.nivelAlerta || a.NivelAlerta) === filtro);

  const counts = ['CRITICO','URGENTE','ATENCION','VIGILANCIA'].reduce((acc, n) => {
    acc[n] = alertas.filter(a => (a.nivelAlerta||a.NivelAlerta) === n).length;
    return acc;
  }, {});

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🚨 Alertas de Caducidad</h1>
          <p className="text-sm text-gray-500 mt-1">
            Lotes próximos a vencer con descuentos sugeridos automáticos
          </p>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-2">
          {['TODOS','CRITICO','URGENTE','ATENCION','VIGILANCIA'].map(n => (
            <button
              key={n}
              onClick={() => setFiltro(n)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border
                ${filtro === n
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
            >
              {n === 'TODOS' ? `Todos (${alertas.length})` : `${NIVEL[n]?.icon} ${n} (${counts[n]})`}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="card animate-pulse h-64" />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtradas.map(a => {
              const nivel = NIVEL[a.nivelAlerta || a.NivelAlerta] || NIVEL.VIGILANCIA;
              return (
                <div key={a.loteId || a.LoteId} className="card hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-800 text-sm">{a.producto || a.Nombre}</h3>
                      <p className="text-xs text-gray-400 font-mono mt-0.5">{a.SKU}</p>
                    </div>
                    <span className={`badge ${nivel.cls}`}>
                      {nivel.icon} {a.nivelAlerta || a.NivelAlerta}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                    <div className="bg-gray-50 rounded-lg p-2">
                      <p className="text-gray-500">Vence en</p>
                      <p className="font-bold text-gray-800 text-base">{a.diasParaVencer || a.DiasParaVencer} días</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2">
                      <p className="text-gray-500">Unidades</p>
                      <p className="font-bold text-gray-800 text-base">{(a.cantidadVendible || a.CantidadVendible || 0).toLocaleString()}</p>
                    </div>
                    <div className="bg-red-50 rounded-lg p-2">
                      <p className="text-gray-500">Valor en riesgo</p>
                      <p className="font-bold text-red-700">${(a.valorEnRiesgo || a.ValorEnRiesgo || 0).toFixed(2)}</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-2">
                      <p className="text-gray-500">Precio sugerido</p>
                      <p className="font-bold text-green-700">
                        ${(a.precioSugerido || a.PrecioSugerido || 0).toFixed(2)}
                        <span className="text-green-600 ml-1">(-{a.descuentoSugeridoPct || a.DescuentoSugeridoPct}%)</span>
                      </p>
                    </div>
                  </div>

                  <div className="text-xs text-gray-500">
                    <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">
                      {a.NumeroLote || a.numLote || a.numeroLote}
                    </span>
                    <span className="ml-2">
                      Ventas 7d: {a.ventas7Dias || a.Ventas7Dias || 0} uds
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!loading && filtradas.length === 0 && (
          <div className="card text-center py-16 text-gray-400">
            <span className="text-5xl block mb-3">✅</span>
            <p className="font-medium">No hay alertas para el filtro seleccionado</p>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
