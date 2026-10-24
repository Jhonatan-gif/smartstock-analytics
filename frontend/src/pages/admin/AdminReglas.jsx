// ============================================================
// Página Admin: Reglas de Precios
// ============================================================

import React, { useEffect, useState } from 'react';
import api from '../../utils/api';
import MainLayout from '../../components/layout/MainLayout';

const TIPO_LABELS = {
  TIPO_NEGOCIO_B2B:  { label: 'Tipo Negocio — B2B',     icon: '🏭', color: 'badge-blue'   },
  TIPO_NEGOCIO_B2C:  { label: 'Tipo Negocio — B2C',     icon: '👤', color: 'badge-green'  },
  TIPO_NEGOCIO_VIP:  { label: 'Tipo Negocio — VIP',     icon: '⭐', color: 'badge-yellow' },
  STOCK_BAJO:        { label: 'Stock Bajo (<50)',        icon: '📉', color: 'badge-red'    },
  SOBRESTOCK:        { label: 'Sobrestock (>300)',       icon: '📦', color: 'badge-orange' },
  CADUCIDAD_CRITICA: { label: 'Caducidad Crítica ≤3d',  icon: '🔴', color: 'badge-red'    },
  CADUCIDAD_PRONTO:  { label: 'Caducidad Pronto ≤7d',   icon: '🟠', color: 'badge-orange' },
  CADUCIDAD_NORMAL:  { label: 'Caducidad Normal ≤15d',  icon: '🟡', color: 'badge-yellow' },
  ALTA_DEMANDA:      { label: 'Alta Demanda (>100/7d)', icon: '📈', color: 'badge-purple'  },
  BAJA_DEMANDA:      { label: 'Baja Demanda (<10/7d)',  icon: '📊', color: 'badge-blue'   },
};

export default function AdminReglas() {
  const [reglas,  setReglas]  = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // En producción esto requeriría un endpoint /api/pricing-rules
    // Aquí mostramos una vista estática de las reglas con datos de semilla
    setReglas([
      { Id:1,  TipoRegla:'TIPO_NEGOCIO_B2C', Descripcion:'Precio estándar consumidor final',     FactorMultiplicador:1.0000, Prioridad:1, Activo:true },
      { Id:2,  TipoRegla:'TIPO_NEGOCIO_B2B', Descripcion:'Descuento distribuidores B2B (15%)',   FactorMultiplicador:0.8500, Prioridad:1, Activo:true },
      { Id:3,  TipoRegla:'TIPO_NEGOCIO_VIP', Descripcion:'Precio preferencial VIP (25% desc.)',  FactorMultiplicador:0.7500, Prioridad:1, Activo:true },
      { Id:4,  TipoRegla:'STOCK_BAJO',        Descripcion:'Recargo stock crítico (<50 unid)',     FactorMultiplicador:1.2000, Prioridad:2, Activo:true },
      { Id:5,  TipoRegla:'SOBRESTOCK',        Descripcion:'Descuento liquidación sobrestock',     FactorMultiplicador:0.8000, Prioridad:2, Activo:true },
      { Id:6,  TipoRegla:'CADUCIDAD_CRITICA', Descripcion:'Descuento urgente: vence en 1-3 días', FactorMultiplicador:0.5000, Prioridad:3, Activo:true },
      { Id:7,  TipoRegla:'CADUCIDAD_PRONTO',  Descripcion:'Descuento pronto: vence en 4-7 días',  FactorMultiplicador:0.7000, Prioridad:3, Activo:true },
      { Id:8,  TipoRegla:'CADUCIDAD_NORMAL',  Descripcion:'Descuento moderado: vence en 8-15d',   FactorMultiplicador:0.9000, Prioridad:3, Activo:true },
      { Id:9,  TipoRegla:'ALTA_DEMANDA',      Descripcion:'Recargo alta demanda (>100 ventas/7d)', FactorMultiplicador:1.1500, Prioridad:4, Activo:true },
      { Id:10, TipoRegla:'BAJA_DEMANDA',      Descripcion:'Descuento baja demanda (<10 ventas/7d)',FactorMultiplicador:0.9500, Prioridad:4, Activo:true },
    ]);
    setLoading(false);
  }, []);

  // Agrupar por prioridad
  const grupos = [
    { label: '1️⃣  Tipo de Cliente',  prioridad: 1 },
    { label: '2️⃣  Oferta / Stock',   prioridad: 2 },
    { label: '3️⃣  Caducidad',        prioridad: 3 },
    { label: '4️⃣  Demanda',          prioridad: 4 },
  ];

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">⚙️ Reglas de Precios</h1>
          <p className="text-sm text-gray-500 mt-1">
            Motor de precios dinámicos — factores multiplicadores aplicados en cascada
          </p>
        </div>

        {/* Fórmula */}
        <div className="card bg-gradient-to-r from-indigo-50 to-blue-50 border-indigo-200">
          <h2 className="text-sm font-semibold text-indigo-800 mb-2">📐 Fórmula de Cálculo</h2>
          <code className="text-xs text-indigo-700 bg-indigo-100 px-3 py-2 rounded-lg block">
            PrecioFinal = PrecioBase × F_TipoCliente × F_Stock × F_Caducidad × F_Demanda
          </code>
          <p className="text-xs text-indigo-600 mt-2">
            Los factores se aplican en cascada. Un factor = 1.0 significa sin cambio en precio.
            Factor &lt; 1 = descuento. Factor &gt; 1 = recargo.
          </p>
        </div>

        {/* Tabla de reglas agrupadas */}
        {grupos.map(grupo => {
          const items = reglas.filter(r => r.Prioridad === grupo.prioridad);
          return (
            <div key={grupo.prioridad} className="card p-0 overflow-hidden">
              <div className="px-6 py-3 bg-gray-50 border-b border-gray-100">
                <h3 className="font-semibold text-gray-700 text-sm">{grupo.label}</h3>
              </div>
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Tipo Regla</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Descripción</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Factor</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Efecto</th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {items.map(r => {
                    const meta      = TIPO_LABELS[r.TipoRegla] || {};
                    const pct       = ((r.FactorMultiplicador - 1) * 100).toFixed(1);
                    const isDescuento = r.FactorMultiplicador < 1;
                    const isRecargo   = r.FactorMultiplicador > 1;

                    return (
                      <tr key={r.Id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <span className={`badge ${meta.color || 'badge-blue'}`}>
                            {meta.icon} {r.TipoRegla}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{r.Descripcion}</td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-gray-800">
                          {r.FactorMultiplicador.toFixed(4)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {isDescuento && (
                            <span className="text-green-600 font-medium">▼ {Math.abs(pct)}% descuento</span>
                          )}
                          {isRecargo && (
                            <span className="text-red-600 font-medium">▲ {Math.abs(pct)}% recargo</span>
                          )}
                          {!isDescuento && !isRecargo && (
                            <span className="text-gray-400">Sin cambio</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={r.Activo ? 'badge badge-green' : 'badge badge-red'}>
                            {r.Activo ? '✅ Activa' : '❌ Inactiva'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })}

        <p className="text-xs text-gray-400 text-center">
          Para modificar factores, actualiza la tabla <code>dbo.ReglasPrecios</code> en SQL Server.
          Los cambios aplican en tiempo real en el siguiente cálculo de precio.
        </p>
      </div>
    </MainLayout>
  );
}
