import { useEffect, useState, type FormEvent } from "react";
import type { Barber } from "@/entities/barber";
import { useCatalog } from "@/entities/service";
import { getAvailability, type Slot } from "@/entities/slot";
import { time12 } from "@/shared/lib";
import { Modal, PanelField, panelButton, panelControl, panelText } from "@/shared/ui";
import { createPanelAppointment } from "../api/createPanelAppointment";

/** Cita creada por la barbería, para el cliente que llama o llega sin reserva. */
export function NewAppointmentModal({
  barbers,
  initialDate,
  onClose,
  onSaved,
}: {
  barbers: Barber[];
  initialDate: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { data: services = [] } = useCatalog();
  const [serviceId, setServiceId] = useState<number>();
  const [barberId, setBarberId] = useState<number>();
  const [date, setDate] = useState(initialDate);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [start, setStart] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");

  // El primer servicio queda elegido apenas llega el catálogo
  useEffect(() => {
    if (!serviceId && services.length) setServiceId(services[0].id);
  }, [services, serviceId]);

  useEffect(() => {
    if (!serviceId) return;
    setStart("");
    getAvailability(serviceId, date, barberId).then(setSlots).catch(() => setSlots([]));
  }, [serviceId, date, barberId]);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!serviceId || !start) return;
    try {
      await createPanelAppointment({ serviceId, barberId, start, client: { name, phone, acceptsDataPolicy: false } });
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <Modal title="Nueva cita" onClose={onClose}>
      <form onSubmit={save}>
        <PanelField label="Servicio">
          <select value={serviceId ?? ""} onChange={(e) => setServiceId(Number(e.target.value))}>
            {services.map((s) => (
              <option key={s.id} value={s.id}>{s.name} ({s.durationMin} min)</option>
            ))}
          </select>
        </PanelField>
        <PanelField label="Barbero">
          <select value={barberId ?? ""} onChange={(e) => setBarberId(e.target.value ? Number(e.target.value) : undefined)}>
            <option value="">El que esté libre</option>
            {barbers.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </PanelField>
        <PanelField label="Fecha">
          <input className={panelControl} type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </PanelField>
        <PanelField label="Hora">
          <select value={start} onChange={(e) => setStart(e.target.value)} required>
            <option value="">{slots.length ? "Elige una hora" : "Sin horas libres"}</option>
            {slots.map((s) => (
              <option key={s.start} value={s.start}>
                {time12(s.start)} ({s.barbers.map((b) => b.name).join(", ")})
              </option>
            ))}
          </select>
        </PanelField>
        <PanelField label="Nombre del cliente">
          <input className={panelControl} value={name} onChange={(e) => setName(e.target.value)} required />
        </PanelField>
        <PanelField label="Celular">
          <input className={panelControl} value={phone} onChange={(e) => setPhone(e.target.value)} required inputMode="tel" />
        </PanelField>
        {error && <p className={panelText.error}>{error}</p>}
        <button className={panelButton("primary", "lg", "mt-[18px]", true)}>Guardar cita</button>
      </form>
    </Modal>
  );
}
