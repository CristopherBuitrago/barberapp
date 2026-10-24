import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { getPanelAppointments, type Appointment } from "@/entities/appointment";
import { useTeam } from "@/entities/barber";
import { useSession } from "@/entities/session";
import { getTimeBlocks, type TimeBlock } from "@/entities/time-block";
import { BlockTimeModal, deleteTimeBlock } from "@/features/block-time";
import { AppointmentDetailModal } from "@/features/change-appointment-status";
import { NewAppointmentModal } from "@/features/create-panel-appointment";
import { DAYS_SHORT, MONTHS, addDays, cn, startOfWeek, today, weekday } from "@/shared/lib";
import { panelButton, panelText } from "@/shared/ui";
import { AppointmentCalendar } from "@/widgets/appointment-calendar";
import { PanelLayout, panelControlGroup, panelControls, panelControlsTitle } from "@/widgets/panel-layout";

type View = "week" | "day";
type OpenModal = { kind: "appointment"; appointment: Appointment } | { kind: "new" } | { kind: "block" } | null;

/** El panel es solo para barberos y admin: sin sesión del equipo se va a iniciar sesión. */
export function PanelAgendaPage() {
  const { user, isTeam } = useSession();
  if (!user) return <Navigate to="/perfil" replace state={{ from: "/panel" }} />;
  if (!isTeam) return <Navigate to="/" replace />;
  return <Agenda />;
}

const segment = "cursor-pointer border-0 bg-transparent px-[14px] py-2 [font-family:inherit]";

function Agenda() {
  const narrow = typeof window !== "undefined" && window.innerWidth < 760;
  const [view, setView] = useState<View>(narrow ? "day" : "week");
  const [date, setDate] = useState(today());
  const [barberId, setBarberId] = useState<number | undefined>();
  const { data: team = [] } = useTeam();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [blocks, setBlocks] = useState<TimeBlock[]>([]);
  const [showCancelled, setShowCancelled] = useState(false);
  const [modal, setModal] = useState<OpenModal>(null);
  const [error, setError] = useState("");

  const days = useMemo(() => {
    if (view === "day") return [date];
    const monday = startOfWeek(date);
    return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  }, [view, date]);

  const load = useCallback(async () => {
    try {
      const from = days[0];
      const to = days[days.length - 1];
      const [a, b] = await Promise.all([getPanelAppointments(from, to), getTimeBlocks(from, to)]);
      setAppointments(a);
      setBlocks(b);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }, [days]);

  // Carga al cambiar de rango y refresca cada minuto (citas que entran por WhatsApp o por la web)
  useEffect(() => {
    load();
    const timer = setInterval(load, 60_000);
    return () => clearInterval(timer);
  }, [load]);

  const visible = appointments.filter(
    (a) => (!barberId || a.barber.id === barberId) && (showCancelled || a.status !== "CANCELADA"),
  );
  const visibleBlocks = blocks.filter((b) => !barberId || b.barber.id === barberId);
  const jump = view === "day" ? 1 : 7;
  const title =
    view === "day"
      ? `${DAYS_SHORT[weekday(date)]} ${Number(date.slice(8, 10))} de ${MONTHS[Number(date.slice(5, 7)) - 1]}`
      : `Semana del ${Number(days[0].slice(8, 10))} de ${MONTHS[Number(days[0].slice(5, 7)) - 1]}`;
  const pendingToday = appointments.filter((a) => a.start.startsWith(today()) && a.status === "AGENDADA").length;
  const closeAndReload = () => {
    setModal(null);
    load();
  };

  return (
    <PanelLayout summary={`${pendingToday} citas pendientes hoy`}>
      <div className={panelControls}>
        <div className={panelControlGroup}>
          <button className={panelButton("secondary", "md")} onClick={() => setDate(addDays(date, -jump))}>‹</button>
          <button className={panelButton("secondary", "md")} onClick={() => setDate(today())}>Hoy</button>
          <button className={panelButton("secondary", "md")} onClick={() => setDate(addDays(date, jump))}>›</button>
          <h2 className={panelControlsTitle}>{title}</h2>
        </div>
        <div className={panelControlGroup}>
          <div className="inline-flex overflow-hidden rounded-full border border-solid border-line bg-white">
            <button className={cn(segment, view === "day" && "bg-brand! text-white")} onClick={() => setView("day")}>Día</button>
            <button className={cn(segment, view === "week" && "bg-brand! text-white")} onClick={() => setView("week")}>Semana</button>
          </div>
          <select value={barberId ?? ""} onChange={(e) => setBarberId(e.target.value ? Number(e.target.value) : undefined)}>
            <option value="">Todos los barberos</option>
            {team.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          <label className={cn(panelText.checkbox, "m-0! items-center")}>
            <input type="checkbox" checked={showCancelled} onChange={(e) => setShowCancelled(e.target.checked)} />
            Canceladas
          </label>
          <button className={panelButton("secondary", "md")} onClick={() => setModal({ kind: "block" })}>⛔ Bloquear</button>
          <button className={panelButton("primary", "md")} onClick={() => setModal({ kind: "new" })}>+ Cita</button>
        </div>
      </div>

      {error && <p className={cn(panelText.error, "px-4")}>{error}</p>}

      <AppointmentCalendar
        days={days}
        appointments={visible}
        blocks={visibleBlocks}
        barbers={team}
        onAppointment={(appointment) => setModal({ kind: "appointment", appointment })}
        onBlock={async (b) => {
          if (confirm(`¿Quitar el bloqueo de ${b.barber.name}${b.reason ? ` (${b.reason})` : ""}?`)) {
            await deleteTimeBlock(b.id);
            load();
          }
        }}
      />

      {modal?.kind === "appointment" && (
        <AppointmentDetailModal appointment={modal.appointment} onClose={() => setModal(null)} onChanged={closeAndReload} />
      )}
      {modal?.kind === "new" && (
        <NewAppointmentModal barbers={team} initialDate={date} onClose={() => setModal(null)} onSaved={closeAndReload} />
      )}
      {modal?.kind === "block" && (
        <BlockTimeModal barbers={team} initialDate={date} onClose={() => setModal(null)} onSaved={closeAndReload} />
      )}
    </PanelLayout>
  );
}
