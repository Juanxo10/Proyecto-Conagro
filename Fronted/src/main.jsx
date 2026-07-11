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
      if (res.status === 401) {
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

