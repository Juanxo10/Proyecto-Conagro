import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";

/* Fuente Inter */
const fontLink = document.createElement("link");
fontLink.rel = "stylesheet";
fontLink.href = "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap";
if (!document.head.querySelector('[href*="Inter"]')) document.head.appendChild(fontLink);

const ESTADOS = ["TODOS", "PENDIENTE", "APROBADO", "CONDICIONADO", "PESADO", "PROCESADO", "LIQUIDADO", "DESPACHADO"];

const ESTADO_META = {
  PENDIENTE:    { color: "#854d0e", bg: "#fef9c3", border: "#fef08a", next: "/previo",           nextLabel: "Aprobar" },
  APROBADO:     { color: "#1d4ed8", bg: "#dbeafe", border: "#93c5fd", next: "/actualiza_pesaje",  nextLabel: "Ir a Pesaje" },
  CONDICIONADO: { color: "#92400e", bg: "#fef3c7", border: "#f59e0b", next: "/actualiza_pesaje",  nextLabel: "Ir a Pesaje" },
  PESADO:     { color: "#0369a1", bg: "#e0f2fe", border: "#7dd3fc", next: "/trilla",         nextLabel: "Ir a Trilla" },
  PROCESADO:  { color: "#7c3aed", bg: "#ede9fe", border: "#c4b5fd", next: "/liquidacion",    nextLabel: "Ir a Liquidación" },
  LIQUIDADO:  { color: "#0f766e", bg: "#ccfbf1", border: "#5eead4", next: "/despacho",       nextLabel: "Ir a Despacho" },
  DESPACHADO: { color: "#166534", bg: "#dcfce7", border: "#86efac", next: null,              nextLabel: null },
};

