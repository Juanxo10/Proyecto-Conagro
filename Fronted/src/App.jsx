import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

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

// Ruta protegida: requiere sesión activa y token no expirado
function PrivateRoute({ children }) {
  if (!isTokenValid()) {
    localStorage.clear();
    return <Navigate to="/" replace />;
  }
  return children;
}

// Ruta exclusiva para administradores
function AdminRoute({ children }) {
  if (!isTokenValid()) {
    localStorage.clear();
    return <Navigate to="/" replace />;
  }
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  if (user.rol !== 'admin') return <Navigate to="/index" replace />;
  return children;
}

function App() {
  return (
    <Router>
      <Routes>
        {/* Login sin navbar */}
        <Route path="/" element={<LoginScreen />} />

        {/* Páginas protegidas CON navbar */}
        <Route path="/index"            element={<PrivateRoute><Navbar><Index /></Navbar></PrivateRoute>} />
        <Route path="/panel"            element={<PrivateRoute><Navbar><Panel /></Navbar></PrivateRoute>} />
        <Route path="/maestro_vehiculos" element={<PrivateRoute><Navbar><MaestroVehiculos /></Navbar></PrivateRoute>} />
        <Route path="/actualiza_pesaje" element={<PrivateRoute><Navbar><ActualizaPesaje /></Navbar></PrivateRoute>} />
        <Route path="/previo"           element={<PrivateRoute><Navbar><Previo /></Navbar></PrivateRoute>} />
        <Route path="/trilla"           element={<PrivateRoute><Navbar><Trilla /></Navbar></PrivateRoute>} />
        <Route path="/liquidacion"      element={<PrivateRoute><Navbar><Liquidacion /></Navbar></PrivateRoute>} />
        <Route path="/despacho"         element={<PrivateRoute><Navbar><Despacho /></Navbar></PrivateRoute>} />

        {/* Solo admin puede acceder a inventario y logs */}
        <Route path="/inventario"       element={<AdminRoute><Navbar><Inventario /></Navbar></AdminRoute>} />
        <Route path="/logs"             element={<AdminRoute><Navbar><Logs /></Navbar></AdminRoute>} />

        <Route path="*" element={<PrivateRoute><Navbar><Index /></Navbar></PrivateRoute>} />
      </Routes>
    </Router>
  );
}

export default App;
