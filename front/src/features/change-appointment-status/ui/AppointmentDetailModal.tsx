import { CHANNEL_LABEL, STATUS_LABEL, type Appointment, type AppointmentStatus } from "@/entities/appointment";
import { longDate, money, time12 } from "@/shared/lib";
import { Modal, panelButton } from "@/shared/ui";
import { changeStatus } from "../api/changeStatus";

const line = "mt-2 mb-0 mx-0 text-[0.92rem]";

/** El detalle de una cita en el panel, con los botones para marcar cómo terminó. */
export function AppointmentDetailModal({
  appointment,
  onClose,
  onChanged,
}: {
  appointment: Appointment;
  onClose: () => void;
  onChanged: () => void;
}) {
  async function setStatus(status: AppointmentStatus) {
    await changeStatus(appointment.id, status);
    onChanged();
  }

  const a = appointment;
  return (
    <Modal title={a.client.name} onClose={onClose}>
      <p className={line}>📅 {longDate(a.start)}, {time12(a.start)} – {time12(a.end)}</p>
      <p className={line}>✂️ {a.service.name} con {a.barber.name}</p>
      <p className={line}>
        💵 {money(a.finalPrice)}
        {a.discountPct > 0 && ` (${a.discountPct}% de descuento por registro)`}
      </p>
      <p className={line}>
        📱{" "}
        <a href={`https://wa.me/${a.client.phone}`} target="_blank" rel="noreferrer">
          +{a.client.phone}
        </a>
      </p>
      <p className={line}>Estado: <strong>{STATUS_LABEL[a.status]}</strong> · Reservó por {CHANNEL_LABEL[a.channel]}</p>
      {a.notes && <p className="mt-3 mb-0 mx-0 text-[0.8rem] text-muted">{a.notes}</p>}

      <div className="mt-[18px] flex flex-wrap justify-start gap-[10px]">
        {a.status !== "COMPLETADA" && (
          <button className={panelButton("success")} onClick={() => setStatus("COMPLETADA")}>✓ Atendido</button>
        )}
        {a.status !== "NO_ASISTIO" && (
          <button className={panelButton("secondary")} onClick={() => setStatus("NO_ASISTIO")}>No vino</button>
        )}
        {a.status !== "CANCELADA" && (
          <button className={panelButton("danger")} onClick={() => confirm("¿Cancelar esta cita?") && setStatus("CANCELADA")}>
            Cancelar
          </button>
        )}
        {a.status !== "AGENDADA" && (
          <button className={panelButton("secondary")} onClick={() => setStatus("AGENDADA")}>Volver a agendada</button>
        )}
      </div>
    </Modal>
  );
}
