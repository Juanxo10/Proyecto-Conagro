import React, { useState, useEffect, useRef, useCallback } from "react";

export default function ActualizaPesaje() {

  const API = "/api/pesajes";

  const FORM_VACIO = {
    fecha: "", hora: "",
    placas: "", conductor: "", nombre: "",
    propietario: "", empresa: "",
    codigo: "", subcodigo: "",
    descripcion: "", nit_propietario: "", nombre_producto: "",
    transacc: "", bodega: "", cantidad: "",
    peso_bruto: "", peso_tara: "0", destare_empaque: "0",
    presentacion: "", numero_tiquete: "", division: "", endoso: "",
    tipo_movimiento: "ENTRADA",
    lote_id: "",
    observaciones: "",
    procedencia: "",
    humedad_inicial: "", humedad_final: "",
    impureza_inicial: "", impureza_final: "",
    kilos_verde: "", kilos_seco: "",
    vlr_kilo: "", kl_compra: "",
  };

  const [form, setForm]                   = useState(FORM_VACIO);
  const [modoEditar, setModo]             = useState(null);
  const [vehiculos, setVehiculos]         = useState([]);
  const [pesajes, setPesajes]             = useState([]);
  const [busqueda, setBusqueda]           = useState("");
  const [placaFiltro, setPlacaFiltro]     = useState("");
  const [placaOpen, setPlacaOpen]         = useState(false);
  const [msg, setMsg]                     = useState({ tipo: "", texto: "" });
  const [cargando, setCargando]           = useState(false);
  const [loadingLista, setLoadingLista]   = useState(true);

  // Lote selector
  const [loteSearch, setLoteSearch]         = useState("");
  const [lotes, setLotes]                   = useState([]);
  const [loteOpen, setLoteOpen]             = useState(false);
  const [loteCargando, setLoteCargando]     = useState(false);
  const [loteCondicionado, setLoteCondicionado] = useState(false);

  const placaRef = useRef(null);
  const loteRef  = useRef(null);

  // ── Derivados ────────────────────────────────────────────
  const esPaddyVerde = form.codigo === "1AP";
  const esPaddySeco  = form.codigo === "1A1";
  const esPaddy      = esPaddyVerde || esPaddySeco;
  const pesoBruto    = parseFloat(form.peso_bruto)      || 0;
  const tara         = parseFloat(form.peso_tara)        || 0;
  const empaque      = parseFloat(form.destare_empaque)  || 0;
  const neto         = Math.max(0, pesoBruto - tara - empaque);

  // ── Carga inicial ────────────────────────────────────────
  useEffect(() => {
    fetch("/api/vehiculos")
      .then(r => r.json())
      .then(data => setVehiculos(Array.isArray(data) ? data : []))
      .catch(() => setVehiculos([]));
    cargarPesajes();
  }, []);

  const cargarPesajes = async () => {
    setLoadingLista(true);
    try {
      const res  = await fetch(API);
      const data = await res.json();
      setPesajes(Array.isArray(data) ? data : []);
    } catch {
      setPesajes([]);
    } finally {
      setLoadingLista(false);
    }
  };

  // ── Fecha y hora actuales ────────────────────────────────
  useEffect(() => {
    const now  = new Date();
    const dd   = String(now.getDate()).padStart(2, "0");
    const mm   = String(now.getMonth() + 1).padStart(2, "0");
    const yyyy = now.getFullYear();
    const hora = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    setForm(prev => ({ ...prev, fecha: `${dd}/${mm}/${yyyy}`, hora }));
  }, []);

  // ── Cerrar dropdowns al clic fuera ───────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (placaRef.current && !placaRef.current.contains(e.target)) setPlacaOpen(false);
      if (loteRef.current  && !loteRef.current.contains(e.target))  setLoteOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Buscar lotes aprobados (debounce) ────────────────────
  useEffect(() => {
    if (!loteOpen) return;
    setLoteCargando(true);
    const timer = setTimeout(async () => {
      try {
        const q   = loteSearch.trim();
        const url = `/api/previos/aprobados${q ? `?q=${encodeURIComponent(q)}` : ""}`;
        const res  = await fetch(url);
        const data = await res.json();
        setLotes(Array.isArray(data) ? data : []);
      } catch {
        setLotes([]);
      } finally {
        setLoteCargando(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [loteSearch, loteOpen]);

  // ── Helpers ──────────────────────────────────────────────
  const mostrarMsg = (tipo, texto) => {
    setMsg({ tipo, texto });
    setTimeout(() => setMsg({ tipo: "", texto: "" }), 5000);
  };

  const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const resetForm = () => {
    const now  = new Date();
    const dd   = String(now.getDate()).padStart(2, "0");
    const mm   = String(now.getMonth() + 1).padStart(2, "0");
    const yyyy = now.getFullYear();
    const hora = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    setForm({ ...FORM_VACIO, fecha: `${dd}/${mm}/${yyyy}`, hora });
    setModo(null);
    setMsg({ tipo: "", texto: "" });
    setLoteSearch("");
    setLoteCondicionado(false);
  };

  // ── Placa selector ───────────────────────────────────────
  const vehiculosFiltrados = vehiculos.filter(v =>
    v.placa.toLowerCase().includes(placaFiltro.toLowerCase())
  );

  const handlePlacaSelect = (v) => {
    setPlacaFiltro("");
    setPlacaOpen(false);
    setForm(prev => ({
      ...prev,
      placas:      v.placa,
      conductor:   v.conductor_cedula   || "",
      nombre:      v.conductor_nombre   || "",
      propietario: v.propietario_nombre || "",
      empresa:     v.empresa            || "",
    }));
  };

  // ── Lote selector ────────────────────────────────────────
  const handleLoteSelect = useCallback((lote) => {
    setLoteSearch(lote.lote_id);
    setLoteOpen(false);
    setLoteCondicionado(lote.estado === "CONDICIONADO");
    const vehiculo  = vehiculos.find(v => v.placa === lote.placa);
    // Mapear texto del producto del previo al código interno
    const prodTextToCode = { "Paddy Verde": "1AP", "Paddy Seco": "1A1", "Arroz Paddy Verde": "1AP", "Arroz Paddy Seco": "1A1" };
    const codigo = prodTextToCode[lote.producto] || "";
    const nombre = codigo === "1AP" ? "Arroz Paddy Verde" : codigo === "1A1" ? "Arroz Paddy Seco" : "";
    setForm(prev => ({
      ...prev,
      lote_id:         lote.lote_id,
      placas:          lote.placa              || prev.placas,
      propietario:     lote.propietario        || prev.propietario,
      nit_propietario: lote.cedula_nit         || prev.nit_propietario,
      nombre:          lote.nombre_conductor   || vehiculo?.conductor_nombre  || prev.nombre,
      conductor:       lote.cedula_conductor   || vehiculo?.conductor_cedula  || prev.conductor,
      empresa:         vehiculo?.empresa        || prev.empresa,
      codigo:          codigo                   || prev.codigo,
      descripcion:     nombre                   || prev.descripcion,
      nombre_producto: nombre                   || prev.nombre_producto,
      peso_bruto:      lote.peso_bruto != null  ? String(lote.peso_bruto)  : prev.peso_bruto,
      peso_tara:       lote.peso_tara  != null  ? String(lote.peso_tara)   : "0",
      humedad_inicial: lote.humedad_s  != null  ? String(lote.humedad_s)   : prev.humedad_inicial,
      humedad_final:   lote.humedad_l  != null  ? String(lote.humedad_l)   : prev.humedad_final,
      impureza_inicial:lote.impureza   != null  ? String(lote.impureza)    : prev.impureza_inicial,
    }));
  }, [vehiculos]);

  // ── Tipo de Paddy ────────────────────────────────────────
  const handleTipoPaddyChange = (e) => {
    const cod    = e.target.value;
    const nombre = cod === "1AP" ? "Arroz Paddy Verde" : cod === "1A1" ? "Arroz Paddy Seco" : "";
    setForm(prev => ({
      ...prev,
      codigo:          cod,
      subcodigo:       "",
      descripcion:     nombre,
      nombre_producto: nombre,
    }));
  };

  // ── Editar ───────────────────────────────────────────────
  const handleEditar = (p) => {
    setLoteSearch(p.lote_id || "");
    setForm({
      fecha:                p.fecha                || "",
      hora:                 p.hora                 || "",
      placas:               p.placas               || "",
      conductor:            p.conductor            || "",
      nombre:               p.nombre               || "",
      propietario:          p.propietario          || "",
      empresa:              p.empresa              || "",
      codigo:               p.codigo               || "",
      subcodigo:            p.subcodigo            || "",
      descripcion:          p.descripcion          || "",
      nit_propietario:      p.nit_propietario      || "",
      nombre_producto:      p.nombre_producto      || "",
      transacc:             p.transacc             || "",
      bodega:               p.bodega               || "",
      cantidad:             p.cantidad             || "",
      peso_bruto:           p.peso_bruto           || "",
      peso_tara:            p.peso_tara            || "0",
      destare_empaque:      p.destare_empaque      || "0",
      presentacion:         p.presentacion         || "",
      numero_tiquete:       p.numero_tiquete       || "",
      division:             p.division             || "",
      endoso:               p.endoso               || "",
      tipo_movimiento:      p.tipo_movimiento      || "ENTRADA",
      lote_id:              p.lote_id              || "",
      observaciones:        p.observaciones        || "",
      procedencia:          p.procedencia          || "",
      humedad_inicial:      p.humedad_inicial      || "",
      humedad_final:        p.humedad_final        || "",
      impureza_inicial:     p.impureza_inicial     || "",
      impureza_final:       p.impureza_final       || "",
      kilos_verde:          p.compra               || "",
      kilos_seco:           p.pilada               || "",
      vlr_kilo:             p.kilo                 || "",
      kl_compra:            p.compra               || "",
    });
    setModo(p.id);
    setMsg({ tipo: "", texto: "" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ── Guardar / Actualizar ─────────────────────────────────
  const handleSubmit = async () => {
    if (!form.lote_id && !form.placas) {
      mostrarMsg("error", "Debe seleccionar un lote aprobado o ingresar una placa.");
      return;
    }
    if (!form.codigo || !["1AP", "1A1"].includes(form.codigo)) {
      mostrarMsg("error", "Debe seleccionar el Tipo de Paddy.");
      return;
    }
    if (!form.fecha) {
      mostrarMsg("error", "La fecha es obligatoria.");
      return;
    }
    if (!form.hora) {
      mostrarMsg("error", "La hora es obligatoria.");
      return;
    }
    if (!form.nombre) {
      mostrarMsg("error", "El nombre del conductor es obligatorio.");
      return;
    }
    if (!form.propietario) {
      mostrarMsg("error", "El propietario es obligatorio.");
      return;
    }
    const pesoVal = parseFloat(form.peso_bruto);
    if (!form.peso_bruto || isNaN(pesoVal) || pesoVal <= 0) {
      mostrarMsg("error", "El peso bruto es obligatorio y debe ser un valor positivo.");
      return;
    }

    const payload = {
      ...form,
      compra:                 form.kilos_verde || form.kl_compra || null,
      pilada:                 form.kilos_seco  || null,
      kilo:                   form.vlr_kilo    || null,
      velocidad_total_compra: null,
    };

    setCargando(true);
    try {
      const esEdicion = modoEditar !== null;
      const res = await fetch(esEdicion ? `${API}/${modoEditar}` : API, {
        method:  esEdicion ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al guardar");
      mostrarMsg("ok", esEdicion ? "Entrada actualizada correctamente." : "Entrada guardada correctamente.");
      resetForm();
      cargarPesajes();
    } catch (error) {
      mostrarMsg("error", error.message);
    } finally {
      setCargando(false);
    }
  };

  // ── Eliminar ─────────────────────────────────────────────
  const handleEliminar = async (p) => {
    if (!window.confirm(`¿Eliminar la entrada #${p.id} (${p.placas || p.lote_id})?`)) return;
    try {
      const res  = await fetch(`${API}/${p.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      mostrarMsg("ok", data.message);
      if (modoEditar === p.id) resetForm();
      cargarPesajes();
    } catch (error) {
      mostrarMsg("error", error.message);
    }
  };

  // ── Imprimir tiquete ─────────────────────────────────────
  const handleImprimir = (d) => {
    const pb       = parseFloat(d.peso_bruto)     || 0;
    const ta       = parseFloat(d.peso_tara)       || 0;
    const em       = parseFloat(d.destare_empaque) || 0;
    const netoVal  = pb - ta - em;
    const isPV     = d.codigo === "1AP";
    const isPS     = d.codigo === "1A1";
    const fmtN     = n => Number(n || 0).toLocaleString("es-CO");
    const tiqNum   = d.numero_tiquete
      ? String(d.numero_tiquete).padStart(6, "0")
      : d.id ? String(d.id).padStart(6, "0") : "------";

    const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"/>
<title>Tiquete Entrada Nro. ${tiqNum}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:"Courier New",Courier,monospace;font-size:10px;width:640px;
     margin:0 auto;padding:14px 20px;color:#0a0a0a;background:#fff;}
.header-wrap{text-align:center;margin-bottom:6px;}
.nit{font-size:11px;letter-spacing:3px;margin:2px 0;}
.doc-title{font-size:12px;font-weight:700;letter-spacing:2px;margin-top:3px;text-transform:uppercase;}
.doc-num{font-size:11px;}
.sep{border:none;border-top:1px dashed #333;margin:6px 0;}
table.main{width:100%;border-collapse:collapse;margin-bottom:0;}
table.main td{border:1px solid #555;padding:3px 6px;font-size:9.5px;vertical-align:top;}
.lbl{font-weight:700;white-space:nowrap;}
.right{text-align:right;}
.bold{font-weight:700;}
.sect{background:#166534;color:#fff;font-weight:700;font-size:9.5px;
      text-align:center;letter-spacing:2px;padding:4px 6px;}
.obs{border:1px solid #555;padding:4px 6px;font-size:9.5px;min-height:32px;
     margin-top:6px;white-space:pre-wrap;}
.footer-row{display:flex;justify-content:space-between;margin-top:30px;gap:12px;}
.sig-box{text-align:center;flex:1;}
.sig-line{border-top:1px solid #333;width:140px;margin:0 auto 4px;}
.sig-name{font-size:9.5px;font-weight:700;}
.sig-role{font-size:9px;color:#444;}
.logo-name{color:#2f6e18;font-size:15px;font-weight:900;font-style:italic;}
.logo-sub{color:#2f6e18;font-size:7px;letter-spacing:0.4px;}
@media print{body{padding:6px;width:100%;}@page{margin:8mm;size:A5;}}
</style></head>
<body>

<div class="header-wrap">
  <span style="display:inline-block;vertical-align:middle;margin-right:12px;">
    <svg width="46" height="42" viewBox="0 0 60 54" xmlns="http://www.w3.org/2000/svg" style="display:inline-block;vertical-align:middle;">
      <rect x="1" y="1" width="58" height="52" fill="#e8f2db" stroke="#3a7020" stroke-width="1.5"/>
      <line x1="30" y1="48" x2="30" y2="9" stroke="#3a7020" stroke-width="2"/>
      <ellipse cx="30" cy="10" rx="4" ry="6" fill="#4a8c28"/>
      <path d="M30 20 C22 15 15 8 18 4 C23 2 29 14 30 20Z" fill="#4a8c28"/>
      <path d="M30 20 C38 15 45 8 42 4 C37 2 31 14 30 20Z" fill="#4a8c28"/>
      <path d="M30 30 C20 23 12 13 15 7 C20 4 28 22 30 30Z" fill="#5aaa30"/>
      <path d="M30 30 C40 23 48 13 45 7 C40 4 32 22 30 30Z" fill="#5aaa30"/>
      <path d="M30 42 C18 33 10 20 13 12 C18 9 27 30 30 42Z" fill="#3a7020"/>
      <path d="M30 42 C42 33 50 20 47 12 C42 9 33 30 30 42Z" fill="#3a7020"/>
    </svg>
    <span class="logo-name">conagro</span><br/>
    <span class="logo-sub">COMERCIALIZADORA AGRÍCOLA NACI</span>
  </span>
  <div class="nit">900,664,456</div>
  <div class="doc-title">TIQUETE DE ENTRADA</div>
  <div class="doc-num">Nro. ${tiqNum}</div>
</div>

<hr class="sep"/>

<table class="main">
  <tr>
    <td colspan="3" class="lbl">Propietario:&nbsp;<span class="bold">${d.propietario || ""}</span></td>
    <td class="lbl">Fecha:&nbsp;<span class="bold">${d.fecha || ""}</span></td>
  </tr>
  <tr>
    <td colspan="2">NIT / Cédula:&nbsp;<span class="bold">${d.nit_propietario || ""}</span></td>
    <td colspan="2">Entra:&nbsp;<span class="bold">${d.hora || ""}</span></td>
  </tr>
  <tr>
    <td colspan="2">Bodega:&nbsp;<span class="bold">${d.bodega || ""}</span></td>
    <td colspan="2">LOTE:&nbsp;<span class="bold">${d.lote_id || "—"}</span></td>
  </tr>
  <tr>
    <td colspan="4" class="lbl">Transacción:&nbsp;${d.transacc || "100 ENTRADAS"}</td>
  </tr>
</table>

<hr class="sep"/>

<table class="main">
  <tr><td colspan="4" class="sect">DESCRIPCIÓN DEL PRODUCTO</td></tr>
  <tr>
    <td class="lbl">Descripción:</td>
    <td colspan="2">${(d.descripcion || "").toUpperCase()}</td>
    <td class="lbl right">KILOS:&nbsp;<span class="bold">${fmtN(netoVal)}</span></td>
  </tr>
  <tr>
    <td class="lbl">Código:</td>
    <td>${d.codigo || ""}${d.subcodigo ? " / " + d.subcodigo : ""}</td>
    <td class="lbl">Presentación:</td>
    <td>${d.presentacion || "GRANEL"}&nbsp;&nbsp;Cant:&nbsp;${d.cantidad || "—"}</td>
  </tr>
</table>

<hr class="sep"/>

<table class="main">
  <tr><td colspan="4" class="sect">PESOS</td></tr>
  <tr>
    <td class="lbl">Peso Bruto:</td>
    <td class="right bold">${fmtN(pb)}&nbsp;kg</td>
    <td class="lbl">Tara Vehículo:</td>
    <td class="right bold">${fmtN(ta)}&nbsp;kg</td>
  </tr>
  <tr>
    <td class="lbl">Destare Empaque:</td>
    <td class="right bold">${fmtN(em)}&nbsp;kg</td>
    <td class="lbl">Tiquete Báscula:</td>
    <td class="right bold">${tiqNum}</td>
  </tr>
  <tr>
    <td class="lbl" style="background:#14532d;color:#fff;">NETO ENTRADA:</td>
    <td class="right bold" style="background:#14532d;color:#fff;font-size:12px;">${fmtN(netoVal)}&nbsp;kg</td>
    <td></td>
    <td></td>
  </tr>
</table>

${(isPV || isPS) ? `
<hr class="sep"/>
<table class="main">
  <tr><td colspan="4" class="sect">CALIDAD DE LABORATORIO</td></tr>
  <tr>
    <td></td>
    <td class="lbl right">Labor.</td>
    <td class="lbl right">Base Comp.</td>
    <td></td>
  </tr>
  <tr>
    <td class="lbl">Humedad:</td>
    <td class="right">${d.humedad_inicial || "—"}</td>
    <td class="right">${d.humedad_final || "—"}</td>
    <td></td>
  </tr>
  <tr>
    <td class="lbl">Impureza:</td>
    <td class="right">${d.impureza_inicial || "—"}</td>
    <td class="right">${d.impureza_final || "—"}</td>
    <td></td>
  </tr>
  ${isPV ? `<tr>
    <td class="lbl">Kilos Verde:</td>
    <td class="right bold" colspan="2">${fmtN(d.kilos_verde || d.compra || 0)}</td>
    <td></td>
  </tr>` : ""}
  <tr>
    <td class="lbl">Kilos Seco:</td>
    <td class="right bold" colspan="2">${fmtN(d.kilos_seco || d.pilada || 0)}</td>
    <td></td>
  </tr>
</table>` : ""}

<hr class="sep"/>

<table class="main">
  <tr><td colspan="4" class="sect">TRANSPORTE DE ENTRADA</td></tr>
  <tr>
    <td class="lbl">Placa:</td>
    <td class="bold">${d.placas || ""}</td>
    <td class="lbl">Conductor:</td>
    <td class="bold">${d.nombre || ""}</td>
  </tr>
  <tr>
    <td class="lbl">Cédula:</td>
    <td>${d.conductor || ""}</td>
    <td class="lbl">Empresa:</td>
    <td>${d.empresa || ""}</td>
  </tr>
</table>

${(d.vlr_kilo || d.kilo || d.kl_compra || d.compra) ? `
<hr class="sep"/>
<table class="main">
  <tr><td colspan="4" class="sect">VALORES</td></tr>
  <tr>
    <td class="lbl">Vlr. por Kilo:</td>
    <td class="right bold">${fmtN(d.vlr_kilo || d.kilo || 0)}</td>
    <td class="lbl">Kl. Compra:</td>
    <td class="right bold">${fmtN(d.kl_compra || d.compra || 0)}</td>
  </tr>
</table>` : ""}

<div class="obs"><strong>Observaciones:</strong><br/>${d.observaciones || d.procedencia || ""}</div>

<div style="font-size:9px;text-align:right;margin-top:4px;">
  Nro Tiq. báscula:&nbsp;<strong>${tiqNum}</strong>&nbsp;&nbsp;|&nbsp;&nbsp;
  Lote:&nbsp;<strong>${d.lote_id || "—"}</strong>
</div>

<div class="footer-row">
  <div class="sig-box">
    <div class="sig-line"></div>
    <p class="sig-name">Administrador</p>
    <p class="sig-role">Conagro</p>
  </div>
  <div class="sig-box">
    <div class="sig-line"></div>
    <p class="sig-name">${d.propietario || "Propietario"}</p>
    <p class="sig-role">Entregado</p>
  </div>
  <div class="sig-box">
    <div class="sig-line"></div>
    <p class="sig-name">${d.nombre || "Conductor"}</p>
    <p class="sig-role">Transportador</p>
  </div>
</div>

</body></html>`;

    const win = window.open("", "_blank", "width=860,height=720");
    if (!win) {
      mostrarMsg("error", "El navegador bloqueó la ventana emergente. Permita ventanas emergentes para imprimir.");
      return;
    }
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  };

  // ── Lista filtrada ───────────────────────────────────────
  const lista = pesajes.filter(p =>
    [p.placas, p.descripcion, p.empresa, p.nombre, p.codigo, p.lote_id]
      .some(c => (c || "").toLowerCase().includes(busqueda.toLowerCase()))
  );

  return (
    <>
      <div className="app">
        <div className="wrapper">

          {/* HEADER */}
          <div className="page-header">
            <div>
              <p className="page-eyebrow">OPERACIONES</p>
              <h1 className="title">Actualiza <span>Entrada</span></h1>
              <p className="subtitle-text">Registro y administración de entradas de báscula.</p>
            </div>
          </div>

          {/* MENSAJE */}
          {msg.texto && (
            <div className={`msg ${msg.tipo}`}>
              <span className="msg-icon">{msg.tipo === "ok" ? "✓" : "✕"}</span>
              {msg.texto}
            </div>
          )}

          {/* FORMULARIO */}
          <div className="form-section">
            <div className="form-section-header">
              <div className={`form-estado ${modoEditar ? "editando" : "nuevo"}`}>
                <div className="estado-dot" />
                <span>{modoEditar ? `Editando entrada #${modoEditar} — ${form.placas || form.lote_id}` : "Nuevo registro"}</span>
              </div>
              {modoEditar !== null && (
                <button className="btn-limpiar" onClick={resetForm} disabled={cargando}>
                  Cancelar edición
                </button>
              )}
            </div>

            <div className="form">

              {/* ── LOTE ── */}
              <Card title="Selección de Lote (Aprobado / Condicionado)">
                <div className="lote-wrap" ref={loteRef}>
                  <div className="group" style={{ position: "relative" }}>
                    <label>Buscar lote por ID o placa</label>
                    <div className="placa-combo">
                      <input
                        className="lote-input"
                        placeholder="Ej: LOT-2026-0001 o placa..."
                        value={loteSearch}
                        onChange={e => { setLoteSearch(e.target.value); setLoteOpen(true); }}
                        onFocus={() => setLoteOpen(true)}
                      />
                      <button type="button" className="placa-toggle" onClick={() => setLoteOpen(o => !o)}>&#9660;</button>
                    </div>
                    {loteOpen && (
                      <div className="placa-dropdown">
                        {loteCargando ? (
                          <div className="placa-empty">Buscando lotes aprobados y condicionados...</div>
                        ) : lotes.length === 0 ? (
                          <div className="placa-empty">Sin lotes aprobados o condicionados encontrados</div>
                        ) : (
                          <ul className="placa-lista">
                            {lotes.map(l => (
                              <li key={l.id} onMouseDown={() => handleLoteSelect(l)}>
                                <span className="placa-id">{l.lote_id}</span>
                                {l.estado === "CONDICIONADO" && <span className="lote-cond-badge">⚠ CONDICIONADO</span>}
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
                  {form.lote_id && (
                    <div className="lote-badge-row">
                      <span className="lote-chip">✓ Lote: {form.lote_id}</span>
                      <button
                        className="btn-limpiar"
                        onClick={() => { setForm(prev => ({ ...prev, lote_id: "" })); setLoteSearch(""); setLoteCondicionado(false); }}
                      >
                        ✕ Quitar lote
                      </button>
                    </div>
                  )}
                  {loteCondicionado && (
                    <div className="alerta-condicionado">
                      ⚠ Este lote está <strong>CONDICIONADO</strong> — calidad regular, requiere seguimiento. Verifique los parámetros de calidad antes de continuar.
                    </div>
                  )}
                </div>
              </Card>

              {/* ── INFORMACIÓN GENERAL ── */}
              <Card title="Información general">
                <Row>
                  <Input label="Fecha" name="fecha" value={form.fecha} onChange={handleChange} />
                  <Input label="Hora entrada" name="hora" value={form.hora} onChange={handleChange} />
                  <div className="group">
                    <label>Tipo de movimiento</label>
                    <select name="tipo_movimiento" value={form.tipo_movimiento} onChange={handleChange}>
                      <option value="ENTRADA">ENTRADA</option>
                      <option value="SALIDA">SALIDA</option>
                    </select>
                  </div>
                </Row>
              </Card>

              {/* ── DATOS DEL VEHÍCULO ── */}
              <Card title="Datos del vehículo">
                <div className="vehicle-grid">
                  <div className="group" ref={placaRef} style={{ position: "relative" }}>
                    <label>Placas</label>
                    <div className="placa-combo">
                      <span className="placa-valor">{form.placas || "Seleccione placa..."}</span>
                      <button type="button" className="placa-toggle" onClick={() => setPlacaOpen(o => !o)}>&#9660;</button>
                    </div>
                    {placaOpen && (
                      <div className="placa-dropdown">
                        <input
                          className="placa-search" autoFocus
                          placeholder="Buscar placa..."
                          value={placaFiltro}
                          onChange={e => setPlacaFiltro(e.target.value)}
                        />
                        <ul className="placa-lista">
                          {vehiculosFiltrados.length === 0
                            ? <li className="placa-empty">Sin resultados</li>
                            : vehiculosFiltrados.map(v => (
                              <li key={v.placa} onMouseDown={() => handlePlacaSelect(v)}>
                                <span className="placa-id">{v.placa}</span>
                                <span className="placa-info">
                                  {[v.conductor_nombre, v.propietario_nombre, v.empresa].filter(Boolean).join(" · ")}
                                </span>
                              </li>
                            ))
                          }
                        </ul>
                      </div>
                    )}
                  </div>
                  <Input label="Cédula Conductor" name="conductor"   value={form.conductor}   onChange={handleChange} />
                  <Input label="Nombre Conductor" name="nombre"      value={form.nombre}      onChange={handleChange} />
                  <Input label="Propietario"      name="propietario" value={form.propietario} onChange={handleChange} />
                  <Input label="Empresa"          name="empresa"     value={form.empresa}     onChange={handleChange} />
                </div>
              </Card>

              {/* ── PRODUCTO ── */}
              <Card title="Producto">
                <div className="product-grid">
                  <div className="group">
                    <label>Tipo de Paddy *</label>
                    <select
                      name="codigo"
                      value={form.codigo}
                      onChange={handleTipoPaddyChange}
                      required
                      style={{ padding: "9px 12px", borderRadius: 6, border: form.codigo ? "1px solid #d1d5db" : "1px solid #f87171", fontSize: 14, background: "white", color: form.codigo ? "#111827" : "#6b7280" }}
                    >
                      <option value="">Seleccione tipo de Paddy…</option>
                      <option value="1AP">Paddy Verde</option>
                      <option value="1A1">Paddy Seco</option>
                    </select>
                  </div>
                  <Input label="NIT Propietario" name="nit_propietario" value={form.nit_propietario} onChange={handleChange} />
                  <Input label="Transacción"     name="transacc"        value={form.transacc}        onChange={handleChange} />
                  <Input label="Bodega"          name="bodega"          value={form.bodega}          onChange={handleChange} />
                  <div className="group">
                    <label>Presentación</label>
                    <input
                      list="presentaciones-list"
                      name="presentacion"
                      value={form.presentacion}
                      onChange={handleChange}
                      placeholder="Seleccione o escriba…"
                      style={{ padding: "9px 12px", borderRadius: 6, border: "1px solid #d1d5db", fontSize: 14, background: "white", color: "#111827" }}
                    />
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
                  </div>
                  <Input label="Procedencia"     name="procedencia"     value={form.procedencia}     onChange={handleChange} />
                </div>
              </Card>

              {/* ── PESOS ── */}
              <Card title="Pesos">
                <div className="pesos-grid">
                  <Input label="Peso bruto (kg)"    name="peso_bruto"       value={form.peso_bruto}      onChange={handleChange} type="number" />
                  <Input label="Tara / Destare (kg)" name="peso_tara"       value={form.peso_tara}       onChange={handleChange} type="number" />
                  <Input label="Empaque (kg)"        name="destare_empaque" value={form.destare_empaque} onChange={handleChange} type="number" />
                  <div className="group">
                    <label>NETO (kg) — calculado</label>
                    <div className="neto-display">{neto.toLocaleString("es-CO")}</div>
                  </div>
                </div>
              </Card>

              {/* ── CALIDAD (solo Paddy) ── */}
              {esPaddy && (
                <Card title={`Calidad de Laboratorio — ${esPaddyVerde ? "Arroz Paddy Verde" : "Arroz Paddy Seco"}`}>
                  <div className="cal-grid">
                    <div className="cal-header-row">
                      <span></span>
                      <span className="cal-col-head">Labor. (muestra)</span>
                      <span className="cal-col-head">Base Compra</span>
                    </div>
                    <div className="cal-row">
                      <span className="cal-label">Humedad (%)</span>
                      <input className="cal-input" type="number" step="0.1" name="humedad_inicial" value={form.humedad_inicial} onChange={handleChange} placeholder="Lab." />
                      <input className="cal-input" type="number" step="0.1" name="humedad_final"   value={form.humedad_final}   onChange={handleChange} placeholder="Base" />
                    </div>
                    <div className="cal-row">
                      <span className="cal-label">Impureza (%)</span>
                      <input className="cal-input" type="number" step="0.1" name="impureza_inicial" value={form.impureza_inicial} onChange={handleChange} placeholder="Lab." />
                      <input className="cal-input" type="number" step="0.1" name="impureza_final"   value={form.impureza_final}   onChange={handleChange} placeholder="Base" />
                    </div>
                    <div className="cal-divider" />
                    {esPaddyVerde && (
                      <div className="cal-row">
                        <span className="cal-label">Kilos verde</span>
                        <input className="cal-input cal-input-full" type="number" name="kilos_verde" value={form.kilos_verde} onChange={handleChange} placeholder="Kilos verde" />
                        <span />
                      </div>
                    )}
                    <div className="cal-row">
                      <span className="cal-label">Kilos seco</span>
                      <input className="cal-input cal-input-full" type="number" name="kilos_seco" value={form.kilos_seco} onChange={handleChange} placeholder="Kilos seco" />
                      <span />
                    </div>
                    <div className="cal-row">
                      <span className="cal-label">Kl. Compra</span>
                      <input className="cal-input cal-input-full" type="number" name="kl_compra" value={form.kl_compra} onChange={handleChange} placeholder="Kl. Compra" />
                      <span />
                    </div>
                    <div className="cal-row">
                      <span className="cal-label">Vlr Kilo</span>
                      <input className="cal-input cal-input-full" type="number" name="vlr_kilo" value={form.vlr_kilo} onChange={handleChange} placeholder="Valor por kilo" />
                      <span />
                    </div>
                  </div>
                </Card>
              )}

              {/* ── ADICIONAL ── */}
              <Card title="Información adicional">
                <div className="product-grid">
                  <Input label="Cantidad"              name="cantidad"        value={form.cantidad}       onChange={handleChange} type="number" />
                  <Input label="N° Tiq. báscula manual" name="numero_tiquete" value={form.numero_tiquete} onChange={handleChange} />
                  <Input label="División"              name="division"        value={form.division}       onChange={handleChange} />
                  <Input label="Endoso"                name="endoso"          value={form.endoso}         onChange={handleChange} />
                </div>
                <div style={{ marginTop: 14 }}>
                  <div className="group">
                    <label>Observaciones</label>
                    <textarea name="observaciones" value={form.observaciones} onChange={handleChange} rows={2} style={{ padding: "9px 12px", borderRadius: 6, border: "1px solid #d1d5db", fontSize: 14, resize: "vertical" }} />
                  </div>
                </div>
              </Card>

              <div className="actions">
                <button className="btn print-btn" onClick={() => handleImprimir(form)} disabled={cargando || !form.codigo}>
                  🖨 Vista previa / Imprimir
                </button>
                {modoEditar !== null && (
                  <button className="btn outline" onClick={resetForm} disabled={cargando}>Cancelar</button>
                )}
                <button className="btn primary" onClick={handleSubmit} disabled={cargando}>
                  {cargando ? "Procesando..." : modoEditar ? "Guardar cambios" : "Registrar entrada"}
                </button>
              </div>

            </div>
          </div>

          {/* TABLA DE PESAJES */}
          <div className="list-section">
            <div className="list-header">
              <div className="list-title-group">
                <h2 className="list-title">Entradas registradas</h2>
                <span className="count-badge">{pesajes.length} en total</span>
              </div>
              <div className="search-wrap">
                <span className="search-icon">⌕</span>
                <input
                  className="search"
                  placeholder="Buscar por placa, lote, producto, empresa..."
                  value={busqueda}
                  onChange={e => setBusqueda(e.target.value)}
                />
              </div>
            </div>

            {loadingLista ? (
              <div className="estado-tabla">Cargando registros...</div>
            ) : lista.length === 0 ? (
              <div className="estado-tabla">{busqueda ? "No se encontraron resultados." : "No hay entradas registradas."}</div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Fecha</th>
                      <th>Lote</th>
                      <th>Placa</th>
                      <th>Conductor</th>
                      <th>Producto</th>
                      <th>Peso bruto</th>
                      <th>NETO</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lista.map(p => {
                      const pbr  = parseFloat(p.peso_bruto)     || 0;
                      const tar  = parseFloat(p.peso_tara)       || 0;
                      const emp  = parseFloat(p.destare_empaque) || 0;
                      const net  = pbr - tar - emp;
                      return (
                        <tr key={p.id} className={modoEditar === p.id ? "row-activa" : ""}>
                          <td><span className="id-tag">{p.id}</span></td>
                          <td>{p.fecha || "—"}</td>
                          <td>{p.lote_id ? <span className="lote-tag">{p.lote_id}</span> : "—"}</td>
                          <td><span className="placa-tag">{p.placas || "—"}</span></td>
                          <td>{p.nombre || "—"}</td>
                          <td>{p.descripcion || "—"}</td>
                          <td>{p.peso_bruto ? `${Number(p.peso_bruto).toLocaleString("es-CO")} kg` : "—"}</td>
                          <td>{pbr > 0 ? `${net.toLocaleString("es-CO")} kg` : "—"}</td>
                          <td className="td-actions">
                            <button className="btn-print"  onClick={() => handleImprimir({
                              ...p,
                              kilos_verde: p.compra,
                              kilos_seco:  p.pilada,
                              vlr_kilo:    p.kilo,
                              kl_compra:   p.compra,
                            })}>🖨</button>
                            <button className="btn-edit"   onClick={() => handleEditar(p)}>Editar</button>
                            <button className="btn-delete" onClick={() => handleEliminar(p)}>Eliminar</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      </div>

      <style>{`
        * { box-sizing: border-box; font-family: Arial, sans-serif; }
        .app { width: 100%; }
        .wrapper { max-width: 1200px; margin: 0 auto; display: flex; flex-direction: column; gap: 28px; }

        /* ── HEADER ── */
        .page-header { padding-bottom: 4px; border-bottom: 2px solid #e5e7eb; }
        .page-eyebrow { font-size: 11px; font-weight: 700; letter-spacing: 2px; color: #2e7d32; text-transform: uppercase; margin: 0 0 6px 0; }
        .title { font-size: 26px; font-weight: 700; margin: 0 0 4px 0; color: #111827; }
        .title span { color: #2e7d32; }
        .subtitle-text { color: #6b7280; font-size: 13px; margin: 0; }

        /* ── MENSAJE ── */
        .msg { display: flex; align-items: center; gap: 10px; padding: 12px 18px; border-radius: 8px; font-size: 14px; font-weight: 500; }
        .msg.ok    { background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; }
        .msg.error { background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }
        .msg-icon { width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; flex-shrink: 0; }
        .msg.ok    .msg-icon { background: #166534; color: white; }
        .msg.error .msg-icon { background: #991b1b; color: white; }

        /* ── FORMULARIO ── */
        .form-section { background: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 28px; box-shadow: 0 1px 4px rgba(0,0,0,.06); }
        .form-section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid #f3f4f6; }
        .form-estado { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; }
        .form-estado.nuevo    { color: #2e7d32; }
        .form-estado.editando { color: #92400e; }
        .estado-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
        .form-estado.nuevo    .estado-dot { background: #2e7d32; }
        .form-estado.editando .estado-dot { background: #f59e0b; }
        .btn-limpiar { font-size: 13px; color: #6b7280; background: none; border: 1px solid #d1d5db; padding: 6px 14px; border-radius: 6px; cursor: pointer; }
        .btn-limpiar:hover { background: #f9fafb; color: #374151; }

        /* ── CARDS ── */
        .form { display: flex; flex-direction: column; gap: 16px; }
        .card { background: #fafafa; border: 1px solid #e5e7eb; border-radius: 10px; padding: 20px 24px; }
        .card-title { font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: #2e7d32; margin-bottom: 16px; padding-bottom: 10px; border-bottom: 1px solid #e5e7eb; }
        .row { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; }
        .vehicle-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; }
        .product-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; }
        .pesos-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; }
        .group { display: flex; flex-direction: column; }
        .group label { font-size: 12px; font-weight: 600; color: #374151; margin-bottom: 5px; }
        .group input, .group select { padding: 9px 12px; border-radius: 6px; border: 1px solid #d1d5db; font-size: 14px; background: white; color: #111827; transition: border-color 0.15s, box-shadow 0.15s; }
        .group input:focus, .group select:focus { outline: none; border-color: #2e7d32; box-shadow: 0 0 0 3px rgba(46,125,50,.12); }

        /* ── NETO DISPLAY ── */
        .neto-display { padding: 9px 12px; border-radius: 6px; border: 1px solid #bbf7d0; background: #f0fdf4; font-size: 15px; font-weight: 700; color: #166534; }

        /* ── LOTE WRAP ── */
        .lote-wrap { display: flex; flex-direction: column; gap: 10px; }
        .lote-input { flex: 1; padding: 9px 12px; border: none; outline: none; font-size: 14px; color: #374151; background: white; min-width: 0; }
        .lote-badge-row { display: flex; align-items: center; gap: 10px; }
        .lote-chip { display: inline-flex; align-items: center; gap: 6px; background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; border-radius: 20px; padding: 4px 14px; font-size: 13px; font-weight: 600; }
        .lote-cond-badge { display: inline-flex; align-items: center; gap: 4px; background: #fef9c3; color: #854d0e; border: 1px solid #fde047; border-radius: 20px; padding: 2px 10px; font-size: 11px; font-weight: 700; margin-left: 4px; }
        .alerta-condicionado { background: #fffbeb; border: 1.5px solid #fcd34d; color: #92400e; padding: 10px 14px; border-radius: 8px; font-size: .84rem; font-weight: 600; margin-top: 8px; }

        /* ── PLACA COMBO ── */
        .placa-combo { display: flex; align-items: center; border: 1px solid #d1d5db; border-radius: 6px; overflow: hidden; background: white; cursor: pointer; }
        .placa-valor { flex: 1; padding: 9px 12px; font-size: 14px; color: #374151; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .placa-toggle { padding: 0 14px; background: #2e7d32; color: white; border: none; font-size: 12px; min-height: 38px; cursor: pointer; flex-shrink: 0; }
        .placa-toggle:hover { background: #1b5e20; }
        .placa-dropdown { position: absolute; top: 100%; left: 0; right: 0; background: white; border: 1px solid #d1d5db; border-radius: 0 0 8px 8px; z-index: 200; box-shadow: 0 6px 18px rgba(0,0,0,.15); }
        .placa-search { width: 100%; padding: 9px 12px; border: none; border-bottom: 1px solid #e5e7eb; font-size: 13px; outline: none; box-sizing: border-box; }
        .placa-lista { list-style: none; margin: 0; padding: 0; max-height: 220px; overflow-y: auto; }
        .placa-lista li { padding: 9px 14px; cursor: pointer; display: flex; flex-direction: column; gap: 2px; border-bottom: 1px solid #f3f4f6; }
        .placa-lista li:last-child { border-bottom: none; }
        .placa-lista li:hover { background: #f0fdf4; }
        .placa-empty { color: #9ca3af; font-size: 13px; cursor: default; padding: 10px 14px; }
        .placa-id { font-weight: 700; font-size: 13px; color: #166534; }
        .placa-info { font-size: 12px; color: #6b7280; }

        /* ── CALIDAD ── */
        .cal-grid { display: flex; flex-direction: column; gap: 8px; }
        .cal-header-row { display: grid; grid-template-columns: 180px 1fr 1fr; gap: 10px; }
        .cal-col-head { font-size: 11px; font-weight: 700; color: #6b7280; text-align: center; text-transform: uppercase; letter-spacing: 0.5px; }
        .cal-row { display: grid; grid-template-columns: 180px 1fr 1fr; gap: 10px; align-items: center; }
        .cal-label { font-size: 13px; font-weight: 600; color: #374151; }
        .cal-input { padding: 8px 10px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; text-align: center; }
        .cal-input:focus { outline: none; border-color: #2e7d32; box-shadow: 0 0 0 3px rgba(46,125,50,.1); }
        .cal-input-full { grid-column: span 1; }
        .cal-divider { border-top: 1px dashed #e5e7eb; margin: 4px 0; }

        /* ── BOTONES ── */
        .actions { display: flex; justify-content: flex-end; gap: 10px; padding-top: 8px; flex-wrap: wrap; }
        .btn { padding: 10px 24px; border: none; border-radius: 7px; cursor: pointer; font-size: 14px; font-weight: 600; transition: background 0.15s; }
        .btn:disabled { opacity: 0.55; cursor: not-allowed; }
        .btn.primary { background: #2e7d32; color: white; }
        .btn.primary:hover:not(:disabled) { background: #1b5e20; }
        .btn.outline { background: white; color: #374151; border: 1px solid #d1d5db; }
        .btn.outline:hover:not(:disabled) { background: #f9fafb; }
        .btn.print-btn { background: #1e40af; color: white; }
        .btn.print-btn:hover:not(:disabled) { background: #1e3a8a; }

        /* ── TABLA ── */
        .list-section { background: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 28px; box-shadow: 0 1px 4px rgba(0,0,0,.06); }
        .list-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px; margin-bottom: 20px; }
        .list-title-group { display: flex; align-items: center; gap: 10px; }
        .list-title { font-size: 16px; font-weight: 700; margin: 0; color: #111827; }
        .count-badge { background: #f0fdf4; color: #166534; font-size: 12px; font-weight: 600; padding: 3px 10px; border-radius: 20px; border: 1px solid #bbf7d0; }
        .search-wrap { position: relative; }
        .search-icon { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); font-size: 16px; color: #9ca3af; pointer-events: none; }
        .search { padding: 9px 14px 9px 34px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 13px; min-width: 300px; color: #111827; }
        .search:focus { outline: none; border-color: #2e7d32; box-shadow: 0 0 0 3px rgba(46,125,50,.12); }
        .estado-tabla { color: #9ca3af; font-size: 14px; text-align: center; padding: 40px 0; margin: 0; }
        .table-wrap { overflow-x: auto; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        th { text-align: left; padding: 10px 12px; background: #f9fafb; color: #374151; font-size: 10px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; border-bottom: 2px solid #e5e7eb; white-space: nowrap; }
        td { padding: 10px 12px; border-bottom: 1px solid #f3f4f6; color: #374151; }
        tbody tr:last-child td { border-bottom: none; }
        tbody tr:hover td { background: #f9fafb; }
        tbody tr.row-activa td { background: #fffbeb; }
        .id-tag { display: inline-block; background: #f3f4f6; color: #6b7280; border-radius: 4px; padding: 1px 7px; font-size: 12px; font-weight: 600; }
        .placa-tag { display: inline-block; background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; border-radius: 5px; padding: 2px 9px; font-size: 12px; font-weight: 700; letter-spacing: 1px; }
        .lote-tag { display: inline-block; background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; border-radius: 5px; padding: 2px 9px; font-size: 11px; font-weight: 700; }
        .td-actions { display: flex; gap: 6px; white-space: nowrap; }
        .btn-print  { padding: 5px 10px; font-size: 13px; font-weight: 600; border: 1px solid #c7d2fe; background: #eef2ff; color: #4338ca; border-radius: 5px; cursor: pointer; }
        .btn-print:hover  { background: #e0e7ff; }
        .btn-edit   { padding: 5px 13px; font-size: 12px; font-weight: 600; border: 1px solid #bfdbfe; background: #eff6ff; color: #1d4ed8; border-radius: 5px; cursor: pointer; }
        .btn-edit:hover   { background: #dbeafe; }
        .btn-delete { padding: 5px 13px; font-size: 12px; font-weight: 600; border: 1px solid #fecaca; background: #fef2f2; color: #dc2626; border-radius: 5px; cursor: pointer; }
        .btn-delete:hover { background: #fee2e2; }
      `}</style>
    </>
  );
}

/* ── Componentes ── */
const Card = ({ title, children }) => (
  <div className="card">
    <div className="card-title">{title}</div>
    {children}
  </div>
);

const Row = ({ children }) => <div className="row">{children}</div>;

const Input = ({ label, name, value, onChange, type }) => (
  <div className="group">
    <label>{label}</label>
    <input name={name} value={value} onChange={onChange} type={type || "text"} />
  </div>
);

const SelectProd = ({ label, value, onChange, options }) => (
  <div className="group">
    <label>{label}</label>
    <select value={value} onChange={onChange}>
      <option value="">Seleccione...</option>
      {options.map(opt => (
        <option key={opt.codigo} value={opt.codigo}>
          {opt.codigo} — {opt.nombre}
        </option>
      ))}
    </select>
  </div>
);

