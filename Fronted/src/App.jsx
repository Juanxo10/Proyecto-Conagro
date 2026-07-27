import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';

import LoginScreen from './pages/login';
import Index from './pages/index';
import Panel from './pages/panel';
import MaestroVehiculos from './pages/maestro_vehiculos';
import ActualizaPesaje from './pages/actualiza_pesaje';
import Inventario from './pages/inventario';
import Logs from './pages/logs';
import Previo from './pages/previo';
import Trilla from './pages/trilla';
import Liquidacion from './pages/liquidacion';
import Despacho    from './pages/despacho';
import Navbar from './components/navbar';

// Decodifica el payload del JWT sin librerías externas
function getTokenPayload(token) {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

// Devuelve true si el token es válido y no ha expirado
function isTokenValid() {
  const token = localStorage.getItem('token');
  if (!token) return false;
  const payload = getTokenPayload(token);
  if (!payload) return false;
  // payload.exp está en segundos
  return payload.exp * 1000 > Date.now();
}

// Layout persistente: valida sesión y monta el Navbar UNA sola vez.
// Las páginas se renderizan dentro vía <Outlet/>, así el navbar no
// se desmonta/remonta (ni parpadea) al cambiar de ruta.
function ProtectedLayout() {
  if (!isTokenValid()) {
    localStorage.clear();
    return <Navigate to="/" replace />;
  }
  return <Navbar />;
}

// Sub-guard para rutas exclusivas de administrador. Se anida DENTRO
// de ProtectedLayout (no lo reemplaza) para que el Navbar tampoco se
// remonte al entrar a una sección de admin.
function AdminGuard() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  if (user.rol !== 'admin') return <Navigate to="/index" replace />;
  return <Outlet />;
}

function App() {
  return (
    <Router>
      <Routes>
        {/* Login sin navbar */}
        <Route path="/" element={<LoginScreen />} />

        {/* Páginas protegidas, todas comparten el mismo Navbar montado */}
        <Route element={<ProtectedLayout />}>
          <Route path="/index"             element={<Index />} />
          <Route path="/panel"             element={<Panel />} />
          <Route path="/maestro_vehiculos" element={<MaestroVehiculos />} />
          <Route path="/actualiza_pesaje"  element={<ActualizaPesaje />} />
          <Route path="/previo"            element={<Previo />} />
          <Route path="/trilla"            element={<Trilla />} />
          <Route path="/liquidacion"       element={<Liquidacion />} />
          <Route path="/despacho"          element={<Despacho />} />

          {/* Solo admin puede acceder a inventario y logs */}
          <Route element={<AdminGuard />}>
            <Route path="/inventario" element={<Inventario />} />
            <Route path="/logs"       element={<Logs />} />
          </Route>

          <Route path="*" element={<Index />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
