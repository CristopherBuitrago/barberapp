import type { Cita, EstadoCita } from "../api";
import { fechaLarga, hora, precio } from "../formato";
import { Modal } from "./Modal";

const NOMBRE_ESTADO: Record<EstadoCita, string> = {
  AGENDADA: "Agendada",
  CANCELADA: "Cancelada",
  COMPLETADA: "Completada",
  NO_ASISTIO: "No asistió",
};

const NOMBRE_CANAL = { WEB: "Página web", WHATSAPP: "WhatsApp", PANEL: "Panel" };

export function DetalleCita({
  cita,
  onCerrar,
  onCambiarEstado,
}: {
  cita: Cita;
  onCerrar: () => void;
  onCambiarEstado: (estado: EstadoCita) => void;
}) {
  return (
    <Modal titulo={cita.cliente.nombre} onCerrar={onCerrar}>
      <p className="resumen-linea">📅 {fechaLarga(cita.inicio)}, {hora(cita.inicio)} – {hora(cita.fin)}</p>
      <p className="resumen-linea">✂️ {cita.servicio.nombre} con {cita.barbero.nombre}</p>
      <p className="resumen-linea">
        💵 {precio(cita.precioFinal)}
        {cita.descuentoPct > 0 && ` (${cita.descuentoPct}% de descuento por registro)`}
      </p>
      <p className="resumen-linea">
        📱{" "}
        <a href={`https://wa.me/${cita.cliente.telefono}`} target="_blank" rel="noreferrer">
          +{cita.cliente.telefono}
        </a>
      </p>
      <p className="resumen-linea">Estado: <strong>{NOMBRE_ESTADO[cita.estado]}</strong> · Reservó por {NOMBRE_CANAL[cita.canal]}</p>
      {cita.notas && <p className="nota">{cita.notas}</p>}

      <div className="acciones envolver">
        {cita.estado !== "COMPLETADA" && (
          <button className="boton exito" onClick={() => onCambiarEstado("COMPLETADA")}>✓ Atendido</button>
        )}
        {cita.estado !== "NO_ASISTIO" && (
          <button className="boton secundario" onClick={() => onCambiarEstado("NO_ASISTIO")}>No vino</button>
        )}
        {cita.estado !== "CANCELADA" && (
          <button className="boton peligro" onClick={() => confirm("¿Cancelar esta cita?") && onCambiarEstado("CANCELADA")}>
            Cancelar
          </button>
        )}
        {cita.estado !== "AGENDADA" && (
          <button className="boton secundario" onClick={() => onCambiarEstado("AGENDADA")}>Volver a agendada</button>
        )}
      </div>
    </Modal>
  );
}
