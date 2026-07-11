import React, { useState } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";

/* ── SVG Icons ───────────────────────────────────────────── */
const Icon = ({ name }) => {
  const icons = {
    home: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
    clipboard: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
      </svg>
    ),
    scale: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="3" x2="12" y2="21"/><path d="M17 21H7"/><path d="M3 9l9-6 9 6"/><path d="M3 9h4l2 6H3z"/><path d="M21 9h-4l-2 6h6z"/>
      </svg>
    ),
    grain: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a10 10 0 0 1 0 20"/><path d="M12 2a10 10 0 0 0 0 20"/><path d="M12 2v20"/><path d="M2 12h20"/>
      </svg>
    ),
    receipt: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1z"/><line x1="8" y1="9" x2="16" y2="9"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="12" y2="17"/>
      </svg>
    ),
    truck: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
      </svg>
    ),
    chart: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>
      </svg>
    ),
    car: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v9a2 2 0 0 1-2 2h-3"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>
      </svg>
    ),
    box: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
      </svg>
    ),
    logs: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
      </svg>
    ),
    logout: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
      </svg>
    ),
    menu: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>
      </svg>
    ),
    chevron: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="15 18 9 12 15 6"/>
      </svg>
    ),
  };
  return <span className="svg-icon">{icons[name] || null}</span>;
};

/* ── Nav structure ───────────────────────────────────────── */
const sections = [
  {
    items: [
      { label: "Inicio",      path: "/index",            icon: "home" },
    ],
  },
  {
    title: "Entradas y Despachos",
    items: [
      { label: "Previo",      path: "/previo",           icon: "clipboard" },
      { label: "Entrada",     path: "/actualiza_pesaje", icon: "scale" },
      { label: "Despacho",    path: "/despacho",         icon: "truck" },
    ],
  },
  {
    title: "Proceso",
    items: [
      { label: "Trilla",      path: "/trilla",           icon: "grain" },
    ],
  },
  {
    title: "Contable",
    items: [
      { label: "Liquidación", path: "/liquidacion",      icon: "receipt" },
    ],
  },
  {
    title: "Extras",
    items: [
      { label: "Panel",      path: "/panel",             icon: "chart" },
      { label: "Vehículos",  path: "/maestro_vehiculos", icon: "car" },
    ],
  },
  {
    title: "Admin",
    adminOnly: true,
    items: [
      { label: "Inventario", path: "/inventario", icon: "box" },
      { label: "Logs",       path: "/logs",        icon: "logs" },
    ],
  },
];