function fmt(n, dec = 2) {
  if (n === null || n === undefined || n === "" || isNaN(Number(n))) return "—";
  return Number(n).toLocaleString("es-CO", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}
function fmtMoney(n) {
  if (!n) return "—";
  return Number(n).toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
}

export default function Panel() {
  const navigate = useNavigate();

  const [lotes, setLotes]         = useState([]);
  const [cargando, setCargando]   = useState(true);
  const [filtroEstado, setFiltroEstado] = useState("TODOS");
  const [busq, setBusq]           = useState("");
  const [detalle, setDetalle]     = useState(null);   // lote seleccionado para modal
  const [, setCargDet]            = useState(false);
  const [stats, setStats]         = useState({});

  /* ── cargar todos los lotes con su estado ── */
  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const r = await fetch("/api/panel/lotes");
      const d = await r.json();
      const data = Array.isArray(d) ? d : [];
      setLotes(data);
      // calcular stats
      const s = {};
      ESTADOS.slice(1).forEach(e => { s[e] = data.filter(l => (l.estado || "PENDIENTE") === e).length; });
      s.TOTAL = data.length;
      setStats(s);
    } catch { setLotes([]); }
    finally { setCargando(false); }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  /* ── auto-refresh cada 30s ── */
  useEffect(() => {
    const t = setInterval(cargar, 30000);
    return () => clearInterval(t);
  }, [cargar]);

  /* ── filtro ── */
  const lotesFiltrados = lotes.filter(l => {
    const estado = l.estado || "PENDIENTE";
    if (filtroEstado !== "TODOS" && estado !== filtroEstado) return false;
    if (busq.trim()) {
      const q = busq.toLowerCase();
      return (
        (l.lote_id || "").toLowerCase().includes(q) ||
        (l.propietario || "").toLowerCase().includes(q) ||
        (l.placa || "").toLowerCase().includes(q) ||
        (l.producto || "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  /* ── cargar detalle de un lote ── */
  async function verDetalle(lote_id) {
    setCargDet(true);
    setDetalle({ lote_id, _cargando: true });
    try {
      const [rPrev, rTri, rLiq, rDesp] = await Promise.all([
        fetch(`/api/previos`).then(r => r.json()),
        fetch(`/api/trillas/lote-completo/${encodeURIComponent(lote_id)}`).then(r => r.ok ? r.json() : null),
        fetch(`/api/liquidaciones/${encodeURIComponent(lote_id)}`).then(r => r.ok ? r.json() : null),
        fetch(`/api/despachos/${encodeURIComponent(lote_id)}`).then(r => r.ok ? r.json() : null),
      ]);
      const lote = (Array.isArray(rPrev) ? rPrev : []).find(l => l.lote_id === lote_id) || {};
      setDetalle({ lote_id, lote, trilla: rTri, liquidacion: rLiq, despacho: rDesp });
    } catch { setDetalle(null); }
    finally { setCargDet(false); }
  }

  const estadoMeta = (estado) => ESTADO_META[estado || "PENDIENTE"] || ESTADO_META.PENDIENTE;

  return (
    <div className="pn-root">

      {/* ── Modal detalle ── */}
      {detalle && (
        <div className="pn-overlay" onClick={e => e.target === e.currentTarget && setDetalle(null)}>
          <div className="pn-modal">
            <div className="pn-modal-header">
              <div className="pn-modal-title">Detalle del Lote — {detalle.lote_id}</div>
              <button className="pn-modal-close" onClick={() => setDetalle(null)}>✕</button>
            </div>
            <div className="pn-modal-body">
              {detalle._cargando ? (
                <div className="pn-loading"><div className="pn-spinner" /> Cargando…</div>
              ) : (
                <>
                  {/* Timeline */}
                  <div className="pn-timeline">
                    {["PENDIENTE","APROBADO","PESADO","PROCESADO","LIQUIDADO","DESPACHADO"].map((e, i) => {
                      const estadoActual = detalle.lote?.estado || "PENDIENTE";
                      const idx = ["PENDIENTE","APROBADO","PESADO","PROCESADO","LIQUIDADO","DESPACHADO"].indexOf(estadoActual);
                      const done = i <= idx;
                      const current = i === idx;
                      return (
                        <div key={e} className={`pn-step ${done ? "done" : ""} ${current ? "current" : ""}`}>
                          <div className="pn-step-dot">{done && !current ? "✓" : i + 1}</div>
                          <div className="pn-step-label">{e}</div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Datos del previo */}
                  <div className="pn-det-section">
                    <div className="pn-det-title">Previo</div>
                    <div className="pn-det-grid">
                      <DField label="Propietario"  value={detalle.lote?.propietario} />
                      <DField label="Cédula / NIT"  value={detalle.lote?.cedula_nit} />
                      <DField label="Placa"         value={detalle.lote?.placa} />
                      <DField label="Conductor"     value={detalle.lote?.nombre_conductor} />
                      <DField label="Producto"      value={detalle.lote?.producto} />
                      <DField label="Fecha"         value={detalle.lote?.fecha?.slice(0,10)} />
                      <DField label="Peso Bruto"    value={fmt(detalle.lote?.peso_bruto) + " kg"} />
                      <DField label="Peso Tara"     value={fmt(detalle.lote?.peso_tara) + " kg"} />
                    </div>
                  </div>

                  {/* Trilla */}
                  {detalle.trilla?.trilla && (
                    <div className="pn-det-section">
                      <div className="pn-det-title">Trilla / Procesamiento</div>
                      <div className="pn-det-grid">
                        <DField label="Fecha trilla"   value={detalle.trilla.trilla.fecha_trilla?.slice(0,10)} />
                        <DField label="Kilos procesados" value={fmt(detalle.trilla.trilla.kilos_procesados) + " kg"} />
                        <DField label="Kilos resultado"  value={fmt(detalle.trilla.trilla.kilos_resultado) + " kg"} />
                        <DField label="Rendimiento"    value={fmt(detalle.trilla.trilla.rendimiento) + " %"} />
                        <DField label="Humedad salida" value={fmt(detalle.trilla.trilla.humedad_salida) + " %"} />
                        <DField label="Analista"       value={detalle.trilla.trilla.analista} />
                      </div>
                    </div>
                  )}

                  {/* Liquidación */}
                  {detalle.liquidacion && (
                    <div className="pn-det-section">
                      <div className="pn-det-title">Liquidación</div>
                      <div className="pn-det-grid">
                        <DField label="Fecha"         value={detalle.liquidacion.fecha_liquidacion?.slice(0,10)} />
                        <DField label="Humedad"       value={fmt(detalle.liquidacion.humedad) + " %"} />
                        <DField label="Impureza"      value={fmt(detalle.liquidacion.impureza) + " %"} />
                        <DField label="Peso ajustado" value={fmt(detalle.liquidacion.peso_ajustado) + " kg"} />
                        <DField label="Precio / kg"   value={fmtMoney(detalle.liquidacion.precio)} />
                        <DField label="Total a pagar" value={fmtMoney(detalle.liquidacion.total_pagar)} bold />
                      </div>
                    </div>
                  )}

                  {/* Despacho */}
                  {detalle.despacho && (
                    <div className="pn-det-section">
                      <div className="pn-det-title">Despacho</div>
                      <div className="pn-det-grid">
                        <DField label="N° Despacho"   value={detalle.despacho.numero_despacho} bold />
                        <DField label="Fecha"         value={detalle.despacho.fecha_despacho?.slice(0,10)} />
                        <DField label="Placa salida"  value={detalle.despacho.placa_salida} />
                        <DField label="Conductor"     value={detalle.despacho.conductor_salida} />
                        <DField label="Peso neto sal." value={fmt(detalle.despacho.peso_neto_salida) + " kg"} />
                      </div>
                    </div>
                  )}

                  {/* Acción siguiente */}
                  {estadoMeta(detalle.lote?.estado).next && (
                    <div style={{ textAlign: "right", marginTop: 8 }}>
                      <button className="pn-btn pn-btn--primary"
                        onClick={() => { setDetalle(null); navigate(estadoMeta(detalle.lote?.estado).next); }}>
                        {estadoMeta(detalle.lote?.estado).nextLabel} →
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── HEADER ── */}
      <div className="pn-page-header">
        <div>
          <div className="pn-page-label">MÓDULO OPERATIVO</div>
          <h1 className="pn-page-title">Panel de Control</h1>
          <p className="pn-page-sub">Estado en tiempo real de todos los lotes · CONAGRO S.A.S</p>
        </div>
        <button className="pn-btn pn-btn--refresh" onClick={cargar} title="Actualizar">
          ↻ Actualizar
        </button>
      </div>

      {/* ── TARJETAS DE RESUMEN ── */}
      <div className="pn-stats-grid">
        <StatCard label="Total lotes"   value={stats.TOTAL       || 0} color="#0f4c35" />
        <StatCard label="Pendientes"    value={stats.PENDIENTE   || 0} color="#854d0e" />
        <StatCard label="Aprobados"     value={stats.APROBADO    || 0} color="#1d4ed8" />
        <StatCard label="Condicionados" value={stats.CONDICIONADO|| 0} color="#92400e" />
        <StatCard label="Pesados"       value={stats.PESADO      || 0} color="#0369a1" />
        <StatCard label="Procesados"    value={stats.PROCESADO   || 0} color="#7c3aed" />
        <StatCard label="Liquidados"    value={stats.LIQUIDADO   || 0} color="#0f766e" />
        <StatCard label="Despachados"   value={stats.DESPACHADO  || 0} color="#166534" />
      </div>

      {/* ── FILTROS ── */}
      <div className="pn-filters">
        <div className="pn-search-box">
          <svg className="pn-search-icon" viewBox="0 0 20 20" fill="none">
            <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.8"/>
            <path d="M13.5 13.5L17 17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
          <input className="pn-search-input" placeholder="Buscar lote, propietario, placa…"
            value={busq} onChange={e => setBusq(e.target.value)} />
          {busq && <button className="pn-search-clear" onClick={() => setBusq("")}>✕</button>}
        </div>
        <div className="pn-estado-tabs">
          {ESTADOS.map(e => (
            <button key={e}
              className={`pn-tab ${filtroEstado === e ? "active" : ""}`}
              onClick={() => setFiltroEstado(e)}>
              {e === "TODOS" ? `Todos (${stats.TOTAL || 0})` : `${e} (${stats[e] || 0})`}
            </button>
          ))}
        </div>
      </div>

      {/* ── TABLA ── */}
      <div className="pn-card">
        {cargando ? (
          <div className="pn-loading"><div className="pn-spinner" /> Cargando lotes…</div>
        ) : lotesFiltrados.length === 0 ? (
          <div className="pn-empty">No hay lotes que coincidan con el filtro</div>
        ) : (
          <div className="pn-tabla-wrap">
            <table className="pn-tabla">
              <thead>
                <tr>
                  <th>Lote ID</th>
                  <th>Fecha</th>
                  <th>Propietario</th>
                  <th>Placa</th>
                  <th>Conductor</th>
                  <th>Producto</th>
                  <th style={{ textAlign: "right" }}>Peso Neto</th>
                  <th>Estado</th>
                  <th>Siguiente paso</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {lotesFiltrados.map(l => {
                  const estado = l.estado || "PENDIENTE";
                  const meta   = estadoMeta(estado);
                  return (
                    <tr key={l.id} className="pn-fila">
                      <td>
                        <span className="pn-lote-badge">{l.lote_id}</span>
                      </td>
                      <td className="pn-fecha">{l.fecha?.slice(0, 10)}</td>
                      <td>{l.propietario || <span className="pn-dash">—</span>}</td>
                      <td>
                        {l.placa
                          ? <span className="pn-placa-badge">{l.placa}</span>
                          : <span className="pn-dash">—</span>}
                      </td>
                      <td>{l.nombre_conductor || <span className="pn-dash">—</span>}</td>
                      <td>{l.producto || <span className="pn-dash">—</span>}</td>
                      <td style={{ textAlign: "right", fontWeight: 600 }}>
                        {l.peso_neto != null ? `${Number(l.peso_neto).toLocaleString("es-CO")} kg` : <span className="pn-dash">—</span>}
                      </td>
                      <td>
                        <span className="pn-estado-badge"
                          style={{ background: meta.bg, color: meta.color, borderColor: meta.border }}>
                          {estado}
                        </span>
                      </td>
                      <td>
                        {meta.next ? (
                          <button className="pn-btn-next" onClick={() => navigate(meta.next)}>
                            {meta.nextLabel}
                          </button>
                        ) : (
                          <span className="pn-completado">Completado</span>
                        )}
                      </td>
                      <td>
                        <button className="pn-btn-ver" onClick={() => verDetalle(l.lote_id)}>
                          Ver
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style>{`
        .pn-root { font-family: Arial, sans-serif;
          max-width:1200px; margin:0 auto; color:#1e293b; }

        /* Header */
        .pn-page-header { display:flex; justify-content:space-between; align-items:center;
          margin-bottom:20px; flex-wrap:wrap; gap:12px; }
        .pn-page-label  { font-size:11px; font-weight:700; letter-spacing:2px;
          color:#2e7d32; text-transform:uppercase; margin-bottom:4px; }
        .pn-page-title  { font-size:26px; font-weight:700; color:#111827; margin:0; }
        .pn-page-sub    { font-size:13px; color:#6b7280; margin:4px 0 0; }

        /* Stats */
        .pn-stats-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(130px,1fr));
          gap:12px; margin-bottom:20px; }
        .pn-stat-card  { background:#fff; border:1px solid #e2e8f0; border-radius:12px;
          padding:14px 16px; text-align:center; box-shadow:0 1px 4px rgba(0,0,0,.04); }
        .pn-stat-val   { font-size:1.8rem; font-weight:900; line-height:1; margin-bottom:4px; }
        .pn-stat-label { font-size:.72rem; font-weight:600; color:#64748b;
          text-transform:uppercase; letter-spacing:.4px; }

        /* Filtros */
        .pn-filters    { margin-bottom:16px; display:flex; flex-direction:column; gap:10px; }
        .pn-search-box { position:relative; display:flex; align-items:center; max-width:380px; }
        .pn-search-icon{ position:absolute; left:11px; color:#94a3b8; width:16px; height:16px; pointer-events:none; }
        .pn-search-input{ width:100%; padding:9px 32px 9px 34px; border:1.5px solid #e2e8f0;
          border-radius:8px; font-size:.9rem; background:#f8fafc; color:#1e293b;
          outline:none; font-family:inherit; }
        .pn-search-input:focus { border-color:#16a34a; background:#fff; box-shadow:0 0 0 3px #dcfce7; }
        .pn-search-clear{ position:absolute; right:9px; background:none; border:none;
          color:#94a3b8; cursor:pointer; font-size:.85rem; }
        .pn-estado-tabs { display:flex; flex-wrap:wrap; gap:6px; }
        .pn-tab { padding:5px 12px; border:1.5px solid #e2e8f0; border-radius:20px;
          font-size:.75rem; font-weight:700; cursor:pointer; background:#fff;
          color:#64748b; transition:all .15s; font-family:inherit; }
        .pn-tab:hover  { border-color:#16a34a; color:#0f4c35; }
        .pn-tab.active { background:#0f4c35; color:#fff; border-color:#0f4c35; }

        /* Card / tabla */
        .pn-card { background:#fff; border:1px solid #e2e8f0; border-radius:12px;
          padding:0; overflow:hidden; box-shadow:0 1px 4px rgba(0,0,0,.04); }
        .pn-tabla-wrap { overflow-x:auto; }
        .pn-tabla { width:100%; border-collapse:collapse; font-size:.85rem; }
        .pn-tabla thead tr { background:#0f4c35; }
        .pn-tabla th { padding:11px 14px; text-align:left; font-size:.7rem; font-weight:700;
          color:#fff; white-space:nowrap; text-transform:uppercase; letter-spacing:.5px; }
        .pn-tabla th:first-child { border-radius:0; }
        .pn-tabla td { padding:10px 14px; border-bottom:1px solid #f1f5f9; vertical-align:middle; }
        .pn-fila:hover td { background:#f8fafc; }
        .pn-fila:last-child td { border-bottom:none; }

        .pn-fecha { color:#64748b; font-size:.8rem; white-space:nowrap; }
        .pn-dash  { color:#cbd5e1; }
        .pn-empty { text-align:center; color:#94a3b8; padding:48px; font-style:italic; }

        /* Badges */
        .pn-lote-badge  { display:inline-block; background:#dcfce7; color:#166534;
          padding:3px 10px; border-radius:20px; font-weight:700; font-size:.72rem;
          letter-spacing:.3px; white-space:nowrap; }
        .pn-placa-badge { display:inline-block; background:#1e293b; color:#fbbf24;
          padding:3px 10px; border-radius:5px; font-weight:800; font-size:.8rem;
          letter-spacing:2px; border:2px solid #374151; white-space:nowrap; }
        .pn-estado-badge{ display:inline-block; padding:3px 10px; border-radius:20px;
          font-size:.7rem; font-weight:800; letter-spacing:.5px; text-transform:uppercase;
          border:1.5px solid; white-space:nowrap; }
        .pn-completado  { font-size:.75rem; color:#16a34a; font-weight:700; }

        /* Botones tabla */
        .pn-btn-next { padding:4px 10px; border:1.5px solid #0f4c35; border-radius:6px;
          background:#f0fdf4; color:#0f4c35; font-size:.75rem; font-weight:700;
          cursor:pointer; white-space:nowrap; font-family:inherit; }
        .pn-btn-next:hover { background:#0f4c35; color:#fff; }
        .pn-btn-ver  { padding:4px 10px; border:1.5px solid #0369a1; border-radius:6px;
          background:#eff6ff; color:#1d4ed8; font-size:.75rem; font-weight:700;
          cursor:pointer; white-space:nowrap; font-family:inherit; }
        .pn-btn-ver:hover { background:#1d4ed8; color:#fff; }

        /* Botones generales */
        .pn-btn { padding:9px 18px; border:none; border-radius:8px; font-size:.88rem;
          font-weight:700; cursor:pointer; font-family:inherit; transition:all .15s; }
        .pn-btn--primary { background:#16a34a; color:#fff; }
        .pn-btn--primary:hover { background:#15803d; }
        .pn-btn--refresh { background:#f1f5f9; color:#374151; border:1.5px solid #e2e8f0; }
        .pn-btn--refresh:hover { background:#e2e8f0; }

        /* Loading */
        .pn-loading { display:flex; align-items:center; gap:10px; color:#64748b;
          padding:36px 24px; font-style:italic; }
        .pn-spinner { width:18px; height:18px; border:2px solid #e2e8f0;
          border-top-color:#16a34a; border-radius:50%; animation:pn-spin .7s linear infinite; flex-shrink:0; }
        @keyframes pn-spin { to{transform:rotate(360deg)} }

        /* Modal */
        .pn-overlay { position:fixed; inset:0; background:rgba(15,25,40,.5);
          display:flex; align-items:center; justify-content:center;
          z-index:1000; padding:16px; backdrop-filter:blur(3px); }
        .pn-modal { background:#fff; border-radius:16px; width:100%; max-width:720px;
          max-height:90vh; display:flex; flex-direction:column;
          box-shadow:0 25px 60px rgba(0,0,0,.3); overflow:hidden; }
        .pn-modal-header { background:linear-gradient(135deg,#0f4c35,#166534);
          padding:18px 24px; display:flex; justify-content:space-between; align-items:center; }
        .pn-modal-title  { color:#fff; font-size:1rem; font-weight:800; }
        .pn-modal-close  { background:rgba(255,255,255,.15); border:none; color:#fff;
          width:32px; height:32px; border-radius:8px; font-size:1rem; cursor:pointer; }
        .pn-modal-close:hover { background:rgba(255,255,255,.3); }
        .pn-modal-body   { padding:20px 24px; overflow-y:auto; flex:1; }

        /* Timeline */
        .pn-timeline { display:flex; align-items:flex-start; gap:0; margin-bottom:20px;
          overflow-x:auto; padding-bottom:4px; }
        .pn-step { display:flex; flex-direction:column; align-items:center; flex:1; min-width:80px; position:relative; }
        .pn-step:not(:last-child)::after { content:""; position:absolute; top:14px; left:50%;
          width:100%; height:2px; background:#e2e8f0; z-index:0; }
        .pn-step.done:not(:last-child)::after { background:#16a34a; }
        .pn-step-dot { width:28px; height:28px; border-radius:50%; border:2px solid #e2e8f0;
          background:#fff; display:flex; align-items:center; justify-content:center;
          font-size:.7rem; font-weight:800; color:#94a3b8; position:relative; z-index:1; }
        .pn-step.done .pn-step-dot { background:#16a34a; border-color:#16a34a; color:#fff; }
        .pn-step.current .pn-step-dot { background:#0f4c35; border-color:#0f4c35; color:#fff;
          box-shadow:0 0 0 3px #dcfce7; }
        .pn-step-label { font-size:.65rem; font-weight:700; color:#94a3b8; margin-top:6px;
          text-align:center; text-transform:uppercase; letter-spacing:.3px; }
        .pn-step.done .pn-step-label    { color:#16a34a; }
        .pn-step.current .pn-step-label { color:#0f4c35; }

        /* Detalle secciones */
        .pn-det-section { background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px;
          padding:14px 16px; margin-bottom:12px; }
        .pn-det-title { font-size:.72rem; font-weight:800; text-transform:uppercase;
          letter-spacing:.5px; color:#0f4c35; margin-bottom:12px; }
        .pn-det-grid  { display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr));
          gap:8px 16px; }
        .pn-det-field { display:flex; flex-direction:column; gap:1px; }
        .pn-det-label { font-size:.68rem; font-weight:700; color:#94a3b8;
          text-transform:uppercase; letter-spacing:.3px; }
        .pn-det-val   { font-size:.88rem; color:#1e293b; }
        .pn-det-val.bold { font-weight:800; color:#0f4c35; }

        @media (max-width:640px) {
          .pn-root { padding:16px 12px; }
          .pn-stats-grid { grid-template-columns:repeat(2,1fr); }
        }
      `}</style>
    </div>
  );
}

/* ── Sub-componentes ── */
function StatCard({ label, value, color }) {
  return (
    <div className="pn-stat-card">
      <div className="pn-stat-val" style={{ color }}>{value}</div>
      <div className="pn-stat-label">{label}</div>
    </div>
  );
}

function DField({ label, value, bold }) {
  return (
    <div className="pn-det-field">
      <span className="pn-det-label">{label}</span>
      <span className={`pn-det-val${bold ? " bold" : ""}`}>{value || "—"}</span>
    </div>
  );
}
