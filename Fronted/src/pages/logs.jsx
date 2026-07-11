import React, { useState, useEffect, useCallback } from "react";

const API = "/api/logs";

/* ─────────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────────── */
function authHeaders() {
  const token = localStorage.getItem("token");
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

function fmtFecha(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("es-CO", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
  } catch { return iso; }
}

/* ─────────────────────────────────────────────────────────
   Componente principal
───────────────────────────────────────────────────────── */
export default function Logs() {
  const [logs,     setLogs]     = useState([]);
  const [stats,    setStats]    = useState(null);
  const [modulos,  setModulos]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [total,    setTotal]    = useState(0);
  const [pages,    setPages]    = useState(1);

  // Filtros
  const [page,     setPage]     = useState(1);
  const [busqueda, setBusqueda] = useState("");
  const [usuario,  setUsuario]  = useState("");
  const [modulo,   setModulo]   = useState("");
  const [accion,   setAccion]   = useState("");
  const [desde,    setDesde]    = useState("");
  const [hasta,    setHasta]    = useState("");

  const ACCIONES = ["CONSULTA", "CREACIÓN", "EDICIÓN", "ELIMINACIÓN"];

  /* ── Carga de datos ── */
  const cargar = useCallback(async (p = page) => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ page: p });
      if (busqueda) qs.set("busqueda", busqueda);
      if (usuario)  qs.set("usuario",  usuario);
      if (modulo)   qs.set("modulo",   modulo);
      if (accion)   qs.set("accion",   accion);
      if (desde)    qs.set("desde",    desde);
      if (hasta)    qs.set("hasta",    hasta);

      const [resLogs, resStats, resMods] = await Promise.all([
        fetch(`${API}?${qs}`,      { headers: authHeaders() }),
        fetch(`${API}/stats`,      { headers: authHeaders() }),
        fetch(`${API}/modules`,    { headers: authHeaders() }),
      ]);

      if (!resLogs.ok) throw new Error("Sin acceso");

      const [dataLogs, dataStats, dataMods] = await Promise.all([
        resLogs.json(), resStats.json(), resMods.json(),
      ]);

      setLogs(dataLogs.data   || []);
      setTotal(dataLogs.total || 0);
      setPages(dataLogs.pages || 1);
      setStats(dataStats);
      setModulos(Array.isArray(dataMods) ? dataMods : []);
    } catch (err) {
      console.error(err);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [page, busqueda, usuario, modulo, accion, desde, hasta]);

  // Solo recarga al cambiar de página; los filtros se aplican vía el botón "buscar".
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { cargar(page); }, [page]);

  const buscar = (e) => { e.preventDefault(); setPage(1); cargar(1); };

  const limpiar = () => {
    setBusqueda(""); setUsuario(""); setModulo("");
    setAccion(""); setDesde(""); setHasta("");
    setPage(1);
    setTimeout(() => cargar(1), 0);
  };

  return (
    <>
      <div className="lg-app">

        {/* ── HEADER ── */}
        <div className="lg-header">
          <div>
            <p className="lg-label">ADMINISTRACIÓN · CONAGRO</p>
            <h1 className="lg-title">Registro de <span>Actividad</span></h1>
            <p className="lg-sub">Auditoría completa de acciones realizadas por todos los usuarios</p>
          </div>
          <button className="btn-ref" onClick={() => cargar(page)} disabled={loading}>
            {loading ? "Cargando..." : "↻ Actualizar"}
          </button>
        </div>

        {/* ── KPIs ── */}
        {stats && (
          <div className="lg-kpis">
            <KpiCard label="Total registros"    value={parseInt(stats.total   || 0).toLocaleString("es-CO")} color="#2e7d32" icon="≡" />
            <KpiCard label="Hoy"                value={parseInt(stats.hoy     || 0).toLocaleString("es-CO")} color="#1d4ed8" icon="◷" />
            <KpiCard label="Últimos 7 días"     value={parseInt(stats.semana  || 0).toLocaleString("es-CO")} color="#7c3aed" icon="◈" />
            <KpiCard label="Usuarios activos"   value={parseInt(stats.usuarios_activos || 0).toLocaleString("es-CO")} color="#0891b2" icon="◉" />
            <KpiCard label="Errores"            value={parseInt(stats.errores || 0).toLocaleString("es-CO")} color="#dc2626" icon="⚠" />
          </div>
        )}

        {/* ── FILTROS ── */}
        <form className="lg-filtros" onSubmit={buscar}>
          <div className="lg-sw">
            <span className="lg-si">⌕</span>
            <input
              className="lg-search"
              placeholder="Buscar en descripción, ruta, usuario..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
            />
          </div>

          <input
            className="lg-inp"
            placeholder="Filtrar por usuario"
            value={usuario}
            onChange={e => setUsuario(e.target.value)}
          />

          <select className="lg-sel" value={modulo} onChange={e => setModulo(e.target.value)}>
            <option value="">Todos los módulos</option>
            {modulos.map(m => <option key={m} value={m}>{m}</option>)}
          </select>

          <select className="lg-sel" value={accion} onChange={e => setAccion(e.target.value)}>
            <option value="">Todas las acciones</option>
            {ACCIONES.map(a => <option key={a} value={a}>{a}</option>)}
          </select>

          <div className="date-row">
            <label className="date-lbl">Desde</label>
            <input type="date" className="lg-sel" value={desde} onChange={e => setDesde(e.target.value)} />
          </div>
          <div className="date-row">
            <label className="date-lbl">Hasta</label>
            <input type="date" className="lg-sel" value={hasta} onChange={e => setHasta(e.target.value)} />
          </div>

          <button type="submit" className="btn-buscar">Filtrar</button>
          <button type="button" className="btn-limpiar" onClick={limpiar}>✕ Limpiar</button>
        </form>

        {/* ── TABLA ── */}
        <div className="lg-card">
          <div className="lg-card-head">
            <span className="lg-card-title">Actividad del sistema</span>
            <span className="lg-badge">{total.toLocaleString("es-CO")} registro(s)</span>
          </div>

          {loading ? (
            <div className="lg-loading">
              <div className="spinner" />
              <p>Cargando actividad...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="lg-empty">
              <p className="le-ico">📋</p>
              <p className="le-title">Sin registros</p>
              <p className="le-sub">No hay actividad con los filtros aplicados.</p>
            </div>
          ) : (
            <div className="tw">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Fecha / Hora</th>
                    <th>Usuario</th>
                    <th>Nombre</th>
                    <th>Rol</th>
                    <th>Módulo</th>
                    <th>Acción</th>
                    <th>Descripción</th>
                    <th>Ruta</th>
                    <th>Estado</th>
                    <th>IP</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => (
                    <LogRow key={log.id} log={log} />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Paginación */}
          {!loading && pages > 1 && (
            <div className="lg-pagination">
              <button
                className="pg-btn"
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
              >
                ← Anterior
              </button>
              <span className="pg-info">Página {page} de {pages}</span>
              <button
                className="pg-btn"
                disabled={page >= pages}
                onClick={() => setPage(p => p + 1)}
              >
                Siguiente →
              </button>
            </div>
          )}
        </div>
      </div>
      <LogsCSS />
    </>
  );
}

/* ─────────────────────────────────────────────────────────
   Fila de log
───────────────────────────────────────────────────────── */
function LogRow({ log }) {
  const isError = log.estado >= 400;

  const accionClass = {
    CONSULTA:    "ac-get",
    "CREACIÓN":  "ac-post",
    EDICIÓN:     "ac-put",
    ELIMINACIÓN: "ac-del",
  }[log.accion] || "ac-get";

  const rolClass = log.rol === "admin" ? "rol-admin" : "rol-emp";

  return (
    <tr className={isError ? "tr-error" : ""}>
      <td><span className="id-tag">{log.id}</span></td>
      <td className="td-fecha">{fmtFecha(log.created_at)}</td>
      <td><span className="user-tag">{log.usuario || "—"}</span></td>
      <td className="td-nombre">{log.nombre || "—"}</td>
      <td><span className={`rol-badge ${rolClass}`}>{log.rol || "—"}</span></td>
      <td><span className="mod-tag">{log.modulo}</span></td>
      <td><span className={`ac-badge ${accionClass}`}>{log.accion}</span></td>
      <td className="td-desc">{log.descripcion || "—"}</td>
      <td className="td-ruta"><code>{log.metodo} {log.ruta}</code></td>
      <td>
        <span className={`status-badge ${isError ? "st-err" : "st-ok"}`}>
          {log.estado}
        </span>
      </td>
      <td className="td-ip">{log.ip || "—"}</td>
    </tr>
  );
}

/* ─────────────────────────────────────────────────────────
   KPI Card
───────────────────────────────────────────────────────── */
function KpiCard({ label, value, color, icon }) {
  return (
    <div className="lg-kpi" style={{ borderTop: `4px solid ${color}` }}>
      <div className="lk-top">
        <p className="lk-label">{label}</p>
        <span className="lk-ico" style={{ background: color + "22", color }}>{icon}</span>
      </div>
      <p className="lk-val" style={{ color }}>{value}</p>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   Estilos
───────────────────────────────────────────────────────── */
function LogsCSS() {
  return (
    <style>{`
      *, *::before, *::after { box-sizing: border-box; }

      /* APP */
      .lg-app { width: 100%; font-family: Arial, sans-serif; display: flex; flex-direction: column; gap: 24px; max-width: 1600px; margin: 0 auto; padding: 0 4px; }

      /* HEADER */
      .lg-header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 16px; border-bottom: 2px solid #e5e7eb; }
      .lg-label  { font-size: 11px; font-weight: 700; letter-spacing: 2px; color: #7c3aed; text-transform: uppercase; margin: 0 0 5px; }
      .lg-title  { font-size: 28px; font-weight: 800; margin: 0 0 4px; color: #111827; }
      .lg-title span { color: #7c3aed; }
      .lg-sub    { color: #6b7280; font-size: 13px; margin: 0; }
      .btn-ref   { padding: 9px 20px; background: white; border: 1.5px solid #d1d5db; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; color: #374151; transition: background .15s; flex-shrink: 0; }
      .btn-ref:hover:not(:disabled) { background: #f9fafb; }
      .btn-ref:disabled { opacity: .5; cursor: not-allowed; }

      /* KPIs */
      .lg-kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px,1fr)); gap: 14px; }
      .lg-kpi  { background: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px 20px; }
      .lk-top  { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
      .lk-label { font-size: 10px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: #6b7280; margin: 0; }
      .lk-ico  { width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 900; }
      .lk-val  { font-size: 26px; font-weight: 900; margin: 0; line-height: 1; font-variant-numeric: tabular-nums; }

      /* FILTROS */
      .lg-filtros { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; background: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px 20px; }
      .lg-sw  { position: relative; flex: 1; min-width: 260px; }
      .lg-si  { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); font-size: 16px; color: #9ca3af; pointer-events: none; }
      .lg-search { width: 100%; padding: 9px 12px 9px 34px; border: 1.5px solid #d1d5db; border-radius: 8px; font-size: 13px; color: #111827; }
      .lg-search:focus { outline: none; border-color: #7c3aed; box-shadow: 0 0 0 3px rgba(124,58,237,.1); }
      .lg-inp { padding: 9px 12px; border: 1.5px solid #d1d5db; border-radius: 8px; font-size: 13px; color: #111827; min-width: 160px; }
      .lg-inp:focus { outline: none; border-color: #7c3aed; }
      .lg-sel { padding: 9px 12px; border: 1.5px solid #d1d5db; border-radius: 8px; font-size: 13px; color: #111827; background: white; }
      .lg-sel:focus { outline: none; border-color: #7c3aed; }
      .date-row { display: flex; align-items: center; gap: 6px; }
      .date-lbl { font-size: 12px; font-weight: 600; color: #374151; white-space: nowrap; }
      .btn-buscar  { padding: 9px 20px; background: #7c3aed; color: white; border: none; border-radius: 8px; font-size: 13px; font-weight: 700; cursor: pointer; white-space: nowrap; transition: background .15s; }
      .btn-buscar:hover { background: #6d28d9; }
      .btn-limpiar { padding: 9px 16px; background: #fee2e2; color: #991b1b; border: none; border-radius: 8px; font-size: 13px; font-weight: 700; cursor: pointer; white-space: nowrap; }
      .btn-limpiar:hover { background: #fecaca; }

      /* CARD */
      .lg-card { background: white; border: 1px solid #e5e7eb; border-radius: 14px; padding: 24px; box-shadow: 0 1px 6px rgba(0,0,0,.05); }
      .lg-card-head { display: flex; align-items: center; gap: 12px; margin-bottom: 18px; flex-wrap: wrap; }
      .lg-card-title { font-size: 15px; font-weight: 700; color: #111827; }
      .lg-badge { background: #f5f3ff; color: #7c3aed; font-size: 12px; font-weight: 600; padding: 3px 12px; border-radius: 20px; border: 1px solid #ddd6fe; }

      /* LOADING / EMPTY */
      .lg-loading { text-align: center; padding: 80px 0; color: #6b7280; }
      .spinner { width: 32px; height: 32px; border: 3px solid #e5e7eb; border-top-color: #7c3aed; border-radius: 50%; animation: lg-spin .7s linear infinite; margin: 0 auto 14px; }
      @keyframes lg-spin { to { transform: rotate(360deg); } }
      .lg-empty { text-align: center; padding: 60px 0; color: #9ca3af; }
      .le-ico   { font-size: 48px; margin: 0 0 10px; }
      .le-title { font-size: 16px; font-weight: 700; color: #374151; margin: 0 0 4px; }
      .le-sub   { font-size: 13px; margin: 0; }

      /* TABLA */
      .tw    { overflow-x: auto; }
      table  { width: 100%; border-collapse: collapse; font-size: 12px; }
      th     { text-align: left; padding: 9px 12px; background: #faf5ff; color: #374151; font-size: 10px; font-weight: 700; letter-spacing: .7px; text-transform: uppercase; border-bottom: 2px solid #ede9fe; white-space: nowrap; }
      td     { padding: 9px 12px; border-bottom: 1px solid #f3f4f6; color: #374151; vertical-align: middle; }
      tbody tr:last-child td { border-bottom: none; }
      tbody tr:hover td { background: #faf5ff; }
      .tr-error td { background: #fff8f8; }

      /* TAGS */
      .id-tag    { display: inline-block; background: #f3f4f6; color: #9ca3af; border-radius: 4px; padding: 1px 6px; font-size: 11px; font-weight: 600; }
      .user-tag  { display: inline-block; background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; border-radius: 5px; padding: 1px 7px; font-size: 11px; font-weight: 700; white-space: nowrap; }
      .mod-tag   { display: inline-block; background: #f5f3ff; color: #7c3aed; border: 1px solid #ddd6fe; border-radius: 5px; padding: 1px 7px; font-size: 11px; font-weight: 700; white-space: nowrap; }

      /* ROL BADGE */
      .rol-badge { display: inline-block; padding: 2px 8px; border-radius: 20px; font-size: 10px; font-weight: 800; letter-spacing: .5px; }
      .rol-admin { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
      .rol-emp   { background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; }

      /* ACCIÓN BADGE */
      .ac-badge { display: inline-block; padding: 2px 9px; border-radius: 20px; font-size: 10px; font-weight: 700; white-space: nowrap; }
      .ac-get   { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; }
      .ac-post  { background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; }
      .ac-put   { background: #fff7ed; color: #9a3412; border: 1px solid #fed7aa; }
      .ac-del   { background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }

      /* STATUS BADGE */
      .status-badge { display: inline-block; padding: 2px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; font-variant-numeric: tabular-nums; }
      .st-ok  { background: #f0fdf4; color: #166534; }
      .st-err { background: #fef2f2; color: #991b1b; }

      /* CELDAS */
      .td-fecha  { white-space: nowrap; font-weight: 500; font-size: 11.5px; color: #6b7280; }
      .td-nombre { font-weight: 600; }
      .td-desc   { max-width: 260px; color: #374151; }
      .td-ruta   { max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .td-ruta code { background: #f3f4f6; padding: 1px 5px; border-radius: 4px; font-size: 11px; color: #6b7280; }
      .td-ip     { font-size: 11px; color: #9ca3af; white-space: nowrap; }

      /* PAGINACIÓN */
      .lg-pagination { display: flex; align-items: center; justify-content: center; gap: 16px; margin-top: 20px; padding-top: 16px; border-top: 1px solid #f3f4f6; }
      .pg-btn  { padding: 7px 18px; background: white; border: 1.5px solid #d1d5db; border-radius: 7px; font-size: 13px; font-weight: 600; cursor: pointer; color: #374151; transition: all .15s; }
      .pg-btn:hover:not(:disabled) { border-color: #7c3aed; color: #7c3aed; background: #f5f3ff; }
      .pg-btn:disabled { opacity: .4; cursor: not-allowed; }
      .pg-info { font-size: 13px; color: #6b7280; font-weight: 600; }
    `}</style>
  );
}
