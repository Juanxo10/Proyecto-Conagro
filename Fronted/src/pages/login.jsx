import React, { useState } from "react";
import { useNavigate } from "react-router-dom";   // 👈 agrega esto

export default function Login() {
  const [show, setShow] = useState(false);
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();   // 👈 agrega esto

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario, password }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));

        navigate("/index");   // 👈 cambia esto

      } else {
        setError(data.message || "Credenciales inválidas");
      }
    } catch (err) {
      console.error(err);
      setError("No se pudo conectar con el servidor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="app">
        <div className="login-wrapper">
          <div className="login-card">
            <h2 className="title">
              Iniciar <span>Sesión</span>
            </h2>

            <form onSubmit={handleSubmit} className="form">
              <div className="group">
                <label>Usuario</label>
                <input
                  type="text"
                  placeholder="Ingrese usuario"
                  value={usuario}
                  onChange={(e) => setUsuario(e.target.value)}
                  required
                />
              </div>

              <div className="group">
                <label>Contraseña</label>
                <div className="password">
                  <input
                    type={show ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <span onClick={() => setShow(!show)}>
                    {show ? "🙈" : "👁"}
                  </span>
                </div>
              </div>

              {error && <p className="error">{error}</p>}

              <button type="submit" className="btn primary" disabled={loading}>
                {loading ? "Ingresando..." : "Ingresar"}
              </button>
            </form>
          </div>
        </div>
      </div>

      <style>{`
        * { box-sizing: border-box; font-family: Arial, sans-serif; }
        .app {
          min-height: 100vh;
          background: #f4f6f8;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .login-wrapper { width: 100%; max-width: 400px; }
        .login-card {
          background: #fff;
          border: 1px solid #ddd;
          border-radius: 10px;
          padding: 30px;
        }
        .title { text-align: center; margin-bottom: 25px; }
        .title span { color: #2e7d32; }
        .form { display: flex; flex-direction: column; gap: 15px; }
        .group { display: flex; flex-direction: column; }
        .group label { font-size: 13px; margin-bottom: 5px; color: #555; }
        .group input {
          padding: 10px;
          border-radius: 6px;
          border: 1px solid #ccc;
          outline: none;
        }
        .group input:focus { border-color: #2e7d32; }

        .password {
          display: flex;
          align-items: center;
          border: 1px solid #ccc;
          border-radius: 6px;
          overflow: hidden;
        }
        .password input { flex: 1; border: none; padding: 10px; }
        .password span { padding: 0 10px; cursor: pointer; color: #555; }

        .btn {
          padding: 12px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
        }
        .primary { background: #2e7d32; color: white; }
        .primary:hover { background: #1b5e20; }
        .primary:disabled { background: #999; cursor: not-allowed; }

        .error {
          color: #d32f2f;
          text-align: center;
          font-size: 14px;
        }
      `}</style>
    </>
  );
}