/* ── Component ───────────────────────────────────────────── */
export default function Navbar({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const navigate   = useNavigate();
  const location   = useLocation();

  const user    = JSON.parse(localStorage.getItem("user") || "{}");
  const isAdmin = user.rol === "admin";

  const logout = () => { localStorage.clear(); navigate("/"); };

  const allItems   = sections.flatMap(s => s.items);
  const pageLabel  = allItems.find(m => m.path === location.pathname)?.label || "";

  return (
    <div className={`layout ${collapsed ? "collapsed" : ""}`}>

      {/* ── SIDEBAR ── */}
      <aside className="sidebar">

        {/* Brand */}
        <div className="brand">
          <div className="brand-logo">C</div>
          {!collapsed && <span className="brand-name">Conagro</span>}
        </div>

        {/* Nav */}
        <nav>
          {sections.map((section, si) => {
            if (section.adminOnly && !isAdmin) return null;
            return (
              <div key={si} className="nav-section">
                {section.title && !collapsed && (
                  <span className="section-label">{section.title}</span>
                )}
                {section.items.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    title={collapsed ? item.label : undefined}
                    className={({ isActive }) => `item ${isActive ? "active" : ""}`}
                  >
                    <Icon name={item.icon} />
                    {!collapsed && <span className="item-label">{item.label}</span>}
                  </NavLink>
                ))}
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <div className="user-row">
            <div className="avatar">{(user.nombre || "U")[0].toUpperCase()}</div>
            {!collapsed && (
              <div className="user-info">
                <p className="user-name">{user.nombre || "Usuario"}</p>
                <span className="user-role">{user.rol || "—"}</span>
              </div>
            )}
          </div>
          <button className="logout-btn" onClick={logout} title="Cerrar sesión">
            <Icon name="logout" />
            {!collapsed && <span>Salir</span>}
          </button>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <main className="main">
        <header className="topbar">
          <button className="toggle-btn" onClick={() => setCollapsed(!collapsed)} title="Menú">
            <Icon name={collapsed ? "menu" : "chevron"} />
          </button>
          <div className="topbar-title">
            <span className="page-label">{pageLabel}</span>
          </div>
          <div className="topbar-user">
            <span className="topbar-username">{user.nombre || ""}</span>
            <div className="topbar-avatar">{(user.nombre || "U")[0].toUpperCase()}</div>
          </div>
        </header>

        <div className="content">{children}</div>
      </main>

      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        html, body, #root {
          width: 100%; height: 100%;
          font-family: 'Inter', system-ui, sans-serif;
        }

        :root {
          --sb-w: 230px;
          --sb-bg: #ffffff;
          --sb-hover: #f3f4f6;
          --sb-active-bg: #e8f5e9;
          --sb-active: #2e7d32;
          --sb-text: #4b5563;
          --sb-muted: #9ca3af;
          --accent: #2e7d32;
          --topbar-h: 58px;
        }

        /* ── Layout ── */
        .layout {
          display: flex;
          width: 100%;
          min-height: 100vh;
          background: #f4f6f8;
        }

        /* ── Sidebar ── */
        .sidebar {
          width: var(--sb-w);
          min-width: var(--sb-w);
          background: var(--sb-bg);
          border-right: 1px solid #e5e7eb;
          display: flex;
          flex-direction: column;
          transition: width .25s ease, min-width .25s ease;
          overflow: hidden;
        }

        .collapsed .sidebar {
          width: 64px;
          min-width: 64px;
        }

        /* Brand */
        .brand {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 18px 16px 14px;
          border-bottom: 1px solid #e5e7eb;
          white-space: nowrap;
        }
        .brand-logo {
          width: 34px; height: 34px;
          border-radius: 8px;
          background: var(--sb-active);
          color: #fff;
          font-weight: 800;
          font-size: 16px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .brand-name {
          color: #111827;
          font-weight: 700;
          font-size: 16px;
          letter-spacing: .02em;
        }

        /* Nav */
        nav {
          flex: 1;
          padding: 12px 8px 12px 16px;
          overflow-y: auto;
          overflow-x: hidden;
        }

        .nav-section { margin-bottom: 4px; }

        .section-label {
          display: block;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: .08em;
          text-transform: uppercase;
          color: var(--sb-muted);
          padding: 12px 10px 4px;
          white-space: nowrap;
        }

        .item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 9px 10px;
          border-radius: 7px;
          text-decoration: none;
          color: var(--sb-text);
          white-space: nowrap;
          font-size: 14px;
          transition: background .15s, color .15s;
          position: relative;
        }

        .item:hover {
          background: #e8f5e9;
          color: #2e7d32;
        }

        .item.active {
          background: var(--sb-active-bg);
          color: var(--sb-active);
          font-weight: 600;
        }

        .item.active::before {
          content: '';
          position: absolute;
          left: -8px; top: 6px; bottom: 6px;
          width: 3px;
          border-radius: 0 2px 2px 0;
          background: var(--sb-active);
        }

        .svg-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          width: 18px; height: 18px;
        }
        .svg-icon svg { width: 18px; height: 18px; }

        .item-label { overflow: hidden; text-overflow: ellipsis; }

        /* Sidebar footer */
        .sidebar-footer {
          padding: 12px 8px;
          border-top: 1px solid #e5e7eb;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .user-row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 6px 8px;
          overflow: hidden;
        }

        .avatar {
          width: 32px; height: 32px;
          border-radius: 50%;
          background: var(--sb-active);
          color: #fff;
          font-weight: 700;
          font-size: 14px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }

        .user-info { overflow: hidden; }
        .user-name {
          color: #111827;
          font-size: 13px;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .user-role {
          font-size: 11px;
          color: var(--sb-muted);
          text-transform: capitalize;
        }

        .logout-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
          padding: 8px 10px;
          border: none;
          border-radius: 7px;
          background: transparent;
          color: #ef4444;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
          transition: background .15s;
          white-space: nowrap;
        }
        .logout-btn:hover { background: #fef2f2; }

        /* ── Topbar ── */
        .main {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-width: 0;
          overflow: hidden;
        }

        .topbar {
          height: var(--topbar-h);
          background: #fff;
          border-bottom: 1px solid #e8ecf0;
          display: flex;
          align-items: center;
          padding: 0 20px;
          gap: 12px;
          flex-shrink: 0;
          box-shadow: 0 1px 4px rgba(0,0,0,.04);
        }

        .toggle-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 34px; height: 34px;
          border: none;
          border-radius: 7px;
          background: none;
          color: #6b7280;
          cursor: pointer;
          transition: background .15s, color .15s;
          flex-shrink: 0;
        }
        .toggle-btn:hover { background: #f3f4f6; color: #111; }
        .toggle-btn .svg-icon, .toggle-btn .svg-icon svg { width: 20px; height: 20px; }

        .topbar-title { flex: 1; }
        .page-label {
          font-size: 16px;
          font-weight: 600;
          color: #111827;
        }

        .topbar-user {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .topbar-username {
          font-size: 13px;
          color: #6b7280;
        }
        .topbar-avatar {
          width: 32px; height: 32px;
          border-radius: 50%;
          background: var(--accent);
          color: #fff;
          font-size: 13px;
          font-weight: 700;
          display: flex; align-items: center; justify-content: center;
        }

        /* ── Content ── */
        .content {
          flex: 1;
          padding: 24px;
          overflow: auto;
        }

        hr { display: none; }
      `}</style>
    </div>
  );
}
