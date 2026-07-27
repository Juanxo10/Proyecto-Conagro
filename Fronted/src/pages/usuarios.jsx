import React, { useState, useEffect } from "react";

const API = "/api/auth";

const FORM_VACIO = { nombre: "", usuario: "", password: "", rol: "empleado" };

export default function Usuarios() {
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");

  const [form, setForm]         = useState(FORM_VACIO);
  const [usuarios, setUsuarios] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [msg, setMsg]           = useState({ tipo: "", texto: "" });
  const [cargando, setCargando] = useState(false);
  const [loadingLista, setLoadingLista] = useState(true);

  const cargarUsuarios = async () => {
    setLoadingLista(true);
    try {
      const res  = await fetch(`${API}/users`);
      if (!res.ok) throw new Error(`No se pudo cargar la lista de usuarios (${res.status})`);
      const data = await res.json();
      setUsuarios(Array.isArray(data) ? data : []);
    } catch (error) {
      setUsuarios([]);
      mostrarMsg("error", error.message || "No se pudo cargar la lista de usuarios");
    } finally {
      setLoadingLista(false);
    }
  };

  useEffect(() => { cargarUsuarios(); }, []);

  const mostrarMsg = (tipo, texto) => {
    setMsg({ tipo, texto });
    setTimeout(() => setMsg({ tipo: "", texto: "" }), 4000);
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const resetForm = () => {
    setForm(FORM_VACIO);
  };

  const handleSubmit = async () => {
    if (!form.nombre.trim() || !form.usuario.trim() || !form.password.trim()) {
      mostrarMsg("error", "Nombre, usuario y contraseña son obligatorios");
      return;
    }
    if (form.password.length < 6) {
      mostrarMsg("error", "La contraseña debe tener al menos 6 caracteres");
      return;
    }

    setCargando(true);
    try {
      const res = await fetch(`${API}/register`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      mostrarMsg("ok", "Usuario creado correctamente.");
      resetForm();
      cargarUsuarios();
    } catch (error) {
      mostrarMsg("error", error.message);
    } finally {
      setCargando(false);
    }
  };

  const cambiarEstado = async (u, cambios) => {
    try {
      const res = await fetch(`${API}/users/${u.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(cambios),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      mostrarMsg("ok", data.message);
      cargarUsuarios();
    } catch (error) {
      mostrarMsg("error", error.message);
    }
  };

  const lista = usuarios.filter(u =>
    [u.usuario, u.nombre, u.rol].some(c => (c || "").toLowerCase().includes(busqueda.toLowerCase()))
  );

  return (
    <>
      <div className="app">
        <div className="wrapper">

          {/* HEADER */}
          <div className="page-header">
            <div>
              <p className="page-eyebrow">ADMINISTRACIÓN</p>
              <h1 className="title">Gestión de <span>Usuarios</span></h1>
              <p className="subtitle-text">Creación y control de acceso al sistema. Solo visible para administradores.</p>
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
              <div className="form-estado nuevo">
                <div className="estado-dot" />
                <span>Nuevo usuario</span>
              </div>
            </div>

            <div className="form">
              <div className="card">
                <div className="card-title">Datos de acceso</div>
                <div className="row">
                  <div className="group">
                    <label>Nombre completo</label>
                    <input name="nombre" value={form.nombre} onChange={handleChange} placeholder="Ej: Juan Pérez" />
                  </div>
                  <div className="group">
                    <label>Usuario</label>
                    <input name="usuario" value={form.usuario} onChange={handleChange} placeholder="Ej: jperez" />
                  </div>
                  <div className="group">
                    <label>Contraseña</label>
                    <input name="password" type="password" value={form.password} onChange={handleChange} placeholder="Mínimo 6 caracteres" />
                  </div>
                  <div className="group">
                    <label>Rol</label>
                    <select name="rol" value={form.rol} onChange={handleChange}>
                      <option value="empleado">Empleado</option>
                      <option value="admin">Administrador</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="actions">
                <button className="btn primary" onClick={handleSubmit} disabled={cargando}>
                  {cargando ? "Creando..." : "Crear usuario"}
                </button>
              </div>
            </div>
          </div>

          {/* TABLA */}
          <div className="list-section">
            <div className="list-header">
              <div className="list-title-group">
                <h2 className="list-title">Usuarios registrados</h2>
                <span className="count-badge">{usuarios.length} en total</span>
              </div>
              <div className="search-wrap">
                <span className="search-icon">⌕</span>
                <input
                  className="search"
                  placeholder="Buscar por usuario, nombre o rol..."
                  value={busqueda}
                  onChange={e => setBusqueda(e.target.value)}
                />
              </div>
            </div>

            {loadingLista ? (
              <div className="estado-tabla">Cargando registros...</div>
            ) : lista.length === 0 ? (
              <div className="estado-tabla">{busqueda ? "No se encontraron resultados." : "No hay usuarios registrados."}</div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Usuario</th>
                      <th>Nombre</th>
                      <th>Rol</th>
                      <th>Estado</th>
                      <th>Creado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lista.map(u => {
                      const esYo = String(u.id) === String(currentUser.id);
                      return (
                        <tr key={u.id}>
                          <td>
                            <span className="usuario-tag">{u.usuario}</span>
                            {esYo && <span className="tu-badge">tú</span>}
                          </td>
                          <td>{u.nombre || "—"}</td>
                          <td>
                            <span className={`rol-badge ${u.rol}`}>{u.rol}</span>
                          </td>
                          <td>
                            <span className={`estado-badge ${u.activo ? "activo" : "inactivo"}`}>
                              {u.activo ? "Activo" : "Inactivo"}
                            </span>
                          </td>
                          <td>{u.created_at ? new Date(u.created_at).toLocaleDateString("es-CO") : "—"}</td>
                          <td className="td-actions">
                            <button
                              className="btn-edit"
                              disabled={esYo}
                              title={esYo ? "No puedes cambiar tu propio rol" : ""}
                              onClick={() => cambiarEstado(u, { rol: u.rol === "admin" ? "empleado" : "admin" })}
                            >
                              {u.rol === "admin" ? "Quitar admin" : "Hacer admin"}
                            </button>
                            <button
                              className={u.activo ? "btn-delete" : "btn-activar"}
                              disabled={esYo}
                              title={esYo ? "No puedes desactivar tu propia cuenta" : ""}
                              onClick={() => cambiarEstado(u, { activo: !u.activo })}
                            >
                              {u.activo ? "Desactivar" : "Activar"}
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
        .msg-icon  { width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; flex-shrink: 0; }
        .msg.ok    .msg-icon { background: #166534; color: white; }
        .msg.error .msg-icon { background: #991b1b; color: white; }

        /* ── FORMULARIO ── */
        .form-section { background: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 28px; box-shadow: 0 1px 4px rgba(0,0,0,.06); }
        .form-section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid #f3f4f6; }
        .form-estado { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; }
        .form-estado.nuevo { color: #2e7d32; }
        .estado-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
        .form-estado.nuevo .estado-dot { background: #2e7d32; }

        /* ── CARDS DEL FORM ── */
        .form { display: flex; flex-direction: column; gap: 16px; }
        .card { background: #fafafa; border: 1px solid #e5e7eb; border-radius: 10px; padding: 20px 24px; }
        .card-title { font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: #2e7d32; margin-bottom: 16px; padding-bottom: 10px; border-bottom: 1px solid #e5e7eb; }
        .row { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; }
        .group { display: flex; flex-direction: column; }
        .group label { font-size: 12px; font-weight: 600; color: #374151; margin-bottom: 5px; }
        .group input, .group select {
          padding: 9px 12px; border-radius: 6px; border: 1px solid #d1d5db;
          font-size: 14px; background: white; color: #111827;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .group input:focus, .group select:focus { outline: none; border-color: #2e7d32; box-shadow: 0 0 0 3px rgba(46,125,50,.12); }

        /* ── BOTONES ── */
        .actions { display: flex; justify-content: flex-end; gap: 10px; padding-top: 8px; }
        .btn { padding: 10px 24px; border: none; border-radius: 7px; cursor: pointer; font-size: 14px; font-weight: 600; letter-spacing: 0.2px; transition: background 0.15s; }
        .btn:disabled { opacity: 0.55; cursor: not-allowed; }
        .btn.primary { background: #2e7d32; color: white; }
        .btn.primary:hover:not(:disabled) { background: #1b5e20; }

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
        table { width: 100%; border-collapse: collapse; font-size: 13.5px; }
        th { text-align: left; padding: 10px 14px; background: #f9fafb; color: #374151; font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; border-bottom: 2px solid #e5e7eb; white-space: nowrap; }
        td { padding: 12px 14px; border-bottom: 1px solid #f3f4f6; color: #374151; vertical-align: middle; }
        tbody tr:last-child td { border-bottom: none; }
        tbody tr:hover td { background: #f9fafb; }

        .usuario-tag { font-weight: 700; color: #111827; }
        .tu-badge { margin-left: 8px; background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; border-radius: 20px; padding: 1px 8px; font-size: 10.5px; font-weight: 700; text-transform: uppercase; }

        .rol-badge { display: inline-block; border-radius: 20px; padding: 2px 10px; font-size: 11.5px; font-weight: 700; text-transform: capitalize; }
        .rol-badge.admin    { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
        .rol-badge.empleado { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; }

        .estado-badge { display: inline-block; border-radius: 20px; padding: 2px 10px; font-size: 11.5px; font-weight: 700; }
        .estado-badge.activo   { background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; }
        .estado-badge.inactivo { background: #f3f4f6; color: #6b7280; border: 1px solid #e5e7eb; }

        .td-actions { display: flex; gap: 6px; white-space: nowrap; }
        .btn-edit    { padding: 5px 13px; font-size: 12px; font-weight: 600; border: 1px solid #bfdbfe; background: #eff6ff; color: #1d4ed8; border-radius: 5px; cursor: pointer; }
        .btn-edit:hover:not(:disabled) { background: #dbeafe; }
        .btn-delete  { padding: 5px 13px; font-size: 12px; font-weight: 600; border: 1px solid #fecaca; background: #fef2f2; color: #dc2626; border-radius: 5px; cursor: pointer; }
        .btn-delete:hover:not(:disabled) { background: #fee2e2; }
        .btn-activar { padding: 5px 13px; font-size: 12px; font-weight: 600; border: 1px solid #bbf7d0; background: #f0fdf4; color: #166534; border-radius: 5px; cursor: pointer; }
        .btn-activar:hover:not(:disabled) { background: #dcfce7; }
        .btn-edit:disabled, .btn-delete:disabled, .btn-activar:disabled { opacity: .4; cursor: not-allowed; }
      `}</style>
    </>
  );
}
