import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Interceptor global: agrega token JWT y maneja respuestas 401 (sesión expirada)
const _fetch = window.fetch;
window.fetch = function (url, options = {}) {
  const token = localStorage.getItem('token');
  if (typeof url === 'string' && url.startsWith('/api/')) {
    if (token) {
      options = {
        ...options,
        headers: {
          ...options.headers,
          Authorization: `Bearer ${token}`,
        },
      };
    }
    return _fetch(url, options).then((res) => {
      // El propio login devuelve 401 cuando el usuario/contraseña son
      // incorrectos — eso no es una sesión expirada, es un error de
      // credenciales que el formulario debe poder mostrar. Recargar la
      // página aquí borraba el mensaje de error antes de que se viera.
      if (res.status === 401 && !url.startsWith('/api/auth/login')) {
        // Token inválido o expirado: cerrar sesión y redirigir al login
        localStorage.clear();
        window.location.replace('/');
      }
      return res;
    });
  }
  return _fetch(url, options);
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

