import React, { useState, useEffect } from "react";

const API = "/api/vehiculos";

const FORM_VACIO = {
  placa: "", tipo: "", marca: "", modelo: "",
  motor: "", chasis: "", color: "", empresa: "",
  conductor_cedula: "", conductor_nombre: "",
  propietario_cedula: "", propietario_nombre: "",
  telefono: "", centro_costo: "", alerta: ""
};

const TIPOS = ["Camión", "Tracto Camión", "Volqueta", "Furgón", "Camioneta", "Tractomula", "Mini Van", "Bus", "Otro"];
const COLORES = ["Blanco", "Negro", "Rojo", "Azul", "Gris", "Verde", "Amarillo", "Naranja", "Plateado", "Café", "Beige", "Otro"];

export default function MaestroVehiculos() {

  const [form, setForm]         = useState(FORM_VACIO);
  const [modoEditar, setModo]   = useState(null);   // null = nuevo | id = editando
  const [vehiculos, setVehiculos] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [msg, setMsg]           = useState({ tipo: "", texto: "" });
  const [cargando, setCargando] = useState(false);
  const [loadingLista, setLoadingLista] = useState(true);

  // ── Cargar lista ──────────────────────────────────────────
  const cargarVehiculos = async () => {
    setLoadingLista(true);
    try {
      const res  = await fetch(API);
      const data = await res.json();
      setVehiculos(Array.isArray(data) ? data : []);
    } catch {
      setVehiculos([]);
    } finally {
      setLoadingLista(false);
    }
  };

  useEffect(() => { cargarVehiculos(); }, []);

  // ── Helpers ───────────────────────────────────────────────
  const mostrarMsg = (tipo, texto) => {
    setMsg({ tipo, texto });
    setTimeout(() => setMsg({ tipo: "", texto: "" }), 4000);
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const resetForm = () => {
    setForm(FORM_VACIO);
    setModo(null);
    setMsg({ tipo: "", texto: "" });
  };

  // ── Cargar vehículo para editar ───────────────────────────
  const handleEditar = (v) => {
    setForm({
      placa:              v.placa              || "",
      tipo:               v.tipo               || "",
      marca:              v.marca              || "",
      modelo:             v.modelo             || "",
      motor:              v.motor              || "",
      chasis:             v.chasis             || "",
      color:              v.color              || "",
      empresa:            v.empresa            || "",
      conductor_cedula:   v.conductor_cedula   || "",
      conductor_nombre:   v.conductor_nombre   || "",
      propietario_cedula: v.propietario_cedula || "",
      propietario_nombre: v.propietario_nombre || "",
      telefono:           v.telefono           || "",
      centro_costo:       v.centro_costo       || "",
      alerta:             v.alerta             || "",
    });
    setModo(v.id);
    setMsg({ tipo: "", texto: "" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ── Guardar (crear o actualizar) ──────────────────────────
  const handleSubmit = async () => {
    const obligatorios = {
      placa: "Placa", tipo: "Tipo", marca: "Marca",
      empresa: "Empresa",
      conductor_cedula: "Cédula del conductor",
      conductor_nombre: "Nombre del conductor",
    };
    const faltantes = Object.entries(obligatorios)
      .filter(([key]) => !form[key]?.trim())
      .map(([, label]) => label);

    if (faltantes.length > 0) {
      mostrarMsg("error", `Campos obligatorios: ${faltantes.join(", ")}`);
      return;
    }

    setCargando(true);
    try {
      const esEdicion = modoEditar !== null;
      const res = await fetch(esEdicion ? `${API}/${modoEditar}` : API, {
        method:  esEdicion ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      mostrarMsg("ok", esEdicion ? "Vehículo actualizado correctamente." : "Vehículo guardado correctamente.");
      resetForm();
      cargarVehiculos();
    } catch (error) {
      mostrarMsg("error", error.message);
    } finally {
      setCargando(false);
    }
  };

  // ── Eliminar ───────────────────────────────────────────────
  const handleEliminar = async (v) => {
    if (!window.confirm(`¿Eliminar el vehículo ${v.placa}?`)) return;
    try {
      const res  = await fetch(`${API}/${v.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      mostrarMsg("ok", data.message);
      if (modoEditar === v.id) resetForm();
      cargarVehiculos();
    } catch (error) {
      mostrarMsg("error", error.message);
    }
  };

  // ── Lista filtrada ─────────────────────────────────────────
  const lista = vehiculos.filter(v =>
    [v.placa, v.tipo, v.empresa, v.conductor_nombre, v.marca]
      .some(c => (c || "").toLowerCase().includes(busqueda.toLowerCase()))
  );

  return (
    <>
      <div className="app">
        <div className="wrapper">

          {/* HEADER */}
          <div className="page-header">
            <div>
              <p className="page-eyebrow">GESTIÓN DE FLOTA</p>
              <h1 className="title">Maestro de <span>Vehículos</span></h1>
              <p className="subtitle-text">Registro, consulta y administración de la flota vehicular.</p>
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
                <span>{modoEditar ? `Editando vehículo: ${form.placa}` : "Nuevo registro"}</span>
              </div>
              {modoEditar !== null && (
                <button className="btn-limpiar" onClick={resetForm} disabled={cargando}>
                  Cancelar edición
                </button>
              )}
            </div>

            <div className="form">

              <Card title="Identificación del vehículo">
                <Row>
                  <InputF label="Placa"  name="placa"  value={form.placa}  onChange={handleChange} upper required />
                  <SelectF label="Tipo"  name="tipo"   value={form.tipo}   onChange={handleChange} options={TIPOS} required />
                  <InputF label="Marca"  name="marca"  value={form.marca}  onChange={handleChange} required />
                  <InputF label="Modelo" name="modelo" value={form.modelo} onChange={handleChange} />
                </Row>
              </Card>

              <Card title="Características">
                <Row>
                  <InputF label="Motor"   name="motor"   value={form.motor}   onChange={handleChange} />
                  <InputF label="Chasis"  name="chasis"  value={form.chasis}  onChange={handleChange} />
                  <SelectF label="Color"  name="color"   value={form.color}   onChange={handleChange} options={COLORES} />
                  <InputF label="Empresa" name="empresa" value={form.empresa} onChange={handleChange} required />
                </Row>
              </Card>

              <Card title="Conductor">
                <Row>
                  <InputF label="Cédula" name="conductor_cedula" value={form.conductor_cedula} onChange={handleChange} required />
                  <InputF label="Nombre" name="conductor_nombre" value={form.conductor_nombre} onChange={handleChange} required />
                </Row>
              </Card>

              <Card title="Propietario">
                <Row>
                  <InputF label="Cédula"          name="propietario_cedula" value={form.propietario_cedula} onChange={handleChange} />
                  <InputF label="Nombre"          name="propietario_nombre" value={form.propietario_nombre} onChange={handleChange} />
                  <InputF label="Teléfono"        name="telefono"           value={form.telefono}           onChange={handleChange} />
                  <InputF label="Centro de costo" name="centro_costo"       value={form.centro_costo}       onChange={handleChange} />
                </Row>
              </Card>

              <Card title="Observaciones">
                <textarea
                  name="alerta"
                  value={form.alerta}
                  onChange={handleChange}
                  placeholder="Observaciones o alertas sobre el vehículo..."
                  rows={3}
                />
              </Card>

              <div className="actions">
                {modoEditar !== null && (
                  <button className="btn outline" onClick={resetForm} disabled={cargando}>
                    Cancelar
                  </button>
                )}
                <button className="btn primary" onClick={handleSubmit} disabled={cargando}>
                  {cargando ? "Procesando..." : modoEditar ? "Guardar cambios" : "Registrar vehículo"}
                </button>
              </div>

            </div>
          </div>

          {/* TABLA */}
          <div className="list-section">
            <div className="list-header">
              <div className="list-title-group">
                <h2 className="list-title">Vehículos registrados</h2>
                <span className="count-badge">{vehiculos.length} en total</span>
              </div>
              <div className="search-wrap">
                <span className="search-icon">⌕</span>
                <input
                  className="search"
                  placeholder="Buscar por placa, tipo, empresa o conductor..."
                  value={busqueda}
                  onChange={e => setBusqueda(e.target.value)}
                />
              </div>
            </div>

            {loadingLista ? (
              <div className="estado-tabla">Cargando registros...</div>
            ) : lista.length === 0 ? (
              <div className="estado-tabla">{busqueda ? "No se encontraron resultados." : "No hay vehículos registrados."}</div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Placa</th>
                      <th>Tipo</th>
                      <th>Marca / Modelo</th>
                      <th>Empresa</th>
                      <th>Conductor</th>
                      <th>Propietario</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lista.map(v => (
                      <tr key={v.id} className={modoEditar === v.id ? "row-activa" : ""}>
                        <td><span className="placa-tag">{v.placa}</span></td>
                        <td>{v.tipo || "—"}</td>
                        <td>{[v.marca, v.modelo].filter(Boolean).join(" · ") || "—"}</td>
                        <td>{v.empresa || "—"}</td>
                        <td>{v.conductor_nombre || "—"}</td>
                        <td>{v.propietario_nombre || "—"}</td>
                        <td className="td-actions">
                          <button className="btn-edit"   onClick={() => handleEditar(v)}>Editar</button>
                          <button className="btn-delete" onClick={() => handleEliminar(v)}>Eliminar</button>
                        </td>
                      </tr>
                    ))}
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
        .msg {
          display: flex; align-items: center; gap: 10px;
          padding: 12px 18px; border-radius: 8px; font-size: 14px; font-weight: 500;
        }
        .msg.ok    { background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; }
        .msg.error { background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }
        .msg-icon {
          width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center;
          justify-content: center; font-size: 12px; font-weight: 700; flex-shrink: 0;
        }
        .msg.ok    .msg-icon { background: #166534; color: white; }
        .msg.error .msg-icon { background: #991b1b; color: white; }

        /* ── FORMULARIO ── */
        .form-section {
          background: white; border: 1px solid #e5e7eb;
          border-radius: 12px; padding: 28px;
          box-shadow: 0 1px 4px rgba(0,0,0,.06);
        }
        .form-section-header {
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid #f3f4f6;
        }
        .form-estado { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; }
        .form-estado.nuevo    { color: #2e7d32; }
        .form-estado.editando { color: #92400e; }
        .estado-dot {
          width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
        }
        .form-estado.nuevo    .estado-dot { background: #2e7d32; }
        .form-estado.editando .estado-dot { background: #f59e0b; }
        .btn-limpiar {
          font-size: 13px; color: #6b7280; background: none; border: 1px solid #d1d5db;
          padding: 6px 14px; border-radius: 6px; cursor: pointer;
        }
        .btn-limpiar:hover { background: #f9fafb; color: #374151; }

        /* ── CARDS DEL FORM ── */
        .form { display: flex; flex-direction: column; gap: 16px; }
        .card {
          background: #fafafa; border: 1px solid #e5e7eb;
          border-radius: 10px; padding: 20px 24px;
        }
        .card-title {
          font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase;
          color: #2e7d32; margin-bottom: 16px; padding-bottom: 10px;
          border-bottom: 1px solid #e5e7eb;
        }
        .row { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; }
        .group { display: flex; flex-direction: column; }
        .group label { font-size: 12px; font-weight: 600; color: #374151; margin-bottom: 5px; }
        .group input, .group select {
          padding: 9px 12px; border-radius: 6px; border: 1px solid #d1d5db;
          font-size: 14px; background: white; color: #111827;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .group input:focus, .group select:focus {
          outline: none; border-color: #2e7d32;
          box-shadow: 0 0 0 3px rgba(46,125,50,.12);
        }
        textarea {
          width: 100%; padding: 10px 12px; border-radius: 6px;
          border: 1px solid #d1d5db; font-size: 14px; resize: vertical;
          font-family: Arial, sans-serif; color: #111827;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        textarea:focus {
          outline: none; border-color: #2e7d32;
          box-shadow: 0 0 0 3px rgba(46,125,50,.12);
        }

        /* ── BOTONES ── */
        .actions { display: flex; justify-content: flex-end; gap: 10px; padding-top: 8px; }
        .btn {
          padding: 10px 24px; border: none; border-radius: 7px;
          cursor: pointer; font-size: 14px; font-weight: 600; letter-spacing: 0.2px;
          transition: background 0.15s;
        }
        .btn:disabled { opacity: 0.55; cursor: not-allowed; }
        .btn.primary { background: #2e7d32; color: white; }
        .btn.primary:hover:not(:disabled) { background: #1b5e20; }
        .btn.outline { background: white; color: #374151; border: 1px solid #d1d5db; }
        .btn.outline:hover:not(:disabled) { background: #f9fafb; }

        /* ── TABLA ── */
        .list-section {
          background: white; border: 1px solid #e5e7eb;
          border-radius: 12px; padding: 28px;
          box-shadow: 0 1px 4px rgba(0,0,0,.06);
        }
        .list-header {
          display: flex; justify-content: space-between;
          align-items: center; flex-wrap: wrap; gap: 14px;
          margin-bottom: 20px;
        }
        .list-title-group { display: flex; align-items: center; gap: 10px; }
        .list-title { font-size: 16px; font-weight: 700; margin: 0; color: #111827; }
        .count-badge {
          background: #f0fdf4; color: #166534; font-size: 12px;
          font-weight: 600; padding: 3px 10px; border-radius: 20px;
          border: 1px solid #bbf7d0;
        }
        .search-wrap { position: relative; }
        .search-icon {
          position: absolute; left: 11px; top: 50%; transform: translateY(-50%);
          font-size: 16px; color: #9ca3af; pointer-events: none;
        }
        .search {
          padding: 9px 14px 9px 34px; border: 1px solid #d1d5db;
          border-radius: 8px; font-size: 13px; min-width: 300px; color: #111827;
        }
        .search:focus { outline: none; border-color: #2e7d32; box-shadow: 0 0 0 3px rgba(46,125,50,.12); }
        .estado-tabla { color: #9ca3af; font-size: 14px; text-align: center; padding: 40px 0; margin: 0; }

        .table-wrap { overflow-x: auto; }
        table { width: 100%; border-collapse: collapse; font-size: 13.5px; }
        th {
          text-align: left; padding: 10px 14px;
          background: #f9fafb; color: #374151;
          font-size: 11px; font-weight: 700; letter-spacing: 1px;
          text-transform: uppercase; border-bottom: 2px solid #e5e7eb;
          white-space: nowrap;
        }
        td { padding: 12px 14px; border-bottom: 1px solid #f3f4f6; color: #374151; }
        tbody tr:last-child td { border-bottom: none; }
        tbody tr:hover td { background: #f9fafb; }
        tbody tr.row-activa td { background: #fffbeb; }

        .placa-tag {
          display: inline-block; background: #f0fdf4; color: #166534;
          border: 1px solid #bbf7d0; border-radius: 5px;
          padding: 2px 9px; font-size: 12px; font-weight: 700; letter-spacing: 1px;
        }
        .td-actions { display: flex; gap: 6px; white-space: nowrap; }
        .btn-edit {
          padding: 5px 13px; font-size: 12px; font-weight: 600;
          border: 1px solid #bfdbfe; background: #eff6ff;
          color: #1d4ed8; border-radius: 5px; cursor: pointer;
        }
        .btn-edit:hover { background: #dbeafe; }
        .btn-delete {
          padding: 5px 13px; font-size: 12px; font-weight: 600;
          border: 1px solid #fecaca; background: #fef2f2;
          color: #dc2626; border-radius: 5px; cursor: pointer;
        }
        .btn-delete:hover { background: #fee2e2; }
      `}</style>
    </>
  );
}

const Card = ({ title, children }) => (
  <div className="card">
    <div className="card-title">{title}</div>
    {children}
  </div>
);

const Row = ({ children }) => <div className="row">{children}</div>;

const InputF = ({ label, name, value, onChange, upper }) => (
  <div className="group">
    <label>{label}</label>
    <input
      name={name}
      value={value}
      onChange={upper
        ? (e) => onChange({ target: { name, value: e.target.value.toUpperCase() } })
        : onChange
      }
    />
  </div>
);

const SelectF = ({ label, name, options, value, onChange }) => (
  <div className="group">
    <label>{label}</label>
    <select name={name} value={value} onChange={onChange}>
      <option value="">Seleccione</option>
      {options.map((opt, i) => (
        <option key={i} value={opt}>{opt}</option>
      ))}
    </select>
  </div>
);