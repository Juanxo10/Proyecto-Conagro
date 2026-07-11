import React, { useState, useEffect, useRef, useCallback } from "react";

const SUBPRODUCTOS_BASE = [
  "Arroz blanco tipo 1",
  "Arroz blanco tipo 2",
  "Cristal",
  "Arroz amarillo",
  "Grano 1/4",
  "1/2 grano",
  "Rechazo trilla",
  "Rechazo final",
  "Harina",
  "Cascarilla",
];

const emptySubproductos = () => SUBPRODUCTOS_BASE.map(n => ({ subproducto: n, kilos: "" }));

export default function Trilla() {
  // ── Estado tab Trilla ────────────────────────────────────
  const [loteBusq, setLoteBusq]         = useState("");
  const [loteOpen, setLoteOpen]         = useState(false);
  const [lotes, setLotes]               = useState([]);
  const [loteCarg, setLoteCarg]         = useState(false);
  const [loteData, setLoteData]         = useState(null); // { previo, pesaje, trilla }
  const [cargando, setCargando]         = useState(false);
  const [msg, setMsg]                   = useState({ tipo: "", texto: "" });
  const [formT, setFormT]               = useState({
    fecha_trilla: "", hora_trilla: "",
    rendimiento: "", descuento_humedad: "",
    descuento_impureza: "", descuento_grano_partido: "",
    kilos_procesados: "", kilos_resultado: "",
    analista: "", observaciones: "",
    // Calidad del producto procesado
    presentacion: "", cantidad_salida: "", fecha_vencimiento: "",
    humedad_salida: "", grano_partido_salida: "", grano_yesado_salida: "",
    grano_dano_hongo_salida: "", grano_dano_calor_salida: "",
    semillas_obj_salida: "", impureza_salida: "",
    olor_resultado: "CUMPLE", sabor_resultado: "CUMPLE", color_resultado: "CUMPLE",
    nivel_infestacion_resultado: "CUMPLE", materias_extranas_resultado: "CUMPLE",
  });
  const loteRef  = useRef(null);
  const editRef   = useRef(null);

  // ── Subproductos (tab Trilla)
  const [subproductosT, setSubproductosT] = useState(emptySubproductos());

  // ── Estado sección Modificar Trilla (solo admin)
  const userRol = (() => { try { return JSON.parse(localStorage.getItem("user") || "{}").rol || ""; } catch { return ""; } })();
  const [editBusq,     setEditBusq]     = useState("");
  const [editOpen,     setEditOpen]     = useState(false);
  const [editLotes,    setEditLotes]    = useState([]);
  const [editLoteCarg, setEditLoteCarg] = useState(false);
  const [editLoteData, setEditLoteData] = useState(null);
  const [editCargando, setEditCargando] = useState(false);
  const [motivoEdit,   setMotivoEdit]   = useState("");
  const emptyFormE = () => ({
    fecha_trilla: "", hora_trilla: "",
    rendimiento: "", descuento_humedad: "",
    descuento_impureza: "", descuento_grano_partido: "",
    kilos_procesados: "", kilos_resultado: "",
    analista: "", observaciones: "",
    presentacion: "", cantidad_salida: "", fecha_vencimiento: "",
    humedad_salida: "", grano_partido_salida: "", grano_yesado_salida: "",
    grano_dano_hongo_salida: "", grano_dano_calor_salida: "",
    semillas_obj_salida: "", impureza_salida: "",
    olor_resultado: "CUMPLE", sabor_resultado: "CUMPLE", color_resultado: "CUMPLE",
    nivel_infestacion_resultado: "CUMPLE", materias_extranas_resultado: "CUMPLE",
  });
  const [formE,         setFormE]         = useState(emptyFormE());
  const [subproductosE, setSubproductosE] = useState(emptySubproductos());

  // ── Auto-fill kilos_resultado y rendimiento desde subproductos
  useEffect(() => {
    const COMERCIALES = ["Arroz blanco tipo 1", "Arroz blanco tipo 2", "Cristal"];
    const totalComercial = subproductosT
      .filter(sp => COMERCIALES.includes(sp.subproducto))
      .reduce((s, sp) => s + (parseFloat(sp.kilos) || 0), 0);
    const pesoEntrada = parseFloat(formT.kilos_procesados) || 0;
    setFormT(p => ({
      ...p,
      kilos_resultado: String(totalComercial),
      rendimiento:     pesoEntrada > 0 && totalComercial > 0
        ? ((totalComercial / pesoEntrada) * 100).toFixed(2)
        : p.rendimiento,
    }));
  }, [subproductosT, formT.kilos_procesados]);

  // ── Fecha/hora actual ────────────────────────────────────
  useEffect(() => {
    const now  = new Date();
    const dd   = String(now.getDate()).padStart(2, "0");
    const mm   = String(now.getMonth() + 1).padStart(2, "0");
    const yyyy = now.getFullYear();
    const hora = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    setFormT(p => ({ ...p, fecha_trilla: `${dd}/${mm}/${yyyy}`, hora_trilla: hora }));
  }, []);

  // ── Auto-fill kilos_resultado en formulario de edición
  useEffect(() => {
    const COMERCIALES = ["Arroz blanco tipo 1", "Arroz blanco tipo 2", "Cristal"];
    const totalComercial = subproductosE
      .filter(sp => COMERCIALES.includes(sp.subproducto))
      .reduce((s, sp) => s + (parseFloat(sp.kilos) || 0), 0);
    const pesoEntrada = parseFloat(formE.kilos_procesados) || 0;
    setFormE(p => ({
      ...p,
      kilos_resultado: String(totalComercial),
      rendimiento:     pesoEntrada > 0 && totalComercial > 0
        ? ((totalComercial / pesoEntrada) * 100).toFixed(2)
        : p.rendimiento,
    }));
  }, [subproductosE, formE.kilos_procesados]);

  // ── Cerrar dropdowns al clic fuera ──────────────────────
  useEffect(() => {
    const h = (e) => {
      if (loteRef.current && !loteRef.current.contains(e.target)) setLoteOpen(false);
      if (editRef.current && !editRef.current.contains(e.target)) setEditOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // ── Buscar lotes PROCESADOS para edición (debounce)
  useEffect(() => {
    if (!editOpen) return;
    setEditLoteCarg(true);
    const t = setTimeout(async () => {
      try {
        const q   = editBusq.trim();
        const url = `/api/trillas/lotes-procesados${q ? `?q=${encodeURIComponent(q)}` : ""}`;
        const res = await fetch(url);
        const d   = await res.json();
        setEditLotes(Array.isArray(d) ? d : []);
      } catch { setEditLotes([]); } finally { setEditLoteCarg(false); }
    }, 350);
    return () => clearTimeout(t);
  }, [editBusq, editOpen]);

  // ── Seleccionar lote para edición
  const handleEditSelect = useCallback(async (previo) => {
    setEditOpen(false);
    setEditBusq(previo.lote_id);
    setEditCargando(true);
    setEditLoteData(null);
    setFormE(emptyFormE());
    setSubproductosE(emptySubproductos());
    setMotivoEdit("");
    try {
      const res = await fetch(`/api/trillas/lote-completo/${previo.lote_id}`);
      const d   = await res.json();
      if (!res.ok) throw new Error(d.error);
      setEditLoteData(d);
      if (d.trilla) {
        const t = d.trilla;
        setFormE({
          fecha_trilla: t.fecha_trilla || "",
          hora_trilla: t.hora_trilla || "",
          rendimiento: t.rendimiento ?? "",
          descuento_humedad: t.descuento_humedad ?? "",
          descuento_impureza: t.descuento_impureza ?? "",
          descuento_grano_partido: t.descuento_grano_partido ?? "",
          kilos_procesados: t.kilos_procesados ?? "",
          kilos_resultado: t.kilos_resultado ?? "",
          analista: t.analista || "",
          observaciones: t.observaciones || "",
          presentacion: t.presentacion || "",
          cantidad_salida: t.cantidad_salida || "",
          fecha_vencimiento: t.fecha_vencimiento || "",
          humedad_salida: t.humedad_salida ?? "",
          grano_partido_salida: t.grano_partido_salida ?? "",
          grano_yesado_salida: t.grano_yesado_salida ?? "",
          grano_dano_hongo_salida: t.grano_dano_hongo_salida ?? "",
          grano_dano_calor_salida: t.grano_dano_calor_salida ?? "",
          semillas_obj_salida: t.semillas_obj_salida ?? "",
          impureza_salida: t.impureza_salida ?? "",
          olor_resultado: t.olor_resultado || "CUMPLE",
          sabor_resultado: t.sabor_resultado || "CUMPLE",
          color_resultado: t.color_resultado || "CUMPLE",
          nivel_infestacion_resultado: t.nivel_infestacion_resultado || "CUMPLE",
          materias_extranas_resultado: t.materias_extranas_resultado || "CUMPLE",
        });
      }
      if (Array.isArray(d.subproductos) && d.subproductos.length) {
        setSubproductosE(SUBPRODUCTOS_BASE.map(n => {
          const found = d.subproductos.find(s => s.subproducto === n);
          return { subproducto: n, kilos: found ? String(found.kilos ?? "") : "" };
        }));
      }
    } catch (e) { mostrarMsg("error", e.message); }
    finally { setEditCargando(false); }
  }, []);

  // ── Guardar cambios de trilla (admin PUT)
  const handleActualizar = async () => {
    if (!editLoteData?.previo) return mostrarMsg("error", "Seleccione un lote.");
    if (!motivoEdit.trim()) return mostrarMsg("error", "El motivo de modificación es obligatorio.");
    const token = localStorage.getItem("token");
    if (!token) return mostrarMsg("error", "Sesión expirada. Vuelva a iniciar sesión.");
    setEditCargando(true);
    try {
      const res = await fetch(`/api/trillas/${editLoteData.previo.lote_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({
          ...formE,
          subproductos: subproductosE,
          motivo_modificacion: motivoEdit.trim(),
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Error al actualizar");
      mostrarMsg("ok", `Trilla del lote ${editLoteData.previo.lote_id} actualizada correctamente.`);
      setEditLoteData(null);
      setEditBusq("");
      setFormE(emptyFormE());
      setSubproductosE(emptySubproductos());
      setMotivoEdit("");
    } catch (e) { mostrarMsg("error", e.message); }
    finally { setEditCargando(false); }
  };

  // ── Buscar lotes PESADOS (debounce) ──────────────────────
  useEffect(() => {
    if (!loteOpen) return;
    setLoteCarg(true);
    const t = setTimeout(async () => {
      try {
        const q   = loteBusq.trim();
        const url = `/api/trillas/lotes-pesados${q ? `?q=${encodeURIComponent(q)}` : ""}`;
        const res = await fetch(url);
        const d   = await res.json();
        setLotes(Array.isArray(d) ? d : []);
      } catch { setLotes([]); } finally { setLoteCarg(false); }
    }, 350);
    return () => clearTimeout(t);
  }, [loteBusq, loteOpen]);


  const mostrarMsg = (tipo, texto) => {
    setMsg({ tipo, texto });
    setTimeout(() => setMsg({ tipo: "", texto: "" }), 5000);
  };

  // ── Seleccionar lote para trilla ─────────────────────────
  // ── Seleccionar lote para trilla ─────────────────────────────
  const handleLoteSelect = useCallback(async (previo) => {
    setLoteOpen(false);
    setLoteBusq(previo.lote_id);
    setCargando(true);

    // 1. Limpiar formulario y subproductos del lote anterior
    const now  = new Date();
    const dd   = String(now.getDate()).padStart(2, "0");
    const mm   = String(now.getMonth() + 1).padStart(2, "0");
    const yyyy = now.getFullYear();
    const hora = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    setFormT({
      fecha_trilla: `${dd}/${mm}/${yyyy}`, hora_trilla: hora,
      rendimiento: "", descuento_humedad: "", descuento_impureza: "",
      descuento_grano_partido: "", kilos_procesados: "", kilos_resultado: "",
      analista: "", observaciones: "",
      presentacion: "", cantidad_salida: "", fecha_vencimiento: "",
      humedad_salida: "", grano_partido_salida: "", grano_yesado_salida: "",
      grano_dano_hongo_salida: "", grano_dano_calor_salida: "",
      semillas_obj_salida: "", impureza_salida: "",
      olor_resultado: "CUMPLE", sabor_resultado: "CUMPLE", color_resultado: "CUMPLE",
      nivel_infestacion_resultado: "CUMPLE", materias_extranas_resultado: "CUMPLE",
    });
    setSubproductosT(emptySubproductos());
    setLoteData(null);

    try {
      const res = await fetch(`/api/trillas/lote-completo/${previo.lote_id}`);
      const d   = await res.json();
      if (!res.ok) throw new Error(d.error);
      setLoteData(d);

      // 2. Cargar peso neto automáticamente desde el pesaje
      if (d.pesaje) {
        const pb = parseFloat(d.pesaje.peso_bruto)     || 0;
        const ta = parseFloat(d.pesaje.peso_tara)       || 0;
        const em = parseFloat(d.pesaje.destare_empaque) || 0;
        setFormT(p => ({
          ...p,
          kilos_procesados: String(pb - ta - em),
          analista:         d.pesaje.analista_laboratorio || "",
        }));
      }

      // 3. Cargar subproductos guardados si existen — activa cálculos automáticamente
      if (Array.isArray(d.subproductos) && d.subproductos.length) {
        setSubproductosT(SUBPRODUCTOS_BASE.map(n => {
          const found = d.subproductos.find(s => s.subproducto === n);
          return { subproducto: n, kilos: found ? String(found.kilos ?? "") : "" };
        }));
      }
    } catch (e) { mostrarMsg("error", e.message); }
    finally { setCargando(false); }
  }, []);


  // ── Guardar trilla ───────────────────────────────────────
  const handleGuardar = async () => {
    if (!loteData?.previo) return mostrarMsg("error", "Seleccione un lote.");
    if (!formT.fecha_trilla) return mostrarMsg("error", "La fecha de trilla es obligatoria.");
    setCargando(true);
    try {
      const res = await fetch("/api/trillas", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ lote_id: loteData.previo.lote_id, ...formT, subproductos: subproductosT }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Error al guardar");
      mostrarMsg("ok", `Trilla del lote ${loteData.previo.lote_id} registrada. Estado → PROCESADO`);
      setLoteData(null);
      setLoteBusq("");
      setSubproductosT(emptySubproductos());
      const now  = new Date();
      const dd   = String(now.getDate()).padStart(2, "0");
      const mm   = String(now.getMonth() + 1).padStart(2, "0");
      const yyyy = now.getFullYear();
      const hora = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      setFormT({ fecha_trilla: `${dd}/${mm}/${yyyy}`, hora_trilla: hora, rendimiento: "", descuento_humedad: "", descuento_impureza: "", descuento_grano_partido: "", kilos_procesados: "", kilos_resultado: "", analista: "", observaciones: "", presentacion: "", cantidad_salida: "", fecha_vencimiento: "", humedad_salida: "", grano_partido_salida: "", grano_yesado_salida: "", grano_dano_hongo_salida: "", grano_dano_calor_salida: "", semillas_obj_salida: "", impureza_salida: "", olor_resultado: "CUMPLE", sabor_resultado: "CUMPLE", color_resultado: "CUMPLE", nivel_infestacion_resultado: "CUMPLE", materias_extranas_resultado: "CUMPLE" });
    } catch (e) { mostrarMsg("error", e.message); }
    finally { setCargando(false); }
  };


  // ── Render ───────────────────────────────────────────────
  return (
    <>
      <div className="app">
        <div className="wrapper">

          {/* HEADER */}
          <div className="page-header">
            <div>
              <p className="page-label">PROCESAMIENTO</p>
              <h1 className="title">Trilla</h1>
              <p className="subtitle-text">Registro del proceso de trilla y datos de calidad por lote.</p>
            </div>
          </div>

          {/* MENSAJE */}
          {msg.texto && (
            <div className={`msg ${msg.tipo}`}>
              <span className="msg-icon">{msg.tipo === "ok" ? "✓" : "✕"}</span>
              {msg.texto}
            </div>
          )}


          {/* ══════════════ TAB TRILLA ══════════════ */}
            <div className="form-section">
              <div className="form-section-header">
                <div className="form-estado nuevo">
                  <div className="estado-dot" />
                  <span>Registrar procesamiento — solo lotes en estado <strong>PESADO</strong></span>
                </div>
              </div>

              {/* Selector de lote */}
              <div className="card" ref={loteRef}>
                <div className="card-title">Seleccionar Lote (Estado: PESADO)</div>
                <div style={{ position: "relative", maxWidth: 520 }}>
                  <div className="placa-combo">
                    <input
                      className="lote-input"
                      placeholder="Buscar por ID de lote o placa..."
                      value={loteBusq}
                      onChange={e => { setLoteBusq(e.target.value); setLoteOpen(true); }}
                      onFocus={() => setLoteOpen(true)}
                    />
                    <button type="button" className="placa-toggle" onClick={() => setLoteOpen(o => !o)}>&#9660;</button>
                  </div>
                  {loteOpen && (
                    <div className="placa-dropdown">
                      {loteCarg ? (
                        <div className="placa-empty">Buscando lotes...</div>
                      ) : lotes.length === 0 ? (
                        <div className="placa-empty">Sin lotes en estado PESADO</div>
                      ) : (
                        <ul className="placa-lista">
                          {lotes.map(l => (
                            <li key={l.id} onMouseDown={() => handleLoteSelect(l)}>
                              <span className="placa-id">{l.lote_id}</span>
                              <span className="placa-info">
                                {[l.placa, l.propietario, l.producto].filter(Boolean).join(" · ")}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {cargando && !loteData && (
                <div className="estado-tabla">Cargando datos del lote...</div>
              )}

              {loteData && (
                <>
                  {/* ── Card unificada: Info lote + Análisis entrada ── */}
                  <div className="card">
                    <div className="card-title">
                      Lote: {loteData.previo.lote_id}
                      <span className="badge-pesado">PESADO</span>
                      {loteData.previo.estado === "CONDICIONADO" && (
                        <span className="badge-condicionado">⚠ CONDICIONADO</span>
                      )}
                    </div>
                    {loteData.previo.estado === "CONDICIONADO" && (
                      <div className="alerta-condicionado">
                        ⚠ Lote <strong>CONDICIONADO</strong> — calidad regular, requiere seguimiento especial. Verifique los parámetros de humedad e impureza antes de procesar.
                      </div>
                    )}
                    <div className="lote-info-grid">
                      {/* Columna izquierda: datos del previo */}
                      <div>
                        <p className="section-mini-title">Información del lote</p>
                        <div className="info-grid">
                          <Field label="Propietario"   value={loteData.previo.propietario} />
                          <Field label="NIT / Cédula"  value={loteData.previo.cedula_nit} />
                          <Field label="Placa"         value={loteData.previo.placa} />
                          <Field label="Conductor"     value={loteData.previo.nombre_conductor || loteData.pesaje?.nombre} />
                          <Field label="Producto"      value={loteData.pesaje?.descripcion || loteData.previo.producto} />
                          <Field label="Procedencia"   value={loteData.pesaje?.procedencia} />
                        </div>
                      </div>
                      {/* Columna derecha: pesaje de entrada */}
                      {loteData.pesaje && (
                        <div>
                          <p className="section-mini-title">Análisis de entrada — Solo lectura</p>
                          <div className="info-grid">
                            <Field label="Fecha entrada"  value={loteData.pesaje.fecha} />
                            <Field label="Peso Bruto"     value={loteData.pesaje.peso_bruto ? `${Number(loteData.pesaje.peso_bruto).toLocaleString("es-CO")} kg` : "—"} />
                            <Field label="Tara"           value={loteData.pesaje.peso_tara ? `${Number(loteData.pesaje.peso_tara).toLocaleString("es-CO")} kg` : "—"} />
                            <Field
                              label="Peso NETO" highlight
                              value={(() => {
                                const pb = parseFloat(loteData.pesaje.peso_bruto) || 0;
                                const ta = parseFloat(loteData.pesaje.peso_tara)  || 0;
                                const em = parseFloat(loteData.pesaje.destare_empaque) || 0;
                                return `${(pb - ta - em).toLocaleString("es-CO")} kg`;
                              })()}
                            />
                            <Field label="Humedad Lab."  value={loteData.pesaje.humedad_inicial  ? `${loteData.pesaje.humedad_inicial}%`  : "—"} />
                            <Field label="Humedad Base"  value={loteData.pesaje.humedad_final    ? `${loteData.pesaje.humedad_final}%`    : "—"} />
                            <Field label="Impureza Lab." value={loteData.pesaje.impureza_inicial ? `${loteData.pesaje.impureza_inicial}%` : "—"} />
                            <Field label="Impureza Base" value={loteData.pesaje.impureza_final   ? `${loteData.pesaje.impureza_final}%`   : "—"} />
                            {loteData.pesaje.codigo === "1A1" && (
                              <>
                                <Field label="G. Partido Lab."  value={loteData.pesaje.grano_partido_inicial ? `${loteData.pesaje.grano_partido_inicial}%` : "—"} />
                                <Field label="G. Partido Base"  value={loteData.pesaje.grano_partido_final   ? `${loteData.pesaje.grano_partido_final}%`   : "—"} />
                              </>
                            )}
                            {loteData.pesaje.codigo === "1AP" && (
                              <Field label="Kilos Verde" value={loteData.pesaje.compra ? `${Number(loteData.pesaje.compra).toLocaleString("es-CO")} kg` : "—"} />
                            )}
                            <Field label="Kilos Seco" value={loteData.pesaje.pilada ? `${Number(loteData.pesaje.pilada).toLocaleString("es-CO")} kg` : "—"} />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ── Layout principal: Formulario ← → Subproductos ── */}
                  <div className="trilla-main-grid">
                    {/* Columna izquierda: datos de procesamiento */}
                    <div className="card" style={{ alignSelf: "start" }}>
                      <div className="card-title">Datos de Procesamiento</div>

                      <div className="product-grid two-col">
                        <Grp label="Fecha de trilla">
                          <input type="text" value={formT.fecha_trilla} onChange={e => setFormT(p => ({ ...p, fecha_trilla: e.target.value }))} />
                        </Grp>
                        <Grp label="Hora inicio">
                          <input type="text" value={formT.hora_trilla} onChange={e => setFormT(p => ({ ...p, hora_trilla: e.target.value }))} />
                        </Grp>
                      </div>

                      <div className="section-divider">Kilos</div>
                      <div className="product-grid two-col" style={{ marginTop: 10 }}>
                        <Grp label="Kilos a procesar (kg)">
                          <input type="number" step="any" value={formT.kilos_procesados} onChange={e => setFormT(p => ({ ...p, kilos_procesados: e.target.value }))} />
                        </Grp>
                      </div>

                      <div className="section-divider">Descuentos</div>
                      <div className="product-grid two-col" style={{ marginTop: 10 }}>
                        <Grp label="Desc. Humedad (kg)">
                          <input type="number" step="any" value={formT.descuento_humedad} onChange={e => setFormT(p => ({ ...p, descuento_humedad: e.target.value }))} />
                        </Grp>
                        <Grp label="Desc. Impureza (kg)">
                          <input type="number" step="any" value={formT.descuento_impureza} onChange={e => setFormT(p => ({ ...p, descuento_impureza: e.target.value }))} />
                        </Grp>
                        <Grp label="Desc. G. Partido (kg)">
                          <input type="number" step="any" value={formT.descuento_grano_partido} onChange={e => setFormT(p => ({ ...p, descuento_grano_partido: e.target.value }))} />
                        </Grp>
                      </div>

                      <div className="section-divider">Analista</div>
                      <div style={{ marginTop: 10 }}>
                        <Grp label="Analista de laboratorio">
                          <input type="text" value={formT.analista} onChange={e => setFormT(p => ({ ...p, analista: e.target.value }))} />
                        </Grp>
                      </div>

                      <div className="group" style={{ marginTop: 14 }}>
                        <label>Observaciones</label>
                        <textarea
                          rows={2}
                          style={{ padding: "9px 12px", borderRadius: 6, border: "1px solid #d1d5db", fontSize: 14, resize: "vertical" }}
                          value={formT.observaciones}
                          onChange={e => setFormT(p => ({ ...p, observaciones: e.target.value }))}
                        />
                      </div>

                      <div className="section-divider" style={{ marginTop: 18 }}>Calidad — Producto Procesado</div>
                      <div className="product-grid two-col" style={{ marginTop: 10 }}>
                        <Grp label="Presentación">
                          <input list="presentaciones-list" placeholder="Seleccione o escriba..." value={formT.presentacion} onChange={e => setFormT(p => ({ ...p, presentacion: e.target.value }))} />
                          <datalist id="presentaciones-list">
                            <option value="Bulto x 50 kg" />
                            <option value="Bulto x 40 kg" />
                            <option value="Bulto x 25 kg" />
                            <option value="Bulto x 10 kg" />
                            <option value="Bolsa x 5 kg" />
                            <option value="Bolsa x 2 kg" />
                            <option value="Bolsa x 1 kg" />
                            <option value="Granel" />
                          </datalist>
                        </Grp>
                        <Grp label="Cantidad salida">
                          <input type="text" placeholder="Ej: 690 Bulto" value={formT.cantidad_salida} onChange={e => setFormT(p => ({ ...p, cantidad_salida: e.target.value }))} />
                        </Grp>
                        <Grp label="Fecha vencimiento">
                          <input type="text" placeholder="DD/MM/AAAA" value={formT.fecha_vencimiento} onChange={e => setFormT(p => ({ ...p, fecha_vencimiento: e.target.value }))} />
                        </Grp>
                      </div>

                      <div className="section-divider" style={{ marginTop: 16 }}>Calidad — Físicos</div>
                      <div className="product-grid two-col" style={{ marginTop: 10 }}>
                        <Grp label="Humedad (%)"><input type="number" step="0.01" value={formT.humedad_salida} onChange={e => setFormT(p => ({ ...p, humedad_salida: e.target.value }))} /></Grp>
                        <Grp label="Grano Partido (%)"><input type="number" step="0.01" value={formT.grano_partido_salida} onChange={e => setFormT(p => ({ ...p, grano_partido_salida: e.target.value }))} /></Grp>
                        <Grp label="Grano Yesado (%)"><input type="number" step="0.01" value={formT.grano_yesado_salida} onChange={e => setFormT(p => ({ ...p, grano_yesado_salida: e.target.value }))} /></Grp>
                        <Grp label="G. Dañado Hongo (%)"><input type="number" step="0.01" value={formT.grano_dano_hongo_salida} onChange={e => setFormT(p => ({ ...p, grano_dano_hongo_salida: e.target.value }))} /></Grp>
                        <Grp label="G. Dañado Calor (%)"><input type="number" step="0.01" value={formT.grano_dano_calor_salida} onChange={e => setFormT(p => ({ ...p, grano_dano_calor_salida: e.target.value }))} /></Grp>
                        <Grp label="Semillas / Arr. c.Cáscara"><input type="number" step="0.01" value={formT.semillas_obj_salida} onChange={e => setFormT(p => ({ ...p, semillas_obj_salida: e.target.value }))} /></Grp>
                        <Grp label="Impureza (%)"><input type="number" step="0.01" value={formT.impureza_salida} onChange={e => setFormT(p => ({ ...p, impureza_salida: e.target.value }))} /></Grp>
                      </div>

                      <div className="section-divider" style={{ marginTop: 16 }}>Organolépticos e Inocuidad</div>
                      <div className="product-grid two-col" style={{ marginTop: 10 }}>
                        <Grp label="Olor">
                          <select value={formT.olor_resultado} onChange={e => setFormT(p => ({ ...p, olor_resultado: e.target.value }))}>
                            <option value="CUMPLE">CUMPLE</option><option value="NO CUMPLE">NO CUMPLE</option>
                          </select>
                        </Grp>
                        <Grp label="Sabor">
                          <select value={formT.sabor_resultado} onChange={e => setFormT(p => ({ ...p, sabor_resultado: e.target.value }))}>
                            <option value="CUMPLE">CUMPLE</option><option value="NO CUMPLE">NO CUMPLE</option>
                          </select>
                        </Grp>
                        <Grp label="Color">
                          <select value={formT.color_resultado} onChange={e => setFormT(p => ({ ...p, color_resultado: e.target.value }))}>
                            <option value="CUMPLE">CUMPLE</option><option value="NO CUMPLE">NO CUMPLE</option>
                          </select>
                        </Grp>
                        <Grp label="Nivel de Infestación (100 g)">
                          <select value={formT.nivel_infestacion_resultado} onChange={e => setFormT(p => ({ ...p, nivel_infestacion_resultado: e.target.value }))}>
                            <option value="CUMPLE">CUMPLE</option><option value="NO CUMPLE">NO CUMPLE</option>
                          </select>
                        </Grp>
                        <Grp label="Materias Extrañas (100 g)">
                          <select value={formT.materias_extranas_resultado} onChange={e => setFormT(p => ({ ...p, materias_extranas_resultado: e.target.value }))}>
                            <option value="CUMPLE">CUMPLE</option><option value="NO CUMPLE">NO CUMPLE</option>
                          </select>
                        </Grp>
                      </div>
                    </div>

                    {/* Columna derecha: subproductos + resumen */}
                    <div className="card" style={{ alignSelf: "start" }}>
                      <div className="card-title">Subproductos del Procesamiento</div>
                      <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 14 }}>
                        Ingrese los kg por subproducto. El <strong>rendimiento</strong> y el <strong>total comercial</strong> se calculan automáticamente abajo.
                      </p>
                      <SubproductosTable subproductos={subproductosT} onChange={setSubproductosT} kilosProcesados={formT.kilos_procesados} />
                    </div>
                  </div>

                  {(() => {
                    const _ts = subproductosT.reduce((s, sp) => s + (parseFloat(sp.kilos) || 0), 0);
                    const _pe = parseFloat(formT.kilos_procesados) || 0;
                    const _excede = _pe > 0 && _ts > _pe + 0.01;
                    const _tieneNegativos = subproductosT.some(sp => parseFloat(sp.kilos) < 0);
                    const _bloqueado = _excede || _tieneNegativos;
                    return (
                      <>
                        {_tieneNegativos && (
                          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 7, padding: "10px 16px", fontSize: 13, color: "#991b1b", fontWeight: 600 }}>
                            ⚠️ No se permiten valores negativos en los subproductos.
                          </div>
                        )}
                        {_excede && !_tieneNegativos && (
                          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 7, padding: "10px 16px", fontSize: 13, color: "#991b1b", fontWeight: 600 }}>
                            ⚠️ Total salida ({_ts.toLocaleString("es-CO", {maximumFractionDigits:2})} kg) supera el peso de entrada ({_pe.toLocaleString("es-CO", {maximumFractionDigits:2})} kg). Corrija los valores para poder guardar.
                          </div>
                        )}
                        <div className="actions">
                          <button className="btn outline" disabled={cargando} onClick={() => { setLoteData(null); setLoteBusq(""); }}>
                            Cancelar
                          </button>
                          <button className="btn primary" disabled={cargando || _bloqueado} onClick={handleGuardar}
                            title={_bloqueado ? "Corrija los errores antes de guardar" : ""}>
                            {cargando ? "Procesando..." : "✓ Registrar Trilla → PROCESADO"}
                          </button>
                        </div>
                      </>
                    );
                  })()}
                </>
              )}
            </div>


          {/* ══════════════ SECCIÓN MODIFICAR TRILLA (solo admin) ══════════════ */}
          {userRol === "admin" && (
            <div className="form-section" style={{ borderColor: "#fbbf24" }}>
              <div className="form-section-header">
                <div className="form-estado" style={{ color: "#92400e" }}>
                  <div className="estado-dot" style={{ background: "#f59e0b" }} />
                  <span>✏️ Modificar trilla — solo lotes en estado <strong>PROCESADO</strong> (solo admin)</span>
                </div>
              </div>

              {/* Selector de lote procesado */}
              <div className="card" ref={editRef}>
                <div className="card-title">Seleccionar Lote (Estado: PROCESADO)</div>
                <div style={{ position: "relative", maxWidth: 520 }}>
                  <div className="placa-combo">
                    <input
                      className="lote-input"
                      placeholder="Buscar por ID de lote o placa..."
                      value={editBusq}
                      onChange={e => { setEditBusq(e.target.value); setEditOpen(true); }}
                      onFocus={() => setEditOpen(true)}
                    />
                    <button className="placa-toggle" onClick={() => setEditOpen(v => !v)}>▼</button>
                  </div>
                  {editOpen && (
                    <div className="placa-dropdown">
                      {editLoteCarg
                        ? <div className="placa-empty">Buscando...</div>
                        : editLotes.length === 0
                          ? <div className="placa-empty">Sin resultados</div>
                          : <ul className="placa-lista">
                              {editLotes.map(p => (
                                <li key={p.lote_id} onClick={() => handleEditSelect(p)}>
                                  <span className="placa-id">{p.lote_id}</span>
                                  <span className="placa-info">{p.placa} — {p.producto}</span>
                                </li>
                              ))}
                            </ul>
                      }
                    </div>
                  )}
                </div>
              </div>

              {/* Formulario de edición */}
              {editCargando && <div className="estado-tabla">Cargando...</div>}
              {!editCargando && editLoteData && (
                <>
                  {/* Info del lote */}
                  <div className="card">
                    <div className="card-title">Información del Lote</div>
                    <div className="info-grid">
                      <Field label="Lote ID"     value={editLoteData.previo.lote_id} highlight />
                      <Field label="Placa"       value={editLoteData.previo.placa} />
                      <Field label="Producto"    value={editLoteData.previo.producto} />
                      <Field label="Propietario" value={editLoteData.previo.propietario} />
                    </div>
                  </div>

                  <div className="trilla-main-grid">
                    {/* Columna izquierda: datos de proceso */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                      <div className="card">
                        <div className="card-title">Datos del Proceso</div>
                        <div className="product-grid two-col">
                          <Grp label="Fecha trilla"><input type="text" value={formE.fecha_trilla} onChange={e => setFormE(p => ({ ...p, fecha_trilla: e.target.value }))} /></Grp>
                          <Grp label="Hora trilla"><input type="text" value={formE.hora_trilla} onChange={e => setFormE(p => ({ ...p, hora_trilla: e.target.value }))} /></Grp>
                          <Grp label="Kilos procesados"><input type="number" step="any" value={formE.kilos_procesados} onChange={e => setFormE(p => ({ ...p, kilos_procesados: e.target.value }))} /></Grp>
                          <Grp label="Descuento humedad (kg)"><input type="number" step="any" value={formE.descuento_humedad} onChange={e => setFormE(p => ({ ...p, descuento_humedad: e.target.value }))} /></Grp>
                          <Grp label="Descuento impureza (kg)"><input type="number" step="any" value={formE.descuento_impureza} onChange={e => setFormE(p => ({ ...p, descuento_impureza: e.target.value }))} /></Grp>
                          <Grp label="Descuento grano partido (kg)"><input type="number" step="any" value={formE.descuento_grano_partido} onChange={e => setFormE(p => ({ ...p, descuento_grano_partido: e.target.value }))} /></Grp>
                          <Grp label="Analista"><input type="text" value={formE.analista} onChange={e => setFormE(p => ({ ...p, analista: e.target.value }))} /></Grp>
                          <Grp label="Observaciones"><input type="text" value={formE.observaciones} onChange={e => setFormE(p => ({ ...p, observaciones: e.target.value }))} /></Grp>
                        </div>
                      </div>

                      <div className="card">
                        <div className="card-title">Calidad del Producto</div>
                        <div className="product-grid two-col">
                          <Grp label="Presentación"><input list="presentaciones-list" placeholder="Seleccione o escriba..." value={formE.presentacion} onChange={e => setFormE(p => ({ ...p, presentacion: e.target.value }))} /></Grp>
                          <Grp label="Cantidad salida"><input type="text" placeholder="Ej: 690 Bulto" value={formE.cantidad_salida} onChange={e => setFormE(p => ({ ...p, cantidad_salida: e.target.value }))} /></Grp>
                          <Grp label="Fecha vencimiento"><input type="text" placeholder="DD/MM/AAAA" value={formE.fecha_vencimiento} onChange={e => setFormE(p => ({ ...p, fecha_vencimiento: e.target.value }))} /></Grp>
                          <Grp label="Humedad (%)"><input type="number" step="0.01" value={formE.humedad_salida} onChange={e => setFormE(p => ({ ...p, humedad_salida: e.target.value }))} /></Grp>
                          <Grp label="Grano Partido (%)"><input type="number" step="0.01" value={formE.grano_partido_salida} onChange={e => setFormE(p => ({ ...p, grano_partido_salida: e.target.value }))} /></Grp>
                          <Grp label="Grano Yesado (%)"><input type="number" step="0.01" value={formE.grano_yesado_salida} onChange={e => setFormE(p => ({ ...p, grano_yesado_salida: e.target.value }))} /></Grp>
                          <Grp label="G. Dañado Hongo (%)"><input type="number" step="0.01" value={formE.grano_dano_hongo_salida} onChange={e => setFormE(p => ({ ...p, grano_dano_hongo_salida: e.target.value }))} /></Grp>
                          <Grp label="G. Dañado Calor (%)"><input type="number" step="0.01" value={formE.grano_dano_calor_salida} onChange={e => setFormE(p => ({ ...p, grano_dano_calor_salida: e.target.value }))} /></Grp>
                          <Grp label="Semillas/Obj. (%)"><input type="number" step="0.01" value={formE.semillas_obj_salida} onChange={e => setFormE(p => ({ ...p, semillas_obj_salida: e.target.value }))} /></Grp>
                          <Grp label="Impureza (%)"><input type="number" step="0.01" value={formE.impureza_salida} onChange={e => setFormE(p => ({ ...p, impureza_salida: e.target.value }))} /></Grp>
                        </div>
                        <div className="product-grid two-col" style={{ marginTop: 12 }}>
                          <Grp label="Olor">
                            <select value={formE.olor_resultado} onChange={e => setFormE(p => ({ ...p, olor_resultado: e.target.value }))}>
                              <option value="CUMPLE">CUMPLE</option><option value="NO CUMPLE">NO CUMPLE</option>
                            </select>
                          </Grp>
                          <Grp label="Sabor">
                            <select value={formE.sabor_resultado} onChange={e => setFormE(p => ({ ...p, sabor_resultado: e.target.value }))}>
                              <option value="CUMPLE">CUMPLE</option><option value="NO CUMPLE">NO CUMPLE</option>
                            </select>
                          </Grp>
                          <Grp label="Color">
                            <select value={formE.color_resultado} onChange={e => setFormE(p => ({ ...p, color_resultado: e.target.value }))}>
                              <option value="CUMPLE">CUMPLE</option><option value="NO CUMPLE">NO CUMPLE</option>
                            </select>
                          </Grp>
                          <Grp label="Nivel de Infestación">
                            <select value={formE.nivel_infestacion_resultado} onChange={e => setFormE(p => ({ ...p, nivel_infestacion_resultado: e.target.value }))}>
                              <option value="CUMPLE">CUMPLE</option><option value="NO CUMPLE">NO CUMPLE</option>
                            </select>
                          </Grp>
                          <Grp label="Materias Extrañas">
                            <select value={formE.materias_extranas_resultado} onChange={e => setFormE(p => ({ ...p, materias_extranas_resultado: e.target.value }))}>
                              <option value="CUMPLE">CUMPLE</option><option value="NO CUMPLE">NO CUMPLE</option>
                            </select>
                          </Grp>
                        </div>
                      </div>

                      {/* Motivo de modificación */}
                      <div className="card" style={{ border: "1.5px solid #fbbf24", background: "#fffbeb" }}>
                        <div className="card-title" style={{ color: "#92400e" }}>⚠️ Motivo de modificación (obligatorio)</div>
                        <Grp label="Explique el motivo del cambio">
                          <textarea
                            rows={3}
                            placeholder="Ej: Corrección de kilos por error en báscula..."
                            value={motivoEdit}
                            onChange={e => setMotivoEdit(e.target.value)}
                            style={{ padding: "9px 12px", borderRadius: 6, border: "1px solid #d1d5db", fontSize: 14, resize: "vertical", width: "100%" }}
                          />
                        </Grp>
                      </div>
                    </div>

                    {/* Columna derecha: subproductos */}
                    <div className="card" style={{ alignSelf: "start" }}>
                      <div className="card-title">Subproductos del Procesamiento</div>
                      <SubproductosTable subproductos={subproductosE} onChange={setSubproductosE} kilosProcesados={formE.kilos_procesados} />
                    </div>
                  </div>

                  <div className="actions">
                    <button className="btn outline" disabled={editCargando} onClick={() => { setEditLoteData(null); setEditBusq(""); setMotivoEdit(""); }}>
                      Cancelar
                    </button>
                    <button className="btn" style={{ background: "#b45309", color: "white" }} disabled={editCargando || !motivoEdit.trim()} onClick={handleActualizar}
                      title={!motivoEdit.trim() ? "Ingrese el motivo de modificación" : ""}>
                      {editCargando ? "Guardando..." : "✏️ Guardar cambios"}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}


        </div>
      </div>

      <style>{`
        * { box-sizing: border-box; font-family: Arial, sans-serif; }
        .app { width: 100%; }
        .wrapper { max-width: 1200px; margin: 0 auto; display: flex; flex-direction: column; gap: 20px; }

        /* HEADER */
        .page-header { padding-bottom: 4px; border-bottom: 2px solid #e5e7eb; }
        .page-label { font-size: 11px; font-weight: 700; letter-spacing: 2px; color: #2e7d32; text-transform: uppercase; margin: 0 0 6px; }
        .title { font-size: 26px; font-weight: 700; margin: 0 0 4px; color: #111827; }
        .title span { color: #2e7d32; }
        .subtitle-text { color: #6b7280; font-size: 13px; margin: 0; }

        /* MENSAJE */
        .msg { display: flex; align-items: center; gap: 10px; padding: 12px 18px; border-radius: 8px; font-size: 14px; font-weight: 500; }
        .msg.ok    { background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; }
        .msg.error { background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }
        .msg-icon { width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; flex-shrink: 0; }
        .msg.ok    .msg-icon { background: #166534; color: white; }
        .msg.error .msg-icon { background: #991b1b; color: white; }

        /* FORM SECTION */
        .form-section { background: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 28px; box-shadow: 0 1px 4px rgba(0,0,0,.06); display: flex; flex-direction: column; gap: 16px; }
        .form-section-header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 1px solid #f3f4f6; }
        .form-estado { display: flex; align-items: center; gap: 8px; font-size: 13px; }
        .form-estado.nuevo { color: #2e7d32; }
        .estado-dot { width: 8px; height: 8px; border-radius: 50%; background: #2e7d32; flex-shrink: 0; }

        /* CARD */
        .card { background: #fafafa; border: 1px solid #e5e7eb; border-radius: 10px; padding: 20px 24px; }
        .card-title { font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: #2e7d32; margin-bottom: 14px; padding-bottom: 10px; border-bottom: 1px solid #e5e7eb; display: flex; align-items: center; gap: 10px; }

        /* BADGES */
        .badge-pesado { display: inline-block; background: #f59e0b; color: white; padding: 2px 10px; border-radius: 20px; font-size: 10px; font-weight: 700; }
        .badge-condicionado { display: inline-block; background: #fef9c3; color: #854d0e; border: 1px solid #fde047; padding: 2px 10px; border-radius: 20px; font-size: 10px; font-weight: 700; margin-left: 6px; }
        .alerta-condicionado { background: #fffbeb; border: 1.5px solid #fcd34d; color: #92400e; padding: 10px 14px; border-radius: 8px; font-size: .84rem; font-weight: 600; margin: 8px 0 4px; }

        /* INFO GRID */
        .info-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 10px; }
        .field-item { display: flex; flex-direction: column; gap: 2px; }
        .field-label { font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; }
        .field-value { font-size: 13px; color: #111827; padding: 5px 0; }
        .field-value.highlight { color: #166534; font-weight: 700; font-size: 15px; }

        /* PRODUCT GRID / GROUP */
        .product-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; }
        .group { display: flex; flex-direction: column; }
        .group label { font-size: 12px; font-weight: 600; color: #374151; margin-bottom: 5px; }
        .group input, .group select { padding: 9px 12px; border-radius: 6px; border: 1px solid #d1d5db; font-size: 14px; background: white; color: #111827; }
        .group input:focus, .group select:focus { outline: none; border-color: #2e7d32; box-shadow: 0 0 0 3px rgba(46,125,50,.12); }

        /* PLACA COMBO */
        .placa-combo { display: flex; align-items: center; border: 1px solid #d1d5db; border-radius: 6px; overflow: hidden; background: white; }
        .lote-input { flex: 1; padding: 9px 12px; border: none; outline: none; font-size: 14px; color: #374151; }
        .placa-toggle { padding: 0 14px; background: #2e7d32; color: white; border: none; font-size: 12px; min-height: 38px; cursor: pointer; flex-shrink: 0; }
        .placa-toggle:hover { background: #1b5e20; }
        .placa-dropdown { position: absolute; top: 100%; left: 0; right: 0; background: white; border: 1px solid #d1d5db; border-radius: 0 0 8px 8px; z-index: 200; box-shadow: 0 6px 18px rgba(0,0,0,.15); }
        .placa-lista { list-style: none; margin: 0; padding: 0; max-height: 240px; overflow-y: auto; }
        .placa-lista li { padding: 9px 14px; cursor: pointer; display: flex; flex-direction: column; gap: 2px; border-bottom: 1px solid #f3f4f6; }
        .placa-lista li:last-child { border-bottom: none; }
        .placa-lista li:hover { background: #f0fdf4; }
        .placa-empty { color: #9ca3af; font-size: 13px; padding: 12px 14px; }
        .placa-id   { font-weight: 700; font-size: 13px; color: #166534; }
        .placa-info { font-size: 12px; color: #6b7280; }

        /* ACTIONS */
        .actions { display: flex; justify-content: flex-end; gap: 10px; flex-wrap: wrap; }
        .btn { padding: 10px 24px; border: none; border-radius: 7px; cursor: pointer; font-size: 14px; font-weight: 600; transition: background 0.15s; }
        .btn:disabled { opacity: 0.55; cursor: not-allowed; }
        .btn.primary   { background: #2e7d32; color: white; }
        .btn.primary:hover:not(:disabled) { background: #1b5e20; }
        .btn.outline   { background: white; color: #374151; border: 1px solid #d1d5db; }
        .btn.outline:hover:not(:disabled) { background: #f9fafb; }
        .btn.print-btn { background: #1e40af; color: white; }
        .btn.print-btn:hover:not(:disabled) { background: #1e3a8a; }

        /* ESTADO TABLA */
        .estado-tabla { color: #9ca3af; font-size: 14px; text-align: center; padding: 32px 0; }


        /* TABLA HISTORIAL */
        .table-wrap { overflow-x: auto; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        th { text-align: left; padding: 10px 12px; background: #f9fafb; color: #374151; font-size: 10px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; border-bottom: 2px solid #e5e7eb; white-space: nowrap; }
        td { padding: 10px 12px; border-bottom: 1px solid #f3f4f6; color: #374151; }
        tbody tr:last-child td { border-bottom: none; }
        tbody tr:hover td { background: #f9fafb; }
        .id-tag   { display: inline-block; background: #f3f4f6; color: #6b7280; border-radius: 4px; padding: 1px 7px; font-size: 12px; font-weight: 600; }
        .lote-tag { display: inline-block; background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; border-radius: 5px; padding: 2px 9px; font-size: 11px; font-weight: 700; }

        /* ── Layout unificado: info lote dos columnas ── */
        .lote-info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
        @media (max-width: 768px) { .lote-info-grid { grid-template-columns: 1fr; } }

        /* ── Layout principal trilla: form izquierda | subproductos derecha ── */
        .trilla-main-grid { display: grid; grid-template-columns: 38fr 62fr; gap: 16px; align-items: start; }
        @media (max-width: 960px) { .trilla-main-grid { grid-template-columns: 1fr; } }

        /* ── Grid 2 columnas para inputs ── */
        .two-col { grid-template-columns: 1fr 1fr !important; }

        /* ── Separador de sección dentro del form ── */
        .section-divider { font-size: 10px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px; margin-top: 16px; }

        /* ── Título de mini-columna en info card ── */
        .section-mini-title { font-size: 10px; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 10px; border-bottom: 1px solid #f3f4f6; padding-bottom: 5px; }
      `}</style>
    </>
  );
}

/* ── Componentes auxiliares ── */
const COMERCIALES    = ["Arroz blanco tipo 1", "Arroz blanco tipo 2", "Cristal"];
const CONSUMO_HUMANO = ["Arroz blanco tipo 1", "Arroz blanco tipo 2", "Cristal", "Arroz amarillo"];

const SubproductosTable = ({ subproductos, onChange, kilosProcesados }) => {
  const totalSalida    = subproductos.reduce((s, sp) => s + (parseFloat(sp.kilos) || 0), 0);
  const totalComercial = subproductos
    .filter(sp => COMERCIALES.includes(sp.subproducto))
    .reduce((s, sp) => s + (parseFloat(sp.kilos) || 0), 0);
  const pesoEntrada    = parseFloat(kilosProcesados) || 0;
  const diferencia     = pesoEntrada - totalSalida;
  const rendimiento    = pesoEntrada > 0 ? (totalComercial / pesoEntrada) * 100 : 0;

  const fmt      = v => v.toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const difColor = Math.abs(diferencia) < 0.01 ? "#166534" : diferencia < 0 ? "#991b1b" : "#92400e";

  const bloqueConsumo = subproductos.filter(sp =>  CONSUMO_HUMANO.includes(sp.subproducto));
  const bloqueOtros   = subproductos.filter(sp => !CONSUMO_HUMANO.includes(sp.subproducto));
  const totalConsumo  = bloqueConsumo.reduce((s, sp) => s + (parseFloat(sp.kilos) || 0), 0);
  const totalOtros    = bloqueOtros.reduce((s, sp) => s + (parseFloat(sp.kilos) || 0), 0);

  const renderFila = (sp) => {
    const idx = subproductos.findIndex(s => s.subproducto === sp.subproducto);
    return (
      <tr key={sp.subproducto}>
        <td style={{ padding: "6px 12px", fontSize: 13, borderBottom: "1px solid #e5e7eb" }}>
          {sp.subproducto}
        </td>
        <td style={{ padding: "4px 10px", borderBottom: "1px solid #e5e7eb", width: 160 }}>
          <input
            type="number"
            step="any"
            min="0"
            placeholder="0"
            style={{ width: "100%", textAlign: "right", padding: "5px 8px", borderRadius: 5, border: "1px solid #d1d5db", fontSize: 13 }}
            value={sp.kilos}
            onChange={e => {
              const nv = [...subproductos];
              nv[idx] = { ...nv[idx], kilos: e.target.value };
              onChange(nv);
            }}
          />
        </td>
      </tr>
    );
  };

  const thS  = (bg) => ({ textAlign: "left",   padding: "7px 12px", background: bg, fontSize: 11, fontWeight: 700, letterSpacing: "0.5px", textTransform: "uppercase", color: "white", borderBottom: "none" });
  const thKg = (bg) => ({ textAlign: "center", padding: "7px 12px", background: bg, fontSize: 11, fontWeight: 700, letterSpacing: "0.5px", textTransform: "uppercase", color: "white", width: 160, borderBottom: "none" });
  const subTd = (color) => ({ padding: "7px 12px", fontWeight: 700, fontSize: 12, borderTop: "2px solid #e5e7eb", background: "#f9fafb", color });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* ── Bloque 1: Consumo humano ── */}
      <div style={{ border: "1px solid #bbf7d0", borderRadius: 8, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>
            <th style={thS("#16a34a")}>🌾 Consumo humano</th>
            <th style={thKg("#16a34a")}>Kilos (kg)</th>
          </tr></thead>
          <tbody>{bloqueConsumo.map(sp => renderFila(sp))}</tbody>
          <tfoot><tr>
            <td style={subTd("#166534")}>Subtotal consumo humano</td>
            <td style={{ ...subTd("#166534"), textAlign: "right" }}>{fmt(totalConsumo)} kg</td>
          </tr></tfoot>
        </table>
      </div>

      {/* ── Bloque 2: Subproductos ── */}
      <div style={{ border: "1px solid #fde68a", borderRadius: 8, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>
            <th style={thS("#b45309")}>📦 Subproductos</th>
            <th style={thKg("#b45309")}>Kilos (kg)</th>
          </tr></thead>
          <tbody>{bloqueOtros.map(sp => renderFila(sp))}</tbody>
          <tfoot><tr>
            <td style={subTd("#92400e")}>Subtotal subproductos</td>
            <td style={{ ...subTd("#92400e"), textAlign: "right" }}>{fmt(totalOtros)} kg</td>
          </tr></tfoot>
        </table>
      </div>

      {/* ── Resumen ── */}
      <div style={{ border: "1px solid #e2e8f0", borderRadius: 8, overflow: "hidden" }}>
        <div style={{ background: "#1e293b", color: "white", padding: "8px 16px", fontSize: 11, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase" }}>
          Resumen
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            <ResumenFila label="Peso entrada"    value={pesoEntrada > 0 ? `${fmt(pesoEntrada)} kg` : "—"} color="#1e40af" bg="#eff6ff" />
            <ResumenFila label="Total salida"    value={`${fmt(totalSalida)} kg`}                          color="#0f172a" bg="#f8fafc" />
            <ResumenFila label="Total comercial" value={`${fmt(totalComercial)} kg`}                       color="#166534" bg="#f0fdf4"
              sub="Tipo 1 + Tipo 2 + Cristal" />
            <ResumenFila
              label="Diferencia"
              value={pesoEntrada > 0 ? `${diferencia > 0.01 ? "+" : ""}${fmt(diferencia)} kg` : "—"}
              color={difColor}
              bg={Math.abs(diferencia) < 0.01 ? "#f0fdf4" : diferencia < 0 ? "#fef2f2" : "#fffbeb"}
              sub={
                pesoEntrada <= 0 ? "Ingrese peso de entrada" :
                Math.abs(diferencia) < 0.01 ? "✓ Balance cuadrado" :
                diferencia > 0 ? `Faltan ${fmt(diferencia)} kg por asignar` :
                `⚠️ Excede entrada en ${fmt(Math.abs(diferencia))} kg`
              }
            />
            <ResumenFila
              label="Rendimiento"
              value={pesoEntrada > 0 ? `${rendimiento.toFixed(2)}%` : "—"}
              color="#1e40af" bg="#eff6ff"
              sub="Total comercial / Peso entrada × 100"
              large
            />
          </tbody>
        </table>
      </div>
    </div>
  );
};

const ResumenFila = ({ label, value, color, bg, sub, large }) => (
  <tr style={{ background: bg, borderBottom: "1px solid #e5e7eb" }}>
    <td style={{ padding: "10px 16px", fontSize: 12, fontWeight: 600, color: "#374151", width: "55%" }}>
      {label}
      {sub && <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 400, marginTop: 2 }}>{sub}</div>}
    </td>
    <td style={{ padding: "10px 16px", fontSize: large ? 18 : 14, fontWeight: 800, color, textAlign: "right" }}>
      {value}
    </td>
  </tr>
);

const CalcCell = ({ label, sub, value, color, bg, borderColor, icon, large }) => (
  <div style={{
    padding: "12px 16px",
    background: bg,
    borderRight: `1px solid ${borderColor}`,
    borderBottom: `1px solid ${borderColor}`,
  }}>
    <div style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>{label}</div>
    <div style={{ fontSize: large ? 20 : 16, fontWeight: 800, color, lineHeight: 1.1 }}>
      {icon && <span style={{ marginRight: 4, fontSize: 14 }}>{icon}</span>}{value}
    </div>
    <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 3 }}>{sub}</div>
  </div>
);

const Field = ({ label, value, highlight }) => (
  <div className="field-item">
    <span className="field-label">{label}</span>
    <span className={`field-value${highlight ? " highlight" : ""}`}>{value || "—"}</span>
  </div>
);

const Grp = ({ label, children }) => (
  <div className="group">
    <label>{label}</label>
    {children}
  </div>
);

const CRow = ({ l, v }) => (
  <div className="cert-row">
    <span className="cert-lbl">{l}:</span>
    <span className="cert-val">{v || "—"}</span>
  </div>
);

const CalRow = ({ label, lab, base }) => {
  const l = parseFloat(lab)  || 0;
  const b = parseFloat(base) || 0;
  const excede = l > b && (l > 0 || b > 0);
  return (
    <tr>
      <td>{label}</td>
      <td className="tc">{lab || "—"}</td>
      <td className="tc">{base || "—"}</td>
      <td className="tc">
        {excede
          ? <span className="tag-warn">↑ Excede base</span>
          : <span className="tag-ok">✓ OK</span>
        }
      </td>
    </tr>
  );
};
