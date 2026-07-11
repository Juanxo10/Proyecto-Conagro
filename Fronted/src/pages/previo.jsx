import React, { useState, useEffect, useRef } from "react";

/* Fuente Inter desde Google Fonts */
const fontLink = document.createElement("link");
fontLink.rel = "stylesheet";
fontLink.href = "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap";
if (!document.head.querySelector('[href*="Inter"]')) document.head.appendChild(fontLink);

const API     = "/api/previos";
const API_VEH = "/api/vehiculos";
const HOY     = () => new Date().toISOString().split("T")[0];

const FORM_VACIO = {
  lote_id: "", fecha: HOY(), propietario: "", cedula_nit: "",
  placa: "", peso_bruto: "", peso_tara: "",
  humedad_s: "", humedad_l: "", impureza: "",
  nombre_conductor: "", cedula_conductor: "", producto: "",
};

const VEH_VACIO = {
  placa: "", tipo: "", marca: "", modelo: "", motor: "", chasis: "",
  color: "", empresa: "", conductor_cedula: "", conductor_nombre: "",
  propietario_cedula: "", propietario_nombre: "", telefono: "",
  centro_costo: "", alerta: "",
};

const TIPOS   = ["Camión","Tracto Camión","Volqueta","Furgón","Camioneta","Tractomula","Mini Van","Bus","Otro"];
const COLORES = ["Blanco","Negro","Rojo","Azul","Gris","Verde","Amarillo","Naranja","Plateado","Café","Beige","Otro"];

/* ── Helpers de campo ── */
const Field = ({ label, children }) => (
  <div className="pv-field">
    <label className="pv-label">{label}</label>
    {children}
  </div>
);

const FV = ({ label, name, value, onChange, ...rest }) => (
  <Field label={label}>
    <input className="pv-input" name={name} value={value} onChange={onChange} {...rest} />
  </Field>
);

const FVSel = ({ label, name, value, onChange, options }) => (
  <Field label={label}>
    <select className="pv-input" name={name} value={value} onChange={onChange}>
      <option value="">Seleccione…</option>
      {options.map((o, i) => <option key={i} value={o}>{o}</option>)}
    </select>
  </Field>
);

/* ── Badge de placa estilo matrícula ── */
const PlacaBadge = ({ placa }) =>
  placa
    ? <span className="placa-badge">{placa}</span>
    : <span className="pv-dash">—</span>;

