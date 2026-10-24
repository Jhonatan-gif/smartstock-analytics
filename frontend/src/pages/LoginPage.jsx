import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  const { login } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const from = location.state?.from?.pathname || null;

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const usuario = await login(email, password);
      const destino = from || (usuario.rol === "Admin" ? "/admin/dashboard" : "/catalogo");
      navigate(destino, { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || "Error al iniciar sesión. Verifica tus credenciales.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-lg mb-4">
            <span className="text-3xl">📦</span>
          </div>
          <h1 className="text-3xl font-bold text-white">StockDinamico</h1>
          <p className="text-blue-200 mt-1">Gestión de Inventario con Precios Inteligentes</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Iniciar Sesión</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Correo</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="usuario@ejemplo.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm disabled:opacity-50">
              {loading ? "Verificando..." : "Ingresar"}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-100">
            <p className="text-xs text-gray-500 text-center mb-3 font-medium">Cuentas de prueba</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button onClick={() => { setEmail("admin@stockdinamico.com"); setPassword("Admin123!"); }}
                className="p-2 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 text-left">
                <span className="block font-medium text-gray-700">Admin</span>
                <span className="text-gray-500">admin@stockdinamico.com</span>
              </button>
              <button onClick={() => { setEmail("ana@gmail.com"); setPassword("User123!"); }}
                className="p-2 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 text-left">
                <span className="block font-medium text-gray-700">B2C</span>
                <span className="text-gray-500">ana@gmail.com</span>
              </button>
              <button onClick={() => { setEmail("carlos@distribuidora.com"); setPassword("User123!"); }}
                className="p-2 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 text-left">
                <span className="block font-medium text-gray-700">B2B</span>
                <span className="text-gray-500">carlos@distribuidora.com</span>
              </button>
              <button onClick={() => { setEmail("vip@supercorp.com"); setPassword("User123!"); }}
                className="p-2 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 text-left">
                <span className="block font-medium text-gray-700">VIP</span>
                <span className="text-gray-500">vip@supercorp.com</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
