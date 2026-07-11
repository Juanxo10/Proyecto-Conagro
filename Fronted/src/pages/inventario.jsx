import React, { useState, useEffect, useMemo } from "react";

const API = "/api/inventario";

export default function Inventario() {
  const [resumen,  setResumen]  = useState([]);
  const [totales,  setTotales]  = useState(null);
  const [movs,     setMovs]     = useState([]);
  const [cargando, setCargando] = useState(true);
  const [tab,      setTab]      = useState("stock"); // stock | movimientos
  const [tipoMov,  setTipoMov]  = useState("TODOS"); // TODOS | ENTRADA | SALIDA
  const [busqueda, setBusqueda] = useState("");
  const [desde,    setDesde]    = useState("");
  const [hasta,    setHasta]    = useState("");
  const [prodFiltro, setProdFiltro] = useState(null);

  useEffect(() => { cargar(); }, []);

  const cargar = async () => {
    setCargando(true);
    try {
      const [rRes, tRes, mRes] = await Promise.all([
        fetch(`${API}/resumen`),
        fetch(`${API}/totales`),
        fetch(`${API}/movimientos`),
      ]);
      const [r, t, m] = await Promise.all([rRes.json(), tRes.json(), mRes.json()]);
      setResumen(Array.isArray(r) ? r : []);
      setTotales(t && !t.error ? t : null);
      setMovs(Array.isArray(m) ? m : []);
    } catch {
      setResumen([]); setTotales(null); setMovs([]);
    } finally { setCargando(false); }
  };

  const fmt  = n => (parseFloat(n) || 0).toLocaleString("es-CO", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  const fmtDec = n => (parseFloat(n) || 0).toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtFecha = f => {
    if (!f) return "—";
    if (/^\d{2}\/\d{2}\/\d{4}/.test(f)) return f;
    try { return new Date(f).toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric" }); }
    catch { return f; }
  };
  const normFecha = f => {
    if (!f) return "";
    if (/^\d{2}\/\d{2}\/\d{4}/.test(f)) { const [d,mo,y] = f.split("/"); return `${y}-${mo}-${d}`; }
    return (f || "").slice(0, 10);
  };

  /* Separar productos vs subproductos:
     - Subproductos: bodega=SUBPRODUCTOS Y nombre NO contiene "arroz" (cascarilla, harina, cristal, grano, rechazo…)
     - Productos:    todo lo demás (incluyendo arroces que vengan de trilla) */
  const esArroz = (desc) => /arroz/i.test(desc || "");
  const productosArroz   = useMemo(() => resumen.filter(r => r.bodega !== "SUBPRODUCTOS" || esArroz(r.descripcion)), [resumen]);
  const productosSubprod = useMemo(() => resumen.filter(r => r.bodega === "SUBPRODUCTOS" && !esArroz(r.descripcion)), [resumen]);

  /* Agrupar productos principales por descripción (suma stocks de distintas bodegas) */
  const agruparPorDesc = (lista) => {
    const mapa = new Map();
    lista.forEach(r => {
      const key = r.descripcion;
      if (!mapa.has(key)) {
        mapa.set(key, {
          ...r,
          bodegas:       r.bodega      !== "SIN BODEGA" ? [r.bodega]      : [],
          presentaciones: r.presentacion !== "—"         ? [r.presentacion] : [],
          total_entradas_kg: parseFloat(r.total_entradas_kg) || 0,
          total_salidas_kg:  parseFloat(r.total_salidas_kg)  || 0,
          stock_kg:          parseFloat(r.stock_kg)          || 0,
          total_movimientos: parseInt(r.total_movimientos)   || 0,
        });
      } else {
        const g = mapa.get(key);
        g.total_entradas_kg += parseFloat(r.total_entradas_kg) || 0;
        g.total_salidas_kg  += parseFloat(r.total_salidas_kg)  || 0;
        g.stock_kg          += parseFloat(r.stock_kg)          || 0;
        g.total_movimientos += parseInt(r.total_movimientos)   || 0;
        if (r.bodega !== "SIN BODEGA" && !g.bodegas.includes(r.bodega)) g.bodegas.push(r.bodega);
        if (r.presentacion !== "—" && !g.presentaciones.includes(r.presentacion)) g.presentaciones.push(r.presentacion);
        if ((r.ultimo_movimiento || "") > (g.ultimo_movimiento || "")) g.ultimo_movimiento = r.ultimo_movimiento;
      }
    });
    return Array.from(mapa.values());
  };
  const productosAgrupados = useMemo(() => agruparPorDesc(productosArroz), [productosArroz]);

  const filtrarResumen = (lista) => lista.filter(r =>
    !busqueda || [r.descripcion, r.codigo, r.bodega]
      .some(c => (c || "").toLowerCase().includes(busqueda.toLowerCase()))
  );

  /* Movimientos filtrados */
  const movsFiltrados = useMemo(() => movs.filter(m => {
    const okBusq = !busqueda || [m.descripcion, m.placas, m.propietario, m.nombre, m.lote_id, m.empresa]
      .some(c => (c || "").toLowerCase().includes(busqueda.toLowerCase()));
    const fm = normFecha(m.fecha);
    const okDesde = !desde || fm >= desde;
    const okHasta = !hasta || fm <= hasta;
    const okTipo  = tipoMov === "TODOS" || m.tipo_movimiento === tipoMov;
    const okProd  = !prodFiltro ||
      String(m.descripcion || "").toLowerCase() === String(prodFiltro.descripcion || "").toLowerCase();
    return okBusq && okDesde && okHasta && okTipo && okProd;
  }), [movs, busqueda, desde, hasta, tipoMov, prodFiltro]);

  const verMovs = (r) => {
    setProdFiltro({ descripcion: r.descripcion });
    setTipoMov("TODOS");
    setTab("movimientos");
    setBusqueda("");
  };

  const totalStockKg = resumen.reduce((s, r) => s + (parseFloat(r.stock_kg) || 0), 0);

  return (
    <>
      <div className="inv-wrap">

        {/* ── HEADER ── */}
        <div className="inv-header">
          <div>
            <p className="inv-label">ALMACÉN · CONAGRO</p>
            <h1 className="inv-title">Inventario <span>General</span></h1>
            <p className="inv-sub">Stock en tiempo real de arroz y subproductos de trilla</p>
          </div>
          <button className="btn-refresh" onClick={cargar} disabled={cargando}>
            {cargando ? "⟳ Actualizando..." : "↻ Actualizar"}
          </button>
        </div>

        {/* ── KPIs ── */}
        {totales && !cargando && (
          <div className="inv-kpis">
            <div className="kpi kpi-green" onClick={() => { setTab("movimientos"); setTipoMov("ENTRADA"); }}>
              <div className="kpi-icon">↓</div>
              <div className="kpi-body">
                <p className="kpi-lbl">Total Entradas</p>
                <p className="kpi-val">{fmt(totales.total_entradas_kg)} <span>kg</span></p>
                <p className="kpi-hint">{totales.n_entradas} registro(s)</p>
              </div>
            </div>
            <div className="kpi kpi-red" onClick={() => { setTab("movimientos"); setTipoMov("SALIDA"); }}>
              <div className="kpi-icon">↑</div>
              <div className="kpi-body">
                <p className="kpi-lbl">Total Salidas</p>
                <p className="kpi-val">{fmt(totales.total_salidas_kg)} <span>kg</span></p>
                <p className="kpi-hint">{totales.n_salidas} despacho(s)</p>
              </div>
            </div>
            <div className="kpi kpi-blue kpi-hl" onClick={() => { setTab("stock"); setBusqueda(""); }}>
              <div className="kpi-icon">◈</div>
              <div className="kpi-body">
                <p className="kpi-lbl">Stock Actual Total</p>
                <p className="kpi-val">{fmt(totalStockKg)} <span>kg</span></p>
                <p className="kpi-hint">{resumen.filter(r => parseFloat(r.stock_kg) > 0).length} producto(s) con stock</p>
              </div>
            </div>
            <div className="kpi kpi-purple" onClick={() => { setTab("stock"); setBusqueda(""); }}>
              <div className="kpi-icon">▦</div>
              <div className="kpi-body">
                <p className="kpi-lbl">Productos</p>
                <p className="kpi-val-big">{totales.n_productos}</p>
                <p className="kpi-hint">{productosAgrupados.length} productos · {productosSubprod.length} subprod.</p>
              </div>
            </div>
          </div>
        )}

        {/* ── TABS ── */}
        <div className="inv-tabs">
          <button className={`inv-tab ${tab === "stock" ? "active" : ""}`} onClick={() => { setTab("stock"); setBusqueda(""); setProdFiltro(null); }}>
            📦 Stock por producto
          </button>
          <button className={`inv-tab ${tab === "movimientos" ? "active" : ""}`} onClick={() => setTab("movimientos")}>
            📋 Movimientos {!cargando && `(${movs.length})`}
          </button>
        </div>

        {/* ── BUSCADOR ── */}
        <div className="inv-filters">
          <div className="search-wrap">
            <span className="search-ico">⌕</span>
            <input
              className="search-input"
              placeholder={tab === "stock" ? "Buscar producto o bodega..." : "Buscar placa, producto, propietario, lote..."}
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
            />
            {busqueda && <button className="search-clr" onClick={() => setBusqueda("")}>✕</button>}
          </div>
          {tab === "movimientos" && (
            <>
              <div className="tipo-btns">
                {["TODOS","ENTRADA","SALIDA"].map(t => (
                  <button key={t} className={`tipo-btn ${tipoMov === t ? "active" : ""} ${t === "ENTRADA" ? "tb-e" : t === "SALIDA" ? "tb-s" : "tb-a"}`}
                    onClick={() => setTipoMov(t)}>
                    {t === "TODOS" ? "≡ Todos" : t === "ENTRADA" ? "↓ Entradas" : "↑ Salidas"}
                  </button>
                ))}
              </div>
              <div className="date-group">
                <label>Desde</label>
                <input type="date" value={desde} onChange={e => setDesde(e.target.value)} />
              </div>
              <div className="date-group">
                <label>Hasta</label>
                <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} />
              </div>
              {(desde || hasta) && (
                <button className="btn-clr-f" onClick={() => { setDesde(""); setHasta(""); }}>✕ Fechas</button>
              )}
              {prodFiltro && (
                <div className="prod-chip">
                  <span>📦 {prodFiltro.descripcion}</span>
                  <button onClick={() => setProdFiltro(null)}>✕</button>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── CONTENIDO ── */}
        {cargando ? (
          <div className="inv-loading"><div className="spin" /><p>Cargando inventario...</p></div>
        ) : tab === "stock" ? (
          <SeccionStock
            productos={filtrarResumen(productosAgrupados)}
            subprod={filtrarResumen(productosSubprod)}
            fmt={fmt} fmtDec={fmtDec} fmtFecha={fmtFecha}
            onVerMovs={verMovs}
          />
        ) : (
          <TablaMovimientos
            data={movsFiltrados}
            fmt={fmtDec} fmtFecha={fmtFecha}
            tipoMov={tipoMov}
          />
        )}

      </div>
      <CSS />
    </>
  );
}

/* ══════════════════════════════════════════════════════
   SECCIÓN STOCK
══════════════════════════════════════════════════════ */
function SeccionStock({ productos, subprod, fmt, fmtDec, fmtFecha, onVerMovs }) {
  if (productos.length === 0 && subprod.length === 0) return (
    <div className="inv-empty">
      <p style={{ fontSize: 48 }}>📦</p>
      <p style={{ fontWeight: 700, fontSize: 16, color: "#374151" }}>Sin stock registrado</p>
      <p style={{ color: "#9ca3af", fontSize: 13 }}>Los pesajes con tipo ENTRADA aparecerán aquí.</p>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>

      {/* ── Productos de consumo humano ── */}
      {productos.length > 0 && (
        <div>
          <div className="seccion-header">
            <span className="seccion-icon">🌾</span>
            <div>
              <h2 className="seccion-title">Productos</h2>
              <p className="seccion-sub">Productos de consumo humano registrados por pesaje</p>
            </div>
            <span className="seccion-badge">{productos.length} producto(s)</span>
          </div>
          <div className="cards-grid">
            {productos.map((r, i) => <ProductCard key={i} r={r} fmt={fmt} fmtDec={fmtDec} fmtFecha={fmtFecha} onVerMovs={onVerMovs} color="#2e7d32" />)}
          </div>
        </div>
      )}

      {/* ── Subproductos de trilla ── */}
      {subprod.length > 0 && (
        <div>
          <div className="seccion-header">
            <span className="seccion-icon">📦</span>
            <div>
              <h2 className="seccion-title">Subproductos de Trilla</h2>
              <p className="seccion-sub">Generados automáticamente al registrar proceso de trilla</p>
            </div>
            <span className="seccion-badge seccion-badge-amber">{subprod.length} subproducto(s)</span>
          </div>
          <div className="cards-grid">
            {subprod.map((r, i) => <ProductCard key={i} r={r} fmt={fmt} fmtDec={fmtDec} fmtFecha={fmtFecha} onVerMovs={onVerMovs} color="#b45309" />)}
          </div>
        </div>
      )}
    </div>
  );
}

function ProductCard({ r, fmt, fmtDec, fmtFecha, onVerMovs, color }) {
  const stock  = parseFloat(r.stock_kg)         || 0;
  const ent    = parseFloat(r.total_entradas_kg) || 0;
  const sal    = parseFloat(r.total_salidas_kg)  || 0;
  const pct    = ent > 0 ? Math.max(0, Math.min(100, (stock / ent) * 100)) : 0;
  const est    = stock < 0 ? "neg" : stock === 0 ? "zero" : "pos";
  const estLabel = est === "pos" ? "EN STOCK" : est === "zero" ? "AGOTADO" : "NEGATIVO";
  const estColor = est === "pos" ? { bg: "#f0fdf4", txt: "#166534", border: "#bbf7d0" }
                 : est === "zero" ? { bg: "#f9fafb", txt: "#6b7280", border: "#e5e7eb" }
                 : { bg: "#fef2f2", txt: "#991b1b", border: "#fecaca" };

  return (
    <div className="prod-card" style={{ borderTop: `3px solid ${color}` }}>
      {/* Cabecera */}
      <div className="pc-head">
        <div style={{ flex: 1, minWidth: 0 }}>
          <p className="pc-name">{r.descripcion}</p>
          <div className="pc-tags">
            {r.codigo !== "SIN CÓDIGO" && <span className="tag-cod">{r.codigo}</span>}
            {r.bodegas
              ? r.bodegas.map((b, i) => <span key={i} className="tag-bod" style={{ borderColor: color + "55", color }}>{b}</span>)
              : r.bodega !== "SIN BODEGA" && <span className="tag-bod" style={{ borderColor: color + "55", color }}>{r.bodega}</span>
            }
            {r.presentaciones
              ? r.presentaciones.map((p, i) => <span key={i} className="tag-pres">{p}</span>)
              : r.presentacion !== "—" && <span className="tag-pres">{r.presentacion}</span>
            }
          </div>
        </div>
        <span className="pc-est" style={{ background: estColor.bg, color: estColor.txt, border: `1px solid ${estColor.border}` }}>
          {estLabel}
        </span>
      </div>

      {/* Stock grande */}
      <div className="pc-stock">
        <span className="pc-stock-num" style={{ color: estColor.txt }}>{fmt(stock)}</span>
        <span className="pc-stock-unit">kg</span>
      </div>

      {/* Barra de stock */}
      <div className="pc-bar-wrap">
        <div className="pc-bar">
          <div className="pc-bar-fill" style={{ width: `${pct}%`, background: est === "pos" ? color : est === "neg" ? "#dc2626" : "#9ca3af" }} />
        </div>
        <span className="pc-bar-pct">{pct.toFixed(0)}% disponible</span>
      </div>

      {/* Entradas / Salidas */}
      <div className="pc-stats">
        <div className="pc-stat pc-stat-e">
          <span className="pcs-ico">↓</span>
          <div>
            <p className="pcs-lbl">Entradas</p>
            <p className="pcs-val">{fmtDec(ent)} kg</p>
          </div>
        </div>
        <div className="pc-stat-div" />
        <div className="pc-stat pc-stat-s">
          <span className="pcs-ico">↑</span>
          <div>
            <p className="pcs-lbl">Salidas</p>
            <p className="pcs-val">{fmtDec(sal)} kg</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="pc-footer">
        <span className="pc-fecha">Últ. mov: {fmtFecha(r.ultimo_movimiento)}</span>
        <button className="pc-btn-movs" style={{ color, borderColor: color + "55" }} onClick={() => onVerMovs(r)}>
          Ver movimientos →
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   TABLA MOVIMIENTOS
══════════════════════════════════════════════════════ */
function TablaMovimientos({ data, fmt, fmtFecha, tipoMov }) {
  if (data.length === 0) return (
    <div className="inv-empty">
      <p style={{ fontSize: 48 }}>📋</p>
      <p style={{ fontWeight: 700, fontSize: 16, color: "#374151" }}>Sin movimientos</p>
      <p style={{ color: "#9ca3af", fontSize: 13 }}>No hay registros con los filtros aplicados.</p>
    </div>
  );

  const totalKg = data.reduce((s, m) => s + (parseFloat(m.peso_neto_kg) || 0), 0);

  return (
    <div className="mov-card">
      <div className="mov-head">
        <span className="mov-title">
          {tipoMov === "ENTRADA" ? "↓ Entradas" : tipoMov === "SALIDA" ? "↑ Salidas" : "≡ Todos los movimientos"}
        </span>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <span className={`mov-badge ${tipoMov === "ENTRADA" ? "mb-e" : tipoMov === "SALIDA" ? "mb-s" : "mb-a"}`}>
            {data.length} registro(s)
          </span>
          <span className="mov-total-chip">
            {tipoMov === "SALIDA" ? "−" : "+"}{fmt(totalKg)} kg total
          </span>
        </div>
      </div>
      <div className="mov-table-wrap">
        <table className="mov-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Tipo</th>
              <th>Lote</th>
              <th>Fecha</th>
              <th>Producto</th>
              <th>Bodega</th>
              <th>Placa</th>
              <th>Propietario</th>
              <th style={{ textAlign: "right" }}>Bruto kg</th>
              <th style={{ textAlign: "right" }}>Tara kg</th>
              <th style={{ textAlign: "right" }}>Peso neto kg</th>
            </tr>
          </thead>
          <tbody>
            {data.map(m => {
              const isEnt = m.tipo_movimiento === "ENTRADA";
              return (
                <tr key={m.id} className={isEnt ? "row-e" : "row-s"}>
                  <td><span className="mov-id">#{m.id}</span></td>
                  <td>
                    <span className={`mov-tipo ${isEnt ? "mt-e" : "mt-s"}`}>
                      {isEnt ? "↓ Entrada" : "↑ Salida"}
                    </span>
                  </td>
                  <td>
                    {m.lote_id
                      ? <span className="mov-lote-big">{m.lote_id}</span>
                      : <span className="mov-nil">—</span>}
                  </td>
                  <td className="mov-fecha">{fmtFecha(m.fecha)}{m.hora ? <span className="mov-hora"> {m.hora}</span> : ""}</td>
                  <td className="mov-prod">
                    <p className="mp-name">{m.descripcion || "—"}</p>
                    {m.codigo !== "—" && <span className="mp-cod">{m.codigo}</span>}
                  </td>
                  <td className="mov-g">{m.bodega || "—"}</td>
                  <td>{m.placas ? <span className="mov-placa">{m.placas}</span> : <span className="mov-nil">—</span>}</td>
                  <td className="mov-g">{m.propietario || m.nombre || "—"}</td>
                  <td className="mov-num">{fmt(m.peso_bruto)}</td>
                  <td className="mov-num">{fmt(m.peso_tara)}</td>
                  <td className="mov-num">
                    <span className={`mov-neto ${isEnt ? "mn-e" : "mn-s"}`}>
                      {isEnt ? "+" : "−"}{fmt(m.peso_neto_kg)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   CSS
══════════════════════════════════════════════════════ */
function CSS() {
  return <style>{`
    *, *::before, *::after { box-sizing: border-box; }
    .inv-wrap { font-family: Arial, sans-serif; max-width: 1400px; margin: 0 auto; display: flex; flex-direction: column; gap: 24px; padding: 0 4px; }

    /* HEADER */
    .inv-header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 16px; border-bottom: 2px solid #e5e7eb; }
    .inv-label  { font-size: 11px; font-weight: 700; letter-spacing: 2px; color: #2e7d32; text-transform: uppercase; margin: 0 0 4px; }
    .inv-title  { font-size: 28px; font-weight: 800; margin: 0 0 4px; color: #111827; }
    .inv-title span { color: #2e7d32; }
    .inv-sub    { color: #6b7280; font-size: 13px; margin: 0; }
    .btn-refresh { padding: 9px 20px; background: white; border: 1.5px solid #d1d5db; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; color: #374151; flex-shrink: 0; }
    .btn-refresh:hover:not(:disabled) { background: #f9fafb; border-color: #2e7d32; color: #2e7d32; }
    .btn-refresh:disabled { opacity: .5; cursor: not-allowed; }

    /* KPIs */
    .inv-kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; }
    .kpi { display: flex; align-items: center; gap: 16px; background: white; border: 1px solid #e5e7eb; border-radius: 14px; padding: 18px 20px; cursor: pointer; transition: transform .15s, box-shadow .15s; }
    .kpi:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,.1); }
    .kpi-icon { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 900; flex-shrink: 0; }
    .kpi-green .kpi-icon { background: #dcfce7; color: #16a34a; }
    .kpi-red   .kpi-icon { background: #fee2e2; color: #dc2626; }
    .kpi-blue  .kpi-icon { background: #dbeafe; color: #1d4ed8; }
    .kpi-purple .kpi-icon { background: #ede9fe; color: #7c3aed; }
    .kpi-hl { box-shadow: 0 4px 16px rgba(29,78,216,.12); border-color: #bfdbfe; }
    .kpi-body { flex: 1; min-width: 0; }
    .kpi-lbl  { font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #6b7280; margin: 0 0 3px; }
    .kpi-val  { font-size: 22px; font-weight: 900; color: #111827; margin: 0; line-height: 1.1; font-variant-numeric: tabular-nums; }
    .kpi-val span { font-size: 13px; font-weight: 500; color: #9ca3af; }
    .kpi-val-big { font-size: 36px; font-weight: 900; color: #7c3aed; margin: 0; line-height: 1; }
    .kpi-hint { font-size: 11.5px; color: #9ca3af; margin: 2px 0 0; }

    /* TABS */
    .inv-tabs { display: flex; gap: 4px; background: #f3f4f6; padding: 5px; border-radius: 12px; width: fit-content; }
    .inv-tab  { padding: 9px 24px; border: none; background: transparent; border-radius: 8px; font-size: 13px; font-weight: 600; color: #6b7280; cursor: pointer; transition: all .15s; white-space: nowrap; }
    .inv-tab:hover:not(.active) { background: #e9ebee; color: #374151; }
    .inv-tab.active { background: white; color: #111827; box-shadow: 0 1px 4px rgba(0,0,0,.1); }

    /* FILTROS */
    .inv-filters { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
    .search-wrap  { position: relative; flex: 1; min-width: 260px; }
    .search-ico   { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); font-size: 16px; color: #9ca3af; pointer-events: none; }
    .search-input { width: 100%; padding: 9px 34px 9px 34px; border: 1.5px solid #d1d5db; border-radius: 8px; font-size: 13px; color: #111827; background: white; }
    .search-input:focus { outline: none; border-color: #2e7d32; box-shadow: 0 0 0 3px rgba(46,125,50,.1); }
    .search-clr   { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; color: #9ca3af; cursor: pointer; font-size: 14px; }
    .tipo-btns { display: flex; border-radius: 8px; overflow: hidden; border: 1.5px solid #e5e7eb; }
    .tipo-btn  { padding: 8px 16px; border: none; background: white; font-size: 12px; font-weight: 700; cursor: pointer; transition: all .15s; border-right: 1px solid #e5e7eb; }
    .tipo-btn:last-child { border-right: none; }
    .tipo-btn.active.tb-a { background: #f3f4f6; color: #374151; }
    .tipo-btn.active.tb-e { background: #dcfce7; color: #166534; }
    .tipo-btn.active.tb-s { background: #fee2e2; color: #991b1b; }
    .tipo-btn:not(.active) { color: #9ca3af; }
    .date-group { display: flex; align-items: center; gap: 6px; }
    .date-group label { font-size: 12px; font-weight: 600; color: #374151; white-space: nowrap; }
    .date-group input { padding: 8px 10px; border: 1.5px solid #d1d5db; border-radius: 8px; font-size: 12px; color: #111827; background: white; }
    .date-group input:focus { outline: none; border-color: #2e7d32; }
    .btn-clr-f { background: #fee2e2; border: none; border-radius: 7px; color: #991b1b; font-size: 12px; font-weight: 700; padding: 7px 12px; cursor: pointer; }
    .btn-clr-f:hover { background: #fecaca; }
    .prod-chip { display: flex; align-items: center; gap: 8px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 20px; padding: 5px 14px; font-size: 12px; color: #1d4ed8; font-weight: 600; }
    .prod-chip button { background: none; border: none; color: #60a5fa; cursor: pointer; font-size: 14px; font-weight: 900; padding: 0 2px; }

    /* LOADING / EMPTY */
    .inv-loading { text-align: center; padding: 80px; color: #6b7280; }
    .spin { width: 32px; height: 32px; border: 3px solid #e5e7eb; border-top-color: #2e7d32; border-radius: 50%; animation: inv-spin .7s linear infinite; margin: 0 auto 14px; }
    @keyframes inv-spin { to { transform: rotate(360deg); } }
    .inv-empty { text-align: center; padding: 70px 20px; color: #9ca3af; }

    /* SECCIÓN */
    .seccion-header { display: flex; align-items: center; gap: 14px; margin-bottom: 16px; flex-wrap: wrap; }
    .seccion-icon { font-size: 28px; }
    .seccion-title { font-size: 17px; font-weight: 800; color: #111827; margin: 0 0 2px; }
    .seccion-sub   { font-size: 12px; color: #9ca3af; margin: 0; }
    .seccion-badge { background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; padding: 4px 14px; border-radius: 20px; font-size: 12px; font-weight: 700; margin-left: auto; white-space: nowrap; }
    .seccion-badge-amber { background: #fffbeb; color: #92400e; border-color: #fcd34d; }

    /* CARDS GRID */
    .cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }

    /* PRODUCT CARD */
    .prod-card { background: white; border: 1px solid #e5e7eb; border-radius: 14px; padding: 20px; display: flex; flex-direction: column; gap: 14px; box-shadow: 0 1px 4px rgba(0,0,0,.05); transition: box-shadow .2s, transform .1s; }
    .prod-card:hover { box-shadow: 0 6px 20px rgba(0,0,0,.1); transform: translateY(-2px); }
    .pc-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; }
    .pc-name  { font-size: 15px; font-weight: 800; color: #111827; margin: 0 0 6px; line-height: 1.2; }
    .pc-tags  { display: flex; gap: 5px; flex-wrap: wrap; }
    .tag-cod  { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; padding: 1px 7px; border-radius: 4px; font-size: 10.5px; font-weight: 700; }
    .tag-bod  { background: white; border: 1px solid; padding: 1px 7px; border-radius: 4px; font-size: 10.5px; font-weight: 700; }
    .tag-pres { background: #f9fafb; color: #6b7280; border: 1px solid #e5e7eb; padding: 1px 7px; border-radius: 4px; font-size: 10.5px; }
    .pc-est   { padding: 3px 10px; border-radius: 20px; font-size: 10px; font-weight: 800; letter-spacing: .8px; white-space: nowrap; flex-shrink: 0; }
    .pc-stock { display: flex; align-items: baseline; gap: 6px; }
    .pc-stock-num  { font-size: 38px; font-weight: 900; line-height: 1; font-variant-numeric: tabular-nums; }
    .pc-stock-unit { font-size: 16px; color: #9ca3af; font-weight: 600; }
    .pc-bar-wrap { display: flex; flex-direction: column; gap: 4px; }
    .pc-bar  { height: 6px; background: #f3f4f6; border-radius: 99px; overflow: hidden; }
    .pc-bar-fill { height: 100%; border-radius: 99px; transition: width .6s ease; }
    .pc-bar-pct { font-size: 11px; color: #9ca3af; }
    .pc-stats { display: flex; align-items: center; background: #f9fafb; border-radius: 10px; overflow: hidden; }
    .pc-stat  { flex: 1; display: flex; align-items: center; gap: 10px; padding: 10px 14px; }
    .pc-stat-div { width: 1px; height: 36px; background: #e5e7eb; }
    .pcs-ico  { font-size: 18px; font-weight: 900; }
    .pc-stat-e .pcs-ico { color: #16a34a; }
    .pc-stat-s .pcs-ico { color: #dc2626; }
    .pcs-lbl  { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; color: #9ca3af; margin: 0 0 1px; }
    .pcs-val  { font-size: 13px; font-weight: 700; color: #111827; margin: 0; font-variant-numeric: tabular-nums; }
    .pc-footer { display: flex; justify-content: space-between; align-items: center; padding-top: 6px; border-top: 1px solid #f3f4f6; }
    .pc-fecha { font-size: 11px; color: #9ca3af; }
    .pc-btn-movs { background: white; border: 1.5px solid; border-radius: 7px; padding: 5px 12px; font-size: 12px; font-weight: 700; cursor: pointer; transition: all .15s; }
    .pc-btn-movs:hover { opacity: .8; }

    /* TABLA MOVIMIENTOS */
    .mov-card { background: white; border: 1px solid #e5e7eb; border-radius: 14px; padding: 24px; box-shadow: 0 1px 6px rgba(0,0,0,.05); }
    .mov-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; flex-wrap: wrap; gap: 10px; }
    .mov-title { font-size: 16px; font-weight: 800; color: #111827; }
    .mov-badge { padding: 4px 14px; border-radius: 20px; font-size: 12px; font-weight: 700; }
    .mb-a { background: #f3f4f6; color: #374151; }
    .mb-e { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
    .mb-s { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }
    .mov-total-chip { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 20px; padding: 4px 14px; font-size: 12px; font-weight: 700; color: #374151; font-variant-numeric: tabular-nums; }
    .mov-table-wrap { overflow-x: auto; }
    .mov-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .mov-table th { text-align: left; padding: 10px 14px; background: #f9fafb; font-size: 10.5px; font-weight: 700; letter-spacing: .7px; text-transform: uppercase; color: #6b7280; border-bottom: 2px solid #e5e7eb; white-space: nowrap; }
    .mov-table td { padding: 11px 14px; border-bottom: 1px solid #f3f4f6; vertical-align: middle; }
    .mov-table tbody tr:last-child td { border-bottom: none; }
    .row-e:hover td { background: #f9fffe; }
    .row-s:hover td { background: #fff9f9; }
    .mov-id   { background: #f3f4f6; color: #9ca3af; border-radius: 4px; padding: 1px 6px; font-size: 11px; font-weight: 700; }
    .mov-tipo { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 800; white-space: nowrap; }
    .mt-e { background: #dcfce7; color: #166534; }
    .mt-s { background: #fee2e2; color: #991b1b; }
    .mov-fecha { white-space: nowrap; font-size: 13px; font-weight: 600; color: #374151; }
    .mov-hora  { font-weight: 400; color: #9ca3af; font-size: 12px; }
    .mov-prod  { }
    .mp-name { font-weight: 700; color: #111827; margin: 0 0 2px; white-space: nowrap; }
    .mp-cod  { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; padding: 1px 6px; border-radius: 4px; font-size: 10px; font-weight: 700; }
    .mov-g { color: #6b7280; font-size: 12.5px; }
    .mov-num { text-align: right; font-variant-numeric: tabular-nums; font-weight: 600; color: #374151; white-space: nowrap; }
    .mov-neto { font-weight: 800; font-size: 14px; font-variant-numeric: tabular-nums; }
    .mn-e { color: #16a34a; }
    .mn-s { color: #dc2626; }
    .mov-lote  { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; padding: 1px 7px; border-radius: 4px; font-size: 11px; font-weight: 700; }
    .mov-lote-big { display: inline-block; background: #1e3a5f; color: #fff; border-radius: 6px; padding: 3px 10px; font-size: 11.5px; font-weight: 800; letter-spacing: .6px; font-family: monospace; white-space: nowrap; }
    .mov-placa { background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; padding: 1px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; letter-spacing: .8px; }
    .mov-nil   { color: #d1d5db; }

    @media (max-width: 640px) {
      .cards-grid { grid-template-columns: 1fr; }
      .inv-kpis { grid-template-columns: 1fr 1fr; }
    }
  `}</style>;
}