export default function Previo() {
  const [form, setForm]           = useState(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg]             = useState({ tipo: "", texto: "" });
  const [lista, setLista]         = useState([]);
  const [cargandoLista, setCargando] = useState(true);

  /* placa */
  const [listaVeh, setListaVeh]       = useState([]);
  const [vehOk, setVehOk]             = useState(null);
  const [placaSearch, setPlacaSearch] = useState("");
  const [showPlacaDrop, setShowPlacaDrop] = useState(false);
  const placaRef = useRef(null);

  /* modal camión */
  const [showRegVeh, setShowRegVeh] = useState(false);
  const [formVeh, setFormVeh]       = useState(VEH_VACIO);
  const [guardandoVeh, setGVeh]     = useState(false);
  const [msgVeh, setMsgVeh]         = useState({ tipo: "", texto: "" });

  const printRef = useRef(null);

  /* Computed: filtered vehicles for search */
  const filteredVeh = listaVeh.filter(v => {
    if (!placaSearch.trim()) return true;
    const q = placaSearch.trim().toLowerCase();
    return (
      (v.placa || "").toLowerCase().includes(q) ||
      (v.marca || "").toLowerCase().includes(q) ||
      (v.empresa || "").toLowerCase().includes(q) ||
      (v.conductor_nombre || "").toLowerCase().includes(q) ||
      (v.tipo || "").toLowerCase().includes(q)
    );
  });

  /* ── Init ── */
  useEffect(() => { cargarLista(); pedirNuevoLote(); cargarVehiculos(); }, []);

  /* Click outside closes plate dropdown */
  useEffect(() => {
    const handler = e => {
      if (placaRef.current && !placaRef.current.contains(e.target)) {
        setShowPlacaDrop(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const cargarLista = async () => {
    setCargando(true);
    try {
      const r = await fetch(API);
      const d = await r.json();
      setLista(Array.isArray(d) ? d : []);
    } catch { setLista([]); }
    finally { setCargando(false); }
  };

  const cargarVehiculos = async () => {
    try {
      const r = await fetch(API_VEH);
      const d = await r.json();
      setListaVeh(Array.isArray(d) ? d : []);
    } catch { setListaVeh([]); }
  };

  const handleEstado = async (id, estado) => {
    try {
      const r = await fetch(`${API}/${id}/estado`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado }),
      });
      if (!r.ok) throw new Error("Error al cambiar estado");
      cargarLista();
    } catch (err) { alert(err.message); }
  };

  const pedirNuevoLote = async () => {
    try {
      const r = await fetch(`${API}/nuevo-lote`);
      const d = await r.json();
      setForm(f => ({ ...f, lote_id: d.lote_id, fecha: HOY() }));
    } catch { setForm(f => ({ ...f, lote_id: "LOT-ERROR" })); }
  };

  /* ── Selección de placa desde dropdown ── */
  const seleccionarPlaca = (placa) => {
    if (!placa) { setVehOk(null); setForm(f => ({ ...f, placa: "" })); return; }
    const veh = listaVeh.find(v => v.placa === placa);
    if (veh) { setVehOk(veh); llenarVehiculo(veh, placa); }
  };

  const llenarVehiculo = (v, placa) => {
    setForm(f => ({
      ...f,
      placa:            placa || v.placa || "",
      propietario:      v.propietario_nombre || "",
      cedula_nit:       v.propietario_cedula || v.conductor_cedula || "",
      nombre_conductor: v.conductor_nombre   || "",
      cedula_conductor: v.conductor_cedula   || "",
    }));
  };

  /* ── Registrar vehículo ── */
  const abrirRegVeh = (placa = "") => {
    setFormVeh({ ...VEH_VACIO, placa: placa.toUpperCase() });
    setMsgVeh({ tipo: "", texto: "" });
    setShowRegVeh(true);
  };

  const handleChangeVeh = e => setFormVeh(f => ({ ...f, [e.target.name]: e.target.value }));

  const guardarVehiculo = async () => {
    const { placa, tipo, marca, empresa, conductor_cedula, conductor_nombre } = formVeh;
    if (!placa || !tipo || !marca || !empresa || !conductor_cedula || !conductor_nombre)
      return setMsgVeh({ tipo: "error", texto: "Completa los campos requeridos (*)" });
    setGVeh(true);
    try {
      const r = await fetch(API_VEH, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formVeh, placa: formVeh.placa.toUpperCase() }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Error al guardar");
      setMsgVeh({ tipo: "ok", texto: "¡Camión registrado exitosamente!" });
      llenarVehiculo(d.vehiculo, d.vehiculo.placa);
      setVehOk(d.vehiculo);
      await cargarVehiculos();
      setTimeout(() => { setShowRegVeh(false); setMsgVeh({ tipo: "", texto: "" }); }, 1500);
    } catch (err) { setMsgVeh({ tipo: "error", texto: err.message }); }
    finally { setGVeh(false); }
  };

  /* ── Previo CRUD ── */
  const pesoNeto = () => {
    const b = parseFloat(form.peso_bruto) || 0;
    const t = parseFloat(form.peso_tara)  || 0;
    return (b - t).toFixed(2);
  };

  const flash = (tipo, texto) => {
    setMsg({ tipo, texto });
    setTimeout(() => setMsg({ tipo: "", texto: "" }), 4000);
  };

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const resetForm = async () => {
    await pedirNuevoLote();
    setForm(f => ({ ...FORM_VACIO, lote_id: f.lote_id, fecha: HOY() }));
    setVehOk(null);
    setPlacaSearch(""); setShowPlacaDrop(false);
    setMsg({ tipo: "", texto: "" });
  };

  const handleGuardar = async e => {
    e.preventDefault();
    if (!form.fecha) return flash("error", "La fecha es obligatoria");
    setGuardando(true);
    try {
      const r = await fetch(API, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          peso_bruto: form.peso_bruto || 0, peso_tara: form.peso_tara || 0,
          humedad_s: form.humedad_s || null, humedad_l: form.humedad_l || null,
          impureza:  form.impureza  || null,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Error al guardar");
      flash("ok", `Previo ${form.lote_id} guardado correctamente`);
      await cargarLista(); await pedirNuevoLote();
      setForm(f => ({ ...FORM_VACIO, lote_id: f.lote_id, fecha: HOY() }));
      setVehOk(null);
      setPlacaSearch(""); setShowPlacaDrop(false);
    } catch (err) { flash("error", err.message); }
    finally { setGuardando(false); }
  };

  const cargarParaImprimir = async id => {
    try {
      const r = await fetch(`${API}/${id}`);
      const d = await r.json();
      setForm({
        lote_id: d.lote_id||"", fecha: d.fecha||"", propietario: d.propietario||"",
        cedula_nit: d.cedula_nit||"", placa: d.placa||"",
        peso_bruto: d.peso_bruto||"", peso_tara: d.peso_tara||"",
        humedad_s: d.humedad_s||"", humedad_l: d.humedad_l||"", impureza: d.impureza||"",
        nombre_conductor: d.nombre_conductor||"", cedula_conductor: d.cedula_conductor||"",
        producto: d.producto||"",
      });
      setTimeout(() => window.print(), 300);
    } catch { flash("error", "No se pudo cargar el previo"); }
  };

  const pn = pesoNeto();

  return (
    <div className="pv-root">

      {/* ── Toast ── */}
      {msg.texto && (
        <div className={`pv-toast pv-toast--${msg.tipo}`}>
          <span>{msg.tipo === "ok" ? "✓" : "✕"}</span> {msg.texto}
        </div>
      )}

      {/* ── Modal Registrar Camión ── */}
      {showRegVeh && (
        <div className="pv-overlay" onClick={e => e.target === e.currentTarget && setShowRegVeh(false)}>
          <div className="pv-modal">
            <div className="pv-modal-header">
              <div className="pv-modal-title">
                Registrar nuevo camión
              </div>
              <button className="pv-modal-close" onClick={() => setShowRegVeh(false)}>✕</button>
            </div>

            {msgVeh.texto && (
              <div className={`pv-toast pv-toast--${msgVeh.tipo}`}
                style={{ position:"static", margin:"16px 24px 0", borderRadius:8, animation:"none" }}>
                <span>{msgVeh.tipo === "ok" ? "✓" : "✕"}</span> {msgVeh.texto}
              </div>
            )}

            <div className="pv-modal-body">
              {/* Identificación */}
              <div className="pv-section-card">
                <div className="pv-section-label">Identificación del vehículo</div>
                <div className="pv-modal-grid">
                  <Field label="Placa *">
                    <input className="pv-input pv-input--placa"
                      name="placa" value={formVeh.placa}
                      onChange={e => setFormVeh(f => ({ ...f, placa: e.target.value.toUpperCase() }))}
                      placeholder="ABC123" />
                  </Field>
                  <FVSel label="Tipo *"    name="tipo"    value={formVeh.tipo}    onChange={handleChangeVeh} options={TIPOS} />
                  <FV    label="Marca *"   name="marca"   value={formVeh.marca}   onChange={handleChangeVeh} placeholder="Ej: Kenworth" />
                  <FV    label="Modelo"    name="modelo"  value={formVeh.modelo}  onChange={handleChangeVeh} placeholder="Año o referencia" />
                  <FV    label="Empresa *" name="empresa" value={formVeh.empresa} onChange={handleChangeVeh} placeholder="Empresa transportadora" />
                  <FV    label="Motor"     name="motor"   value={formVeh.motor}   onChange={handleChangeVeh} />
                  <FV    label="Chasis"    name="chasis"  value={formVeh.chasis}  onChange={handleChangeVeh} />
                  <FVSel label="Color"     name="color"   value={formVeh.color}   onChange={handleChangeVeh} options={COLORES} />
                </div>
              </div>

              {/* Conductor */}
              <div className="pv-section-card">
                <div className="pv-section-label">Conductor</div>
                <div className="pv-modal-grid pv-modal-grid--2">
                  <FV label="Cédula *" name="conductor_cedula" value={formVeh.conductor_cedula} onChange={handleChangeVeh} placeholder="Número de cédula" />
                  <FV label="Nombre *" name="conductor_nombre" value={formVeh.conductor_nombre} onChange={handleChangeVeh} placeholder="Nombre completo" />
                  <FV label="Teléfono" name="telefono"         value={formVeh.telefono}         onChange={handleChangeVeh} placeholder="Celular" />
                </div>
              </div>

              {/* Propietario */}
              <div className="pv-section-card">
                <div className="pv-section-label">Propietario</div>
                <div className="pv-modal-grid pv-modal-grid--2">
                  <FV label="Cédula / NIT" name="propietario_cedula" value={formVeh.propietario_cedula} onChange={handleChangeVeh} />
                  <FV label="Nombre"       name="propietario_nombre" value={formVeh.propietario_nombre} onChange={handleChangeVeh} />
                </div>
              </div>
            </div>

            <div className="pv-modal-footer">
              <button className="pv-btn pv-btn--secondary" onClick={() => setShowRegVeh(false)}>Cancelar</button>
              <button className="pv-btn pv-btn--primary" onClick={guardarVehiculo} disabled={guardandoVeh}>
                {guardandoVeh ? "Guardando…" : "Guardar camión"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ PANTALLA PRINCIPAL ══ */}
      <div className="pv-form-area no-print">

        {/* ── Header ── */}
        <div className="pv-page-header">
          <div>
            <h1 className="pv-page-title">Registro de Previo</h1>
            <p className="pv-page-sub">Ingreso y control de vehículos · CONAGRO S.A.S</p>
          </div>
        </div>

        {/* ── Banner lote ID ── */}
        <div className="pv-lote-banner">
          <div>
            <div className="pv-lote-label">ID de Lote generado</div>
            <div className="pv-lote-id">{form.lote_id || "Cargando…"}</div>
          </div>
          <div className="pv-lote-fecha">
            <div className="pv-lote-label">Fecha</div>
            <div className="pv-lote-fecha-val">{form.fecha || HOY()}</div>
          </div>
        </div>

        <form onSubmit={handleGuardar}>

          {/* ── Card: Vehículo ── */}
          <div className="pv-card">
            <div className="pv-card-title">Vehículo</div>
            <div className="pv-placa-row">
              <div className="pv-search-wrap" ref={placaRef}>
                <label className="pv-label">Buscar placa, empresa o conductor</label>
                <div className="pv-search-box">
                  <svg className="pv-search-icon" viewBox="0 0 20 20" fill="none">
                    <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.8"/>
                    <path d="M13.5 13.5L17 17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                  </svg>
                  <input
                    className="pv-input pv-search-input"
                    placeholder="Ej: ABC123, Kenworth, empresa…"
                    value={placaSearch}
                    onChange={e => {
                      setPlacaSearch(e.target.value);
                      setShowPlacaDrop(true);
                      if (!e.target.value) { seleccionarPlaca(""); }
                    }}
                    onFocus={() => setShowPlacaDrop(true)}
                    autoComplete="off"
                  />
                  {placaSearch && (
                    <button type="button" className="pv-search-clear"
                      onClick={() => { setPlacaSearch(""); seleccionarPlaca(""); setShowPlacaDrop(false); }}>
                      ✕
                    </button>
                  )}
                </div>
                {showPlacaDrop && (
                  <div className="pv-search-drop">
                    {filteredVeh.length === 0
                      ? <div className="pv-search-empty">Sin resultados para &ldquo;{placaSearch}&rdquo;</div>
                      : filteredVeh.slice(0, 12).map(v => (
                        <div key={v.id} className="pv-search-item"
                          onMouseDown={e => {
                            e.preventDefault();
                            seleccionarPlaca(v.placa);
                            setPlacaSearch(v.placa);
                            setShowPlacaDrop(false);
                          }}
                        >
                          <span className="pv-search-placa">{v.placa}</span>
                          <span className="pv-search-meta">
                            {[v.tipo, v.marca, v.empresa].filter(Boolean).join(" · ")}
                          </span>
                          {v.conductor_nombre && (
                            <span className="pv-search-conductor">{v.conductor_nombre}</span>
                          )}
                        </div>
                      ))
                    }
                    {filteredVeh.length > 12 && (
                      <div className="pv-search-more">+{filteredVeh.length - 12} más — filtra para ver menos</div>
                    )}
                  </div>
                )}
              </div>
              <button type="button" className="pv-btn pv-btn--camion-sm"
                onClick={() => abrirRegVeh("")}
                title="Registrar nuevo camión"
              >
                <svg viewBox="0 0 20 20" fill="none" width="14" height="14" style={{verticalAlign:"middle"}}>
                  <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                Registrar camión
              </button>
            </div>

            {vehOk && (
              <div className="pv-chip pv-chip--ok">
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
          </div>

          {/* ── Card: Datos generales ── */}
          <div className="pv-card">
            <div className="pv-card-title">Datos del previo</div>
            <div className="pv-form-grid">
              <FV label="Fecha *"           name="fecha"           value={form.fecha}           onChange={handleChange} type="date" required />
              <FV label="Placa"             name="placa"           value={form.placa}           onChange={handleChange} placeholder="ABC123" />
              <FV label="Propietario"       name="propietario"     value={form.propietario}     onChange={handleChange} placeholder="Nombre propietario" />
              <FV label="Cédula / NIT"      name="cedula_nit"      value={form.cedula_nit}      onChange={handleChange} placeholder="Cédula o NIT" />
              <FV label="Nombre Conductor"  name="nombre_conductor" value={form.nombre_conductor} onChange={handleChange} placeholder="Nombre completo" />
              <FV label="Cédula Conductor"  name="cedula_conductor" value={form.cedula_conductor} onChange={handleChange} placeholder="Número de cédula" />
              <div className="pv-field pv-field--full">
                <label className="pv-label">Producto</label>
                <input className="pv-input" name="producto" value={form.producto} onChange={handleChange} placeholder="Nombre del producto" />
              </div>
            </div>
          </div>

          {/* ── Card: Pesos y calidad ── */}
          <div className="pv-card">
            <div className="pv-card-title">Pesos y calidad</div>
            <div className="pv-pesos-grid">
              <Field label="Peso Bruto (kg)">
                <input className="pv-input" type="number" name="peso_bruto" value={form.peso_bruto}
                  onChange={handleChange} placeholder="0" min="0" />
              </Field>
              <Field label="Peso Tara (kg)">
                <input className="pv-input" type="number" name="peso_tara" value={form.peso_tara}
                  onChange={handleChange} placeholder="0" min="0" />
              </Field>
              <Field label="Peso Neto (kg)">
                <div className="pv-neto-box">
                  {pn !== "0.00" ? Number(pn).toLocaleString("es-CO") : "—"}
                </div>
              </Field>
              <Field label="Humedad S. (%)">
                <input className="pv-input" type="number" name="humedad_s" value={form.humedad_s}
                  onChange={handleChange} placeholder="0.00" step="0.01" min="0" />
              </Field>
              <Field label="Humedad L. (%)">
                <input className="pv-input" type="number" name="humedad_l" value={form.humedad_l}
                  onChange={handleChange} placeholder="0.00" step="0.01" min="0" />
              </Field>
              <Field label="Impureza (%)">
                <input className="pv-input" type="number" name="impureza" value={form.impureza}
                  onChange={handleChange} placeholder="0.00" step="0.01" min="0" />
              </Field>
            </div>
          </div>

          {/* ── Acciones ── */}
          <div className="pv-actions">
            <button type="submit" className="pv-btn pv-btn--primary" disabled={guardando}>
              {guardando ? "Guardando…" : "Guardar previo"}
            </button>
            <button type="button" className="pv-btn pv-btn--print" onClick={() => window.print()}>
              Imprimir
            </button>
            <button type="button" className="pv-btn pv-btn--secondary" onClick={resetForm}>
              ↺ Nuevo
            </button>
          </div>
        </form>

        {/* ── Tabla previos ── */}
        <div className="pv-card pv-card--table" style={{ marginTop: 28 }}>
          <div className="pv-card-title">Previos registrados</div>
          {cargandoLista
            ? (
              <div className="pv-loading">
                <div className="pv-spinner" /> Cargando registros…
              </div>
            ) : (
              <div className="pv-tabla-wrap">
                <table className="pv-tabla">
                  <thead>
                    <tr>
                      <th>Lote ID</th>
                      <th>Fecha</th>
                      <th>Placa</th>
                      <th>Propietario</th>
                      <th>Conductor</th>
                      <th>Producto</th>
                      <th style={{ textAlign:"right" }}>Peso Neto</th>
                      <th style={{ textAlign:"center" }}>Estado</th>
                      <th style={{ textAlign:"center", minWidth:180 }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lista.length === 0
                      ? <tr><td colSpan={9} className="pv-empty">No hay previos registrados aún</td></tr>
                      : lista.map(p => (
                        <tr key={p.id} className="pv-fila">
                          <td><span className="lote-badge">{p.lote_id}</span></td>
                          <td className="pv-fecha">{p.fecha?.slice(0, 10)}</td>
                          <td><PlacaBadge placa={p.placa} /></td>
                          <td>{p.propietario || <span className="pv-dash">—</span>}</td>
                          <td>{p.nombre_conductor || <span className="pv-dash">—</span>}</td>
                          <td>{p.producto || <span className="pv-dash">—</span>}</td>
                          <td style={{ textAlign:"right", fontWeight:600 }}>
                            {p.peso_neto != null
                              ? `${Number(p.peso_neto).toLocaleString("es-CO")} kg`
                              : <span className="pv-dash">—</span>}
                          </td>
                          <td style={{ textAlign:"center" }}>
                            {(() => {
                              const e = p.estado || "PENDIENTE";
                              const cls = e === "APROBADO" ? "pv-est-aprobado"
                                : e === "RECHAZADO" ? "pv-est-rechazado"
                                : e === "CONDICIONADO" ? "pv-est-condicionado"
                                : e === "PESADO" ? "pv-est-pesado"
                                : e === "DESPACHADO" ? "pv-est-despachado"
                                : "pv-est-pendiente";
                              return <span className={`pv-est ${cls}`}>{e}</span>;
                            })()}
                          </td>
                          <td>
                            <div className="pv-acciones-row">
                              {(!p.estado || p.estado === "PENDIENTE" || p.estado === "RECHAZADO" || p.estado === "CONDICIONADO") && (
                                <button className="pv-btn-acc pv-btn-acc--aprobar" onClick={() => handleEstado(p.id, "APROBADO")} title="Aprobar">
                                  ✓ Aprobar
                                </button>
                              )}
                              {(!p.estado || p.estado === "PENDIENTE" || p.estado === "APROBADO" || p.estado === "CONDICIONADO") && (
                                <button className="pv-btn-acc pv-btn-acc--rechazar" onClick={() => handleEstado(p.id, "RECHAZADO")} title="Rechazar">
                                  ✕ Rechazar
                                </button>
                              )}
                              {(!p.estado || p.estado === "PENDIENTE" || p.estado === "APROBADO" || p.estado === "RECHAZADO") && (
                                <button className="pv-btn-acc pv-btn-acc--condicionado" onClick={() => handleEstado(p.id, "CONDICIONADO")} title="Condicionado — arroz de calidad regular, seguimiento requerido">
                                  ⚠ Condicionado
                                </button>
                              )}
                              <button className="pv-btn-acc pv-btn-acc--imprimir" onClick={() => cargarParaImprimir(p.id)} title="Imprimir previo">
                                🗘 Imprimir
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    }
                  </tbody>
                </table>
              </div>
            )
          }
        </div>
      </div>

      {/* ══ ZONA DE IMPRESIÓN ══ */}
      <div className="print-only" ref={printRef}>
        <div className="doc-previo">
          <div className="doc-header">
            <div className="doc-logo-cell"><div className="doc-logo-text">CONAGRO</div></div>
            <div className="doc-title-cell">
              <div className="doc-company">CONAGRO S.A.S</div>
              <div className="doc-subtitle">FORMATO PREVIOS 2.026</div>
              <div className="doc-lote">{form.lote_id}</div>
            </div>
          </div>
          <div className="doc-doc-title">Previo</div>
          <table className="doc-tabla">
            <tbody>
              <tr><td className="doc-lbl">FECHA</td>            <td className="doc-val">{form.fecha}</td></tr>
              <tr><td className="doc-lbl">PROPIETARIO</td>      <td className="doc-val">{form.propietario}</td></tr>
              <tr><td className="doc-lbl">CEDULA / NIT</td>     <td className="doc-val">{form.cedula_nit}</td></tr>
              <tr><td className="doc-lbl">PLACA</td>            <td className="doc-val">{form.placa}</td></tr>
              <tr><td className="doc-lbl">PESO BRUTO</td>       <td className="doc-val">{form.peso_bruto ? `${parseFloat(form.peso_bruto).toLocaleString("es-CO")} kg` : ""}</td></tr>
              <tr><td className="doc-lbl">PESO TARA</td>        <td className="doc-val">{form.peso_tara  ? `${parseFloat(form.peso_tara).toLocaleString("es-CO")} kg`  : ""}</td></tr>
              <tr><td className="doc-lbl">PESO NETO</td>        <td className="doc-val">{pn !== "0.00"  ? `${parseFloat(pn).toLocaleString("es-CO")} kg`               : ""}</td></tr>
              <tr><td className="doc-lbl">HUMEDAD S.</td>       <td className="doc-val">{form.humedad_s ? `${form.humedad_s}%` : ""}</td></tr>
              <tr><td className="doc-lbl">HUMEDAD L.</td>       <td className="doc-val">{form.humedad_l ? `${form.humedad_l}%` : ""}</td></tr>
              <tr><td className="doc-lbl">IMPUREZA</td>         <td className="doc-val">{form.impureza  ? `${form.impureza}%`  : ""}</td></tr>
              <tr><td className="doc-lbl">NOMBRE CONDUCTOR</td> <td className="doc-val">{form.nombre_conductor}</td></tr>
              <tr><td className="doc-lbl">CEDULA</td>           <td className="doc-val">{form.cedula_conductor}</td></tr>
              <tr><td className="doc-lbl">PRODUCTO</td>         <td className="doc-val">{form.producto}</td></tr>
            </tbody>
          </table>
          <div className="doc-footer">
            <span>ID Lote: {form.lote_id}</span>
            <span>Impreso: {new Date().toLocaleDateString("es-CO")}</span>
          </div>
        </div>
      </div>

      {/* ══ ESTILOS ══ */}
      <style>{`
        .pv-root { font-family:'Inter','Segoe UI',system-ui,sans-serif; padding:24px 28px;
          color:#1e293b; }
        .pv-root *, .pv-modal * { font-family:'Inter','Segoe UI',system-ui,sans-serif; }

        /* Toast */
        .pv-toast { position:fixed; top:20px; right:24px; z-index:9999;
          padding:12px 20px; border-radius:10px; font-weight:600; font-size:.92rem;
          display:flex; align-items:center; gap:8px;
          box-shadow:0 4px 20px rgba(0,0,0,.15); animation:slideIn .25s ease; }
        .pv-toast--ok    { background:#ecfdf5; color:#065f46; border:1.5px solid #6ee7b7; }
        .pv-toast--error { background:#fef2f2; color:#991b1b; border:1.5px solid #fca5a5; }
        @keyframes slideIn { from{opacity:0;transform:translateY(-12px)} to{opacity:1;transform:none} }

        /* Header */
        .pv-page-header { display:flex; justify-content:space-between; align-items:center;
          margin-bottom:20px; flex-wrap:wrap; gap:12px; }
        .pv-page-title  { font-size:1.6rem; font-weight:800; color:#0f4c35; margin:0; }
        .pv-page-sub    { font-size:.85rem; color:#64748b; margin:4px 0 0; }

        /* Banner lote */
        .pv-lote-banner { background:linear-gradient(135deg,#0f4c35 0%,#166534 100%);
          border-radius:12px; padding:16px 24px; margin-bottom:18px;
          display:flex; align-items:center; justify-content:space-between; gap:20px;
          box-shadow:0 4px 14px rgba(15,76,53,.3); }
        .pv-lote-label    { font-size:.68rem; font-weight:700; text-transform:uppercase;
          letter-spacing:.8px; color:#86efac; margin-bottom:2px; }
        .pv-lote-id       { font-size:1.5rem; font-weight:900; color:#fff;
          letter-spacing:3px; }
        .pv-lote-fecha    { text-align:right; }
        .pv-lote-fecha-val{ font-size:1rem; font-weight:700; color:#fff; }

        /* Cards */
        .pv-card { background:#fff; border:1px solid #e2e8f0; border-radius:12px;
          padding:20px 22px; margin-bottom:16px;
          box-shadow:0 1px 4px rgba(0,0,0,.04); }
        .pv-card-title { font-size:.75rem; font-weight:800; text-transform:uppercase;
          letter-spacing:.7px; color:#0f4c35; margin-bottom:16px;
          padding-bottom:10px; border-bottom:2px solid #f0fdf4; }

        /* Grids */
        .pv-form-grid  { display:grid; grid-template-columns:repeat(auto-fill,minmax(210px,1fr)); gap:14px 18px; }
        .pv-pesos-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(160px,1fr)); gap:14px 18px; }
        .pv-modal-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(190px,1fr)); gap:12px 16px; }
        .pv-modal-grid--2 { grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); }
        .pv-field--full { grid-column:1/-1; }

        /* Campos */
        .pv-field { display:flex; flex-direction:column; }
        .pv-label { font-size:.72rem; font-weight:700; color:#475569; margin-bottom:5px;
          text-transform:uppercase; letter-spacing:.3px; }
        .pv-input { padding:9px 12px; border:1.5px solid #e2e8f0; border-radius:8px;
          font-size:.9rem; color:#1e293b; background:#f8fafc;
          transition:border-color .15s,box-shadow .15s; box-sizing:border-box; }
        .pv-input:focus { outline:none; border-color:#16a34a; background:#fff;
          box-shadow:0 0 0 3px #dcfce7; }
        .pv-input--placa { font-size:.95rem; font-weight:700;
          letter-spacing:2px; text-transform:uppercase; }

        /* Peso neto */
        .pv-neto-box { padding:9px 12px; background:#f0fdf4; border:1.5px solid #86efac;
          border-radius:8px; font-size:1rem; font-weight:800; color:#065f46; text-align:center; }

        /* Búsqueda placa */
        .pv-placa-row { display:flex; align-items:flex-end; gap:12px; flex-wrap:wrap; margin-bottom:4px; }
        .pv-search-wrap { position:relative; flex:1; min-width:240px; }
        .pv-search-box  { position:relative; display:flex; align-items:center; }
        .pv-search-icon { position:absolute; left:11px; color:#94a3b8; pointer-events:none; width:16px; height:16px; flex-shrink:0; }
        .pv-search-input { padding-left:34px !important; padding-right:32px !important; width:100%; }
        .pv-search-clear { position:absolute; right:9px; background:none; border:none;
          color:#94a3b8; cursor:pointer; font-size:.85rem; padding:0 2px;
          line-height:1; display:flex; align-items:center; }
        .pv-search-clear:hover { color:#475569; }
        .pv-search-drop { position:absolute; top:calc(100% + 4px); left:0; right:0;
          background:#fff; border:1.5px solid #e2e8f0; border-radius:10px;
          box-shadow:0 8px 24px rgba(0,0,0,.12); z-index:200;
          max-height:260px; overflow-y:auto; }
        .pv-search-item { padding:10px 14px; cursor:pointer; display:flex;
          flex-direction:column; gap:2px; border-bottom:1px solid #f1f5f9; }
        .pv-search-item:last-child { border-bottom:none; }
        .pv-search-item:hover { background:#f0fdf4; }
        .pv-search-placa { font-size:.9rem; font-weight:800; color:#1e293b;
          letter-spacing:1.5px; font-family:'Inter',monospace; }
        .pv-search-meta  { font-size:.76rem; color:#64748b; font-weight:500; }
        .pv-search-conductor { font-size:.73rem; color:#94a3b8; }
        .pv-search-empty { padding:16px 14px; color:#94a3b8; font-size:.85rem;
          font-style:italic; text-align:center; }
        .pv-search-more  { padding:8px 14px; color:#64748b; font-size:.75rem;
          background:#f8fafc; text-align:center; border-top:1px solid #e2e8f0; }
        .pv-chip      { display:flex; align-items:center; gap:10px; padding:10px 14px;
          border-radius:8px; margin-top:12px; font-size:.88rem; }
        .pv-chip--ok   { background:#f0fdf4; border:1.5px solid #86efac; color:#166534; }
        .pv-chip--warn { background:#fffbeb; border:1.5px solid #fcd34d; color:#92400e; }
        .pv-btn-link  { background:none; border:none; color:#1d4ed8; font-weight:700;
          cursor:pointer; text-decoration:underline; font-size:.88rem; padding:0; }

        /* Botones */
        .pv-actions { display:flex; gap:10px; margin-top:4px; flex-wrap:wrap; }
        .pv-btn { padding:10px 22px; border:none; border-radius:8px; font-size:.9rem;
          font-weight:700; cursor:pointer; transition:all .15s;
          display:inline-flex; align-items:center; gap:6px; }
        .pv-btn:disabled { opacity:.55; cursor:default; }
        .pv-btn--primary   { background:#16a34a; color:#fff; }
        .pv-btn--print     { background:#1d4ed8; color:#fff; }
        .pv-btn--secondary { background:#e2e8f0; color:#374151; }
        .pv-btn--buscar    { background:#0369a1; color:#fff; }
        .pv-btn--camion    { background:#0f4c35; color:#fff; }
        .pv-btn--camion-sm { background:#0f4c35; color:#fff; padding:9px 14px; border:none;
          border-radius:8px; font-size:.85rem; font-weight:700; cursor:pointer; }
        .pv-btn:hover:not(:disabled),
        .pv-btn--camion-sm:hover { filter:brightness(1.1); transform:translateY(-1px);
          box-shadow:0 3px 10px rgba(0,0,0,.15); }

        /* Tabla */
        .pv-tabla-wrap { overflow-x:auto; -webkit-overflow-scrolling:touch; }
        .pv-tabla      { width:100%; border-collapse:collapse; font-size:.85rem; min-width:900px; }
        .pv-tabla th   { background:#0f4c35; color:#fff; padding:11px 12px; text-align:left;
          font-size:.72rem; text-transform:uppercase; letter-spacing:.5px; white-space:nowrap; }
        .pv-tabla th:first-child { border-radius:8px 0 0 0; }
        .pv-tabla th:last-child  { border-radius:0 8px 0 0; }
        .pv-tabla td   { padding:9px 12px; border-bottom:1px solid #f1f5f9; vertical-align:middle; }
        .pv-fila:hover td { background:#f0fdf4; }
        .pv-fecha { color:#64748b; font-size:.8rem; white-space:nowrap; }
        .pv-dash  { color:#cbd5e1; }
        .pv-empty { text-align:center; color:#94a3b8; padding:36px; font-style:italic; }

        /* Badges */
        .lote-badge  { display:inline-block; background:#dcfce7; color:#166534;
          padding:3px 10px; border-radius:20px; font-weight:700; font-size:.72rem;
          letter-spacing:.3px; white-space:nowrap; }
        .placa-badge { display:inline-block; background:#1e293b; color:#fbbf24;
          padding:3px 10px; border-radius:5px;
          font-weight:800; font-size:.85rem; letter-spacing:2px;
          border:2px solid #374151; white-space:nowrap; }
        /* Acciones tabla */
        .pv-acciones-row { display:flex; gap:4px; align-items:center; flex-wrap:wrap; justify-content:center; }
        .pv-btn-acc { display:inline-flex; align-items:center; gap:3px; padding:4px 8px;
          border-radius:6px; font-size:.73rem; font-weight:700; cursor:pointer;
          border:1.5px solid transparent; white-space:nowrap; transition:all .15s; }
        .pv-btn-acc--aprobar  { background:#f0fdf4; color:#166534; border-color:#86efac; }
        .pv-btn-acc--aprobar:hover  { background:#16a34a; color:#fff; border-color:#16a34a; }
        .pv-btn-acc--rechazar { background:#fef2f2; color:#991b1b; border-color:#fca5a5; }
        .pv-btn-acc--rechazar:hover { background:#dc2626; color:#fff; border-color:#dc2626; }
        .pv-btn-acc--condicionado { background:#fefce8; color:#854d0e; border-color:#fde68a; }
        .pv-btn-acc--condicionado:hover { background:#d97706; color:#fff; border-color:#d97706; }
        .pv-btn-acc--imprimir { background:#eff6ff; color:#1d4ed8; border-color:#93c5fd; }
        .pv-btn-acc--imprimir:hover { background:#1d4ed8; color:#fff; border-color:#1d4ed8; }
        .pv-est { display:inline-block; padding:2px 9px; border-radius:20px; font-size:.72rem; font-weight:700; letter-spacing:.5px; text-transform:uppercase; }
        .pv-est-pendiente   { background:#fef9c3; color:#854d0e; border:1px solid #fef08a; }
        .pv-est-aprobado      { background:#dcfce7; color:#166534; border:1px solid #86efac; }
        .pv-est-rechazado     { background:#fee2e2; color:#991b1b; border:1px solid #fecaca; }
        .pv-est-condicionado  { background:#fef9c3; color:#854d0e; border:1px solid #fde047; }
        .pv-est-pesado        { background:#dbeafe; color:#1d4ed8; border:1px solid #93c5fd; }
        .pv-est-despachado  { background:#fef3c7; color:#92400e; border:1px solid #fcd34d; }

        /* Loading */
        .pv-loading { display:flex; align-items:center; gap:10px; color:#64748b;
          padding:28px; font-style:italic; }
        .pv-spinner { width:18px; height:18px; border:2px solid #e2e8f0;
          border-top-color:#16a34a; border-radius:50%; animation:spin .7s linear infinite;
          flex-shrink:0; }
        @keyframes spin { to{transform:rotate(360deg)} }

        /* Modal */
        .pv-overlay { position:fixed; inset:0; background:rgba(15,25,40,.5);
          display:flex; align-items:center; justify-content:center;
          z-index:1000; padding:16px; backdrop-filter:blur(3px); }
        .pv-modal { background:#fff; border-radius:16px; width:100%; max-width:760px;
          max-height:90vh; display:flex; flex-direction:column;
          box-shadow:0 25px 60px rgba(0,0,0,.3); overflow:hidden; }
        .pv-modal-header { background:linear-gradient(135deg,#0f4c35,#166534);
          padding:18px 24px; display:flex; justify-content:space-between; align-items:center; }
        .pv-modal-title  { color:#fff; font-size:1.05rem; font-weight:800;
          display:flex; align-items:center; gap:10px; }
        .pv-modal-icon   { font-size:1.3rem; }
        .pv-modal-close  { background:rgba(255,255,255,.15); border:none; color:#fff;
          width:32px; height:32px; border-radius:8px; font-size:1rem; cursor:pointer; }
        .pv-modal-close:hover { background:rgba(255,255,255,.3); }
        .pv-modal-body   { padding:20px 24px; overflow-y:auto; flex:1; }
        .pv-modal-footer { padding:16px 24px; border-top:1px solid #e2e8f0;
          display:flex; justify-content:flex-end; gap:10px; background:#f8fafc; }

        /* Secciones modal */
        .pv-section-card  { background:#f8fafc; border:1px solid #e2e8f0;
          border-radius:10px; padding:14px 16px; margin-bottom:14px; }
        .pv-section-label { font-size:.72rem; font-weight:800; text-transform:uppercase;
          letter-spacing:.5px; color:#0f4c35; margin-bottom:12px; }

        /* Impresión */
        .print-only { display:none; }
        @media print {
          .sidebar,.topbar,.pv-form-area,.pv-toast,.pv-overlay { display:none !important; }
          .layout  { display:block !important; }
          .main    { display:block !important; padding:0 !important; margin:0 !important; }
          .content { padding:0 !important; margin:0 !important; }
          .pv-root { padding:0 !important; margin:0 !important; }
          .print-only { display:block !important; width:100%; background:#fff;
            padding:10mm; box-sizing:border-box; }
          @page { margin:10mm; }
          .doc-previo    { width:148mm; margin:0 auto; font-family:Arial,sans-serif; font-size:10pt; }
          .doc-header    { display:flex !important; border:2px solid #000; margin-bottom:8mm; }
          .doc-logo-cell { width:35mm; border-right:1px solid #000;
            display:flex !important; align-items:center; justify-content:center; padding:4mm; }
          .doc-logo-text { font-size:13pt; font-weight:900; letter-spacing:1px; }
          .doc-title-cell{ flex:1; padding:3mm 4mm; display:flex !important;
            flex-direction:column; align-items:center; justify-content:center; }
          .doc-company   { font-size:13pt; font-weight:900; }
          .doc-subtitle  { font-size:8pt; }
          .doc-lote      { font-size:9pt; font-weight:700; margin-top:1mm; }
          .doc-doc-title { font-size:12pt; font-weight:700; text-align:center; margin-bottom:4mm; }
          .doc-tabla     { width:100%; border-collapse:collapse; }
          .doc-tabla tr  { border:1px solid #000; }
          .doc-lbl       { font-weight:700; padding:2mm 3mm; width:45mm;
            border-right:1px solid #000; background:#f5f5f5 !important;
            -webkit-print-color-adjust:exact; print-color-adjust:exact; font-size:9pt; }
          .doc-val       { padding:2mm 3mm; font-size:9pt; }
          .doc-footer    { margin-top:6mm; display:flex !important; justify-content:space-between;
            font-size:7pt; color:#555; border-top:1px solid #ccc; padding-top:2mm; }
        }
      `}</style>
    </div>
  );
}
