// ============================================================
// Página Usuario: Catálogo de Productos con Precio Dinámico
// ============================================================

import React, { useEffect, useState } from 'react';
import api from '../../utils/api';
import MainLayout from '../../components/layout/MainLayout';
import { useAuth } from '../../context/AuthContext';

function PriceVariationBadge({ pct }) {
  if (!pct) return null;
  const isDown = pct < 0;
  if (Math.abs(pct) < 0.5) return null;

  return (
    <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
      isDown ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
    }`}>
      {isDown ? '▼' : '▲'} {Math.abs(pct).toFixed(1)}%
    </span>
  );
}

function ProductCard({ producto }) {
  const variacion = producto.porcentajeVariacion || producto.PorcentajeVariacion || 0;
  const precio    = producto.precio             || producto.PrecioFinal           || 0;
  const precioBase= producto.PrecioBase         || producto.precioBase            || 0;

  return (
    <div className="card hover:shadow-md transition-all duration-200 flex flex-col">
      {/* Header producto */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-800 truncate">{producto.Nombre}</h3>
          <p className="text-xs text-gray-400 font-mono mt-0.5">{producto.SKU}</p>
          {producto.Categoria && (
            <span className="badge badge-blue mt-1">{producto.Categoria}</span>
          )}
        </div>
      </div>

      {/* Descripción */}
      {producto.Descripcion && (
        <p className="text-xs text-gray-500 mb-3 flex-1 line-clamp-2">
          {producto.Descripcion}
        </p>
      )}

      {/* Precio dinámico */}
      <div className="mt-auto">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs text-gray-500 mb-1">Tu precio personalizado</p>
              <p className="text-2xl font-bold text-blue-700">
                ${precio.toFixed(2)}
              </p>
              {precioBase !== precio && (
                <p className="text-xs text-gray-400 line-through">${precioBase.toFixed(2)}</p>
              )}
            </div>
            <PriceVariationBadge pct={variacion} />
          </div>
        </div>

        {/* Etiquetas */}
        <div className="flex flex-wrap gap-1 mt-2">
          {(producto.etiquetaPromocion || producto.EtiquetaPromocion) && (
            <span className="badge badge-green text-xs">
              🏷️ {producto.etiquetaPromocion || producto.EtiquetaPromocion}
            </span>
          )}
          {(producto.mensajeUrgencia || producto.MensajeUrgencia) && (
            <span className="badge badge-orange text-xs">
              ⏰ {producto.mensajeUrgencia || producto.MensajeUrgencia}
            </span>
          )}
        </div>

        {/* Stock */}
        <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
          <span>
            Stock: <strong>{(producto.stockDisponible || producto.StockTotal || 0).toLocaleString()}</strong> uds
          </span>
          {(producto.diasParaVencer || producto.DiasParaVencer) && (
            <span>Vence en {producto.diasParaVencer || producto.DiasParaVencer} días</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CatalogoPage() {
  const { user } = useAuth();
  const [productos, setProductos] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [categoria, setCategoria] = useState('TODAS');

  useEffect(() => {
    api.get('/products')
       .then(r => setProductos(r.data.data || []))
       .catch(console.error)
       .finally(() => setLoading(false));
  }, []);

  const categorias = ['TODAS', ...new Set(productos.map(p => p.Categoria).filter(Boolean))];

  const filtrados = productos.filter(p =>
    (categoria === 'TODAS' || p.Categoria === categoria) &&
    (p.Nombre?.toLowerCase().includes(search.toLowerCase()) ||
     p.SKU?.toLowerCase().includes(search.toLowerCase()))
  );

  const tipoBadge = {
    VIP: 'badge-yellow',
    B2B: 'badge-blue',
    B2C: 'badge-green',
  }[user?.tipoNegocio] || 'badge-green';

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">🛒 Catálogo</h1>
            <p className="text-sm text-gray-500 mt-1">
              Precios calculados en tiempo real para tu perfil
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Perfil:</span>
            <span className={`badge ${tipoBadge} text-sm`}>
              {user?.tipoNegocio === 'VIP' ? '⭐' : user?.tipoNegocio === 'B2B' ? '🏭' : '👤'}
              {' '}{user?.tipoNegocio}
            </span>
          </div>
        </div>

        {/* Banner informativo */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-4 text-white">
          <p className="text-sm font-medium">
            💡 Los precios mostrados son exclusivos para tu segmento <strong>{user?.tipoNegocio}</strong> y
            se calculan en tiempo real considerando stock disponible, fechas de caducidad y demanda actual.
          </p>
        </div>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Buscar producto..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex gap-2 flex-wrap">
            {categorias.map(c => (
              <button
                key={c}
                onClick={() => setCategoria(c)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors border
                  ${categoria === c
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Grid de productos */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(8)].map((_,i) => (
              <div key={i} className="card animate-pulse h-64 bg-gray-100" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtrados.map(p => (
              <ProductCard key={p.productoId} producto={p} />
            ))}
          </div>
        )}

        {!loading && filtrados.length === 0 && (
          <div className="card text-center py-16 text-gray-400">
            <span className="text-5xl block mb-3">🔍</span>
            <p className="font-medium">No se encontraron productos</p>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
