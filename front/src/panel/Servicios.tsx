import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { apiPanel, barberia, urlImagen, type DatosServicio, type ServicioAdmin } from "../api";
import { BotonMenu, BotonPerfil } from "../componentes/Navegacion";
import { useSesion } from "../sesion";
import { fechaCorta, precio } from "../formato";
import { Modal } from "./Modal";

/** Catálogo de servicios del negocio. Solo el admin lo administra. */
export function Servicios() {
  const { usuario, esAdmin } = useSesion();
  if (!usuario) return <Navigate to="/perfil" replace state={{ desde: "/panel/servicios" }} />;
  if (!esAdmin) return <Navigate to="/panel" replace />;
  return <ListaServicios />;
}

type Edicion = { servicio: ServicioAdmin | null } | null;

function ListaServicios() {
  const api = useMemo(() => apiPanel(), []);
  const [servicios, setServicios] = useState<ServicioAdmin[] | null>(null);
  const [edicion, setEdicion] = useState<Edicion>(null);
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    try {
      setServicios(await api.servicios());
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }, [api]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function cambiarVisible(s: ServicioAdmin) {
    if (s.activo && !confirm(`¿Ocultar "${s.nombre}"? Dejará de aparecer en la web y en WhatsApp.`)) return;
    try {
      await api.editarServicio(s.id, { activo: !s.activo });
      cargar();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div className="panel">
      <header className="panel-barra">
        <BotonMenu />
        <strong>💈 {barberia.nombre}</strong>
        <span className="panel-resumen">Servicios</span>
        <BotonPerfil />
      </header>

      <div className="panel-controles">
        <div className="grupo">
          <Link className="boton secundario" to="/panel">‹ Agenda</Link>
          <h2>Servicios</h2>
        </div>
        <div className="grupo">
          <button className="boton primario" onClick={() => setEdicion({ servicio: null })}>+ Servicio</button>
        </div>
      </div>

      {error && <p className="error">{error}</p>}
      {!servicios && !error && <p className="cargando">Cargando servicios…</p>}

      {servicios && (
        <div className="tabla-contenedor">
          <table className="tabla">
            <thead>
              <tr>
                <th>Imagen</th>
                <th>Servicio</th>
                <th>Duración</th>
                <th>Precio</th>
                <th>Estado</th>
                <th>Creado por</th>
                <th>Último cambio</th>
                <th>Opciones</th>
              </tr>
            </thead>
            <tbody>
              {servicios.map((s) => (
                <tr key={s.id} className={s.activo ? "" : "inactivo"}>
                  <td>
                    {s.imagenUrl ? (
                      <img className="tabla-miniatura" src={urlImagen(s.imagenUrl)!} alt="" />
                    ) : (
                      <span className="tabla-miniatura vacia">—</span>
                    )}
                  </td>
                  <td>
                    <strong>{s.nombre}</strong>
                    {s.descripcion && <span className="tabla-descripcion">{s.descripcion}</span>}
                  </td>
                  <td>{s.duracionMin} min</td>
                  <td>{precio(s.precio)}</td>
                  <td>
                    <span className={s.activo ? "estado visible" : "estado oculto"}>{s.activo ? "Visible" : "Oculto"}</span>
                  </td>
                  <td>{s.creadoPor?.nombre ?? "Datos de ejemplo"}</td>
                  <td>
                    {fechaCorta(s.actualizadoEn)}
                    {s.actualizadoPor && <span className="tabla-descripcion">por {s.actualizadoPor.nombre}</span>}
                  </td>
                  <td>
                    <div className="tabla-opciones">
                      <button className="boton secundario" onClick={() => setEdicion({ servicio: s })}>Editar</button>
                      <button className="boton secundario" onClick={() => cambiarVisible(s)}>
                        {s.activo ? "Ocultar" : "Mostrar"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {edicion && (
        <FormServicio
          api={api}
          servicio={edicion.servicio}
          onCerrar={() => setEdicion(null)}
          onGuardado={() => {
            setEdicion(null);
            cargar();
          }}
        />
      )}
    </div>
  );
}

function FormServicio({
  api,
  servicio,
  onCerrar,
  onGuardado,
}: {
  api: ReturnType<typeof apiPanel>;
  servicio: ServicioAdmin | null;
  onCerrar: () => void;
  onGuardado: () => void;
}) {
  const [datos, setDatos] = useState<DatosServicio>(
    servicio ?? { nombre: "", descripcion: "", duracionMin: 30, precio: 0, imagenUrl: null, activo: true },
  );
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState("");
  const cambiar = (parcial: Partial<DatosServicio>) => setDatos({ ...datos, ...parcial });

  async function elegirImagen(archivo: File | undefined) {
    if (!archivo) return;
    setSubiendo(true);
    setError("");
    try {
      cambiar({ imagenUrl: await api.subirImagen(archivo) });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubiendo(false);
    }
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    const { nombre, descripcion, duracionMin, precio, imagenUrl, activo } = datos;
    const cuerpo = { nombre, descripcion, duracionMin, precio, imagenUrl, activo };
    try {
      if (servicio) await api.editarServicio(servicio.id, cuerpo);
      else await api.crearServicio(cuerpo);
      onGuardado();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <Modal titulo={servicio ? "Editar servicio" : "Nuevo servicio"} onCerrar={onCerrar}>
      <form onSubmit={guardar}>
        <label className="campo">
          Nombre
          <input value={datos.nombre} onChange={(e) => cambiar({ nombre: e.target.value })} maxLength={60} required />
        </label>
        <label className="campo">
          Descripción
          <textarea
            value={datos.descripcion}
            onChange={(e) => cambiar({ descripcion: e.target.value })}
            maxLength={300}
            rows={3}
          />
        </label>
        <div className="fila">
          <label className="campo">
            Duración (min)
            <input
              type="number"
              min={5}
              max={480}
              step={5}
              value={datos.duracionMin}
              onChange={(e) => cambiar({ duracionMin: Number(e.target.value) })}
              required
            />
          </label>
          <label className="campo">
            Precio (COP)
            <input
              type="number"
              min={0}
              step={1000}
              value={datos.precio}
              onChange={(e) => cambiar({ precio: Number(e.target.value) })}
              required
            />
          </label>
        </div>
        <div className="campo">
          Imagen
          {datos.imagenUrl && <img className="vista-imagen" src={urlImagen(datos.imagenUrl)!} alt="" />}
          <div className="fila">
            <label className="boton secundario">
              {subiendo ? "Subiendo…" : datos.imagenUrl ? "Cambiar imagen" : "Subir imagen"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                hidden
                disabled={subiendo}
                onChange={(e) => elegirImagen(e.target.files?.[0])}
              />
            </label>
            {datos.imagenUrl && (
              <button type="button" className="enlace" onClick={() => cambiar({ imagenUrl: null })}>Quitar</button>
            )}
          </div>
        </div>
        <label className="casilla">
          <input type="checkbox" checked={datos.activo} onChange={(e) => cambiar({ activo: e.target.checked })} />
          Visible en la web y en WhatsApp
        </label>
        {error && <p className="error">{error}</p>}
        <button className="boton primario bloque" disabled={subiendo}>Guardar</button>
      </form>
    </Modal>
  );
}
