import { useState, type FormEvent } from "react";
import type { Barber } from "@/entities/barber";
import { TZ_OFFSET } from "@/shared/lib";
import { Modal, PanelField, panelButton, panelControl, panelText } from "@/shared/ui";
import { createTimeBlock } from "../api/timeBlockApi";

/** Bloquear horas de un barbero: almuerzo, una diligencia o el día completo. */
export function BlockTimeModal({
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
  const [barberId, setBarberId] = useState(barbers[0]?.id);
  const [date, setDate] = useState(initialDate);
  const [from, setFrom] = useState("12:00");
  const [to, setTo] = useState("13:00");
  const [wholeDay, setWholeDay] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!barberId) return;
    const [start, end] = wholeDay ? ["00:00", "23:59"] : [from, to];
    try {
      await createTimeBlock({
        barberId,
        start: `${date}T${start}:00${TZ_OFFSET}`,
        end: `${date}T${end}:00${TZ_OFFSET}`,
        reason,
      });
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <Modal title="Bloquear horario" onClose={onClose}>
      <form onSubmit={save}>
        <PanelField label="Barbero">
          <select value={barberId ?? ""} onChange={(e) => setBarberId(Number(e.target.value))}>
            {barbers.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </PanelField>
        <PanelField label="Fecha">
          <input className={panelControl} type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </PanelField>
        <label className={panelText.checkbox}>
          <input type="checkbox" checked={wholeDay} onChange={(e) => setWholeDay(e.target.checked)} />
          Todo el día
        </label>
        {!wholeDay && (
          <div className="flex gap-[10px]">
            <PanelField label="Desde">
              <input className={panelControl} type="time" value={from} onChange={(e) => setFrom(e.target.value)} required />
            </PanelField>
            <PanelField label="Hasta">
              <input className={panelControl} type="time" value={to} onChange={(e) => setTo(e.target.value)} required />
            </PanelField>
          </div>
        )}
        <PanelField label="Motivo (opcional)">
          <input className={panelControl} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Almuerzo, diligencia…" />
        </PanelField>
        {error && <p className={panelText.error}>{error}</p>}
        <button className={panelButton("primary", "lg", "mt-[18px]", true)}>Bloquear</button>
      </form>
    </Modal>
  );
}
