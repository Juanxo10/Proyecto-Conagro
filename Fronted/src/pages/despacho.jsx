import React from "react";

/* Fuente Inter desde Google Fonts */
const fontLink = document.createElement("link");
fontLink.rel = "stylesheet";
fontLink.href = "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap";
if (!document.head.querySelector('[href*="Inter"]')) document.head.appendChild(fontLink);

/* ─────────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────────── */
function fmt(n, dec = 2) {
  if (n === null || n === undefined || n === "" || isNaN(Number(n))) return "—";
  return Number(n).toLocaleString("es-CO", {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  });
}
function fmtMoney(n) {
  if (n === null || n === undefined || n === "" || isNaN(Number(n))) return "—";
  return Number(n).toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  });
}
function nowFecha() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}
function nowHora() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/* ─────────────────────────────────────────────────────────────────
   TIQUETE DE DESPACHO — genera documento estilo bascula de la imagen
───────────────────────────────────────────────────────────────── */
function generarTiqueteHTML({ loteData, despacho }) {
  const { previo, pesaje, liquidacion } = loteData;
  const producto = (pesaje?.descripcion || previo.producto || "ARROZ").toUpperCase();
  const pesoNetoEntrada = (() => {
    if (pesaje) {
      const pb = parseFloat(pesaje.peso_bruto) || 0;
      const ta = parseFloat(pesaje.peso_tara) || 0;
      const em = parseFloat(pesaje.destare_empaque) || 0;
      return pb - ta - em;
    }
    return parseFloat(previo.peso_neto) || 0;
  })();

  const diferencia = Math.abs(
    (parseFloat(liquidacion.peso_ajustado) || 0) -
    (parseFloat(despacho.peso_neto_salida) || 0)
  );

  const css = `
    *{box-sizing:border-box;margin:0;padding:0;}
    body{font-family:"Courier New",Courier,monospace;font-size:10px;width:640px;
         margin:0 auto;padding:14px 20px;color:#0a0a0a;background:#fff;}
    .header-wrap{text-align:center;margin-bottom:6px;}
    .company{font-size:13px;font-weight:700;letter-spacing:1px;text-transform:uppercase;}
    .nit{font-size:11px;letter-spacing:3px;margin:2px 0;}
    .doc-title{font-size:12px;font-weight:700;letter-spacing:2px;margin-top:3px;text-transform:uppercase;}
    .doc-num{font-size:11px;}
    .sep{border:none;border-top:1px dashed #333;margin:6px 0;}
    table.main{width:100%;border-collapse:collapse;margin-bottom:0;}
    table.main td{border:1px solid #555;padding:3px 6px;font-size:9.5px;vertical-align:top;}
    .lbl{font-weight:700;white-space:nowrap;}
    .right{text-align:right;}
    .bold{font-weight:700;}
    .pesos-col{width:45%;}
    .sect{background:#7f1d1d;color:#fff;font-weight:700;font-size:9.5px;
          text-align:center;letter-spacing:2px;padding:4px 6px;}
    .total-row td{background:#7f1d1d;color:#fff;font-weight:700;font-size:11px;}
    .obs{border:1px solid #555;padding:4px 6px;font-size:9.5px;min-height:32px;
         margin-top:6px;white-space:pre-wrap;}
    .footer-row{display:flex;justify-content:space-between;margin-top:30px;gap:12px;}
    .sig-box{text-align:center;flex:1;}
    .sig-line{border-top:1px solid #333;width:140px;margin:0 auto 4px;}
    .sig-name{font-size:9.5px;font-weight:700;}
    .sig-role{font-size:9px;color:#444;}
    .alerta{background:#fff3cd;border:1px solid #e6a817;padding:4px 8px;
            font-size:9.5px;font-weight:700;margin-top:6px;text-align:center;color:#7a4f00;}
    .logo-area{display:inline-block;vertical-align:middle;margin-right:12px;}
    .logo-name{color:#2f6e18;font-size:15px;font-weight:900;font-style:italic;}
    .logo-sub{color:#2f6e18;font-size:7px;letter-spacing:0.4px;}
    @media print{body{padding:6px;width:100%;}@page{margin:8mm;size:A5;}}
  `;

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"/>
<title>Tiquete Despacho ${despacho.numero_despacho}</title>
<style>${css}</style></head>
<body>

<div class="header-wrap">
  <div>
    <span class="logo-area">
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
  </div>
  <div class="nit">900,664,456</div>
  <div class="doc-title">TIQUETE DE DESPACHO — SALIDA</div>
  <div class="doc-num">Nro. ${despacho.numero_despacho}</div>
</div>

<hr class="sep"/>

<table class="main">
  <tr>
    <td colspan="3" class="lbl">Destinatario:&nbsp;<span class="bold">${previo.propietario || ""}</span></td>
    <td class="lbl">Fecha:&nbsp;<span class="bold">${despacho.fecha_despacho || nowFecha()}</span></td>
  </tr>
  <tr>
    <td colspan="2">NIT / Cédula:&nbsp;<span class="bold">${previo.cedula_nit || ""}</span></td>
    <td colspan="2">Sale:&nbsp;<span class="bold">${despacho.hora_despacho || ""}</span></td>
  </tr>
  <tr>
    <td colspan="2">Bodega:&nbsp;ALM01&nbsp;&nbsp;<span class="bold">ALMACEN PRINCIPAL</span></td>
    <td colspan="2">LOTE: <span class="bold">${previo.lote_id}</span></td>
  </tr>
  <tr>
    <td colspan="4" class="lbl">Transacción:&nbsp;201 DESPACHOS</td>
  </tr>
</table>

<hr class="sep"/>

<table class="main">
  <tr><td colspan="4" class="sect">DESCRIPCIÓN DEL PRODUCTO</td></tr>
  <tr>
    <td class="lbl">Descripción:</td>
    <td colspan="2">${producto}</td>
    <td class="lbl right">KILOS:&nbsp;<span class="bold">${fmt(despacho.peso_neto_salida)}</span></td>
  </tr>
  <tr>
    <td class="lbl">Facturas:</td>
    <td colspan="3"></td>
  </tr>
</table>

<hr class="sep"/>

<table class="main">
  <tr><td colspan="2" class="sect" style="width:55%">PESOS</td><td colspan="2" class="sect">TOTALES</td></tr>
  <tr>
    <td class="lbl">Peso Bruto Salida:</td>
    <td class="right bold">${fmt(despacho.peso_bruto_salida)}&nbsp;kg</td>
    <td class="lbl">Peso Bruto Entrada:</td>
    <td class="right bold">${fmt(pesaje?.peso_bruto ?? previo.peso_bruto)}&nbsp;kg</td>
  </tr>
  <tr>
    <td class="lbl">Tara Salida:</td>
    <td class="right bold">${fmt(despacho.peso_tara_salida)}&nbsp;kg</td>
    <td class="lbl">Destare / Tara Entrada:</td>
    <td class="right bold">${fmt(pesaje?.peso_tara ?? previo.peso_tara)}&nbsp;kg</td>
  </tr>
  <tr>
    <td class="lbl">Empaque:</td>
    <td class="right bold">${fmt(pesaje?.destare_empaque ?? 0)}&nbsp;kg</td>
    <td class="lbl">Peso Neto Entrada:</td>
    <td class="right bold">${fmt(pesoNetoEntrada)}&nbsp;kg</td>
  </tr>
  <tr>
    <td class="lbl" style="background:#7f1d1d;color:#fff;">NETO SALIDA:</td>
    <td class="right bold" style="background:#7f1d1d;color:#fff;font-size:12px;">${fmt(despacho.peso_neto_salida)}&nbsp;kg</td>
    <td class="lbl">Peso Ajustado (Liq.):</td>
    <td class="right bold">${fmt(liquidacion.peso_ajustado)}&nbsp;kg</td>
  </tr>
  ${diferencia > 0.01 ? `
  <tr class="total-row">
    <td colspan="2" style="text-align:right;">Diferencia de peso:</td>
    <td colspan="2" style="text-align:right;">${fmt(diferencia)}&nbsp;kg</td>
  </tr>` : ""}
  <tr>
    <td class="lbl">Valor Total Liq.:</td>
    <td class="right bold" colspan="3">${fmtMoney(liquidacion.total_pagar)}</td>
  </tr>
</table>

<hr class="sep"/>

<table class="main">
  <tr><td colspan="4" class="sect">TRANSPORTE DE SALIDA</td></tr>
  <tr>
    <td class="lbl">Placa:</td>
    <td class="bold">${despacho.placa_salida || ""}</td>
    <td class="lbl">Conductor:</td>
    <td class="bold">${despacho.conductor_salida || ""}</td>
  </tr>
  <tr>
    <td class="lbl">Cédula:</td>
    <td>${despacho.cedula_conductor_salida || ""}</td>
    <td class="lbl">Teléfono:</td>
    <td>${despacho.telefono_conductor_salida || ""}</td>
  </tr>
  <tr>
    <td class="lbl">Empresa:</td>
    <td colspan="3">${despacho.empresa_transportadora || ""}</td>
  </tr>
  <tr>
    <td class="lbl">Placa Entrada:</td>
    <td class="bold">${previo.placa || ""}</td>
    <td class="lbl">Conductor Entrada:</td>
    <td>${previo.nombre_conductor || pesaje?.nombre || ""}</td>
  </tr>
</table>

<hr class="sep"/>

${diferencia > 0.01 ? `<div class="alerta">⚠ DIFERENCIA ENTRE PESO AJUSTADO Y PESO DESPACHADO: ${fmt(diferencia)} kg</div>` : ""}

<div class="obs"><strong>Observaciones:</strong><br/>${despacho.observaciones || ""}</div>

<div style="font-size:9px;text-align:right;margin-top:4px;">
  Nro Tiq. bascula:&nbsp;<strong>${despacho.numero_despacho}</strong>&nbsp;&nbsp;|&nbsp;&nbsp;
  Elaborado por:&nbsp;<strong>${despacho.usuario || "Sistema"}</strong>
</div>

<div class="footer-row">
  <div class="sig-box">
    <div class="sig-line"></div>
    <p class="sig-name">Administrador</p>
    <p class="sig-role">Conagro</p>
  </div>
  <div class="sig-box">
    <div class="sig-line"></div>
    <p class="sig-name">${previo.propietario || "Cliente"}</p>
    <p class="sig-role">Recibido</p>
  </div>
  <div class="sig-box">
    <div class="sig-line"></div>
    <p class="sig-name">${despacho.conductor_salida || "Conductor"}</p>
    <p class="sig-role">Transportador</p>
  </div>
</div>

</body></html>`;
}

/* ═══════════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
═══════════════════════════════════════════════════════════════ */
export default function Despacho() {
  /* ── buscador ── */
  const [busq, setBusq]       = React.useState("");
  const [open, setOpen]       = React.useState(false);
  const [lotes, setLotes]     = React.useState([]);
  const [buscando, setBuscando] = React.useState(false);
  const dropRef = React.useRef(null);

  /* ── datos del lote ── */
  const [loteData, setLoteData] = React.useState(null);
  const [cargando, setCargando] = React.useState(false);
  const [despachado, setDespachado] = React.useState(null);

  /* ── formulario ── */
  const FORM_VACIO = {
    placa_salida: "", conductor_salida: "", cedula_conductor_salida: "",
    telefono_conductor_salida: "", empresa_transportadora: "",
    peso_bruto_salida: "", peso_tara_salida: "",
    observaciones: "",
  };
  const [form, setForm]       = React.useState(FORM_VACIO);
  const [guardando, setGuardando] = React.useState(false);
  const [msg, setMsg]         = React.useState({ tipo: "", texto: "" });

  /* ── historial ── */
  const [lista, setLista]       = React.useState([]);
  const [cargLista, setCargLista] = React.useState(false);
  const [imprimiendoFila, setImprimiendoFila] = React.useState(null);

  /* ── certificado de calidad ── */
  const CERT_VACIO = {
    presentacion: "", cantidad_salida: "", fecha_vencimiento: "",
    grano_yesado_salida: "", grano_dano_hongo_salida: "", grano_dano_calor_salida: "",
    semillas_obj_salida: "", olor_resultado: "CUMPLE", sabor_resultado: "CUMPLE",
    color_resultado: "CUMPLE", nivel_infestacion_resultado: "CUMPLE",
    materias_extranas_resultado: "CUMPLE",
  };
  const [certForm, setCertForm]         = React.useState(CERT_VACIO);

  /* ── vehículos para placa salida ── */
  const [listaVeh, setListaVeh]         = React.useState([]);
  const [placaSearch, setPlacaSearch]   = React.useState("");
  const [showPlacaDrop, setShowPlacaDrop] = React.useState(false);
  const [vehOk, setVehOk]               = React.useState(null);
  const placaRef = React.useRef(null);

  const filteredVeh = listaVeh.filter(v => {
    if (!placaSearch.trim()) return true;
    const q = placaSearch.trim().toLowerCase();
    return (
      (v.placa || "").toLowerCase().includes(q) ||
      (v.marca || "").toLowerCase().includes(q) ||
      (v.empresa || "").toLowerCase().includes(q) ||
      (v.conductor_nombre || "").toLowerCase().includes(q)
    );
  });

  /* ─────────── cargar historial ─────────── */
  const cargarLista = React.useCallback(async () => {
    setCargLista(true);
    try {
      const r = await fetch("/api/despachos");
      if (r.ok) setLista(await r.json());
    } finally { setCargLista(false); }
  }, []);

  React.useEffect(() => { cargarLista(); cargarLotesDisponibles(); cargarVehiculos(); }, [cargarLista]);

  /* cierre del combo al click fuera */
  React.useEffect(() => {
    function h(e) {
      if (dropRef.current && !dropRef.current.contains(e.target)) setOpen(false);
      if (placaRef.current && !placaRef.current.contains(e.target)) setShowPlacaDrop(false);
    }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  /* ─────────── cargar todos los lotes disponibles al inicio ─────────── */
  async function cargarLotesDisponibles() {
    setBuscando(true);
    try {
      const r = await fetch("/api/despachos/buscar?q=");
      if (r.ok) setLotes(await r.json());
    } finally { setBuscando(false); }
  }

  /* ─────────── cargar vehículos ─────────── */
  async function cargarVehiculos() {
    try {
      const r = await fetch("/api/vehiculos");
      const d = await r.json();
      setListaVeh(Array.isArray(d) ? d : []);
    } catch { setListaVeh([]); }
  }

  /* ─────────── seleccionar vehículo de salida ─────────── */
  function seleccionarVehiculo(v) {
    setPlacaSearch(v.placa);
    setShowPlacaDrop(false);
    setVehOk(v);
    setForm(f => ({
      ...f,
      placa_salida:             v.placa || "",
      empresa_transportadora:   v.empresa || "",
      conductor_salida:         v.conductor_nombre || "",
      cedula_conductor_salida:  v.conductor_cedula || "",
      telefono_conductor_salida: v.telefono || "",
    }));
  }

  /* ─────────── buscar lotes liquidados (filtro al escribir) ─────────── */
  React.useEffect(() => {
    if (!busq || busq.length < 1) {
      cargarLotesDisponibles();
      return;
    }
    const t = setTimeout(async () => {
      setBuscando(true);
      try {
        const r = await fetch(`/api/despachos/buscar?q=${encodeURIComponent(busq)}`);
        if (r.ok) setLotes(await r.json());
      } finally { setBuscando(false); }
    }, 250);
    return () => clearTimeout(t);
  }, [busq]);

  /* ─────────── seleccionar lote ─────────── */
  async function seleccionar(lote) {
    setOpen(false);
    setBusq(lote.lote_id);
    setLoteData(null);
    setDespachado(null);
    setForm(FORM_VACIO);
    setMsg({ tipo: "", texto: "" });
    setCargando(true);
    try {
      const [rDatos, rDesp] = await Promise.all([
        fetch(`/api/despachos/lote-datos/${encodeURIComponent(lote.lote_id)}`),
        fetch(`/api/despachos/${encodeURIComponent(lote.lote_id)}`),
      ]);
      const datos = rDatos.ok ? await rDatos.json() : null;
      if (datos) {
        setLoteData(datos);
        // Pre-fill certificate form from existing trilla data
        if (datos.trilla) {
          const t = datos.trilla;
          setCertForm({
            presentacion:               t.presentacion               || "",
            cantidad_salida:            t.cantidad_salida            || "",
            fecha_vencimiento:          t.fecha_vencimiento          || "",
            grano_yesado_salida:        t.grano_yesado_salida        ?? "",
            grano_dano_hongo_salida:    t.grano_dano_hongo_salida    ?? "",
            grano_dano_calor_salida:    t.grano_dano_calor_salida    ?? "",
            semillas_obj_salida:        t.semillas_obj_salida        ?? "",
            olor_resultado:             t.olor_resultado             || "CUMPLE",
            sabor_resultado:            t.sabor_resultado            || "CUMPLE",
            color_resultado:            t.color_resultado            || "CUMPLE",
            nivel_infestacion_resultado: t.nivel_infestacion_resultado || "CUMPLE",
            materias_extranas_resultado: t.materias_extranas_resultado || "CUMPLE",
          });
        } else {
          setCertForm(CERT_VACIO);
        }
        // Autocompletar peso bruto con peso ajustado de liquidación
        // y peso tara con la tara del pesaje de entrada del lote.
        // Redondeado a 2 decimales: el input tiene step="0.01" y
        // peso_ajustado viene de la BD con 4 decimales, lo que hacia
        // que el navegador rechazara el valor silenciosamente al enviar.
        // referencia_kg: con trilla = kg disponibles del producto molido; sin trilla = peso ajustado
        const pesoRef    = datos.referencia_kg ?? datos.liquidacion?.peso_ajustado;
        const taraPesaje = datos.pesaje?.peso_tara;
        const tara = taraPesaje != null && taraPesaje !== "" ? Number(taraPesaje) : 0;
        setForm(f => ({
          ...f,
          ...(pesoRef != null && pesoRef !== "" ? { peso_bruto_salida: (Number(pesoRef) + tara).toFixed(2) } : {}),
          ...(taraPesaje != null && taraPesaje !== "" ? { peso_tara_salida: tara.toFixed(2) } : {}),
        }));
      }
      if (rDesp.ok) setDespachado(await rDesp.json());
    } finally { setCargando(false); }
  }

  /* ─────────── peso neto calculado ─────────── */
  const pesoNeto = (() => {
    const b = parseFloat(form.peso_bruto_salida);
    const t = parseFloat(form.peso_tara_salida);
    if (!isNaN(b) && !isNaN(t) && b > t) return +(b - t).toFixed(2);
    return null;
  })();

  const pesoAjustado = loteData?.referencia_kg ?? loteData?.liquidacion?.peso_ajustado ?? null;
  const diferencia = pesoNeto !== null && pesoAjustado !== null
    ? +(pesoNeto - pesoAjustado).toFixed(2) : null;

  /* ─────────── registrar despacho ─────────── */
  async function registrar(e) {
    e.preventDefault();
    if (!loteData) return;
    if (pesoNeto === null) {
      setMsg({ tipo: "error", texto: "Verifica los pesos de salida (bruto > tara)." });
      return;
    }
    setGuardando(true);
    setMsg({ tipo: "", texto: "" });
    try {
      const body = {
        lote_id: loteData.previo.lote_id,
        fecha_despacho: new Date().toISOString().slice(0, 10),
        hora_despacho: nowHora(),
        ...form,
        peso_neto_salida: pesoNeto,
        producto: loteData.previo?.producto || loteData.pesaje?.descripcion || "ARROZ",
        usuario: "operador",
      };
      const r = await fetch("/api/despachos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await r.json();
      if (!r.ok) {
        setMsg({ tipo: "error", texto: data.error || "Error al registrar despacho." });
        return;
      }
      setMsg({ tipo: "ok", texto: `Despacho ${data.despacho.numero_despacho} registrado exitosamente.` });
      setDespachado(data.despacho);
      cargarLista();
    } finally { setGuardando(false); }
  }

  /* ─────────── tiquete ─────────── */
  function imprimirTiquete() {
    if (!despachado || !loteData) return;
    const html = generarTiqueteHTML({ loteData, despacho: despachado });
    const w = window.open("", "_blank");
    w.document.write(html);
    w.document.close();
    w.print();
  }

  /* ─────────── imprimir desde historial ─────────── */
  async function imprimirDesdeHistorial(row) {
    setImprimiendoFila(row.id);
    try {
      const [rDatos, rDesp] = await Promise.all([
        fetch(`/api/despachos/lote-datos/${encodeURIComponent(row.lote_id)}`),
        fetch(`/api/despachos/${encodeURIComponent(row.lote_id)}`),
      ]);
      if (!rDatos.ok || !rDesp.ok) { alert("Error al cargar datos del despacho."); return; }
      const datos = await rDatos.json();
      const desp  = await rDesp.json();
      const html  = generarTiqueteHTML({ loteData: datos, despacho: desp });
      const w = window.open("", "_blank");
      if (!w) { alert("Permita ventanas emergentes para imprimir."); return; }
      w.document.write(html);
      w.document.close();
      setTimeout(() => w.print(), 300);
    } catch (e) { alert(e.message); }
    finally { setImprimiendoFila(null); }
  }

  /* ─────────── generar certificado de calidad ─────────── */
  async function generarCertificadoCalidad(trillaOverride, datosCtx) {
    const ctx = datosCtx || loteData;
    if (!ctx) return;
    const { previo, pesaje } = ctx;
    const trillaSrc = trillaOverride || ctx.trilla;
    if (!trillaSrc) { setMsg({ tipo: "error", texto: "Este lote no tiene datos de trilla registrados." }); return; }
    // Merge certForm only when using current loteData (not from historial)
    const trilla = datosCtx ? trillaSrc : { ...trillaSrc, ...certForm };
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const now  = new Date();
    const fechaEmision = `${String(now.getDate()).padStart(2,"0")}/${String(now.getMonth()+1).padStart(2,"0")}/${now.getFullYear()}`;
    let numCert = "CC - 00001";
    try {
      const saveRes = await fetch("/api/trillas/certificados", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lote_id: previo.lote_id, fecha_emision: fechaEmision, usuario: user.nombre || "Sistema" }),
      });
      const saved = await saveRes.json();
      if (saved.certificado?.numero_certificado) numCert = saved.certificado.numero_certificado;
    } catch (e) {
      console.error("Error al registrar certificado:", e);
      setMsg({ tipo: "error", texto: "No se pudo registrar el certificado en el servidor; se usará un número provisional." });
    }
    const producto  = (pesaje?.descripcion || previo.producto || "ARROZ BLANCO").toUpperCase();
    const conductor = previo.nombre_conductor || pesaje?.nombre || "";
    const val = (v, suf = "") => (v !== null && v !== undefined && String(v).trim() !== "" && String(v) !== "0") ? `${v}${suf}` : "";
    const css = `*{box-sizing:border-box;margin:0;padding:0;}body{font-family:Arial,Helvetica,sans-serif;font-size:10.5px;width:750px;margin:0 auto;padding:18px 22px;color:#1a1a1a;}table{width:100%;border-collapse:collapse;margin-bottom:8px;}td,th{border:1px solid #7a7a7a;padding:4px 8px;font-size:10.5px;vertical-align:middle;}.logo-td{width:148px;text-align:center;padding:10px 6px;border:1px solid #7a7a7a;}.logo-name{color:#2f6e18;font-size:17px;font-weight:900;font-style:italic;line-height:1;}.logo-sub{color:#2f6e18;font-size:7.5px;letter-spacing:0.4px;line-height:1.45;margin-top:3px;}.title-td{text-align:center;border:1px solid #7a7a7a;padding:16px 12px;}.cert-num{font-size:14px;font-weight:bold;}.cert-prod{font-size:11px;margin-top:10px;}.sh{background:#5a5a5a;color:#fff;text-align:center;font-weight:bold;font-size:10.5px;letter-spacing:2px;padding:5px 8px;border-color:#5a5a5a;}.ssh{background:#8a8a8a;color:#fff;text-align:center;font-weight:bold;font-size:10px;letter-spacing:1.5px;padding:4px 8px;border-color:#8a8a8a;}.ch{background:#cecece;font-weight:bold;text-align:center;font-size:10px;padding:4px 8px;}.lb{background:#e6e6e6;font-weight:bold;font-size:10px;white-space:nowrap;padding:4px 8px;}.vl{font-size:10.5px;}.tc{text-align:center;}.obs-lbl{font-weight:bold;padding:5px 8px;border:1px solid #7a7a7a;}.obs-body{height:52px;border:1px solid #7a7a7a;padding:5px 8px;vertical-align:top;}.elab{font-size:10.5px;margin-top:18px;margin-bottom:52px;}.sigs{display:flex;justify-content:space-around;}.sig{text-align:center;}.sig-line{border-top:1px solid #333;width:178px;margin:0 auto 5px;}.sig-name{font-size:10.5px;font-weight:bold;}.sig-role{font-size:10px;color:#555;}@media print{body{padding:8px;width:100%;}@page{margin:10mm;}}`;
    const certHtml = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/><title>Certificado ${numCert}</title><style>${css}</style></head><body><table><tr><td class="logo-td"><svg width="60" height="54" viewBox="0 0 60 54" xmlns="http://www.w3.org/2000/svg" style="display:block;margin:0 auto 5px;"><rect x="1" y="1" width="58" height="52" fill="#e8f2db" stroke="#3a7020" stroke-width="1.5"/><line x1="30" y1="48" x2="30" y2="9" stroke="#3a7020" stroke-width="2"/><ellipse cx="30" cy="10" rx="4" ry="6" fill="#4a8c28"/><path d="M30 20 C22 15 15 8 18 4 C23 2 29 14 30 20Z" fill="#4a8c28"/><path d="M30 20 C38 15 45 8 42 4 C37 2 31 14 30 20Z" fill="#4a8c28"/><path d="M30 30 C20 23 12 13 15 7 C20 4 28 22 30 30Z" fill="#5aaa30"/><path d="M30 30 C40 23 48 13 45 7 C40 4 32 22 30 30Z" fill="#5aaa30"/><path d="M30 42 C18 33 10 20 13 12 C18 9 27 30 30 42Z" fill="#3a7020"/><path d="M30 42 C42 33 50 20 47 12 C42 9 33 30 30 42Z" fill="#3a7020"/></svg><div class="logo-name">conagro</div><div class="logo-sub">COMERCIALIZADORA<br/>AGRÍCOLA NACI</div></td><td class="title-td"><div class="cert-num">CERTIFICADO DE CALIDAD No. ${numCert}</div><div class="cert-prod">PRODUCTO:&nbsp;&nbsp;${producto}</div></td></tr></table><table><tr><td class="sh" colspan="4">DATOS GENERALES</td></tr><tr><td class="lb">CLIENTE:</td><td class="vl">${previo.propietario||""}</td><td class="lb">FECHA DESPACHO:</td><td class="vl">${trilla.fecha_trilla||""}</td></tr><tr><td class="lb">FECHA DE VENCIMIENTO:</td><td class="vl">${trilla.fecha_vencimiento||""}</td><td class="lb">No. LOTE:</td><td class="vl">${previo.lote_id||""}</td></tr><tr><td class="lb">PRESENTACIÓN:</td><td class="vl">${trilla.presentacion||""}</td><td class="lb">CANTIDAD:</td><td class="vl">${trilla.cantidad_salida||""}</td></tr><tr><td class="lb">RENDIMIENTO:</td><td class="vl">${trilla.rendimiento!=null?trilla.rendimiento+"%":""}</td><td class="lb">KG RESULTADO:</td><td class="vl">${trilla.kilos_resultado!=null?Number(trilla.kilos_resultado).toLocaleString("es-CO")+" kg":""}</td></tr><tr><td class="lb">CONDUCTOR:</td><td class="vl">${conductor}</td><td class="lb">PLACAS VEHÍCULO:</td><td class="vl">${previo.placa||""}</td></tr></table><table><tr><td class="sh" colspan="3">ASPECTOS A EVALUAR</td></tr><tr><td class="ssh" colspan="3">FÍSICOS</td></tr><tr><td class="ch" style="width:52%">CARACTERÍSTICA</td><td class="ch" style="width:26%">ESPECIFICACIÓN</td><td class="ch" style="width:22%">RESULTADO</td></tr><tr><td>HUMEDAD</td><td class="tc">12,0 - 14,0</td><td class="tc">${val(trilla.humedad_salida,"%")}</td></tr><tr><td>GRANO PARTIDO</td><td class="tc">9% MAX</td><td class="tc">${val(trilla.grano_partido_salida,"%")}</td></tr><tr><td>GRANO YESADO</td><td class="tc">11% MAX</td><td class="tc">${val(trilla.grano_yesado_salida,"%")}</td></tr><tr><td>GRANO DAÑADO POR HONGO</td><td class="tc">2,5% MAX</td><td class="tc">${val(trilla.grano_dano_hongo_salida,"%")}</td></tr><tr><td>GRANO DAÑADO POR CALOR</td><td class="tc">1,5% MAX</td><td class="tc">${val(trilla.grano_dano_calor_salida,"%")}</td></tr><tr><td>SEMILLAS OBJETABLES Y ARROZ CON CÁSCARA</td><td class="tc">4 EN 100 GR. MAX</td><td class="tc">${val(trilla.semillas_obj_salida)}</td></tr><tr><td class="ssh" colspan="3">ORGANOLÉPTICOS</td></tr><tr><td class="ch">CARACTERÍSTICA</td><td class="ch">ESPECIFICACIÓN</td><td class="ch">RESULTADO</td></tr><tr><td>OLOR</td><td class="tc">CARACTERÍSTICO</td><td class="tc">${trilla.olor_resultado||""}</td></tr><tr><td>SABOR</td><td class="tc">CARACTERÍSTICO</td><td class="tc">${trilla.sabor_resultado||""}</td></tr><tr><td>COLOR</td><td class="tc">CARACTERÍSTICO</td><td class="tc">${trilla.color_resultado||""}</td></tr><tr><td class="ssh" colspan="3">INOCUIDAD</td></tr><tr><td class="ch">CARACTERÍSTICA</td><td class="ch">ESPECIFICACIÓN</td><td class="ch">RESULTADO</td></tr><tr><td>NIVEL DE INFESTACIÓN EN 100 GRAMOS</td><td class="tc">AUSENCIA</td><td class="tc">${trilla.nivel_infestacion_resultado||""}</td></tr><tr><td>MATERIAS EXTRAÑAS EN 100 GRAMOS</td><td class="tc">AUSENCIA</td><td class="tc">${trilla.materias_extranas_resultado||""}</td></tr><tr><td>IMPUREZAS</td><td class="tc">0,1% MAX</td><td class="tc">${val(trilla.impureza_salida,"%")}</td></tr></table><table><tr><td class="obs-lbl">OBSERVACIONES:</td></tr><tr><td class="obs-body">${trilla.observaciones||""}</td></tr></table><p class="elab">Elaboró:</p><div class="sigs"><div class="sig"><div class="sig-line"></div><p class="sig-name">Esteban Olaya</p><p class="sig-role">Aux. Laboratorio</p></div><div class="sig"><div class="sig-line"></div><p class="sig-name">Edwin Acosta</p><p class="sig-role">Jefe de Planta</p></div></div></body></html>`;
    const win = window.open("", "_blank", "width=860,height=900");
    if (!win) { setMsg({ tipo: "error", texto: "Bloqueador de ventanas emergentes activo." }); return; }
    win.document.write(certHtml);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 400);
  }

  /* ─────────── render ─────────── */
  const liq   = loteData?.liquidacion;
  const prev  = loteData?.previo;
  const pesaje = loteData?.pesaje;
  const trilla = loteData?.trilla;

  return (
    <>
      <div className="app">
        <div className="wrapper">

          {/* ── HEADER ── */}
          <div className="page-header">
            <div className="page-eyebrow">MÓDULO OPERATIVO</div>
            <h1 className="title">Despacho <span>de Lotes</span></h1>
            <p className="subtitle-text">
              Registro de salida y despacho de producto procesado — solo lotes liquidados
            </p>
          </div>

          {/* ── MENSAJE ── */}
          {msg.texto && (
            <div className={`msg ${msg.tipo}`}>
              <span className="msg-icon">{msg.tipo === "ok" ? "✓" : "!"}</span>
              {msg.texto}
            </div>
          )}

          {/* ── BUSCADOR ── */}
          <div className="card">
            <div className="card-title">Seleccionar Lote Liquidado</div>
            <div className="combo" ref={dropRef}>
              <div className="combo-box">
                <input
                  className="combo-input"
                  placeholder="Buscar por lote, propietario, placa…"
                  value={busq}
                  onChange={e => { setBusq(e.target.value); setOpen(true); }}
                  onFocus={() => setOpen(true)}
                  autoComplete="off"
                />
                <button className="combo-toggle" onClick={() => setOpen(o => !o)}>
                  {buscando ? "…" : "▼"}
                </button>
              </div>
              {open && (
                <div className="combo-dropdown">
                  {buscando
                    ? <div className="combo-empty">Cargando lotes…</div>
                    : lotes.length === 0
                      ? <div className="combo-empty">No hay lotes liquidados disponibles</div>
                      : lotes.map(l => (
                          <div key={l.lote_id} className="combo-item" onClick={() => seleccionar(l)}>
                            <span className="combo-id">{l.lote_id}</span>
                            <span className="combo-info">
                              {l.propietario} · {l.placa} · {fmt(l.peso_ajustado)} kg
                            </span>
                            <span className="estado-badge liquidado">LIQUIDADO</span>
                          </div>
                        ))
                  }
                </div>
              )}
            </div>
          </div>

          {/* ── LOADING ── */}
          {cargando && <div className="loading-banner">Cargando datos del lote…</div>}

          {/* ── CONTENIDO PRINCIPAL ── */}
          {loteData && (
            <div className="liq-grid">

              {/* ════ COLUMNA IZQUIERDA ════ */}
              <div className="liq-col">

                {/* Resumen del lote */}
                <div className="card">
                  <div className="card-title">Resumen del Lote</div>
                  <div className="badge-row">
                    <span className={`badge-estado ${despachado ? "despachado" : "liquidado"}`}>
                      {despachado ? "DESPACHADO" : "LIQUIDADO"}
                    </span>
                  </div>
                  {prev?.estado === "CONDICIONADO" && (
                    <div className="alerta-condicionado-desp">
                      ⚠ Lote <strong>CONDICIONADO</strong> — calidad regular, requiere seguimiento especial. Verifique los parámetros de calidad antes de despachar.
                    </div>
                  )}
                  <div className="info-grid">
                    <Field label="Lote ID"        value={prev?.lote_id} bold />
                    <Field label="Propietario"     value={prev?.propietario} />
                    <Field label="Placa entrada"   value={prev?.placa} />
                    <Field label="Conductor ent."  value={prev?.nombre_conductor} />
                    <Field label="Peso bruto ent." value={fmt(pesaje?.peso_bruto) + " kg"} />
                    <Field label="Peso tara ent."  value={fmt(pesaje?.peso_tara) + " kg"} />
                    <Field label="Peso neto ent."  value={fmt(pesaje?.peso_neto) + " kg"} bold />
                    <Field label="Producto"        value={prev?.producto || pesaje?.descripcion || "ARROZ"} />
                  </div>
                  <div className="peso-summary">
                    <div className="peso-item highlight">
                      <span>Peso ajustado (liquidación)</span>
                      <span>{fmt(liq?.peso_ajustado)} kg</span>
                    </div>
                  </div>
                </div>

                {/* Datos de liquidación */}
                <div className="card">
                  <div className="card-title">Datos de Liquidación</div>
                  <div className="result-box">
                    <div className="result-row">
                      <span>Humedad</span><span className="result-val">{fmt(liq?.humedad)} %</span>
                    </div>
                    <div className="result-row">
                      <span>Impureza</span><span className="result-val">{fmt(liq?.impureza)} %</span>
                    </div>
                    <div className="result-row">
                      <span>Factor total</span><span className="result-val">{fmt(liq?.factor_total, 4)}</span>
                    </div>
                    <div className="result-row">
                      <span>Peso ajustado</span>
                      <span className="result-val big">{fmt(liq?.peso_ajustado)} kg</span>
                    </div>
                    <div className="result-row">
                      <span>Precio / kg</span><span className="result-val">{fmtMoney(liq?.precio_kg)}</span>
                    </div>
                  </div>
                  <div className="total-row">
                    <span>TOTAL LIQUIDADO</span>
                    <span className="total-val">{fmtMoney(liq?.total_pagar)}</span>
                  </div>
                </div>

              </div>{/* fin col izq */}

              {/* ════ COLUMNA DERECHA ════ */}
              <div className="liq-col">

                {!despachado ? (
                  <form onSubmit={registrar}>

                    {/* Transporte salida */}
                    <div className="card">
                      <div className="card-title">Transporte de Salida</div>

                      {/* Buscador de placa */}
                      <div className="group">
                        <label className="lbl">Buscar placa, empresa o conductor</label>
                        <div className="veh-search-wrap" ref={placaRef}>
                          <div className="veh-search-box">
                            <svg className="veh-search-icon" viewBox="0 0 20 20" fill="none">
                              <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.8"/>
                              <path d="M13.5 13.5L17 17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                            </svg>
                            <input
                              className="inp veh-search-input"
                              placeholder="Ej: ABC123, Kenworth, empresa…"
                              value={placaSearch}
                              onChange={e => {
                                setPlacaSearch(e.target.value);
                                setShowPlacaDrop(true);
                                if (!e.target.value) { setVehOk(null); setForm(f => ({ ...f, placa_salida: "", empresa_transportadora: "", conductor_salida: "", cedula_conductor_salida: "", telefono_conductor_salida: "" })); }
                              }}
                              onFocus={() => setShowPlacaDrop(true)}
                              autoComplete="off"
                            />
                            {placaSearch && (
                              <button type="button" className="veh-search-clear"
                                onClick={() => { setPlacaSearch(""); setVehOk(null); setShowPlacaDrop(false); setForm(f => ({ ...f, placa_salida: "", empresa_transportadora: "", conductor_salida: "", cedula_conductor_salida: "", telefono_conductor_salida: "" })); }}>
                                ✕
                              </button>
                            )}
                          </div>
                          {showPlacaDrop && (
                            <div className="veh-search-drop">
                              {filteredVeh.length === 0
                                ? <div className="veh-search-empty">Sin resultados para &ldquo;{placaSearch}&rdquo;</div>
                                : filteredVeh.slice(0, 12).map(v => (
                                  <div key={v.id} className="veh-search-item"
                                    onMouseDown={e => { e.preventDefault(); seleccionarVehiculo(v); }}>
                                    <span className="veh-search-placa">{v.placa}</span>
                                    <span className="veh-search-meta">{[v.tipo, v.marca, v.empresa].filter(Boolean).join(" · ")}</span>
                                    {v.conductor_nombre && <span className="veh-search-conductor">{v.conductor_nombre}</span>}
                                  </div>
                                ))
                              }
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Chip vehículo seleccionado */}
                      {vehOk && (
                        <div className="veh-chip">
                          <svg viewBox="0 0 20 20" fill="none" width="16" height="16" style={{flexShrink:0}}>
                            <circle cx="10" cy="10" r="8.5" stroke="#16a34a" strokeWidth="1.5"/>
                            <path d="M6.5 10l2.5 2.5 4.5-5" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          <div>
                            <strong>{vehOk.placa}</strong>
                            {vehOk.marca   ? ` · ${vehOk.marca}`   : ""}
                            {vehOk.tipo    ? ` · ${vehOk.tipo}`    : ""}
                            {vehOk.empresa ? ` · ${vehOk.empresa}` : ""}
                          </div>
                        </div>
                      )}

                      <div className="liq-precio-row" style={{marginTop:12}}>
                        <div className="group">
                          <label className="lbl">Placa vehículo salida</label>
                          <input className="inp" placeholder="Ej. ABC123" value={form.placa_salida}
                            onChange={e => setForm(f => ({ ...f, placa_salida: e.target.value.toUpperCase() }))} required />
                        </div>
                        <div className="group">
                          <label className="lbl">Empresa transportadora</label>
                          <input className="inp" placeholder="Empresa o particular" value={form.empresa_transportadora}
                            onChange={e => setForm(f => ({ ...f, empresa_transportadora: e.target.value }))} />
                        </div>
                        <div className="group">
                          <label className="lbl">Nombre conductor</label>
                          <input className="inp" placeholder="Nombre completo" value={form.conductor_salida}
                            onChange={e => setForm(f => ({ ...f, conductor_salida: e.target.value }))} required />
                        </div>
                        <div className="group">
                          <label className="lbl">Cédula conductor</label>
                          <input className="inp" placeholder="Número de cédula" value={form.cedula_conductor_salida}
                            onChange={e => setForm(f => ({ ...f, cedula_conductor_salida: e.target.value }))} />
                        </div>
                        <div className="group">
                          <label className="lbl">Teléfono conductor</label>
                          <input className="inp" placeholder="Celular/teléfono" value={form.telefono_conductor_salida}
                            onChange={e => setForm(f => ({ ...f, telefono_conductor_salida: e.target.value }))} />
                        </div>
                      </div>
                    </div>

                    {/* Pesaje salida */}
                    <div className="card">
                      <div className="card-title">Pesaje de Salida</div>
                      <div className="liq-precio-row">
                        <div className="group">
                          <label className="lbl">Peso bruto salida (kg)</label>
                          <input className="inp" type="number" step="0.01" min="0" placeholder="kg"
                            value={form.peso_bruto_salida}
                            onChange={e => setForm(f => ({ ...f, peso_bruto_salida: e.target.value }))} required />
                        </div>
                        <div className="group">
                          <label className="lbl">Peso tara salida (kg)</label>
                          <input className="inp" type="number" step="0.01" min="0" placeholder="kg"
                            value={form.peso_tara_salida}
                            onChange={e => setForm(f => ({ ...f, peso_tara_salida: e.target.value }))} required />
                        </div>
                      </div>
                      <div className="result-box" style={{ marginTop: 12 }}>
                        <div className="result-row">
                          <span>Peso neto salida</span>
                          <span className="result-val big">{pesoNeto !== null ? fmt(pesoNeto) + " kg" : "—"}</span>
                        </div>
                        <div className="result-row">
                          <span>{loteData?.trilla ? "Disponible a despachar" : "Peso ajustado liq."}</span>
                          <span className="result-val">{fmt(pesoAjustado)} kg</span>
                        </div>
                        {diferencia !== null && (
                          <div className="result-row">
                            <span>Diferencia</span>
                            <span className={`result-val ${Math.abs(diferencia) > 10 ? "alerta-num" : ""}`}>
                              {diferencia > 0 ? "+" : ""}{fmt(diferencia)} kg
                            </span>
                          </div>
                        )}
                      </div>
                      {diferencia !== null && Math.abs(diferencia) > 10 && (
                        <div className="alerta-warn">
                          El peso neto de salida difiere del peso ajustado en más de 10 kg. Verifique antes de continuar.
                        </div>
                      )}
                    </div>

                    {/* Observaciones */}
                    <div className="card">
                      <div className="card-title">Observaciones</div>
                      <div className="group">
                        <textarea className="inp" rows={3} placeholder="Observaciones opcionales…"
                          value={form.observaciones}
                          onChange={e => setForm(f => ({ ...f, observaciones: e.target.value }))} />
                      </div>
                    </div>

                    {/* Certificado de calidad — solo descarga si tiene datos de trilla */}
                    {trilla && (
                      <div className="card cert-preview-card">
                        <div className="cert-preview-head">
                          <span className="cert-preview-ico">📋</span>
                          <div>
                            <p className="cert-preview-title">Certificado de Calidad disponible</p>
                            <p className="cert-preview-sub">Lote <strong>{loteData.previo.lote_id}</strong> · Datos tomados del proceso de trilla</p>
                          </div>
                          <button type="button" className="btn-cert-dl" onClick={() => generarCertificadoCalidad()}>
                            🖨 Generar / Imprimir
                          </button>
                        </div>
                        <div className="cert-preview-data">
                          {trilla.presentacion  && <span className="cert-chip">📦 {trilla.presentacion}</span>}
                          {trilla.rendimiento   != null && <span className="cert-chip">⚙ Rend. {trilla.rendimiento}%</span>}
                          {trilla.humedad_salida != null && <span className="cert-chip">💧 Hum. {trilla.humedad_salida}%</span>}
                          {trilla.fecha_vencimiento && <span className="cert-chip">📅 Vence: {trilla.fecha_vencimiento}</span>}
                        </div>
                      </div>
                    )}
                    {!trilla && (
                      <div className="card cert-nodata-card">
                        <span className="cert-nodata-ico">⚠</span>
                        <div>
                          <p className="cert-nodata-title">Sin datos de trilla</p>
                          <p className="cert-nodata-sub">El certificado de calidad se genera desde los datos ingresados en el módulo de Trilla. Este lote aún no tiene datos de trilla registrados.</p>
                        </div>
                      </div>
                    )}

                    <div className="actions">
                      <button type="submit" className="btn primary" disabled={guardando}>
                        {guardando ? "Registrando…" : "Registrar Despacho"}
                      </button>
                    </div>

                  </form>
                ) : (

                  /* ── YA DESPACHADO ── */
                  <div className="card">
                    <div className="card-title">Despacho Registrado</div>
                    <div className="result-box">
                      <div className="result-row">
                        <span>N° Despacho</span>
                        <span className="result-val big">{despachado.numero_despacho}</span>
                      </div>
                      <div className="result-row">
                        <span>Fecha / Hora</span>
                        <span className="result-val">{despachado.fecha_despacho} {despachado.hora_despacho}</span>
                      </div>
                      <div className="result-row">
                        <span>Placa salida</span>
                        <span className="result-val">{despachado.placa_salida}</span>
                      </div>
                      <div className="result-row">
                        <span>Conductor</span>
                        <span className="result-val">{despachado.conductor_salida}</span>
                      </div>
                      <div className="result-row">
                        <span>Peso neto salida</span>
                        <span className="result-val">{fmt(despachado.peso_neto_salida)} kg</span>
                      </div>
                    </div>
                    <div className="total-row">
                      <span>PESO AJUSTADO LIQ.</span>
                      <span className="total-val">{fmt(despachado.peso_ajustado_liq)} kg</span>
                    </div>
                    <div className="actions">
                      <button className="btn primary" onClick={imprimirTiquete}>
                        Generar Tiquete de Despacho
                      </button>
                      <button className="btn" style={{ background: "#1d4ed8", color: "#fff" }} onClick={() => generarCertificadoCalidad()}>
                        📋 Certificado de Calidad
                      </button>
                    </div>
                  </div>
                )}

              </div>{/* fin col der */}
            </div>
          )}

          {/* ── HISTORIAL ── */}
          <div className="card" style={{ marginTop: 28 }}>
            <div className="card-title">Historial de Despachos</div>
            {cargLista ? (
              <div className="loading-banner">Cargando historial…</div>
            ) : lista.length === 0 ? (
              <div className="estado-tabla">No hay despachos registrados aún.</div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>N° Despacho</th>
                      <th>Lote</th>
                      <th>Propietario</th>
                      <th>Placa salida</th>
                      <th>Conductor</th>
                      <th>Peso neto</th>
                      <th>Total liq.</th>
                      <th>Fecha</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lista.map(d => (
                      <tr key={d.id}>
                        <td><span className="desp-tag">{d.numero_despacho}</span></td>
                        <td><span className="lote-tag">{d.lote_id}</span></td>
                        <td>{d.propietario || "—"}</td>
                        <td><span className="placa-tag">{d.placa_salida}</span></td>
                        <td>{d.conductor_salida}</td>
                        <td>{fmt(d.peso_neto_salida)} kg</td>
                        <td>{fmtMoney(d.total_pagar)}</td>
                        <td>{d.fecha_despacho}</td>
                        <td style={{ textAlign: "center", whiteSpace: "nowrap" }}>
                          <button
                            className="print-row-btn"
                            disabled={imprimiendoFila === d.id}
                            onClick={() => imprimirDesdeHistorial(d)}
                            title="Imprimir tiquete"
                          >
                            {imprimiendoFila === d.id ? "…" : "🖨 Tiquete"}
                          </button>
                          <button
                            className="print-row-btn"
                            style={{ marginLeft: 4, background: "#eff6ff", color: "#1d4ed8", border: "1.5px solid #3b82f6" }}
                            disabled={imprimiendoFila === d.id + "_cert"}
                            onClick={async () => {
                              setImprimiendoFila(d.id + "_cert");
                              try {
                                const r = await fetch(`/api/despachos/lote-datos/${encodeURIComponent(d.lote_id)}`);
                                if (!r.ok) { alert("Error al cargar datos."); return; }
                                const datos = await r.json();
                                if (!datos.trilla) { alert("Sin datos de trilla para este lote."); return; }
                                await generarCertificadoCalidad(datos.trilla, datos);
                              } catch (e) { alert(e.message); }
                              finally { setImprimiendoFila(null); }
                            }}
                            title="Imprimir certificado de calidad"
                          >
                            {imprimiendoFila === d.id + "_cert" ? "…" : "📋 Cert."}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>{/* wrapper */}
      </div>{/* app */}

      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; font-family: Arial, sans-serif; }
        .app     { width: 100%; }
        .wrapper { max-width: 1200px; margin: 0 auto; }

        /* ── HEADER ── */
        .page-header   { margin-bottom: 24px; padding-bottom: 4px; border-bottom: 2px solid #e5e7eb; }
        .page-eyebrow  { font-size: 11px; font-weight: 700; letter-spacing: 2px; color: #2e7d32; text-transform: uppercase; margin-bottom: 4px; }
        .title         { font-size: 26px; font-weight: 700; color: #111827; line-height: 1.1; }
        .title span    { color: #2e7d32; font-weight: 400; }
        .subtitle-text { font-size: 13px; color: #6b7280; margin-top: 4px; }

        /* ── MENSAJES ── */
        .msg       { display: flex; align-items: center; gap: 10px; padding: 12px 18px; border-radius: 8px; font-size: 14px; font-weight: 500; margin-bottom: 16px; }
        .msg.ok    { background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; }
        .msg.error { background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }
        .msg-icon  { width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; flex-shrink: 0; }
        .msg.ok    .msg-icon { background: #166534; color: white; }
        .msg.error .msg-icon { background: #991b1b; color: white; }

        /* ── CARDS ── */
        .card       { background: #fafafa; border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px 24px; margin-bottom: 16px; box-shadow: 0 1px 4px rgba(0,0,0,.04); }
        .card-title { font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: #2e7d32; margin-bottom: 14px; padding-bottom: 10px; border-bottom: 1px solid #e5e7eb; }

        /* ── COMBO ── */
        .combo          { position: relative; }
        .combo-box      { display: flex; }
        .combo-input    { flex: 1; padding: 9px 12px; border: 1.5px solid #e2e8f0; border-radius: 8px 0 0 8px; font-size: .9rem; outline: none; background: #f8fafc; color: #1e293b; transition: border-color .15s; }
        .combo-input:focus { border-color: #16a34a; background: #fff; box-shadow: 0 0 0 3px #dcfce7; }
        .combo-toggle   { background: #0f4c35; color: #fff; border: none; padding: 0 14px; border-radius: 0 8px 8px 0; cursor: pointer; font-size: .9rem; }
        .combo-toggle:hover { background: #166534; }
        .combo-dropdown { position: absolute; top: 100%; left: 0; right: 0; background: #fff; border: 1.5px solid #e2e8f0; border-radius: 10px; z-index: 200; max-height: 240px; overflow-y: auto; box-shadow: 0 8px 24px rgba(0,0,0,.12); margin-top: 4px; }
        .combo-item     { display: flex; align-items: center; gap: 10px; padding: 10px 14px; cursor: pointer; border-bottom: 1px solid #f1f5f9; font-size: .88rem; }
        .combo-item:hover { background: #f0fdf4; }
        .combo-empty  { padding: 12px 14px; color: #94a3b8; font-size: .85rem; font-style: italic; text-align: center; }

        /* ── BUSCADOR VEHÍCULO SALIDA ── */
        .veh-search-wrap  { position: relative; }
        .veh-search-box   { position: relative; display: flex; align-items: center; }
        .veh-search-icon  { position: absolute; left: 11px; color: #94a3b8; pointer-events: none; width: 16px; height: 16px; flex-shrink: 0; }
        .veh-search-input { padding-left: 34px !important; padding-right: 32px !important; width: 100%; }
        .veh-search-clear { position: absolute; right: 9px; background: none; border: none; color: #94a3b8; cursor: pointer; font-size: .85rem; padding: 0 2px; line-height: 1; }
        .veh-search-clear:hover { color: #475569; }
        .veh-search-drop  { position: absolute; top: calc(100% + 4px); left: 0; right: 0; background: #fff; border: 1.5px solid #e2e8f0; border-radius: 10px; box-shadow: 0 8px 24px rgba(0,0,0,.12); z-index: 300; max-height: 240px; overflow-y: auto; }
        .veh-search-item  { padding: 10px 14px; cursor: pointer; display: flex; flex-direction: column; gap: 2px; border-bottom: 1px solid #f1f5f9; }
        .veh-search-item:last-child { border-bottom: none; }
        .veh-search-item:hover { background: #f0fdf4; }
        .veh-search-placa { font-size: .9rem; font-weight: 800; color: #1e293b; letter-spacing: 1.5px; }
        .veh-search-meta  { font-size: .76rem; color: #64748b; font-weight: 500; }
        .veh-search-conductor { font-size: .73rem; color: #94a3b8; }
        .veh-search-empty { padding: 16px 14px; color: #94a3b8; font-size: .85rem; font-style: italic; text-align: center; }
        .veh-chip { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-radius: 8px; margin-top: 8px; margin-bottom: 4px; font-size: .88rem; background: #f0fdf4; border: 1.5px solid #86efac; color: #166534; }
        .combo-id       { font-weight: 800; font-family: monospace; color: #0f4c35; min-width: 90px; letter-spacing: .5px; }
        .combo-info     { flex: 1; color: #64748b; font-size: .82rem; }
        .estado-badge.liquidado { background: #dbeafe; color: #1e40af; border: 1px solid #bfdbfe; font-size: .7rem; font-weight: 700; padding: 2px 8px; border-radius: 12px; white-space: nowrap; }

        /* ── LOADING ── */
        .loading-banner { display: flex; align-items: center; gap: 10px; background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; padding: 10px 16px; border-radius: 8px; font-size: .88rem; margin-bottom: 16px; }

        /* ── GRID ── */
        .liq-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        @media (max-width: 780px) { .liq-grid { grid-template-columns: 1fr; } }
        .liq-col  { display: flex; flex-direction: column; }

        /* ── BADGE ESTADO ── */
        .badge-row  { margin-bottom: 10px; }
        .badge-estado { display: inline-block; font-size: .72rem; font-weight: 700; letter-spacing: 1px; padding: 3px 12px; border-radius: 14px; }
        .badge-estado.liquidado  { background: #dbeafe; color: #1e40af; border: 1px solid #bfdbfe; }
        .badge-estado.despachado { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }

        /* ── INFO GRID ── */
        .info-grid  { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 16px; margin-bottom: 12px; }
        .field-row  { display: flex; flex-direction: column; gap: 1px; }
        .field-label { font-size: .68rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: .5px; }
        .field-value { font-size: .88rem; color: #1e293b; }
        .field-value.bold { font-weight: 700; color: #0f4c35; }

        /* ── PESO SUMMARY ── */
        .peso-summary { margin-top: 8px; }
        .peso-item    { display: flex; justify-content: space-between; font-size: .88rem; padding: 4px 0; }
        .peso-item.highlight { font-weight: 700; color: #0f4c35; border-top: 1px dashed #e2e8f0; padding-top: 8px; margin-top: 4px; }

        /* ── RESULT BOX ── */
        .result-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; }
        .result-row { display: flex; justify-content: space-between; align-items: center; padding: 4px 0; font-size: .88rem; border-bottom: 1px solid #f1f5f9; }
        .result-row:last-child { border-bottom: none; }
        .result-val     { font-weight: 600; color: #0f4c35; }
        .result-val.big { font-size: 1.05rem; font-weight: 800; color: #16a34a; }
        .alerta-num     { color: #b45309 !important; }

        /* ── TOTAL ROW ── */
        .total-row  { display: flex; justify-content: space-between; align-items: center; background: #0f4c35; border-radius: 0 0 8px 8px; padding: 10px 14px; margin-top: 0; }
        .total-row span { font-size: .72rem; font-weight: 700; letter-spacing: 1px; color: rgba(255,255,255,.7); text-transform: uppercase; }
        .total-val  { font-size: 1.25rem; font-weight: 900; color: #86efac; }

        /* ── FORMULARIO ── */
        .liq-precio-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 16px; }
        .group { display: flex; flex-direction: column; gap: 4px; margin-bottom: 8px; }
        .lbl   { font-size: .72rem; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: .3px; }
        .inp   { padding: 9px 12px; border: 1.5px solid #e2e8f0; border-radius: 8px; font-size: .9rem; outline: none; width: 100%; background: #f8fafc; color: #1e293b; transition: border-color .15s, box-shadow .15s; }
        .inp:focus   { border-color: #16a34a; background: #fff; box-shadow: 0 0 0 3px #dcfce7; }
        textarea.inp { resize: vertical; font-family: inherit; }

        /* ── ALERTA ── */
        .alerta-warn { background: #fffbeb; border: 1px solid #fcd34d; color: #92400e; padding: 9px 14px; border-radius: 8px; font-size: .82rem; font-weight: 600; margin-top: 10px; }
        .alerta-condicionado-desp { background: #fffbeb; border: 1.5px solid #fcd34d; color: #92400e; padding: 10px 14px; border-radius: 8px; font-size: .84rem; font-weight: 600; margin: 10px 0 4px; }

        /* ── ACTIONS ── */
        .actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 4px; flex-wrap: wrap; }
        .btn     { padding: 10px 24px; border-radius: 7px; font-size: 14px; font-weight: 600; cursor: pointer; border: none; transition: background .15s; display: inline-flex; align-items: center; gap: 6px; }
        .btn:disabled      { opacity: .55; cursor: not-allowed; }
        .btn.primary       { background: #2e7d32; color: #fff; }
        .btn.primary:hover:not(:disabled) { background: #1b5e20; }
        .btn.outline       { background: #fff; color: #374151; border: 1px solid #d1d5db; }
        .btn.outline:hover { background: #f9fafb; }

        /* ── TABLA HISTORIAL ── */
        .table-wrap { overflow-x: auto; }
        table       { width: 100%; border-collapse: collapse; font-size: .85rem; }
        thead tr    { background: #0f4c35; }
        th          { padding: 11px 14px; text-align: left; font-size: .72rem; font-weight: 700; color: #fff; white-space: nowrap; text-transform: uppercase; letter-spacing: .5px; }
        thead th:first-child { border-radius: 8px 0 0 0; }
        thead th:last-child  { border-radius: 0 8px 0 0; }
        tbody tr      { border-bottom: 1px solid #f1f5f9; }
        tbody tr:hover { background: #f0fdf4; }
        td            { padding: 10px 14px; vertical-align: middle; color: #374151; }
        .estado-tabla { text-align: center; color: #94a3b8; padding: 36px; font-size: .88rem; font-style: italic; }
        .lote-tag  { display: inline-block; background: #dcfce7; color: #166534; border: 1px solid #86efac; font-family: monospace; font-weight: 700; font-size: .72rem; padding: 2px 8px; border-radius: 20px; letter-spacing: .3px; }
        .desp-tag  { display: inline-block; background: #dbeafe; color: #1e40af; border: 1px solid #93c5fd; font-family: monospace; font-weight: 700; font-size: .72rem; padding: 2px 8px; border-radius: 20px; }
        .print-row-btn { padding: 4px 12px; border-radius: 6px; font-size: .78rem; font-weight: 700; cursor: pointer; border: 1.5px solid #16a34a; background: #f0fdf4; color: #166534; transition: all .12s; white-space: nowrap; }
        .print-row-btn:hover:not(:disabled) { background: #16a34a; color: #fff; }
        .print-row-btn:disabled { opacity: .5; cursor: not-allowed; }
        .placa-tag { display: inline-block; background: #1e293b; color: #fbbf24; border: 2px solid #374151; font-family: monospace; font-weight: 800; font-size: .82rem; padding: 2px 8px; border-radius: 5px; letter-spacing: 2px; }

        /* ── CERT PREVIEW ── */
        .cert-preview-card  { border-top: 3px solid #1d4ed8 !important; padding: 16px 20px !important; margin-bottom: 16px; }
        .cert-preview-head  { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
        .cert-preview-ico   { font-size: 28px; flex-shrink: 0; }
        .cert-preview-title { font-size: .88rem; font-weight: 800; color: #1e3a5f; margin: 0 0 2px; }
        .cert-preview-sub   { font-size: .76rem; color: #64748b; margin: 0; }
        .btn-cert-dl        { margin-left: auto; padding: 8px 18px; background: #1d4ed8; color: #fff; border: none; border-radius: 8px; font-size: .8rem; font-weight: 700; cursor: pointer; white-space: nowrap; flex-shrink: 0; }
        .btn-cert-dl:hover  { background: #1e40af; }
        .cert-preview-data  { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
        .cert-chip          { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; border-radius: 20px; padding: 3px 12px; font-size: .75rem; font-weight: 600; }
        .cert-nodata-card   { border-top: 3px solid #f59e0b !important; display: flex; align-items: flex-start; gap: 14px; padding: 16px 20px !important; margin-bottom: 16px; }
        .cert-nodata-ico    { font-size: 22px; flex-shrink: 0; margin-top: 2px; }
        .cert-nodata-title  { font-size: .85rem; font-weight: 700; color: #92400e; margin: 0 0 3px; }
        .cert-nodata-sub    { font-size: .76rem; color: #78350f; margin: 0; line-height: 1.5; }
      `}</style>
    </>
  );
}

/* ── Field component ── */
function Field({ label, value, bold }) {
  return (
    <div className="field-row">
      <span className="field-label">{label}</span>
      <span className={`field-value${bold ? " bold" : ""}`}>{value || "—"}</span>
    </div>
  );
}
