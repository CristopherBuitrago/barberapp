import { useEffect, useState } from "react";
import { api as apiPublica, type apiPanel, type Barbero, type HoraDisponible, type Servicio } from "../api";
import { hora } from "../formato";
import { Modal } from "./Modal";

/** Cita creada por la barbería (cliente que llama o llega sin reserva). */
export function FormCita({
  api,
  barberos,
  fechaInicial,
  onCerrar,
  onGuardada,
}: {
  api: ReturnType<typeof apiPanel>;
  barberos: Barbero[];
  fechaInicial: string;
  onCerrar: () => void;
  onGuardada: () => void;
}) {
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [servicioId, setServicioId] = useState<number>();
  const [barberoId, setBarberoId] = useState<number>();
  const [fecha, setFecha] = useState(fechaInicial);
  const [horas, setHoras] = useState<HoraDisponible[]>([]);
  const [inicio, setInicio] = useState("");
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    apiPublica.servicios().then((s) => {
      setServicios(s);
      setServicioId(s[0]?.id);
    });
  }, []);

  useEffect(() => {
    if (!servicioId) return;
    setInicio("");
    apiPublica.disponibilidad(servicioId, fecha, barberoId).then(setHoras).catch(() => setHoras([]));
  }, [servicioId, fecha, barberoId]);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!servicioId || !inicio) return;
    try {
      await api.crearCita({ servicioId, barberoId, inicio, cliente: { nombre, telefono, aceptaDatos: false } });
      onGuardada();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <Modal titulo="Nueva cita" onCerrar={onCerrar}>
      <form onSubmit={guardar}>
        <label className="campo">
          Servicio
          <select value={servicioId ?? ""} onChange={(e) => setServicioId(Number(e.target.value))}>
            {servicios.map((s) => (
              <option key={s.id} value={s.id}>{s.nombre} ({s.duracionMin} min)</option>
            ))}
          </select>
        </label>
        <label className="campo">
          Barbero
          <select value={barberoId ?? ""} onChange={(e) => setBarberoId(e.target.value ? Number(e.target.value) : undefined)}>
            <option value="">El que esté libre</option>
            {barberos.map((b) => (
              <option key={b.id} value={b.id}>{b.nombre}</option>
            ))}
          </select>
        </label>
        <label className="campo">
          Fecha
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
        </label>
        <label className="campo">
          Hora
          <select value={inicio} onChange={(e) => setInicio(e.target.value)} required>
            <option value="">{horas.length ? "Elige una hora" : "Sin horas libres"}</option>
            {horas.map((h) => (
              <option key={h.inicio} value={h.inicio}>
                {hora(h.inicio)} ({h.barberos.map((b) => b.nombre).join(", ")})
              </option>
            ))}
          </select>
        </label>
        <label className="campo">
          Nombre del cliente
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} required />
        </label>
        <label className="campo">
          Celular
          <input value={telefono} onChange={(e) => setTelefono(e.target.value)} required inputMode="tel" />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="boton primario bloque">Guardar cita</button>
      </form>
    </Modal>
  );
}
