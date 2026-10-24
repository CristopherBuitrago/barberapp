import { useState, type FormEvent } from "react";
import type { TeamMember } from "@/entities/barber";
import { DAYS, cn } from "@/shared/lib";
import { Modal, PanelField, panelButton, panelControl, panelText } from "@/shared/ui";
import { createBarber, updateBarber } from "../api/barberAdminApi";
import { fieldsOf, type BarberFields, type DaySchedule } from "../lib/week";

const timeInput = cn(panelControl, "w-full min-w-0 px-2 py-[6px]");
// En el celular el día va arriba y las dos horas debajo, a lo ancho
const dayRow =
  "grid grid-cols-[110px_1fr_auto_1fr] items-center gap-2 text-[0.85rem] text-ink max-[480px]:grid-cols-[1fr_auto_1fr] max-[480px]:gap-y-1";

/** Crear o editar un barbero con su semana. Sin barbero es uno nuevo. */
export function BarberFormModal({
  member,
  onClose,
  onSaved,
}: {
  member: TeamMember | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [fields, setFields] = useState<BarberFields>(fieldsOf(member));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  // Si algún día tenía la jornada partida, al guardar queda de corrido
  const hadSplitDay = !!member && new Set(member.schedules.map((s) => s.weekday)).size < member.schedules.length;

  function changeDay(weekday: number, part: Partial<DaySchedule>) {
    setFields({ ...fields, week: fields.week.map((d) => (d.weekday === weekday ? { ...d, ...part } : d)) });
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    const backwards = fields.week.find((d) => d.works && d.startTime >= d.endTime);
    if (backwards) return setError(`El ${DAYS[backwards.weekday]} la hora de salida tiene que ser después de la de entrada`);
    setSaving(true);
    setError("");
    try {
      if (member) await updateBarber(member.id, fields);
      else await createBarber(fields);
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={member ? "Editar barbero" : "Nuevo barbero"} onClose={onClose}>
      <form onSubmit={save}>
        <PanelField label="Nombre">
          <input
            className={panelControl}
            value={fields.name}
            onChange={(e) => setFields({ ...fields, name: e.target.value })}
            maxLength={80}
            required
          />
        </PanelField>
        <PanelField label={member?.hasAccount ? "Teléfono (WhatsApp, con él entra al panel)" : "Teléfono (WhatsApp, opcional)"}>
          <input
            className={panelControl}
            value={fields.phone}
            onChange={(e) => setFields({ ...fields, phone: e.target.value.replace(/[^\d\s+]/g, "") })}
            inputMode="tel"
            placeholder="300 123 4567"
            required={member?.hasAccount}
          />
        </PanelField>

        <PanelField label="Horario" as="div">
          <div className="flex flex-col gap-[6px]">
            {fields.week.map((d) => (
              <div key={d.weekday} className={dayRow}>
                <label className="flex items-center gap-[6px] max-[480px]:col-span-3">
                  <input type="checkbox" checked={d.works} onChange={(e) => changeDay(d.weekday, { works: e.target.checked })} />
                  <span className="first-letter:uppercase">{DAYS[d.weekday]}</span>
                </label>
                {d.works ? (
                  <>
                    <input
                      className={timeInput}
                      type="time"
                      value={d.startTime}
                      onChange={(e) => changeDay(d.weekday, { startTime: e.target.value })}
                      aria-label={`Entrada el ${DAYS[d.weekday]}`}
                      required
                    />
                    <span className="text-muted">a</span>
                    <input
                      className={timeInput}
                      type="time"
                      value={d.endTime}
                      onChange={(e) => changeDay(d.weekday, { endTime: e.target.value })}
                      aria-label={`Salida el ${DAYS[d.weekday]}`}
                      required
                    />
                  </>
                ) : (
                  <span className="col-span-3 text-muted">No trabaja</span>
                )}
              </div>
            ))}
          </div>
        </PanelField>
        {hadSplitDay && (
          <p className="mt-2 text-[0.78rem] text-muted">
            Algún día tenía la jornada partida en dos. Aquí se ve de la primera hora a la última y así queda al guardar. Para
            el almuerzo usa Bloquear en la agenda.
          </p>
        )}

        {error && <p className={panelText.error}>{error}</p>}
        <button className={panelButton("primary", "lg", "mt-[18px]", true)} disabled={saving}>
          {saving ? "Guardando…" : "Guardar"}
        </button>
      </form>
    </Modal>
  );
}
