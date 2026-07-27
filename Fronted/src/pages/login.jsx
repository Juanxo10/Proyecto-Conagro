import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

/* Icono real de Conagro (el mismo trazo usado en los certificados de calidad) */
const RiceMark = ({ size = 40, stem = "#fff", leaf1 = "#bfe3a6", leaf2 = "#9ed37e", leaf3 = "#7cc158" }) => (
  <svg width={size} height={size * 0.9} viewBox="0 0 60 54" fill="none" xmlns="http://www.w3.org/2000/svg">
    <line x1="30" y1="50" x2="30" y2="9" stroke={stem} strokeWidth="2.4" strokeLinecap="round"/>
    <ellipse cx="30" cy="10" rx="4.4" ry="6.4" fill={leaf1}/>
    <path d="M30 20 C22 15 15 8 18 4 C23 2 29 14 30 20Z" fill={leaf1}/>
    <path d="M30 20 C38 15 45 8 42 4 C37 2 31 14 30 20Z" fill={leaf1}/>
    <path d="M30 31 C20 24 12 14 15 8 C20 5 28 23 30 31Z" fill={leaf2}/>
    <path d="M30 31 C40 24 48 14 45 8 C40 5 32 23 30 31Z" fill={leaf2}/>
    <path d="M30 44 C18 35 10 22 13 14 C18 11 27 32 30 44Z" fill={leaf3}/>
    <path d="M30 44 C42 35 50 22 47 14 C42 11 33 32 30 44Z" fill={leaf3}/>
  </svg>
);

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
          <div className="lg-mesh" />
          <div className="lg-watermark"><RiceMark size={620} stem="rgba(255,255,255,.05)" leaf1="rgba(255,255,255,.05)" leaf2="rgba(255,255,255,.045)" leaf3="rgba(255,255,255,.04)" /></div>
          <div className="lg-noise" />

          <div className="lg-brand-content">
            <div className="lg-brand-top">
              <div className="lg-logo"><RiceMark size={26} /></div>
              <div className="lg-brand-name-wrap">
                <span className="lg-brand-name">Conagro</span>
                <span className="lg-brand-tag">Comercializadora Agrícola</span>
              </div>
            </div>

            <div className="lg-brand-mid">
              <span className="lg-kicker">Plataforma de operación</span>
              <h1 className="lg-brand-title">
                Del grano en el campo<br />al arroz en el mercado.
              </h1>
              <p className="lg-brand-sub">
                Controla cada lote con trazabilidad completa: desde el
                previo en portería hasta el despacho final.
              </p>
            </div>

            <div className="lg-timeline">
              {["Previo", "Entrada", "Trilla", "Liquidación", "Despacho"].map((s, i, arr) => (
                <div className="lg-tl-item" key={s}>
                  <div className="lg-tl-marker">
                    <span className="lg-tl-dot" />
                    {i < arr.length - 1 && <span className="lg-tl-line" />}
                  </div>
                  <span className="lg-tl-label">{s}</span>
                </div>
              ))}
            </div>

            <div className="lg-brand-foot">
              <span>© {new Date().getFullYear()} Conagro S.A.S</span>
              <span className="lg-foot-dot">·</span>
              <span>Acceso restringido</span>
            </div>
          </div>
        </div>

        {/* ── PANEL DE LOGIN ── */}
        <div className="lg-panel">
          <div className="lg-panel-grid" />

          <div className="lg-card">
            <div className="lg-logo-mobile"><RiceMark size={30} stem="#fff" /></div>

            <span className="lg-eyebrow">Iniciar sesión</span>
            <h2 className="lg-title">Bienvenido de nuevo</h2>
            <p className="lg-subtitle">Ingresa tus credenciales para acceder al sistema.</p>

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
                {loading ? (
                  <span className="lg-spinner" />
                ) : (
                  <>
                    Ingresar
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                    </svg>
                  </>
                )}
              </button>
            </form>

            <p className="lg-help">¿Problemas para entrar? Contacta a tu administrador.</p>
          </div>
        </div>
      </div>

      <style>{`
        * { box-sizing: border-box; }
        html, body, #root { height: 100%; }

        .lg-screen {
          min-height: 100vh;
          display: flex;
          background: #fff;
          font-family: 'Inter', Arial, sans-serif;
          animation: lg-fade .5s ease both;
        }
        @keyframes lg-fade { from { opacity: 0; } to { opacity: 1; } }

        /* ── Panel de marca ── */
        .lg-brand {
          position: relative;
          flex: 1 1 44%;
          max-width: 580px;
          background:
            radial-gradient(1100px 700px at -10% -10%, #1f6e2b 0%, transparent 55%),
            linear-gradient(160deg, #0f4c28 0%, #1b5e20 45%, #2e7d32 100%);
          color: #fff;
          overflow: hidden;
          display: flex;
        }
        .lg-mesh {
          position: absolute; inset: 0;
          background:
            radial-gradient(480px 480px at 100% 0%, rgba(255,255,255,.10), transparent 60%),
            radial-gradient(360px 360px at 0% 100%, rgba(0,0,0,.14), transparent 60%);
          pointer-events: none;
        }
        .lg-watermark {
          position: absolute; right: -90px; bottom: -60px;
          transform: rotate(-8deg);
          pointer-events: none;
          filter: blur(.3px);
        }
        .lg-noise {
          position: absolute; inset: 0;
          background-image: radial-gradient(rgba(255,255,255,.045) 1px, transparent 1px);
          background-size: 3px 3px;
          mix-blend-mode: overlay;
          pointer-events: none;
        }

        .lg-brand-content {
          position: relative; z-index: 1;
          display: flex; flex-direction: column; justify-content: space-between;
          width: 100%;
          padding: 46px 50px;
        }

        .lg-brand-top { display: flex; align-items: center; gap: 12px; }
        .lg-logo {
          width: 46px; height: 46px;
          border-radius: 13px;
          background: rgba(255,255,255,.12);
          border: 1px solid rgba(255,255,255,.22);
          box-shadow: 0 8px 20px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.15);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .lg-brand-name-wrap { display: flex; flex-direction: column; line-height: 1.15; }
        .lg-brand-name { font-weight: 800; font-size: 18px; letter-spacing: .01em; }
        .lg-brand-tag { font-size: 11px; color: rgba(255,255,255,.6); font-weight: 500; letter-spacing: .02em; }

        .lg-brand-mid { max-width: 400px; }
        .lg-kicker {
          display: inline-block;
          font-size: 11px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase;
          color: #bdeaa1;
          margin-bottom: 14px;
        }
        .lg-brand-title {
          font-size: 32px; font-weight: 800; line-height: 1.22;
          letter-spacing: -.01em;
          margin: 0 0 16px;
        }
        .lg-brand-sub {
          font-size: 14.5px; line-height: 1.65;
          color: rgba(255,255,255,.78);
          margin: 0;
          font-family: Arial, sans-serif;
        }

        .lg-timeline { display: flex; flex-direction: column; }
        .lg-tl-item { display: flex; align-items: stretch; gap: 14px; }
        .lg-tl-marker { display: flex; flex-direction: column; align-items: center; }
        .lg-tl-dot {
          width: 9px; height: 9px; border-radius: 50%;
          background: #bdeaa1;
          box-shadow: 0 0 0 4px rgba(189,234,161,.16);
          flex-shrink: 0; margin-top: 5px;
        }
        .lg-tl-line { width: 1.5px; flex: 1; background: rgba(255,255,255,.18); margin: 3px 0; }
        .lg-tl-label {
          font-size: 13.5px; font-weight: 600; color: rgba(255,255,255,.88);
          padding: 0 0 18px;
          font-family: Arial, sans-serif;
        }

        .lg-brand-foot {
          font-size: 12px; color: rgba(255,255,255,.5);
          display: flex; align-items: center; gap: 8px;
          font-family: Arial, sans-serif;
        }
        .lg-foot-dot { opacity: .6; }

        /* ── Panel de login ── */
        .lg-panel {
          position: relative;
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 32px;
          background: #fbfcfb;
          overflow: hidden;
        }
        .lg-panel-grid {
          position: absolute; inset: 0;
          background-image:
            linear-gradient(rgba(46,125,50,.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(46,125,50,.035) 1px, transparent 1px);
          background-size: 34px 34px;
          -webkit-mask-image: radial-gradient(650px 650px at 82% 18%, #000 0%, transparent 70%);
          mask-image: radial-gradient(650px 650px at 82% 18%, #000 0%, transparent 70%);
          pointer-events: none;
        }

        .lg-card {
          position: relative; z-index: 1;
          width: 100%; max-width: 380px;
          font-family: Arial, sans-serif;
        }

        .lg-logo-mobile {
          display: none;
          width: 48px; height: 48px;
          border-radius: 13px;
          background: linear-gradient(160deg, #1b5e20, #2e7d32);
          box-shadow: 0 8px 20px rgba(46,125,50,.28);
          align-items: center; justify-content: center;
          margin-bottom: 20px;
        }

        .lg-eyebrow {
          display: inline-block;
          font-size: 11px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase;
          color: #2e7d32;
          margin-bottom: 10px;
        }
        .lg-title { font-size: 27px; font-weight: 800; color: #0f1a14; margin: 0 0 6px; letter-spacing: -.01em; }
        .lg-subtitle { font-size: 13.5px; color: #6b7280; margin: 0 0 30px; line-height: 1.5; }

        .lg-form { display: flex; flex-direction: column; gap: 18px; }
        .lg-group { display: flex; flex-direction: column; gap: 6px; }
        .lg-group label { font-size: 12px; font-weight: 700; color: #374151; }

        .lg-input-wrap {
          display: flex; align-items: center; gap: 10px;
          border: 1.5px solid #e2e5e2; border-radius: 10px;
          padding: 0 13px;
          background: #fff;
          box-shadow: 0 1px 2px rgba(16,24,16,.03);
          transition: border-color .15s, box-shadow .15s;
        }
        .lg-input-wrap:focus-within {
          border-color: #2e7d32;
          box-shadow: 0 0 0 4px rgba(46,125,50,.10);
        }
        .lg-input-wrap svg { width: 17px; height: 17px; color: #9ca3af; flex-shrink: 0; }
        .lg-input-wrap:focus-within svg { color: #2e7d32; }
        .lg-input-wrap input {
          flex: 1; min-width: 0;
          border: none; background: transparent; outline: none;
          padding: 12px 0; font-size: 14px; color: #111827;
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
          animation: lg-shake .35s ease;
        }
        @keyframes lg-shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        .lg-error-icon {
          width: 16px; height: 16px; border-radius: 50%;
          background: #991b1b; color: #fff;
          font-size: 11px; font-weight: 800;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }

        .lg-btn {
          padding: 13px; border: none; border-radius: 10px;
          background: linear-gradient(160deg, #2e7d32, #1b5e20);
          color: #fff;
          font-size: 14.5px; font-weight: 700; letter-spacing: .01em;
          cursor: pointer;
          box-shadow: 0 10px 22px -8px rgba(27,94,32,.55);
          transition: filter .15s, transform .1s;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          min-height: 48px;
          margin-top: 4px;
        }
        .lg-btn svg { width: 17px; height: 17px; }
        .lg-btn:hover:not(:disabled) { filter: brightness(1.08); }
        .lg-btn:active:not(:disabled) { transform: translateY(1px); }
        .lg-btn:disabled { background: #9ca3af; box-shadow: none; cursor: not-allowed; }

        .lg-help { text-align: center; font-size: 12.5px; color: #9ca3af; margin: 22px 0 0; }

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
