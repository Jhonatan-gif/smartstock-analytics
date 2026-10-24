// ============================================================
// Página Admin: Dashboard
// ============================================================

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import MainLayout from '../../components/layout/MainLayout';

function KPICard({ icon, title, value, subtitle, color = 'blue', link }) {
  const colors = {
    blue:   'from-blue-500 to-blue-600',
    green:  'from-green-500 to-green-600',
    orange: 'from-orange-500 to-orange-600',
    red:    'from-red-500 to-red-600',
    purple: 'from-purple-500 to-purple-600',
  };

  const content = (
    <div className={`card bg-gradient-to-br ${colors[color]} text-white border-0`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-white/80 text-sm font-medium">{title}</p>
          <p className="text-3xl font-bold mt-1">{value}</p>
          {subtitle && <p className="text-white/70 text-xs mt-1">{subtitle}</p>}
        </div>
        <span className="text-4xl opacity-80">{icon}</span>
      </div>
    </div>
  );

  return link ? <Link to={link}>{content}</Link> : content;
}

export default function AdminDashboard() {
  const [inventory, setInventory] = useState(null);
  const [alerts,    setAlerts]    = useState([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [invRes, alertRes] = await Promise.all([
          api.get('/products/reports/inventory'),
          api.get('/products/reports/alerts'),
        ]);
        setInventory(invRes.data);
        setAlerts(alertRes.data.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const alertasCriticas = alerts.filter(a => a.nivelAlerta === 'CRITICO').length;
  const alertasUrgentes = alerts.filter(a => a.nivelAlerta === 'URGENTE').length;

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Resumen del sistema de inventario</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="card animate-pulse h-28 bg-gray-200" />
            ))}
          </div>
        ) : (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <KPICard
                icon="📦"
                title="Total Productos"
                value={inventory?.totales?.totalProductos ?? 0}
                subtitle="Productos activos"
                color="blue"
                link="/admin/productos"
              />
              <KPICard
                icon="💰"
                title="Valor Inventario"
                value={`$${(inventory?.totales?.totalValorizacionCosto ?? 0).toLocaleString('es-EC', {minimumFractionDigits: 2})}`}
                subtitle="Valorización a costo"
                color="green"
                link="/admin/inventario"
              />
              <KPICard
                icon="🔴"
                title="Alertas Críticas"
                value={alertasCriticas}
                subtitle={`${alertasUrgentes} urgentes adicionales`}
                color={alertasCriticas > 0 ? 'red' : 'green'}
                link="/admin/alertas"
              />
              <KPICard
                icon="⚠️"
                title="Unidades en Riesgo"
                value={inventory?.totales?.totalUnidadesRiesgo ?? 0}
                subtitle="Vencen en ≤7 días"
                color="orange"
                link="/admin/alertas"
              />
            </div>

            {/* Alertas recientes */}
            {alerts.length > 0 && (
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-gray-800">🚨 Alertas Recientes</h2>
                  <Link to="/admin/alertas" className="text-sm text-blue-600 hover:underline">
                    Ver todas →
                  </Link>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="pb-2 text-left text-xs font-medium text-gray-500 uppercase">Lote</th>
                        <th className="pb-2 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
                        <th className="pb-2 text-left text-xs font-medium text-gray-500 uppercase">Días</th>
                        <th className="pb-2 text-left text-xs font-medium text-gray-500 uppercase">Alerta</th>
                        <th className="pb-2 text-left text-xs font-medium text-gray-500 uppercase">Descuento</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {alerts.slice(0, 5).map((a) => (
                        <tr key={a.loteId}>
                          <td className="py-2 font-mono text-xs text-gray-500">{a.numLote || a.NumeroLote || a.numeroLote}</td>
                          <td className="py-2 font-medium text-gray-800">{a.producto || a.Producto || a.Nombre}</td>
                          <td className="py-2 text-gray-600">{a.diasParaVencer || a.DiasParaVencer} días</td>
                          <td className="py-2">
                            <span className={`badge ${
                              (a.nivelAlerta || a.NivelAlerta) === 'CRITICO' ? 'badge-red' :
                              (a.nivelAlerta || a.NivelAlerta) === 'URGENTE' ? 'badge-orange' : 'badge-yellow'
                            }`}>
                              {a.nivelAlerta || a.NivelAlerta}
                            </span>
                          </td>
                          <td className="py-2 text-green-700 font-medium">
                            -{a.descuentoSugeridoPct || a.DescuentoSugeridoPct}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </MainLayout>
  );
}
