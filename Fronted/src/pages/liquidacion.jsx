import React, { useState, useEffect, useRef, useCallback } from "react";

/* ──────────────────────────────────────────────────────────────
   FÓRMULAS DE LIQUIDACIÓN
   Factor humedad   = (100 - H°) / (100 - 25)   = (100 - H) / 75
   Factor impurezas = (100 - I°) / (100 - 5)    = (100 - I) / 95
   Factor total     = factor_humedad × factor_impureza
   Peso ajustado    = peso_neto × factor_total
   Total a pagar    = peso_ajustado × precio
────────────────────────────────────────────────────────────── */
function calcFactores(humedad, impureza) {
  const h = parseFloat(humedad);
  const i = parseFloat(impureza);
  if (isNaN(h) || isNaN(i)) return { fH: null, fI: null, fT: null };
  const fH = (100 - h) / 75;
  const fI = (100 - i) / 95;
  const fT = fH * fI;
  return { fH, fI, fT };
}

function fmt(n, dec = 2) {
  if (n === null || n === undefined || n === "" || isNaN(n)) return "—";
  return Number(n).toLocaleString("es-CO", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

function fmtMoney(n) {
  if (n === null || n === undefined || n === "" || isNaN(n)) return "—";
  return Number(n).toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
}

/* ── Rangos de calidad (mismos que certificado) ─────────────
   Humedad   : 12,0 – 14,0 %      (rango)  bajo=rojo, ok=verde, alto=rojo
   Impurezas : 0 – 0,1 %  MAX     (máximo) ok=verde, alto=rojo
   G.Partido : 0 – 9 %    MAX     (máximo) ok=verde, alto=rojo
   Rendimiento: 50 – 70 %  (rango) bajo=rojo, ok=verde, alto=verde oscuro
──────────────────────────────────────────────────────────── */
const RANGOS = {
  humedad:       { min: 12,  max: 14,  spec: "12,0 – 14,0 %" },
  impureza:      {           max: 0.1, spec: "0,1 % MAX"      },
  grano_partido: {           max: 9,   spec: "9 % MAX"        },
  rendimiento:   { min: 50,  max: 70,  spec: "50 – 70 %"      },
};

function estadoCalidad(value, rango) {
  const v = parseFloat(value);
  if (isNaN(v) || rango == null) return "neutral";
  if (rango.min !== undefined && v < rango.min) return "low";
  if (rango.max !== undefined && v > rango.max) return "high";
  return "ok";
}

export default function Liquidacion() {
  // ── Búsqueda de lote ──────────────────────────────────────────
  const [busq, setBusq]       = useState("");
  const [open, setOpen]       = useState(false);
  const [lotes, setLotes]     = useState([]);
  const [buscando, setBuscando] = useState(false);
  const dropRef = useRef(null);

  // ── Datos del lote cargado ────────────────────────────────────
  const [loteData, setLoteData] = useState(null); // { previo, pesaje, trilla }
  const [cargando, setCargando] = useState(false);
  const [msg, setMsg]           = useState({ tipo: "", texto: "" });

  // ── Campos de liquidación ─────────────────────────────────────
  const [unidad, setUnidad]       = useState("kg");   // 'kg' | 'ton'
  const [precio, setPrecio]       = useState("");
  const [observaciones, setObs]   = useState("");
  const [guardando, setGuardando] = useState(false);
  const [yaLiquidado, setYaLiquidado] = useState(false);   // lote ya tiene liquidación
  const [modoEdicion, setModoEdicion] = useState(false);  // usuario quiere editar
  const [lista, setLista]           = useState([]);
  const [cargLista, setCargLista]   = useState(false);
  const [imprimiendoFila, setImprimiendoFila] = useState(null); // lote_id en proceso

  // ── Cargar lista de liquidaciones ─────────────────────────────
  const cargarLista = useCallback(async () => {
    setCargLista(true);
    try {
      const res = await fetch("/api/liquidaciones");
      const d   = await res.json();
      setLista(Array.isArray(d) ? d : []);
    } catch { setLista([]); }
    finally { setCargLista(false); }
  }, []);

  useEffect(() => { cargarLista(); }, [cargarLista]);

  // ── Cerrar dropdown al clic fuera ─────────────────────────────
  useEffect(() => {
    const h = e => { if (dropRef.current && !dropRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // ── Buscar lotes (debounce) ───────────────────────────────────
  useEffect(() => {
    if (!open) return;
    setBuscando(true);
    const t = setTimeout(async () => {
      try {
        const q   = busq.trim();
        const url = `/api/liquidaciones/buscar${q ? `?q=${encodeURIComponent(q)}` : ""}`;
        const res = await fetch(url);
        const d   = await res.json();
        setLotes(Array.isArray(d) ? d : []);
      } catch { setLotes([]); } finally { setBuscando(false); }
    }, 350);
    return () => clearTimeout(t);
  }, [busq, open]);

  const mostrarMsg = (tipo, texto) => {
    setMsg({ tipo, texto });
    setTimeout(() => setMsg({ tipo: "", texto: "" }), 6000);
  };

  // ── Seleccionar lote ──────────────────────────────────────────
  const handleSelect = useCallback(async (previo) => {
    setOpen(false);
    setBusq(previo.lote_id);
    setCargando(true);
    setModoEdicion(false);
    try {
      const res = await fetch(`/api/liquidaciones/lote-datos/${previo.lote_id}`);
      const d   = await res.json();
      if (!res.ok) throw new Error(d.error);
      setLoteData(d);

      // Si ya hay liquidación guardada, cargarla y marcar como ya liquidado
      const r2 = await fetch(`/api/liquidaciones/${previo.lote_id}`);
      if (r2.ok) {
        const liq = await r2.json();
        setPrecio(liq.precio ?? "");
        setUnidad(liq.unidad_precio || "kg");
        setObs(liq.observaciones || "");
        setYaLiquidado(true);
      } else {
        setPrecio("");
        setUnidad("kg");
        setObs("");
        setYaLiquidado(false);
      }
    } catch (e) { mostrarMsg("error", e.message); }
    finally { setCargando(false); }
  }, []);

  // ── Derivar humedad e impureza desde los datos del lote ───────
  const getCalidad = () => {
    if (!loteData) return { humedad: null, impureza: null, origen: "" };
    const t = loteData.trilla;
    const p = loteData.pesaje;

    // Prioridad: trilla.humedad_salida > pesaje.humedad_final > pesaje.humedad_inicial
    const humedad =
      t?.humedad_salida   != null ? t.humedad_salida   :
      p?.humedad_final    != null ? p.humedad_final    :
      p?.humedad_inicial  != null ? p.humedad_inicial  : null;

    const impureza =
      t?.impureza_salida  != null ? t.impureza_salida  :
      p?.impureza_final   != null ? p.impureza_final   :
      p?.impureza_inicial != null ? p.impureza_inicial : null;

    const origen =
      t?.humedad_salida != null ? "trilla (salida)" :
      p?.humedad_final  != null ? "pesaje (base)"   : "pesaje (laboratorio)";

    return { humedad, impureza, origen };
  };

  // ── Peso neto del lote ────────────────────────────────────────
  const getPesoNeto = () => {
    if (!loteData) return null;
    const p = loteData.pesaje;
    const pr = loteData.previo;
    if (p) {
      const pb = parseFloat(p.peso_bruto)      || 0;
      const ta = parseFloat(p.peso_tara)        || 0;
      const em = parseFloat(p.destare_empaque)  || 0;
      return pb - ta - em;
    }
    return parseFloat(pr.peso_neto) || null;
  };

  // ── Cálculos reactivos ────────────────────────────────────────
  const { humedad, impureza, origen } = getCalidad();
  const pesoNeto = getPesoNeto();
  const { fH, fI, fT } = calcFactores(humedad, impureza);

  const pesoAjustado = (fT != null && pesoNeto != null) ? pesoNeto * fT : null;

  const precioNum = parseFloat(precio) || null;
  // Si unidad = 'ton', convertir precio a por-kg
  const precioKg = precioNum != null
    ? (unidad === "ton" ? precioNum / 1000 : precioNum)
    : null;
  const totalPagar = (pesoAjustado != null && precioKg != null) ? pesoAjustado * precioKg : null;

  // ── Guardar liquidación ───────────────────────────────────────
  const handleGuardar = async () => {
    if (!loteData?.previo) return mostrarMsg("error", "Seleccione un lote.");
    if (yaLiquidado && !modoEdicion)
      return mostrarMsg("error", "Este lote ya está liquidado. Haga clic en 'Editar' para modificarlo.");
    if (!precio || isNaN(parseFloat(precio))) return mostrarMsg("error", "Ingrese un precio válido.");
    if (humedad === null || impureza === null)
      return mostrarMsg("error", "El lote no tiene datos de humedad/impureza para liquidar.");

    setGuardando(true);
    const now   = new Date();
    const fecha = `${String(now.getDate()).padStart(2,"0")}/${String(now.getMonth()+1).padStart(2,"0")}/${now.getFullYear()}`;
    const user  = JSON.parse(localStorage.getItem("user") || "{}");

    try {
      const res = await fetch("/api/liquidaciones", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lote_id:          loteData.previo.lote_id,
          fecha_liquidacion: fecha,
          humedad, impureza,
          factor_humedad:   fH, factor_impureza: fI, factor_total: fT,
          peso_neto:        pesoNeto, peso_ajustado: pesoAjustado,
          unidad_precio:    unidad, precio: precioKg, total_pagar: totalPagar,
          observaciones,
          usuario:          user.nombre || "Sistema",
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Error al guardar");
      mostrarMsg("ok", `Liquidación del lote ${loteData.previo.lote_id} guardada correctamente.`);
      cargarLista();
      // Limpiar formulario para evitar re-guardar accidentalmente
      setLoteData(null);
      setBusq("");
      setPrecio("");
      setUnidad("kg");
      setObs("");
      setYaLiquidado(false);
      setModoEdicion(false);
    } catch (e) { mostrarMsg("error", e.message); }
    finally { setGuardando(false); }
  };

  // ── Generar comprobante de liquidación (impresión) ────────────
  const handleComprobante = () => {
    if (!loteData) return;
    if (!precio || isNaN(parseFloat(precio)))
      return mostrarMsg("error", "Ingrese el precio antes de generar el comprobante.");
    if (humedad === null || impureza === null)
      return mostrarMsg("error", "Faltan datos de calidad (humedad/impureza).");

    const { previo, pesaje, trilla } = loteData;
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const now  = new Date();
    const fechaEmision = `${String(now.getDate()).padStart(2,"0")}/${String(now.getMonth()+1).padStart(2,"0")}/${now.getFullYear()}`;
    const producto = (pesaje?.descripcion || previo.producto || "ARROZ").toUpperCase();

    const css = `
      *{box-sizing:border-box;margin:0;padding:0;}
      body{font-family:Arial,Helvetica,sans-serif;font-size:10.5px;width:750px;margin:0 auto;padding:18px 22px;color:#1a1a1a;}
      table{width:100%;border-collapse:collapse;margin-bottom:8px;}
      td,th{border:1px solid #7a7a7a;padding:4px 8px;font-size:10.5px;vertical-align:middle;}
      .logo-td{width:148px;border:1px solid #7a7a7a;text-align:center;padding:10px 6px;}
      .logo-name{color:#2f6e18;font-size:17px;font-weight:900;font-style:italic;line-height:1;letter-spacing:-0.5px;}
      .logo-sub{color:#2f6e18;font-size:7.5px;letter-spacing:0.4px;line-height:1.45;margin-top:3px;}
      .title-td{text-align:center;border:1px solid #7a7a7a;padding:16px 12px;}
      .cert-num{font-size:14px;font-weight:bold;}
      .cert-prod{font-size:11px;margin-top:10px;}
      .sh{background:#5a5a5a;color:#fff;text-align:center;font-weight:bold;font-size:10.5px;letter-spacing:2px;padding:5px 8px;border-color:#5a5a5a;}
      .ssh{background:#8a8a8a;color:#fff;text-align:center;font-weight:bold;font-size:10px;letter-spacing:1.5px;padding:4px 8px;border-color:#8a8a8a;}
      .lb{background:#e6e6e6;font-weight:bold;font-size:10px;white-space:nowrap;padding:4px 8px;}
      .vl{font-size:10.5px;}
      .tc{text-align:center;}
      .num{text-align:right;font-weight:bold;}
      .total-row td{background:#1a3a0f;color:white;font-weight:bold;font-size:12px;}
      .footer-sigs{display:flex;justify-content:space-around;margin-top:40px;}
      .sig{text-align:center;}
      .sig-line{border-top:1px solid #333;width:178px;margin:0 auto 5px;}
      .sig-name{font-size:10.5px;font-weight:bold;}
      .sig-role{font-size:10px;color:#555;}
      @media print{body{padding:8px;width:100%;}@page{margin:10mm;}}
    `;

    const precioMostrar = unidad === "ton"
      ? `${fmtMoney(parseFloat(precio))} / ton`
      : `${fmtMoney(precioKg)} / kg`;

    const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"/><title>Liquidación ${previo.lote_id}</title>
<style>${css}</style></head>
<body>

<!-- Encabezado -->
<table>
  <tr>
    <td class="logo-td">
      <svg width="60" height="54" viewBox="0 0 60 54" xmlns="http://www.w3.org/2000/svg" style="display:block;margin:0 auto 5px;">
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
      <div class="logo-name">conagro</div>
      <div class="logo-sub">COMERCIALIZADORA<br/>AGRÍCOLA NACI</div>
    </td>
    <td class="title-td">
      <div class="cert-num">COMPROBANTE DE LIQUIDACIÓN</div>
      <div class="cert-prod">LOTE: ${previo.lote_id}&nbsp;&nbsp;|&nbsp;&nbsp;PRODUCTO: ${producto}</div>
      <div style="font-size:10px;margin-top:6px;color:#555;">Fecha de emisión: ${fechaEmision}&nbsp;&nbsp;|&nbsp;&nbsp;Elaborado por: ${user.nombre || "Sistema"}</div>
    </td>
  </tr>
</table>

<!-- Datos generales -->
<table>
  <tr><td class="sh" colspan="4">DATOS GENERALES</td></tr>
  <tr>
    <td class="lb">CLIENTE:</td><td class="vl">${previo.propietario || ""}</td>
    <td class="lb">NIT / CÉDULA:</td><td class="vl">${previo.cedula_nit || ""}</td>
  </tr>
  <tr>
    <td class="lb">PLACA VEHÍCULO:</td><td class="vl">${previo.placa || ""}</td>
    <td class="lb">CONDUCTOR:</td><td class="vl">${previo.nombre_conductor || pesaje?.nombre || ""}</td>
  </tr>
  <tr>
    <td class="lb">PRODUCTO:</td><td class="vl">${producto}</td>
    <td class="lb">PROCEDENCIA:</td><td class="vl">${pesaje?.procedencia || ""}</td>
  </tr>
  <tr>
    <td class="lb">PESO BRUTO:</td><td class="vl">${pesaje?.peso_bruto != null ? fmt(pesaje.peso_bruto) + " kg" : ""}</td>
    <td class="lb">PESO TARA:</td><td class="vl">${pesaje?.peso_tara != null ? fmt(pesaje.peso_tara) + " kg" : ""}</td>
  </tr>
  <tr>
    <td class="lb">DESTARE EMPAQUE:</td><td class="vl">${pesaje?.destare_empaque != null ? fmt(pesaje.destare_empaque) + " kg" : ""}</td>
    <td class="lb">PESO NETO:</td><td class="vl" style="font-weight:bold;">${pesoNeto != null ? fmt(pesoNeto) + " kg" : ""}</td>
  </tr>
</table>

<!-- Calidad -->
<table>
  <tr><td class="sh" colspan="4">ANÁLISIS DE CALIDAD (${origen})</td></tr>
  <tr>
    <td class="lb">HUMEDAD (H°):</td><td class="vl tc">${humedad != null ? humedad + " %" : "—"}</td>
    <td class="lb">IMPUREZAS (I°):</td><td class="vl tc">${impureza != null ? impureza + " %" : "—"}</td>
  </tr>
  ${trilla ? `
  <tr>
    <td class="lb">GRANO PARTIDO:</td><td class="vl tc">${trilla.grano_partido_salida != null ? trilla.grano_partido_salida + " %" : "—"}</td>
    <td class="lb">RENDIMIENTO TRILLA:</td><td class="vl tc">${trilla.rendimiento != null ? trilla.rendimiento + " %" : "—"}</td>
  </tr>` : ""}
</table>

<!-- Factores de liquidación -->
<table>
  <tr><td class="sh" colspan="4">FACTORES DE LIQUIDACIÓN</td></tr>
  <tr>
    <td class="lb">FÓRMULA HUMEDAD:</td>
    <td class="vl">(100 - ${humedad}) / 75</td>
    <td class="lb">FACTOR HUMEDAD:</td>
    <td class="vl tc num">${fH != null ? fH.toFixed(6) : "—"}</td>
  </tr>
  <tr>
    <td class="lb">FÓRMULA IMPUREZAS:</td>
    <td class="vl">(100 - ${impureza}) / 95</td>
    <td class="lb">FACTOR IMPUREZAS:</td>
    <td class="vl tc num">${fI != null ? fI.toFixed(6) : "—"}</td>
  </tr>
  <tr>
    <td class="lb" colspan="2">FACTOR TOTAL = Factor Humedad × Factor Impurezas</td>
    <td class="lb">FACTOR TOTAL:</td>
    <td class="vl tc num">${fT != null ? fT.toFixed(6) : "—"}</td>
  </tr>
</table>

<!-- Liquidación económica -->
<table>
  <tr><td class="sh" colspan="4">LIQUIDACIÓN ECONÓMICA</td></tr>
  <tr>
    <td class="lb">PESO NETO ORIGINAL:</td>
    <td class="vl num">${pesoNeto != null ? fmt(pesoNeto) + " kg" : "—"}</td>
    <td class="lb">FACTOR TOTAL:</td>
    <td class="vl num">${fT != null ? fT.toFixed(6) : "—"}</td>
  </tr>
  <tr>
    <td class="lb">PESO AJUSTADO:</td>
    <td class="vl num" style="font-size:12px;font-weight:bold;">${pesoAjustado != null ? fmt(pesoAjustado, 2) + " kg" : "—"}</td>
    <td class="lb">PRECIO:</td>
    <td class="vl num">${precioMostrar}</td>
  </tr>
  <tr class="total-row">
    <td colspan="3" style="text-align:right;padding-right:16px;">TOTAL A PAGAR:</td>
    <td class="num" style="font-size:14px;">${totalPagar != null ? fmtMoney(totalPagar) : "—"}</td>
  </tr>
</table>

${observaciones ? `
<table>
  <tr><td class="lb">OBSERVACIONES:</td></tr>
  <tr><td style="height:40px;vertical-align:top;padding:6px 8px;">${observaciones}</td></tr>
</table>` : ""}

<!-- Firmas -->
<div class="footer-sigs">
  <div class="sig">
    <div class="sig-line"></div>
    <p class="sig-name">Esteban Olaya</p>
    <p class="sig-role">Aux. Laboratorio</p>
  </div>
  <div class="sig">
    <div class="sig-line"></div>
    <p class="sig-name">Edwin Acosta</p>
    <p class="sig-role">Jefe de Planta</p>
  </div>
  <div class="sig">
    <div class="sig-line"></div>
    <p class="sig-name">${previo.propietario || "Cliente"}</p>
    <p class="sig-role">Cliente / Propietario</p>
  </div>
</div>

</body></html>`;

    const win = window.open("", "_blank", "width=860,height=900");
    if (!win) { mostrarMsg("error", "Bloqueador de ventanas emergentes activo."); return; }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 400);
  };

  // ── Imprimir comprobante desde una fila de la tabla ─────────
  const imprimirComprobanteDesdeTabla = async (liqRow) => {
    setImprimiendoFila(liqRow.lote_id);
    try {
      const res = await fetch(`/api/liquidaciones/lote-datos/${liqRow.lote_id}`);
      const d   = await res.json();
      if (!res.ok) { mostrarMsg("error", d.error); return; }
      const { previo, pesaje, trilla } = d;
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const now  = new Date();
      const fechaEmision = `${String(now.getDate()).padStart(2,"0")}/${String(now.getMonth()+1).padStart(2,"0")}/${now.getFullYear()}`;
      const producto = (pesaje?.descripcion || previo?.producto || "ARROZ").toUpperCase();

      // Usar valores ya calculados guardados en la liquidación
      const fHv = liqRow.factor_humedad;
      const fIv = liqRow.factor_impureza;
      const fTv = liqRow.factor_total;
      const pesoNetoV   = liqRow.peso_neto;
      const pesoAjV     = liqRow.peso_ajustado;
      const precioKgV   = liqRow.precio;
      const totalV      = liqRow.total_pagar;
      const humV        = liqRow.humedad;
      const impV        = liqRow.impureza;
      const unidadV     = liqRow.unidad_precio || "kg";
      const obsV        = liqRow.observaciones || "";
      const precioMostrar = unidadV === "ton"
        ? `${fmtMoney(precioKgV * 1000)} / ton`
        : `${fmtMoney(precioKgV)} / kg`;
      const origenV = trilla?.humedad_salida != null ? "trilla (salida)" : pesaje?.humedad_final != null ? "pesaje (base)" : "pesaje (laboratorio)";

      const css = `*{box-sizing:border-box;margin:0;padding:0;}body{font-family:Arial,Helvetica,sans-serif;font-size:10.5px;width:750px;margin:0 auto;padding:18px 22px;color:#1a1a1a;}table{width:100%;border-collapse:collapse;margin-bottom:8px;}td,th{border:1px solid #7a7a7a;padding:4px 8px;font-size:10.5px;vertical-align:middle;}.logo-td{width:148px;border:1px solid #7a7a7a;text-align:center;padding:10px 6px;}.logo-name{color:#2f6e18;font-size:17px;font-weight:900;font-style:italic;line-height:1;}.logo-sub{color:#2f6e18;font-size:7.5px;letter-spacing:0.4px;line-height:1.45;margin-top:3px;}.title-td{text-align:center;border:1px solid #7a7a7a;padding:16px 12px;}.cert-num{font-size:14px;font-weight:bold;}.cert-prod{font-size:11px;margin-top:10px;}.sh{background:#5a5a5a;color:#fff;text-align:center;font-weight:bold;font-size:10.5px;letter-spacing:2px;padding:5px 8px;border-color:#5a5a5a;}.lb{background:#e6e6e6;font-weight:bold;font-size:10px;white-space:nowrap;padding:4px 8px;}.vl{font-size:10.5px;}.tc{text-align:center;}.num{text-align:right;font-weight:bold;}.total-row td{background:#1a3a0f;color:white;font-weight:bold;font-size:12px;}.footer-sigs{display:flex;justify-content:space-around;margin-top:40px;}.sig{text-align:center;}.sig-line{border-top:1px solid #333;width:178px;margin:0 auto 5px;}.sig-name{font-size:10.5px;font-weight:bold;}.sig-role{font-size:10px;color:#555;}@media print{body{padding:8px;width:100%;}@page{margin:10mm;}}`;

      const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/><title>Liquidación ${previo.lote_id}</title><style>${css}</style></head><body>
<table><tr><td class="logo-td"><svg width="60" height="54" viewBox="0 0 60 54" xmlns="http://www.w3.org/2000/svg" style="display:block;margin:0 auto 5px;"><rect x="1" y="1" width="58" height="52" fill="#e8f2db" stroke="#3a7020" stroke-width="1.5"/><line x1="30" y1="48" x2="30" y2="9" stroke="#3a7020" stroke-width="2"/><ellipse cx="30" cy="10" rx="4" ry="6" fill="#4a8c28"/><path d="M30 20 C22 15 15 8 18 4 C23 2 29 14 30 20Z" fill="#4a8c28"/><path d="M30 20 C38 15 45 8 42 4 C37 2 31 14 30 20Z" fill="#4a8c28"/><path d="M30 30 C20 23 12 13 15 7 C20 4 28 22 30 30Z" fill="#5aaa30"/><path d="M30 30 C40 23 48 13 45 7 C40 4 32 22 30 30Z" fill="#5aaa30"/><path d="M30 42 C18 33 10 20 13 12 C18 9 27 30 30 42Z" fill="#3a7020"/><path d="M30 42 C42 33 50 20 47 12 C42 9 33 30 30 42Z" fill="#3a7020"/></svg><div class="logo-name">conagro</div><div class="logo-sub">COMERCIALIZADORA<br/>AGRÍCOLA NACI</div></td><td class="title-td"><div class="cert-num">COMPROBANTE DE LIQUIDACIÓN</div><div class="cert-prod">LOTE: ${previo.lote_id}&nbsp;&nbsp;|&nbsp;&nbsp;PRODUCTO: ${producto}</div><div style="font-size:10px;margin-top:6px;color:#555;">Fecha de emisión: ${liqRow.fecha_liquidacion || fechaEmision}&nbsp;&nbsp;|&nbsp;&nbsp;Elaborado por: ${liqRow.usuario || user.nombre || "Sistema"}</div></td></tr></table>
<table><tr><td class="sh" colspan="4">DATOS GENERALES</td></tr><tr><td class="lb">CLIENTE:</td><td class="vl">${previo.propietario || ""}</td><td class="lb">NIT / CÉDULA:</td><td class="vl">${previo.cedula_nit || ""}</td></tr><tr><td class="lb">PLACA VEHÍCULO:</td><td class="vl">${previo.placa || ""}</td><td class="lb">CONDUCTOR:</td><td class="vl">${previo.nombre_conductor || pesaje?.nombre || ""}</td></tr><tr><td class="lb">PRODUCTO:</td><td class="vl">${producto}</td><td class="lb">PROCEDENCIA:</td><td class="vl">${pesaje?.procedencia || ""}</td></tr><tr><td class="lb">PESO BRUTO:</td><td class="vl">${pesaje?.peso_bruto != null ? fmt(pesaje.peso_bruto)+" kg" : ""}</td><td class="lb">PESO TARA:</td><td class="vl">${pesaje?.peso_tara != null ? fmt(pesaje.peso_tara)+" kg" : ""}</td></tr><tr><td class="lb">PESO NETO:</td><td class="vl" style="font-weight:bold;" colspan="3">${pesoNetoV != null ? fmt(pesoNetoV)+" kg" : ""}</td></tr></table>
<table><tr><td class="sh" colspan="4">ANÁLISIS DE CALIDAD (${origenV})</td></tr><tr><td class="lb">HUMEDAD (H°):</td><td class="vl tc">${humV != null ? humV+" %" : "—"}</td><td class="lb">IMPUREZAS (I°):</td><td class="vl tc">${impV != null ? impV+" %" : "—"}</td></tr></table>
<table><tr><td class="sh" colspan="4">FACTORES DE LIQUIDACIÓN</td></tr><tr><td class="lb">FÓRMULA HUMEDAD:</td><td class="vl">(100 - ${humV}) / 75</td><td class="lb">FACTOR HUMEDAD:</td><td class="num">${fHv != null ? Number(fHv).toFixed(6) : "—"}</td></tr><tr><td class="lb">FÓRMULA IMPUREZAS:</td><td class="vl">(100 - ${impV}) / 95</td><td class="lb">FACTOR IMPUREZAS:</td><td class="num">${fIv != null ? Number(fIv).toFixed(6) : "—"}</td></tr><tr><td class="lb" colspan="2">FACTOR TOTAL = Factor Humedad × Factor Impurezas</td><td class="lb">FACTOR TOTAL:</td><td class="num">${fTv != null ? Number(fTv).toFixed(6) : "—"}</td></tr></table>
<table><tr><td class="sh" colspan="4">LIQUIDACIÓN ECONÓMICA</td></tr><tr><td class="lb">PESO NETO ORIGINAL:</td><td class="num">${pesoNetoV != null ? fmt(pesoNetoV)+" kg" : "—"}</td><td class="lb">FACTOR TOTAL:</td><td class="num">${fTv != null ? Number(fTv).toFixed(6) : "—"}</td></tr><tr><td class="lb">PESO AJUSTADO:</td><td class="num" style="font-size:12px;font-weight:bold;">${pesoAjV != null ? fmt(pesoAjV)+" kg" : "—"}</td><td class="lb">PRECIO:</td><td class="num">${precioMostrar}</td></tr><tr class="total-row"><td colspan="3" style="text-align:right;padding-right:16px;">TOTAL A PAGAR:</td><td class="num" style="font-size:14px;">${totalV != null ? fmtMoney(totalV) : "—"}</td></tr></table>
${obsV ? `<table><tr><td class="lb">OBSERVACIONES:</td></tr><tr><td style="height:40px;vertical-align:top;padding:6px 8px;">${obsV}</td></tr></table>` : ""}
<div class="footer-sigs"><div class="sig"><div class="sig-line"></div><p class="sig-name">Esteban Olaya</p><p class="sig-role">Aux. Laboratorio</p></div><div class="sig"><div class="sig-line"></div><p class="sig-name">Edwin Acosta</p><p class="sig-role">Jefe de Planta</p></div><div class="sig"><div class="sig-line"></div><p class="sig-name">${previo.propietario || "Cliente"}</p><p class="sig-role">Cliente / Propietario</p></div></div>
</body></html>`;

      const win = window.open("", "_blank", "width=860,height=900");
      if (!win) { mostrarMsg("error", "Bloqueador de ventanas emergentes activo."); return; }
      win.document.write(html); win.document.close(); win.focus();
      setTimeout(() => win.print(), 400);
    } catch (e) { mostrarMsg("error", e.message); }
    finally { setImprimiendoFila(null); }
  };

  // ── Imprimir certificado desde una fila de la tabla ───────────
  const imprimirCertificadoDesdeTabla = async (liqRow) => {
    setImprimiendoFila(liqRow.lote_id + "_cert");
    try {
      const res = await fetch(`/api/liquidaciones/lote-datos/${liqRow.lote_id}`);
      const d   = await res.json();
      if (!res.ok) { mostrarMsg("error", d.error); return; }
      const { previo, pesaje, trilla } = d;
      if (!trilla) { mostrarMsg("error", `El lote ${liqRow.lote_id} no tiene datos de trilla registrados.`); return; }
      await handleVerCertificadoConDatos({ previo, pesaje, trilla });
    } catch (e) { mostrarMsg("error", e.message); }
    finally { setImprimiendoFila(null); }
  };

  // ── Certificado con datos directos (sin depender de loteData) ─
  const handleVerCertificadoConDatos = async ({ previo, pesaje, trilla }) => {
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
      mostrarMsg("error", "No se pudo registrar el certificado en el servidor; se usará un número provisional.");
    }
    const producto  = (pesaje?.descripcion || previo.producto || "ARROZ BLANCO").toUpperCase();
    const conductor = previo.nombre_conductor || pesaje?.nombre || "";
    const val = (v, suf="") => (v !== null && v !== undefined && String(v).trim() !== "" && String(v) !== "0") ? `${v}${suf}` : "";
    const css = `*{box-sizing:border-box;margin:0;padding:0;}body{font-family:Arial,Helvetica,sans-serif;font-size:10.5px;width:750px;margin:0 auto;padding:18px 22px;color:#1a1a1a;}table{width:100%;border-collapse:collapse;margin-bottom:8px;}td,th{border:1px solid #7a7a7a;padding:4px 8px;font-size:10.5px;vertical-align:middle;}.logo-td{width:148px;text-align:center;padding:10px 6px;border:1px solid #7a7a7a;}.logo-name{color:#2f6e18;font-size:17px;font-weight:900;font-style:italic;line-height:1;}.logo-sub{color:#2f6e18;font-size:7.5px;letter-spacing:0.4px;line-height:1.45;margin-top:3px;}.title-td{text-align:center;border:1px solid #7a7a7a;padding:16px 12px;}.cert-num{font-size:14px;font-weight:bold;}.cert-prod{font-size:11px;margin-top:10px;}.sh{background:#5a5a5a;color:#fff;text-align:center;font-weight:bold;font-size:10.5px;letter-spacing:2px;padding:5px 8px;border-color:#5a5a5a;}.ssh{background:#8a8a8a;color:#fff;text-align:center;font-weight:bold;font-size:10px;letter-spacing:1.5px;padding:4px 8px;border-color:#8a8a8a;}.ch{background:#cecece;font-weight:bold;text-align:center;font-size:10px;padding:4px 8px;}.lb{background:#e6e6e6;font-weight:bold;font-size:10px;white-space:nowrap;padding:4px 8px;}.vl{font-size:10.5px;}.tc{text-align:center;}.obs-lbl{font-weight:bold;padding:5px 8px;border:1px solid #7a7a7a;}.obs-body{height:52px;border:1px solid #7a7a7a;padding:5px 8px;vertical-align:top;}.elab{font-size:10.5px;margin-top:18px;margin-bottom:52px;}.sigs{display:flex;justify-content:space-around;}.sig{text-align:center;}.sig-line{border-top:1px solid #333;width:178px;margin:0 auto 5px;}.sig-name{font-size:10.5px;font-weight:bold;}.sig-role{font-size:10px;color:#555;}@media print{body{padding:8px;width:100%;}@page{margin:10mm;}}`;
    const certHtml = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/><title>Certificado ${numCert}</title><style>${css}</style></head><body><table><tr><td class="logo-td"><svg width="60" height="54" viewBox="0 0 60 54" xmlns="http://www.w3.org/2000/svg" style="display:block;margin:0 auto 5px;"><rect x="1" y="1" width="58" height="52" fill="#e8f2db" stroke="#3a7020" stroke-width="1.5"/><line x1="30" y1="48" x2="30" y2="9" stroke="#3a7020" stroke-width="2"/><ellipse cx="30" cy="10" rx="4" ry="6" fill="#4a8c28"/><path d="M30 20 C22 15 15 8 18 4 C23 2 29 14 30 20Z" fill="#4a8c28"/><path d="M30 20 C38 15 45 8 42 4 C37 2 31 14 30 20Z" fill="#4a8c28"/><path d="M30 30 C20 23 12 13 15 7 C20 4 28 22 30 30Z" fill="#5aaa30"/><path d="M30 30 C40 23 48 13 45 7 C40 4 32 22 30 30Z" fill="#5aaa30"/><path d="M30 42 C18 33 10 20 13 12 C18 9 27 30 30 42Z" fill="#3a7020"/><path d="M30 42 C42 33 50 20 47 12 C42 9 33 30 30 42Z" fill="#3a7020"/></svg><div class="logo-name">conagro</div><div class="logo-sub">COMERCIALIZADORA<br/>AGRÍCOLA NACI</div></td><td class="title-td"><div class="cert-num">CERTIFICADO DE CALIDAD No. ${numCert}</div><div class="cert-prod">PRODUCTO:&nbsp;&nbsp;${producto}</div></td></tr></table><table><tr><td class="sh" colspan="4">DATOS GENERALES</td></tr><tr><td class="lb">CLIENTE:</td><td class="vl">${previo.propietario||""}</td><td class="lb">FECHA DESPACHO:</td><td class="vl">${trilla.fecha_trilla||""}</td></tr><tr><td class="lb">FECHA DE VENCIMIENTO:</td><td class="vl">${trilla.fecha_vencimiento||""}</td><td class="lb">No. LOTE:</td><td class="vl">${previo.lote_id||""}</td></tr><tr><td class="lb">PRESENTACIÓN:</td><td class="vl">${trilla.presentacion||""}</td><td class="lb">CANTIDAD:</td><td class="vl">${trilla.cantidad_salida||""}</td></tr><tr><td class="lb">RENDIMIENTO:</td><td class="vl">${trilla.rendimiento!=null?trilla.rendimiento+"%":""}</td><td class="lb">KG RESULTADO:</td><td class="vl">${trilla.kilos_resultado!=null?Number(trilla.kilos_resultado).toLocaleString("es-CO")+" kg":""}</td></tr><tr><td class="lb">CONDUCTOR:</td><td class="vl">${conductor}</td><td class="lb">PLACAS VEHÍCULO:</td><td class="vl">${previo.placa||""}</td></tr></table><table><tr><td class="sh" colspan="3">ASPECTOS A EVALUAR</td></tr><tr><td class="ssh" colspan="3">FÍSICOS</td></tr><tr><td class="ch" style="width:52%">CARACTERÍSTICA</td><td class="ch" style="width:26%">ESPECIFICACIÓN</td><td class="ch" style="width:22%">RESULTADO</td></tr><tr><td>HUMEDAD</td><td class="tc">12,0 - 14,0</td><td class="tc">${val(trilla.humedad_salida,"%")}</td></tr><tr><td>GRANO PARTIDO</td><td class="tc">9% MAX</td><td class="tc">${val(trilla.grano_partido_salida,"%")}</td></tr><tr><td>GRANO YESADO</td><td class="tc">11% MAX</td><td class="tc">${val(trilla.grano_yesado_salida,"%")}</td></tr><tr><td>GRANO DAÑADO POR HONGO</td><td class="tc">2,5% MAX</td><td class="tc">${val(trilla.grano_dano_hongo_salida,"%")}</td></tr><tr><td>GRANO DAÑADO POR CALOR</td><td class="tc">1,5% MAX</td><td class="tc">${val(trilla.grano_dano_calor_salida,"%")}</td></tr><tr><td>SEMILLAS OBJETABLES Y ARROZ CON CÁSCARA</td><td class="tc">4 EN 100 GR. MAX</td><td class="tc">${val(trilla.semillas_obj_salida)}</td></tr><tr><td class="ssh" colspan="3">ORGANOLÉPTICOS</td></tr><tr><td class="ch">CARACTERÍSTICA</td><td class="ch">ESPECIFICACIÓN</td><td class="ch">RESULTADO</td></tr><tr><td>OLOR</td><td class="tc">CARACTERÍSTICO</td><td class="tc">${trilla.olor_resultado||""}</td></tr><tr><td>SABOR</td><td class="tc">CARACTERÍSTICO</td><td class="tc">${trilla.sabor_resultado||""}</td></tr><tr><td>COLOR</td><td class="tc">CARACTERÍSTICO</td><td class="tc">${trilla.color_resultado||""}</td></tr><tr><td class="ssh" colspan="3">INOCUIDAD</td></tr><tr><td class="ch">CARACTERÍSTICA</td><td class="ch">ESPECIFICACIÓN</td><td class="ch">RESULTADO</td></tr><tr><td>NIVEL DE INFESTACIÓN EN 100 GRAMOS</td><td class="tc">AUSENCIA</td><td class="tc">${trilla.nivel_infestacion_resultado||""}</td></tr><tr><td>MATERIAS EXTRAÑAS EN 100 GRAMOS</td><td class="tc">AUSENCIA</td><td class="tc">${trilla.materias_extranas_resultado||""}</td></tr><tr><td>IMPUREZAS</td><td class="tc">0,1% MAX</td><td class="tc">${val(trilla.impureza_salida,"%")}</td></tr></table><table><tr><td class="obs-lbl">OBSERVACIONES:</td></tr><tr><td class="obs-body">${trilla.observaciones||""}</td></tr></table><p class="elab">Elaboró:</p><div class="sigs"><div class="sig"><div class="sig-line"></div><p class="sig-name">Esteban Olaya</p><p class="sig-role">Aux. Laboratorio</p></div><div class="sig"><div class="sig-line"></div><p class="sig-name">Edwin Acosta</p><p class="sig-role">Jefe de Planta</p></div></div></body></html>`;
    const win = window.open("", "_blank", "width=860,height=900");
    if (!win) { mostrarMsg("error", "Bloqueador de ventanas emergentes activo."); return; }
    win.document.write(certHtml); win.document.close(); win.focus();
    setTimeout(() => win.print(), 400);
  };

  // ── Ver certificado de calidad (generar e imprimir directamente) ─
  const handleVerCertificado = async () => {
    if (!loteData?.previo) return mostrarMsg("error", "Seleccione un lote primero.");
    if (!loteData.trilla)  return mostrarMsg("error", "Este lote aún no tiene datos de trilla registrados.");

    const { previo, pesaje, trilla } = loteData;
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const now  = new Date();
    const fechaEmision = `${String(now.getDate()).padStart(2,"0")}/${String(now.getMonth()+1).padStart(2,"0")}/${now.getFullYear()}`;

    let numCert = "CC - 00001";
    try {
      const saveRes = await fetch("/api/trillas/certificados", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ lote_id: previo.lote_id, fecha_emision: fechaEmision, usuario: user.nombre || "Sistema" }),
      });
      const saved = await saveRes.json();
      if (saved.certificado?.numero_certificado) numCert = saved.certificado.numero_certificado;
    } catch (e) {
      console.error("Error al registrar certificado:", e);
      mostrarMsg("error", "No se pudo registrar el certificado en el servidor; se usará un número provisional.");
    }

    const producto  = (pesaje?.descripcion || previo.producto || "ARROZ BLANCO").toUpperCase();
    const conductor = previo.nombre_conductor || pesaje?.nombre || "";
    const val = (v, suf = "") => (v !== null && v !== undefined && String(v).trim() !== "" && String(v) !== "0") ? `${v}${suf}` : "";

    const css = `
      *{box-sizing:border-box;margin:0;padding:0;}
      body{font-family:Arial,Helvetica,sans-serif;font-size:10.5px;width:750px;margin:0 auto;padding:18px 22px;color:#1a1a1a;}
      table{width:100%;border-collapse:collapse;margin-bottom:8px;}
      td,th{border:1px solid #7a7a7a;padding:4px 8px;font-size:10.5px;vertical-align:middle;}
      .logo-td{width:148px;border:1px solid #7a7a7a;text-align:center;padding:10px 6px;}
      .logo-name{color:#2f6e18;font-size:17px;font-weight:900;font-style:italic;line-height:1;letter-spacing:-0.5px;}
      .logo-sub{color:#2f6e18;font-size:7.5px;letter-spacing:0.4px;line-height:1.45;margin-top:3px;}
      .title-td{text-align:center;border:1px solid #7a7a7a;padding:16px 12px;}
      .cert-num{font-size:14px;font-weight:bold;letter-spacing:0.2px;}
      .cert-prod{font-size:11px;margin-top:10px;letter-spacing:0.3px;}
      .sh{background:#5a5a5a;color:#fff;text-align:center;font-weight:bold;font-size:10.5px;letter-spacing:2px;padding:5px 8px;border-color:#5a5a5a;}
      .ssh{background:#8a8a8a;color:#fff;text-align:center;font-weight:bold;font-size:10px;letter-spacing:1.5px;padding:4px 8px;border-color:#8a8a8a;}
      .ch{background:#cecece;font-weight:bold;text-align:center;font-size:10px;padding:4px 8px;border-color:#7a7a7a;}
      .lb{background:#e6e6e6;font-weight:bold;font-size:10px;white-space:nowrap;padding:4px 8px;}
      .vl{font-size:10.5px;}
      .tc{text-align:center;}
      .obs-lbl{font-weight:bold;padding:5px 8px;border:1px solid #7a7a7a;}
      .obs-body{height:52px;border:1px solid #7a7a7a;padding:5px 8px;vertical-align:top;}
      .elab{font-size:10.5px;margin-top:18px;margin-bottom:52px;}
      .sigs{display:flex;justify-content:space-around;}
      .sig{text-align:center;}
      .sig-line{border-top:1px solid #333;width:178px;margin:0 auto 5px;}
      .sig-name{font-size:10.5px;font-weight:bold;}
      .sig-role{font-size:10px;color:#555;}
      @media print{body{padding:8px;width:100%;}@page{margin:10mm;}}
    `;

    const certHtml = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"/><title>Certificado ${numCert}</title>
<style>${css}</style></head>
<body>
<table>
  <tr>
    <td class="logo-td">
      <svg width="60" height="54" viewBox="0 0 60 54" xmlns="http://www.w3.org/2000/svg" style="display:block;margin:0 auto 5px;">
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
      <div class="logo-name">conagro</div>
      <div class="logo-sub">COMERCIALIZADORA<br/>AGRÍCOLA NACI</div>
    </td>
    <td class="title-td">
      <div class="cert-num">CERTIFICADO DE CALIDAD No. ${numCert}</div>
      <div class="cert-prod">PRODUCTO:&nbsp;&nbsp;${producto}</div>
    </td>
  </tr>
</table>
<table>
  <tr><td class="sh" colspan="4">DATOS GENERALES</td></tr>
  <tr>
    <td class="lb">CLIENTE:</td><td class="vl">${previo.propietario || ""}</td>
    <td class="lb">FECHA DESPACHO:</td><td class="vl">${trilla.fecha_trilla || ""}</td>
  </tr>
  <tr>
    <td class="lb">FECHA DE VENCIMIENTO:</td><td class="vl">${trilla.fecha_vencimiento || ""}</td>
    <td class="lb">No. LOTE:</td><td class="vl">${previo.lote_id || ""}</td>
  </tr>
  <tr>
    <td class="lb">PRESENTACIÓN:</td><td class="vl">${trilla.presentacion || ""}</td>
    <td class="lb">CANTIDAD:</td><td class="vl">${trilla.cantidad_salida || ""}</td>
  </tr>
  <tr>
    <td class="lb">RENDIMIENTO:</td><td class="vl">${trilla.rendimiento != null ? `${trilla.rendimiento}%` : ""}</td>
    <td class="lb">KG RESULTADO:</td><td class="vl">${trilla.kilos_resultado != null ? `${Number(trilla.kilos_resultado).toLocaleString("es-CO")} kg` : ""}</td>
  </tr>
  <tr>
    <td class="lb">CONDUCTOR:</td><td class="vl">${conductor}</td>
    <td class="lb">PLACAS VEHÍCULO:</td><td class="vl">${previo.placa || ""}</td>
  </tr>
</table>
<table>
  <tr><td class="sh" colspan="3">ASPECTOS A EVALUAR</td></tr>
  <tr><td class="ssh" colspan="3">FÍSICOS</td></tr>
  <tr><td class="ch" style="width:52%">CARACTERÍSTICA</td><td class="ch" style="width:26%">ESPECIFICACIÓN</td><td class="ch" style="width:22%">RESULTADO</td></tr>
  <tr><td>HUMEDAD</td>                                  <td class="tc">12,0 - 14,0</td>    <td class="tc">${val(trilla.humedad_salida,"%")}</td></tr>
  <tr><td>GRANO PARTIDO</td>                            <td class="tc">9% MAX</td>          <td class="tc">${val(trilla.grano_partido_salida,"%")}</td></tr>
  <tr><td>GRANO YESADO</td>                             <td class="tc">11% MAX</td>         <td class="tc">${val(trilla.grano_yesado_salida,"%")}</td></tr>
  <tr><td>GRANO DAÑADO POR HONGO</td>                   <td class="tc">2,5% MAX</td>        <td class="tc">${val(trilla.grano_dano_hongo_salida,"%")}</td></tr>
  <tr><td>GRANO DAÑADO POR CALOR</td>                   <td class="tc">1,5% MAX</td>        <td class="tc">${val(trilla.grano_dano_calor_salida,"%")}</td></tr>
  <tr><td>SEMILLAS OBJETABLES Y ARROZ CON CÁSCARA</td>  <td class="tc">4 EN 100 GR. MAX</td><td class="tc">${val(trilla.semillas_obj_salida)}</td></tr>
  <tr><td class="ssh" colspan="3">ORGANOLÉPTICOS</td></tr>
  <tr><td class="ch">CARACTERÍSTICA</td><td class="ch">ESPECIFICACIÓN</td><td class="ch">RESULTADO</td></tr>
  <tr><td>OLOR</td>  <td class="tc">CARACTERÍSTICO</td><td class="tc">${trilla.olor_resultado  || ""}</td></tr>
  <tr><td>SABOR</td> <td class="tc">CARACTERÍSTICO</td><td class="tc">${trilla.sabor_resultado || ""}</td></tr>
  <tr><td>COLOR</td> <td class="tc">CARACTERÍSTICO</td><td class="tc">${trilla.color_resultado || ""}</td></tr>
  <tr><td class="ssh" colspan="3">INOCUIDAD</td></tr>
  <tr><td class="ch">CARACTERÍSTICA</td><td class="ch">ESPECIFICACIÓN</td><td class="ch">RESULTADO</td></tr>
  <tr><td>NIVEL DE INFESTACIÓN EN 100 GRAMOS</td><td class="tc">AUSENCIA</td><td class="tc">${trilla.nivel_infestacion_resultado || ""}</td></tr>
  <tr><td>MATERIAS EXTRAÑAS EN 100 GRAMOS</td>   <td class="tc">AUSENCIA</td><td class="tc">${trilla.materias_extranas_resultado || ""}</td></tr>
  <tr><td>IMPUREZAS</td>                          <td class="tc">0,1% MAX</td><td class="tc">${val(trilla.impureza_salida,"%")}</td></tr>
</table>
<table>
  <tr><td class="obs-lbl">OBSERVACIONES:</td></tr>
  <tr><td class="obs-body">${trilla.observaciones || ""}</td></tr>
</table>
<p class="elab">Elaboró:</p>
<div class="sigs">
  <div class="sig"><div class="sig-line"></div><p class="sig-name">Esteban Olaya</p><p class="sig-role">Aux. Laboratorio</p></div>
  <div class="sig"><div class="sig-line"></div><p class="sig-name">Edwin Acosta</p><p class="sig-role">Jefe de Planta</p></div>
</div>
</body></html>`;

    const win = window.open("", "_blank", "width=860,height=900");
    if (!win) { mostrarMsg("error", "Bloqueador de ventanas emergentes activo."); return; }
    win.document.write(certHtml);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 400);
  };

  // ── Alerta si faltan datos de calidad ─────────────────────────
  const sinCalidad = loteData && (humedad === null || impureza === null);

  // ──────────────────────────────────────────────────────────────
  return (
    <>
      <div className="app">
        <div className="wrapper">

          {/* HEADER */}
          <div className="page-header">
            <p className="page-label">MÓDULO FINANCIERO</p>
            <h1 className="title">Liquidación <span>de Lotes</span></h1>
            <p className="subtitle-text">
              Calcula automáticamente el peso ajustado y el total a pagar aplicando los factores de humedad e impureza.
            </p>
          </div>

          {/* MENSAJE */}
          {msg.texto && (
            <div className={`msg ${msg.tipo}`}>
              <span className="msg-icon">{msg.tipo === "ok" ? "✓" : "✕"}</span>
              {msg.texto}
            </div>
          )}

          {/* SELECTOR DE LOTE */}
          <div className="card" ref={dropRef}>
            <div className="card-title">Seleccionar Lote</div>
            <div style={{ position: "relative", maxWidth: 540 }}>
              <div className="combo">
                <input
                  className="combo-input"
                  placeholder="Buscar por ID de lote, placa o cliente..."
                  value={busq}
                  onChange={e => { setBusq(e.target.value); setOpen(true); }}
                  onFocus={() => setOpen(true)}
                />
                <button type="button" className="combo-toggle" onClick={() => setOpen(o => !o)}>&#9660;</button>
              </div>
              {open && (
                <div className="combo-dropdown">
                  {buscando ? (
                    <div className="combo-empty">Buscando...</div>
                  ) : lotes.length === 0 ? (
                    <div className="combo-empty">Sin lotes disponibles</div>
                  ) : (
                    <ul className="combo-lista">
                      {lotes.map(l => (
                        <li key={l.id} onMouseDown={() => handleSelect(l)}>
                          <span className="combo-id">{l.lote_id}</span>
                          <span className="combo-info">
                            {[l.placa, l.propietario, l.producto].filter(Boolean).join(" · ")}
                          </span>
                          <span className={`estado-badge ${l.estado?.toLowerCase()}`}>{l.estado}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </div>

          {cargando && <div className="loading-banner">Cargando datos del lote...</div>}

          {sinCalidad && (
            <div className="alerta-warn">
              ⚠ El lote <strong>{loteData.previo.lote_id}</strong> no tiene registros de humedad e impureza.
              Complete la trilla o el pesaje antes de liquidar.
            </div>
          )}

          {loteData && !sinCalidad && (
            <div className="liq-grid" id="liq-detalle">

              {/* ── COLUMNA IZQUIERDA ─────────────────────────────── */}
              <div className="liq-col">

                {/* Resumen del lote */}
                <div className="card">
                  <div className="card-title">
                    📊 Resumen del Lote
                    <span className={`badge-estado ${loteData.previo.estado?.toLowerCase()}`}>
                      {loteData.previo.estado}
                    </span>
                  </div>
                  <div className="info-grid">
                    <Field label="ID Lote"       value={loteData.previo.lote_id} />
                    <Field label="Cliente"        value={loteData.previo.propietario} />
                    <Field label="NIT / Cédula"   value={loteData.previo.cedula_nit} />
                    <Field label="Placa"          value={loteData.previo.placa} />
                    <Field label="Conductor"      value={loteData.previo.nombre_conductor || loteData.pesaje?.nombre} />
                    <Field label="Producto"       value={loteData.pesaje?.descripcion || loteData.previo.producto} />
                    <Field label="Procedencia"    value={loteData.pesaje?.procedencia} />
                  </div>
                  <div className="peso-summary">
                    <div className="peso-item">
                      <span className="peso-lbl">Peso Bruto</span>
                      <span className="peso-val">{loteData.pesaje?.peso_bruto != null ? fmt(loteData.pesaje.peso_bruto) + " kg" : "—"}</span>
                    </div>
                    <div className="peso-item">
                      <span className="peso-lbl">Peso Tara</span>
                      <span className="peso-val">{loteData.pesaje?.peso_tara != null ? fmt(loteData.pesaje.peso_tara) + " kg" : "—"}</span>
                    </div>
                    <div className="peso-item highlight">
                      <span className="peso-lbl">Peso Neto</span>
                      <span className="peso-val">{pesoNeto != null ? fmt(pesoNeto) + " kg" : "—"}</span>
                    </div>
                  </div>
                </div>

                {/* Calidad */}
                <div className="card">
                  <div className="card-title">🧪 Calidad — Solo lectura</div>
                  <p className="origen-tag">Fuente: {origen}</p>
                  <div style={{ display: "flex", gap: 6, marginBottom: 10, fontSize: 10, flexWrap: "wrap" }}>
                    <span style={{ background: "#f0fdf4", color: "#15803d", border: "1px solid #86efac", borderRadius: 4, padding: "2px 8px", fontWeight: 700 }}>● CUMPLE</span>
                    <span style={{ background: "#fef2f2", color: "#dc2626", border: "1px solid #fca5a5", borderRadius: 4, padding: "2px 8px", fontWeight: 700 }}>● NO CUMPLE / FUERA DE RANGO</span>
                  </div>
                  <div className="calidad-grid">
                    <CalBox label="Humedad (H°)" value={humedad} unit="%" rango={RANGOS.humedad} />
                    <CalBox label="Impurezas (I°)" value={impureza} unit="%" rango={RANGOS.impureza} />
                    {loteData.trilla?.grano_partido_salida != null && (
                      <CalBox label="G. Partido" value={loteData.trilla.grano_partido_salida} unit="%" rango={RANGOS.grano_partido} />
                    )}
                    {loteData.trilla?.rendimiento != null && (
                      <CalBox label="Rendimiento trilla" value={loteData.trilla.rendimiento} unit="%" rango={RANGOS.rendimiento} />
                    )}
                  </div>
                </div>

                {/* Factores automáticos */}
                <div className="card">
                  <div className="card-title">⚙️ Factores Calculados</div>
                  <div className="factor-list">
                    <FactorRow
                      label="Factor Humedad"
                      formula={`(100 − ${humedad}) ÷ 75`}
                      value={fH}
                    />
                    <FactorRow
                      label="Factor Impurezas"
                      formula={`(100 − ${impureza}) ÷ 95`}
                      value={fI}
                    />
                    <FactorRow
                      label="Factor Total"
                      formula="F. Humedad × F. Impurezas"
                      value={fT}
                      highlight
                    />
                  </div>
                </div>
              </div>

              {/* ── COLUMNA DERECHA ───────────────────────────────── */}
              <div className="liq-col">

                {/* Precio editable */}
                <div className="card">
                  <div className="card-title">💰 Liquidación</div>

                  <div className="liq-precio-row">
                    <div className="group">
                      <label>Unidad de precio</label>
                      <select value={unidad} onChange={e => setUnidad(e.target.value)}>
                        <option value="kg">Por kilogramo (kg)</option>
                        <option value="ton">Por tonelada (ton)</option>
                      </select>
                    </div>
                    <div className="group">
                      <label>Precio ({unidad === "ton" ? "$ / tonelada" : "$ / kg"})</label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        placeholder={unidad === "ton" ? "Ej: 1.500.000" : "Ej: 1500"}
                        value={precio}
                        onChange={e => setPrecio(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Cuadro de resultados */}
                  <div className="result-box">
                    <div className="result-row">
                      <span className="result-lbl">Peso Neto Original</span>
                      <span className="result-val">{pesoNeto != null ? fmt(pesoNeto) + " kg" : "—"}</span>
                    </div>
                    <div className="result-row">
                      <span className="result-lbl">× Factor Total</span>
                      <span className="result-val">{fT != null ? fT.toFixed(6) : "—"}</span>
                    </div>
                    <div className="result-row highlight-row">
                      <span className="result-lbl">= Peso Ajustado</span>
                      <span className="result-val big">{pesoAjustado != null ? fmt(pesoAjustado, 2) + " kg" : "—"}</span>
                    </div>
                    <div className="result-divider" />
                    <div className="result-row">
                      <span className="result-lbl">Precio aplicado</span>
                      <span className="result-val">
                        {precioKg != null ? `${fmtMoney(precioKg)} / kg` : "—"}
                      </span>
                    </div>
                    <div className="result-row total-row">
                      <span className="result-lbl">TOTAL A PAGAR</span>
                      <span className="result-val total-val">{totalPagar != null ? fmtMoney(totalPagar) : "—"}</span>
                    </div>
                  </div>

                  <div className="group" style={{ marginTop: 12 }}>
                    <label>Observaciones</label>
                    <textarea
                      rows={2}
                      style={{ padding: "9px 12px", borderRadius: 6, border: "1px solid #d1d5db", fontSize: 14, resize: "vertical" }}
                      value={observaciones}
                      onChange={e => setObs(e.target.value)}
                      placeholder="Notas adicionales (opcional)..."
                    />
                  </div>

                  {/* Banner: lote ya liquidado */}
                  {yaLiquidado && !modoEdicion && (
                    <div style={{
                      background:"#fffbeb", border:"1.5px solid #fbbf24", borderRadius:8,
                      padding:"10px 14px", marginBottom:8,
                      display:"flex", alignItems:"center", justifyContent:"space-between", gap:12
                    }}>
                      <span style={{ color:"#92400e", fontWeight:600, fontSize:".88rem" }}>
                        ⚠️ Este lote ya tiene una liquidación registrada. Se muestran los datos actuales.
                      </span>
                      <button
                        onClick={() => setModoEdicion(true)}
                        style={{
                          background:"#f59e0b", color:"#fff", border:"none", borderRadius:6,
                          padding:"6px 14px", fontWeight:700, fontSize:".82rem", cursor:"pointer",
                          whiteSpace:"nowrap"
                        }}>
                        Editar
                      </button>
                    </div>
                  )}
                  {yaLiquidado && modoEdicion && (
                    <div style={{
                      background:"#fef3c7", border:"1.5px solid #f59e0b", borderRadius:8,
                      padding:"8px 14px", marginBottom:8, color:"#92400e",
                      fontWeight:600, fontSize:".82rem"
                    }}>
                      Modo edición activo — los cambios actualizarán la liquidación existente.
                    </div>
                  )}

                  {/* Acciones */}
                  <div className="actions">
                    <button className="btn outline" onClick={handleVerCertificado}>
                      📋 Ver Certificado de Calidad
                    </button>
                    <button
                      className="btn secondary"
                      disabled={guardando || (yaLiquidado && !modoEdicion)}
                      onClick={handleGuardar}
                      style={(yaLiquidado && !modoEdicion) ? { opacity:.5, cursor:"not-allowed" } : {}}
                    >
                      {guardando ? "Guardando..." : yaLiquidado ? "💾 Actualizar Liquidación" : "💾 Guardar Liquidación"}
                    </button>
                    <button className="btn primary" onClick={handleComprobante}>
                      🖨 Generar Comprobante
                    </button>
                  </div>
                </div>

                {/* Fórmulas de referencia */}
                <div className="card formulas-card">
                  <div className="card-title">📐 Fórmulas de Referencia</div>
                  <div className="formula-list">
                    <div className="formula-item green">
                      <span className="formula-tag">F. Humedad</span>
                      <code>(100 − H°) ÷ (100 − 25)</code>
                    </div>
                    <div className="formula-item blue">
                      <span className="formula-tag">F. Impurezas</span>
                      <code>(100 − I°) ÷ (100 − 5)</code>
                    </div>
                    <div className="formula-item purple">
                      <span className="formula-tag">F. Total</span>
                      <code>F. Humedad × F. Impurezas</code>
                    </div>
                    <div className="formula-item orange">
                      <span className="formula-tag">Peso Ajustado</span>
                      <code>Peso Neto × F. Total</code>
                    </div>
                    <div className="formula-item red">
                      <span className="formula-tag">Total a Pagar</span>
                      <code>Peso Ajustado × Precio/kg</code>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* ── TABLA DE LIQUIDACIONES REGISTRADAS ─────────────────── */}
          <div className="card">
            <div className="card-title">📋 Liquidaciones Registradas</div>
            {cargLista ? (
              <div className="estado-tabla">Cargando liquidaciones...</div>
            ) : lista.length === 0 ? (
              <div className="estado-tabla">Aún no hay liquidaciones registradas.</div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Lote</th>
                      <th>Cliente</th>
                      <th>Placa</th>
                      <th>Fecha</th>
                      <th style={{textAlign:"center"}}>H° (%)</th>
                      <th style={{textAlign:"center"}}>I° (%)</th>
                      <th style={{textAlign:"center"}}>F. Total</th>
                      <th style={{textAlign:"right"}}>Peso Ajust. (kg)</th>
                      <th style={{textAlign:"right"}}>Total a Pagar</th>
                      <th style={{textAlign:"center"}}>Documentos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lista.map(l => {
                      const eH = estadoCalidad(l.humedad,  RANGOS.humedad);
                      const eI = estadoCalidad(l.impureza, RANGOS.impureza);
                      return (
                        <tr key={l.id}>
                          <td><span className="id-tag">{l.id}</span></td>
                          <td><span className="lote-tag">{l.lote_id}</span></td>
                          <td>{l.propietario || "—"}</td>
                          <td>{l.placa || "—"}</td>
                          <td>{l.fecha_liquidacion || "—"}</td>
                          <td style={{textAlign:"center"}}>
                            <span className={`cal-chip ${eH}`}>
                              {l.humedad != null ? `${l.humedad}%` : "—"}
                            </span>
                          </td>
                          <td style={{textAlign:"center"}}>
                            <span className={`cal-chip ${eI}`}>
                              {l.impureza != null ? `${l.impureza}%` : "—"}
                            </span>
                          </td>
                          <td style={{textAlign:"center",fontWeight:700}}>
                            {l.factor_total != null ? Number(l.factor_total).toFixed(4) : "—"}
                          </td>
                          <td style={{textAlign:"right",fontWeight:600}}>
                            {l.peso_ajustado != null ? fmt(l.peso_ajustado) : "—"}
                          </td>
                          <td style={{textAlign:"right",fontWeight:700,color:"#166534"}}>
                            {l.total_pagar != null ? fmtMoney(l.total_pagar) : "—"}
                          </td>
                          <td style={{textAlign:"center",whiteSpace:"nowrap"}}>
                            <button
                              disabled={imprimiendoFila === l.lote_id}
                              onClick={() => imprimirComprobanteDesdeTabla(l)}
                              style={{marginRight:4,padding:"3px 8px",fontSize:"0.75rem",fontWeight:700,
                                background:"#f0fdf4",border:"1.5px solid #16a34a",color:"#16a34a",
                                borderRadius:5,cursor:"pointer"}}
                              title="Imprimir comprobante de liquidación">
                              {imprimiendoFila === l.lote_id ? "…" : "Liquidación"}
                            </button>
                            <button
                              disabled={imprimiendoFila === l.lote_id + "_cert"}
                              onClick={() => imprimirCertificadoDesdeTabla(l)}
                              style={{padding:"3px 8px",fontSize:"0.75rem",fontWeight:700,
                                background:"#eff6ff",border:"1.5px solid #3b82f6",color:"#1d4ed8",
                                borderRadius:5,cursor:"pointer"}}
                              title="Imprimir certificado de calidad">
                              {imprimiendoFila === l.lote_id + "_cert" ? "…" : "Certificado"}
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

        </div>
      </div>

      <style>{`
        * { box-sizing: border-box; font-family: Arial, sans-serif; }
        .app { width: 100%; }
        .wrapper { max-width: 1280px; margin: 0 auto; display: flex; flex-direction: column; gap: 20px; }

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

        /* ALERTA */
        .alerta-warn { background: #fffbeb; color: #92400e; border: 1px solid #fcd34d; border-radius: 8px; padding: 12px 16px; font-size: 13px; }
        .loading-banner { background: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe; border-radius: 8px; padding: 12px 16px; font-size: 13px; text-align: center; }

        /* CARD */
        .card { background: #fafafa; border: 1px solid #e5e7eb; border-radius: 10px; padding: 20px 24px; }
        .card-title { font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: #2e7d32; margin-bottom: 14px; padding-bottom: 10px; border-bottom: 1px solid #e5e7eb; display: flex; align-items: center; gap: 10px; }

        /* COMBO */
        .combo { display: flex; align-items: center; border: 1px solid #d1d5db; border-radius: 6px; overflow: hidden; background: white; }
        .combo-input { flex: 1; padding: 9px 12px; border: none; outline: none; font-size: 14px; color: #374151; }
        .combo-toggle { padding: 0 14px; background: #2e7d32; color: white; border: none; font-size: 12px; min-height: 38px; cursor: pointer; flex-shrink: 0; }
        .combo-toggle:hover { background: #1b5e20; }
        .combo-dropdown { position: absolute; top: 100%; left: 0; right: 0; background: white; border: 1px solid #d1d5db; border-radius: 0 0 8px 8px; z-index: 200; box-shadow: 0 6px 18px rgba(0,0,0,.15); }
        .combo-lista { list-style: none; margin: 0; padding: 0; max-height: 240px; overflow-y: auto; }
        .combo-lista li { padding: 9px 14px; cursor: pointer; display: flex; align-items: center; gap: 8px; border-bottom: 1px solid #f3f4f6; flex-wrap: wrap; }
        .combo-lista li:hover { background: #fffbeb; }
        .combo-empty { color: #9ca3af; font-size: 13px; padding: 12px 14px; }
        .combo-id   { font-weight: 700; font-size: 13px; color: #92400e; }
        .combo-info { font-size: 12px; color: #6b7280; flex: 1; }
        .estado-badge { font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 12px; }
        .estado-badge.pesado    { background: #fef3c7; color: #92400e; }
        .estado-badge.procesado { background: #dcfce7; color: #166534; }

        /* LAYOUT LIQUIDACIÓN */
        .liq-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        @media (max-width: 900px) { .liq-grid { grid-template-columns: 1fr; } }
        .liq-col  { display: flex; flex-direction: column; gap: 16px; }

        /* INFO GRID */
        .info-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; margin-bottom: 14px; }
        .field-item { display: flex; flex-direction: column; gap: 2px; }
        .field-label { font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; }
        .field-value { font-size: 13px; color: #111827; padding: 4px 0; }

        /* PESO SUMMARY */
        .peso-summary { display: flex; gap: 12px; flex-wrap: wrap; border-top: 1px solid #e5e7eb; padding-top: 12px; }
        .peso-item { flex: 1; min-width: 130px; background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px 14px; display: flex; flex-direction: column; gap: 4px; }
        .peso-item.highlight { background: #fffbeb; border-color: #fcd34d; }
        .peso-lbl { font-size: 11px; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
        .peso-val { font-size: 15px; font-weight: 700; color: #111827; }
        .peso-item.highlight .peso-val { color: #92400e; }

        /* ORIGEN TAG */
        .origen-tag { font-size: 11px; color: #6b7280; margin-bottom: 12px; font-style: italic; }

        /* CALIDAD GRID */
        .calidad-grid { display: flex; gap: 10px; flex-wrap: wrap; }
        .cal-box { flex: 1; min-width: 110px; border-radius: 8px; padding: 12px 14px; display: flex; flex-direction: column; gap: 4px; }
        .cal-lbl { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.8; }
        .cal-val { font-size: 20px; font-weight: 800; }
        .cal-unit { font-size: 12px; opacity: 0.7; }

        /* FACTORES */
        .factor-list { display: flex; flex-direction: column; gap: 8px; }
        .factor-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px 14px; }
        .factor-row.hl { background: #fffbeb; border-color: #fcd34d; }
        .factor-info { display: flex; flex-direction: column; gap: 2px; }
        .factor-lbl { font-size: 12px; font-weight: 700; color: #374151; }
        .factor-formula { font-size: 11px; color: #9ca3af; font-style: italic; }
        .factor-val { font-size: 15px; font-weight: 800; color: #2e7d32; white-space: nowrap; }
        .factor-row.hl .factor-val { font-size: 17px; color: #1b5e20; }

        /* PRECIO ROW */
        .liq-precio-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
        .group { display: flex; flex-direction: column; }
        .group label { font-size: 12px; font-weight: 600; color: #374151; margin-bottom: 5px; }
        .group input, .group select { padding: 9px 12px; border-radius: 6px; border: 1px solid #d1d5db; font-size: 14px; background: white; color: #111827; }
        .group input:focus, .group select:focus { outline: none; border-color: #2e7d32; box-shadow: 0 0 0 3px rgba(46,125,50,.12); }

        /* RESULT BOX */
        .result-box { background: white; border: 1px solid #e5e7eb; border-radius: 10px; padding: 16px 18px; display: flex; flex-direction: column; gap: 10px; margin-bottom: 14px; }
        .result-row { display: flex; justify-content: space-between; align-items: center; }
        .result-lbl { font-size: 12px; color: #6b7280; font-weight: 600; }
        .result-val { font-size: 14px; font-weight: 700; color: #111827; }
        .result-val.big { font-size: 18px; color: #2e7d32; }
        .result-divider { border: none; border-top: 1px dashed #d1d5db; }
        .highlight-row { background: #fffbeb; border-radius: 6px; padding: 6px 10px; margin: 0 -10px; }
        .total-row { background: #1a3a0f; border-radius: 6px; padding: 10px 14px; margin: 0 -14px -16px; border-radius: 0 0 9px 9px; }
        .total-row .result-lbl { color: rgba(255,255,255,0.8); font-size: 13px; }
        .total-val { font-size: 22px; font-weight: 900; color: #86efac; }

        /* ACCIONES */
        .actions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 14px; }
        .btn { padding: 10px 18px; border: none; border-radius: 7px; cursor: pointer; font-size: 13px; font-weight: 600; transition: background 0.15s; }
        .btn:disabled { opacity: 0.55; cursor: not-allowed; }
        .btn.primary   { background: #2e7d32; color: white; }
        .btn.primary:hover:not(:disabled) { background: #1b5e20; }
        .btn.secondary { background: #1e40af; color: white; }
        .btn.secondary:hover:not(:disabled) { background: #1e3a8a; }
        .btn.outline   { background: white; color: #374151; border: 1px solid #d1d5db; }
        .btn.outline:hover:not(:disabled) { background: #f9fafb; }

        /* FÓRMULAS */
        .formulas-card .card-title { color: #6b7280; }
        .formula-list { display: flex; flex-direction: column; gap: 6px; }
        .formula-item { display: flex; align-items: center; gap: 10px; padding: 7px 10px; border-radius: 6px; }
        .formula-item.green  { background: #f0fdf4; }
        .formula-item.blue   { background: #eff6ff; }
        .formula-item.purple { background: #faf5ff; }
        .formula-item.orange { background: #fff7ed; }
        .formula-item.red    { background: #fef2f2; }
        .formula-tag { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; white-space: nowrap; min-width: 100px; color: #374151; }
        .formula-item code { font-family: 'Courier New', monospace; font-size: 12px; color: #1f2937; }

        /* BADGE ESTADO */
        .badge-estado { font-size: 10px; font-weight: 700; padding: 2px 10px; border-radius: 20px; }
        .badge-estado.pesado    { background: #fef3c7; color: #92400e; }
        .badge-estado.procesado { background: #dcfce7; color: #166534; }

        /* TABLA LIQUIDACIONES */
        .table-wrap { overflow-x: auto; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        th { text-align: left; padding: 10px 12px; background: #f9fafb; color: #374151; font-size: 10px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; border-bottom: 2px solid #e5e7eb; white-space: nowrap; }
        td { padding: 9px 12px; border-bottom: 1px solid #f3f4f6; color: #374151; font-size: 13px; }
        tbody tr:last-child td { border-bottom: none; }
        tbody tr:hover td { background: #fafafa; }
        .id-tag   { display: inline-block; background: #f3f4f6; color: #6b7280; border-radius: 4px; padding: 1px 7px; font-size: 12px; font-weight: 600; }
        .lote-tag { display: inline-block; background: #fef3c7; color: #92400e; border: 1px solid #fcd34d; border-radius: 5px; padding: 2px 9px; font-size: 11px; font-weight: 700; }
        .estado-tabla { color: #9ca3af; font-size: 14px; text-align: center; padding: 32px 0; }

        /* CHIPS DE CALIDAD EN TABLA */
        .cal-chip { display: inline-block; font-size: 12px; font-weight: 700; padding: 3px 10px; border-radius: 12px; }
        .cal-chip.ok      { background: #dcfce7; color: #15803d; }
        .cal-chip.low     { background: #fee2e2; color: #dc2626; }
        .cal-chip.high    { background: #fee2e2; color: #dc2626; }
        .cal-chip.neutral { background: #f1f5f9; color: #64748b; }
      `}</style>
    </>
  );
}

/* ── Componentes auxiliares ───────────────────────────────── */
const Field = ({ label, value }) => (
  <div className="field-item">
    <span className="field-label">{label}</span>
    <span className="field-value">{value || "—"}</span>
  </div>
);

const CAL_COLORS = {
  ok:      { bg: "#f0fdf4", border: "#86efac", text: "#15803d", chip: "#16a34a", chipTxt: "white"   },
  low:     { bg: "#fef2f2", border: "#fca5a5", text: "#dc2626", chip: "#dc2626", chipTxt: "white"   },
  high:    { bg: "#fef2f2", border: "#fca5a5", text: "#dc2626", chip: "#dc2626", chipTxt: "white"   },
  neutral: { bg: "#f8fafc", border: "#cbd5e1", text: "#475569", chip: "#64748b", chipTxt: "white"   },
};

const CalBox = ({ label, value, unit, rango }) => {
  const estado = estadoCalidad(value, rango);
  const c = CAL_COLORS[estado];
  const etiqueta = estado === "ok" ? "CUMPLE" : estado === "neutral" ? "SIN RANGO" : "NO CUMPLE";
  return (
    <div className="cal-box" style={{ background: c.bg, border: `1.5px solid ${c.border}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
        <span className="cal-lbl" style={{ color: c.text }}>{label}</span>
        <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 20, background: c.chip, color: c.chipTxt, letterSpacing: "0.5px", whiteSpace: "nowrap" }}>{etiqueta}</span>
      </div>
      <span className="cal-val" style={{ color: c.text }}>{value ?? "—"}</span>
      <span className="cal-unit" style={{ color: c.text, opacity: 0.85 }}>{unit}</span>
      {rango && <span style={{ fontSize: 10, color: c.text, opacity: 0.65, marginTop: 3 }}>Espec: {rango.spec}</span>}
    </div>
  );
};

const FactorRow = ({ label, formula, value, highlight }) => (
  <div className={`factor-row${highlight ? " hl" : ""}`}>
    <div className="factor-info">
      <span className="factor-lbl">{label}</span>
      <span className="factor-formula">{formula}</span>
    </div>
    <span className="factor-val">
      {value != null ? value.toFixed(6) : "—"}
    </span>
  </div>
);
