import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [show, setShow] = useState(false);
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

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

        navigate("/index");

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
      <div className="lg-screen">

        {/* ── PANEL DE MARCA ── */}
        <div className="lg-brand">
          <div className="lg-brand-glow" />
          <div className="lg-brand-content">
            <div className="lg-brand-top">
              <div className="lg-logo">C</div>
              <span className="lg-brand-name">Conagro</span>
            </div>

            <div className="lg-brand-mid">
              <h1 className="lg-brand-title">
                Trazabilidad completa,<br />de la trilla al despacho.
              </h1>
              <p className="lg-brand-sub">
                Gestiona previos, entradas, trilla, liquidación y despacho
                de arroz en un solo lugar.
              </p>
            </div>

            <div className="lg-brand-steps">
              {["Previo", "Entrada", "Trilla", "Liquidación", "Despacho"].map((s, i) => (
                <div className="lg-step" key={s}>
                  <span className="lg-step-dot">{i + 1}</span>
                  <span>{s}</span>
                </div>
              ))}
            </div>

            <span className="lg-brand-foot">© {new Date().getFullYear()} Conagro S.A.S</span>
          </div>
        </div>

        {/* ── PANEL DE LOGIN ── */}
        <div className="lg-panel">
          <div className="lg-card">

            <div className="lg-logo-mobile">C</div>

            <h2 className="lg-title">Bienvenido</h2>
            <p className="lg-subtitle">Ingresa con tu usuario para continuar.</p>

            <form onSubmit={handleSubmit} className="lg-form">
              <div className="lg-group">
                <label>Usuario</label>
                <div className="lg-input-wrap">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                  </svg>
                  <input
                    type="text"
                    placeholder="Ingresa tu usuario"
                    value={usuario}
                    onChange={(e) => setUsuario(e.target.value)}
                    autoComplete="username"
                    required
                  />
                </div>
              </div>

              <div className="lg-group">
                <label>Contraseña</label>
                <div className="lg-input-wrap">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                  <input
                    type={show ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                  />
                  <button type="button" className="lg-eye" onClick={() => setShow(!show)} tabIndex={-1}>
                    {show ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a18.6 18.6 0 0 1 5.06-5.94M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a18.6 18.6 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div className="lg-error">
                  <span className="lg-error-icon">!</span>
                  {error}
                </div>
              )}

              <button type="submit" className="lg-btn" disabled={loading}>
                {loading ? <span className="lg-spinner" /> : "Ingresar"}
              </button>
            </form>
          </div>
        </div>
      </div>

      <style>{`
        * { box-sizing: border-box; font-family: Arial, sans-serif; }
        html, body, #root { height: 100%; }

        .lg-screen {
          min-height: 100vh;
          display: flex;
          background: #f4f6f8;
        }

        /* ── Panel de marca ── */
        .lg-brand {
          position: relative;
          flex: 1 1 46%;
          max-width: 560px;
          background: linear-gradient(155deg, #1b5e20 0%, #2e7d32 55%, #3a9142 100%);
          color: #fff;
          overflow: hidden;
          display: flex;
        }
        .lg-brand-glow {
          position: absolute;
          width: 640px; height: 640px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(255,255,255,.10) 0%, rgba(255,255,255,0) 70%);
          top: -220px; right: -220px;
          pointer-events: none;
        }
        .lg-brand::after {
          content: '';
          position: absolute;
          width: 420px; height: 420px;
          border-radius: 50%;
          border: 1.5px solid rgba(255,255,255,.12);
          bottom: -180px; left: -140px;
          pointer-events: none;
        }
        .lg-brand-content {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          width: 100%;
          padding: 48px 52px;
        }

        .lg-brand-top { display: flex; align-items: center; gap: 12px; }
        .lg-logo {
          width: 40px; height: 40px;
          border-radius: 10px;
          background: rgba(255,255,255,.16);
          border: 1px solid rgba(255,255,255,.25);
          display: flex; align-items: center; justify-content: center;
          font-weight: 800; font-size: 19px;
          flex-shrink: 0;
        }
        .lg-brand-name { font-weight: 700; font-size: 18px; letter-spacing: .02em; }

        .lg-brand-mid { max-width: 400px; }
        .lg-brand-title {
          font-size: 30px; font-weight: 800; line-height: 1.25;
          margin: 0 0 14px;
        }
        .lg-brand-sub {
          font-size: 14.5px; line-height: 1.6;
          color: rgba(255,255,255,.82);
          margin: 0;
        }

        .lg-brand-steps { display: flex; flex-direction: column; gap: 10px; }
        .lg-step {
          display: flex; align-items: center; gap: 12px;
          font-size: 13.5px; font-weight: 600;
          color: rgba(255,255,255,.9);
        }
        .lg-step-dot {
          width: 22px; height: 22px; border-radius: 50%;
          background: rgba(255,255,255,.14);
          border: 1px solid rgba(255,255,255,.3);
          display: flex; align-items: center; justify-content: center;
          font-size: 11px; font-weight: 800;
          flex-shrink: 0;
        }

        .lg-brand-foot { font-size: 12px; color: rgba(255,255,255,.55); }

        /* ── Panel de login ── */
        .lg-panel {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 32px;
        }
        .lg-card { width: 100%; max-width: 380px; }

        .lg-logo-mobile {
          display: none;
          width: 44px; height: 44px;
          border-radius: 10px;
          background: #2e7d32;
          color: #fff;
          font-weight: 800; font-size: 20px;
          align-items: center; justify-content: center;
          margin-bottom: 18px;
        }

        .lg-title { font-size: 26px; font-weight: 700; color: #111827; margin: 0 0 6px; }
        .lg-subtitle { font-size: 13.5px; color: #6b7280; margin: 0 0 28px; }

        .lg-form { display: flex; flex-direction: column; gap: 18px; }
        .lg-group { display: flex; flex-direction: column; gap: 6px; }
        .lg-group label { font-size: 12px; font-weight: 600; color: #374151; }

        .lg-input-wrap {
          display: flex; align-items: center; gap: 10px;
          border: 1.5px solid #d1d5db; border-radius: 8px;
          padding: 0 12px;
          background: #f9fafb;
          transition: border-color .15s, box-shadow .15s, background .15s;
        }
        .lg-input-wrap:focus-within {
          border-color: #2e7d32;
          background: #fff;
          box-shadow: 0 0 0 3px rgba(46,125,50,.12);
        }
        .lg-input-wrap svg { width: 17px; height: 17px; color: #9ca3af; flex-shrink: 0; }
        .lg-input-wrap:focus-within svg { color: #2e7d32; }
        .lg-input-wrap input {
          flex: 1; min-width: 0;
          border: none; background: transparent; outline: none;
          padding: 11px 0; font-size: 14px; color: #111827;
        }
        .lg-eye {
          border: none; background: none; cursor: pointer;
          display: flex; padding: 4px; color: #9ca3af;
        }
        .lg-eye:hover { color: #374151; }
        .lg-eye svg { width: 17px; height: 17px; }

        .lg-error {
          display: flex; align-items: center; gap: 8px;
          background: #fef2f2; border: 1px solid #fecaca; color: #991b1b;
          border-radius: 8px; padding: 9px 12px; font-size: 13px; font-weight: 500;
        }
        .lg-error-icon {
          width: 16px; height: 16px; border-radius: 50%;
          background: #991b1b; color: #fff;
          font-size: 11px; font-weight: 800;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }

        .lg-btn {
          padding: 12px; border: none; border-radius: 8px;
          background: #2e7d32; color: #fff;
          font-size: 14.5px; font-weight: 700; letter-spacing: .02em;
          cursor: pointer; transition: background .15s;
          display: flex; align-items: center; justify-content: center;
          min-height: 46px;
        }
        .lg-btn:hover:not(:disabled) { background: #1b5e20; }
        .lg-btn:disabled { background: #9ca3af; cursor: not-allowed; }

        .lg-spinner {
          width: 18px; height: 18px;
          border: 2.5px solid rgba(255,255,255,.4);
          border-top-color: #fff;
          border-radius: 50%;
          animation: lg-spin .7s linear infinite;
        }
        @keyframes lg-spin { to { transform: rotate(360deg); } }

        @media (max-width: 860px) {
          .lg-brand { display: none; }
          .lg-panel { padding: 24px; }
          .lg-logo-mobile { display: flex; }
        }
      `}</style>
    </>
  );
}
