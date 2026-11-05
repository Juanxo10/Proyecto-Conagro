import React, { useEffect, useState, useCallback } from "react";
import Icon from "../Icon";
import { useNavigate } from "react-router-dom";

/* ── helpers ── */
function fmt(n) {
  if (n === null || n === undefined || isNaN(Number(n))) return "—";
  return Number(n).toLocaleString("es-CO");
}
function timeAgo(fecha) {
  if (!fecha) return "—";
  const diff = Date.now() - new Date(fecha).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "hace un momento";
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h}h`;
  return `hace ${Math.floor(h / 24)}d`;
}

const ESTADO_META = {
  PENDIENTE:    { label: "Pendiente",    color: "#92400e", bg: "#fef3c7", dot: "#f59e0b" },
  CONDICIONADO: { label: "Condicionado", color: "#854d0e", bg: "#fef9c3", dot: "#eab308" },
  APROBADO:     { label: "Aprobado",     color: "#1e40af", bg: "#dbeafe", dot: "#3b82f6" },
  PESADO:     { label: "Pesado",     color: "#0369a1", bg: "#e0f2fe", dot: "#0ea5e9" },
  PROCESADO:  { label: "Procesado",  color: "#6d28d9", bg: "#ede9fe", dot: "#8b5cf6" },
  LIQUIDADO:  { label: "Liquidado",  color: "#0f766e", bg: "#ccfbf1", dot: "#14b8a6" },
  DESPACHADO: { label: "Despachado", color: "#166534", bg: "#dcfce7", dot: "#22c55e" },
};

/* ── SVG icons ── */
const icons = {
  previo:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
  pesaje:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="3" x2="12" y2="21"/><path d="M17 21H7"/><path d="M3 9l9-6 9 6"/><path d="M3 9h4l2 6H3z"/><path d="M21 9h-4l-2 6h6z"/></svg>,
  trilla:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>,
  liquidacion:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  despacho:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>,
  panel:      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  inventario: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>,
  vehiculos:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v9a2 2 0 0 1-2 2h-2"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>,
  lotes:      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  arrow:      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>,
};

function SvgIcon({ name, size = 20 }) {
  return (
    <span style={{ display:"inline-flex", alignItems:"center", width:size, height:size, flexShrink:0 }}>
      {React.cloneElement(icons[name], { width: size, height: size })}
    </span>
  );
}

/* ── component ── */
export default function Index() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const isAdmin = user.rol === "admin";

  const [lotes, setLotes]       = useState([]);
  const [loading, setLoading]   = useState(true);

  const cargar = useCallback(async () => {
    try {
      const r = await fetch("/api/panel/lotes");
      const d = await r.json();
      setLotes(Array.isArray(d) ? d : []);
    } catch { setLotes([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  /* stats */
  const total      = lotes.length;
  const pendientes    = lotes.filter(l => l.estado === "PENDIENTE").length;
  const condicionados = lotes.filter(l => l.estado === "CONDICIONADO").length;
  const enProceso     = lotes.filter(l => ["APROBADO","PESADO","PROCESADO","LIQUIDADO"].includes(l.estado)).length;
  const despachados   = lotes.filter(l => l.estado === "DESPACHADO").length;
  const recientes  = [...lotes].slice(0, 6);

  const hora = new Date().getHours();
  const saludo = hora < 12 ? "Buenos días" : hora < 18 ? "Buenas tardes" : "Buenas noches";

  const modulos = [
    { key:"previo",      label:"Previo",      desc:"Registra y aprueba lotes de entrada",     path:"/previo",           color:"#3b82f6" },
    { key:"pesaje",      label:"Entrada",     desc:"Captura pesos brutos por placa",           path:"/actualiza_pesaje", color:"#0ea5e9" },
    { key:"trilla",      label:"Trilla",      desc:"Procesa el grano y registra resultados",   path:"/trilla",           color:"#8b5cf6" },
    { key:"liquidacion", label:"Liquidación", desc:"Calcula y genera la liquidación del lote", path:"/liquidacion",      color:"#14b8a6" },
    { key:"despacho",    label:"Despacho",    desc:"Autoriza y registra la salida del lote",   path:"/despacho",         color:"#22c55e" },
    { key:"panel",       label:"Panel",       desc:"Vista global de todos los lotes activos",  path:"/panel",            color:"#f59e0b" },
    { key:"vehiculos",   label:"Vehículos",   desc:"Maestro de placas y conductores",          path:"/maestro_vehiculos",color:"#6b7280" },
    ...(isAdmin ? [
      { key:"inventario",  label:"Inventario",  desc:"Control de stock e insumos",               path:"/inventario",       color:"#ef4444" },
    ] : []),
  ];

  return (
    <div className="ix">

      {/* ── Greeting ── */}
      <div className="ix-greeting">
        <div>
          <p className="ix-sub">{saludo},</p>
          <h1 className="ix-name">{user.nombre || "Usuario"} <span className="ix-role-badge">{user.rol}</span></h1>
          <p className="ix-desc">Aquí tienes el resumen de operaciones de hoy.</p>
        </div>
        <button className="ix-panel-btn" onClick={() => navigate("/panel")}>
          <SvgIcon name="panel" size={16} /> Ver panel completo
        </button>
      </div>

      {/* ── Stats ── */}
      <div className="ix-stats">
        <StatCard label="Total lotes"   value={loading ? "…" : fmt(total)}        color="#2e7d32" icon="lotes" />
        <StatCard label="Pendientes"    value={loading ? "…" : fmt(pendientes)}    color="#f59e0b" icon="previo" />
        <StatCard label="Condicionados" value={loading ? "…" : fmt(condicionados)} color="#d97706" icon="previo" />
        <StatCard label="En proceso"    value={loading ? "…" : fmt(enProceso)}     color="#3b82f6" icon="trilla" />
        <StatCard label="Despachados"   value={loading ? "…" : fmt(despachados)}   color="#22c55e" icon="despacho" />
      </div>

      {/* ── Flujo visual ── */}
      <div className="ix-section">
        <p className="ix-section-title">Flujo del proceso</p>
        <div className="ix-flow">
          {["PENDIENTE","APROBADO","PESADO","PROCESADO","LIQUIDADO","DESPACHADO"].map((e, i, arr) => {
            const m  = ESTADO_META[e];
            const cnt = lotes.filter(l => l.estado === e).length;
            return (
              <React.Fragment key={e}>
                <div className="ix-flow-step" style={{ "--dot": m.dot, "--bg": m.bg, "--col": m.color }}>
                  <div className="ix-flow-dot" />
                  <p className="ix-flow-label">{m.label}</p>
                  <p className="ix-flow-count">{loading ? "…" : cnt}</p>
                </div>
                {i < arr.length - 1 && <div className="ix-flow-arrow"><SvgIcon name="arrow" size={16} /></div>}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* ── Módulos ── */}
      <div className="ix-section">
        <p className="ix-section-title">Módulos</p>
        <div className="ix-modules">
          {modulos.map(m => (
            <button key={m.key} className="ix-module" onClick={() => navigate(m.path)}>
              <div className="ix-mod-icon" style={{ background: m.color + "18", color: m.color }}>
                <SvgIcon name={m.key} size={22} />
              </div>
              <div className="ix-mod-text">
                <p className="ix-mod-label">{m.label}</p>
                <p className="ix-mod-desc">{m.desc}</p>
              </div>
              <span className="ix-mod-arrow" style={{ color: m.color }}><SvgIcon name="arrow" size={16} /></span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Actividad reciente ── */}
      <div className="ix-section">
        <div className="ix-section-header">
          <p className="ix-section-title" style={{ margin:0 }}>Actividad reciente</p>
          <button className="ix-ver-mas" onClick={() => navigate("/panel")}>Ver todos <Icon n="right"/></button>
        </div>
        <div className="ix-table-wrap">
          {loading ? (
            <p className="ix-loading">Cargando…</p>
          ) : recientes.length === 0 ? (
            <p className="ix-empty">Sin lotes registrados aún.</p>
          ) : (
            <table className="ix-table">
              <thead>
                <tr>
                  <th>Lote</th>
                  <th>Propietario</th>
                  <th>Producto</th>
                  <th>Peso bruto</th>
                  <th>Estado</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {recientes.map(l => {
                  const em = ESTADO_META[l.estado] || ESTADO_META.PENDIENTE;
                  return (
                    <tr key={l.id} onClick={() => navigate("/panel")} className="ix-tr">
                      <td className="ix-lote-id">{l.lote_id}</td>
                      <td>{l.propietario || "—"}</td>
                      <td>{l.producto || "—"}</td>
                      <td>{l.peso_bruto_pesaje ? fmt(l.peso_bruto_pesaje) + " kg" : "—"}</td>
                      <td>
                        <span className="ix-badge" style={{ background: em.bg, color: em.color }}>
                          <span className="ix-bdot" style={{ background: em.dot }} />
                          {em.label}
                        </span>
                      </td>
                      <td className="ix-fecha">{timeAgo(l.fecha_ingreso || l.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <style>{`
        .ix { width: 100%; font-family: 'Inter', system-ui, sans-serif; }

        /* Greeting */
        .ix-greeting {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
          margin-bottom: 28px;
        }
        .ix-sub  { font-size: 14px; color: #6b7280; margin-bottom: 4px; }
        .ix-name { font-size: 26px; font-weight: 700; color: #111827; display: flex; align-items: center; gap: 10px; }
        .ix-role-badge {
          font-size: 11px; font-weight: 600;
          background: #e8f5e9; color: #2e7d32;
          border-radius: 20px; padding: 3px 10px;
          text-transform: capitalize;
        }
        .ix-desc { font-size: 14px; color: #6b7280; margin-top: 4px; }
        .ix-panel-btn {
          display: flex; align-items: center; gap: 8px;
          padding: 9px 16px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          background: #fff;
          font-size: 13px; font-weight: 500; color: #374151;
          cursor: pointer;
          transition: border-color .15s, box-shadow .15s;
          white-space: nowrap;
        }
        .ix-panel-btn:hover { border-color: #2e7d32; color: #2e7d32; }

        /* Stats */
        .ix-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 16px;
          margin-bottom: 32px;
        }
        .ix-stat {
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 18px 20px;
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .ix-stat-icon {
          width: 44px; height: 44px;
          border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .ix-stat-val  { font-size: 26px; font-weight: 700; color: #111827; line-height: 1; }
        .ix-stat-lbl  { font-size: 12px; color: #6b7280; margin-top: 3px; }

        /* Section */
        .ix-section { margin-bottom: 32px; }
        .ix-section-header {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 14px;
        }
        .ix-section-title {
          font-size: 11px; font-weight: 700;
          letter-spacing: .07em; text-transform: uppercase;
          color: #9ca3af; margin-bottom: 14px;
        }
        .ix-ver-mas {
          font-size: 13px; color: #2e7d32; background: none; border: none;
          cursor: pointer; font-weight: 500;
        }
        .ix-ver-mas:hover { text-decoration: underline; }

        /* Flow */
        .ix-flow {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 4px;
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 20px 24px;
        }
        .ix-flow-step {
          display: flex; flex-direction: column; align-items: center; gap: 6px;
          padding: 12px 16px;
          border-radius: 8px;
          background: var(--bg);
          min-width: 90px;
        }
        .ix-flow-dot {
          width: 10px; height: 10px;
          border-radius: 50%;
          background: var(--dot);
        }
        .ix-flow-label { font-size: 11px; font-weight: 600; color: var(--col); }
        .ix-flow-count { font-size: 20px; font-weight: 700; color: var(--col); }
        .ix-flow-arrow { color: #d1d5db; flex-shrink: 0; }

        /* Modules */
        .ix-modules {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 12px;
        }
        .ix-module {
          display: flex; align-items: center; gap: 14px;
          padding: 14px 16px;
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          cursor: pointer;
          text-align: left;
          transition: border-color .15s, box-shadow .15s;
        }
        .ix-module:hover { border-color: #2e7d32; box-shadow: 0 2px 8px rgba(46,125,50,.08); }
        .ix-mod-icon {
          width: 44px; height: 44px; border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .ix-mod-text { flex: 1; min-width: 0; }
        .ix-mod-label { font-size: 14px; font-weight: 600; color: #111827; }
        .ix-mod-desc  { font-size: 12px; color: #6b7280; margin-top: 2px; }
        .ix-mod-arrow { flex-shrink: 0; opacity: .5; }

        /* Table */
        .ix-table-wrap {
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          overflow: hidden;
        }
        .ix-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }
        .ix-table th {
          text-align: left;
          padding: 10px 16px;
          font-size: 11px; font-weight: 600;
          letter-spacing: .05em; text-transform: uppercase;
          color: #9ca3af;
          border-bottom: 1px solid #e5e7eb;
          background: #f9fafb;
        }
        .ix-table td { padding: 11px 16px; border-bottom: 1px solid #f3f4f6; color: #374151; }
        .ix-tr:last-child td { border-bottom: none; }
        .ix-tr { cursor: pointer; transition: background .1s; }
        .ix-tr:hover td { background: #f9fafb; }
        .ix-lote-id { font-weight: 600; color: #111827; }
        .ix-fecha   { color: #9ca3af; }
        .ix-badge {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 3px 9px; border-radius: 20px;
          font-size: 11px; font-weight: 600;
        }
        .ix-bdot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
        .ix-loading, .ix-empty { padding: 24px; text-align: center; color: #9ca3af; font-size: 14px; }
      `}</style>
    </div>
  );
}

function StatCard({ label, value, color, icon }) {
  return (
    <div className="ix-stat">
      <div className="ix-stat-icon" style={{ background: color + "15", color }}>
        <SvgIcon name={icon} size={22} />
      </div>
      <div>
        <p className="ix-stat-val">{value}</p>
        <p className="ix-stat-lbl">{label}</p>
      </div>
    </div>
  );
}


