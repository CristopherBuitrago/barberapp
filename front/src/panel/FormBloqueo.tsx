import { useState } from "react";
import type { apiPanel, Barbero } from "../api";
import { DESFASE } from "../formato";
import { Modal } from "./Modal";

/** Bloquear horas de un barbero (almuerzo, diligencia, día libre). */
export function FormBloqueo({
  api,
  barberos,
  fechaInicial,
  onCerrar,
  onGuardado,
}: {
  api: ReturnType<typeof apiPanel>;
  barberos: Barbero[];
  fechaInicial: string;
  onCerrar: () => void;
  onGuardado: () => void;
}) {
  const [barberoId, setBarberoId] = useState(barberos[0]?.id);
  const [fecha, setFecha] = useState(fechaInicial);
  const [desde, setDesde] = useState("12:00");
  const [hasta, setHasta] = useState("13:00");
  const [diaCompleto, setDiaCompleto] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState("");

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!barberoId) return;
    const [hi, hf] = diaCompleto ? ["00:00", "23:59"] : [desde, hasta];
    try {
      await api.bloquear({
        barberoId,
        inicio: `${fecha}T${hi}:00${DESFASE}`,
        fin: `${fecha}T${hf}:00${DESFASE}`,
        motivo,
      });
      onGuardado();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <Modal titulo="Bloquear horario" onCerrar={onCerrar}>
      <form onSubmit={guardar}>
        <label className="campo">
          Barbero
          <select value={barberoId ?? ""} onChange={(e) => setBarberoId(Number(e.target.value))}>
            {barberos.map((b) => (
              <option key={b.id} value={b.id}>{b.nombre}</option>
            ))}
          </select>
        </label>
        <label className="campo">
          Fecha
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
        </label>
        <label className="casilla">
          <input type="checkbox" checked={diaCompleto} onChange={(e) => setDiaCompleto(e.target.checked)} />
          Todo el día
        </label>
        {!diaCompleto && (
          <div className="fila">
            <label className="campo">
              Desde
              <input type="time" value={desde} onChange={(e) => setDesde(e.target.value)} required />
            </label>
            <label className="campo">
              Hasta
              <input type="time" value={hasta} onChange={(e) => setHasta(e.target.value)} required />
            </label>
          </div>
        )}
        <label className="campo">
          Motivo (opcional)
          <input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Almuerzo, diligencia…" />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="boton primario bloque">Bloquear</button>
      </form>
    </Modal>
  );
}
