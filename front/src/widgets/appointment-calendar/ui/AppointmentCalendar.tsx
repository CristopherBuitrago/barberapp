import type { Appointment } from "@/entities/appointment";
import type { Barber } from "@/entities/barber";
import type { TimeBlock } from "@/entities/time-block";
import { DAYS_SHORT, cn, minutesOfDay, today, weekday } from "@/shared/lib";

const FIRST_HOUR = 7;
const LAST_HOUR = 21;
const PX_PER_MIN = 1.1;
const COLORS = ["#2563eb", "#d97706", "#059669", "#db2777", "#7c3aed", "#0891b2"];

const STATUS_STYLE: Record<Appointment["status"], string> = {
  AGENDADA: "",
  COMPLETADA: "bg-[#dcfce7]!",
  NO_ASISTIO: "bg-[#fee2e2]! line-through",
  CANCELADA: "bg-[#f4f4f5]! opacity-60 line-through",
};

const header =
  "sticky top-0 z-[2] border-0 border-b border-solid border-line bg-card px-[6px] py-[10px] text-center text-[0.8rem] text-muted";
const item =
  "absolute right-[3px] left-[3px] flex cursor-pointer flex-col gap-px overflow-hidden rounded-[8px] px-[6px] py-[3px] text-left text-[0.72rem] leading-[1.25] [font-family:inherit]";

/** Dónde va algo en la columna del día según su hora de inicio y de fin */
function position(start: string, end: string) {
  const from = Math.max(minutesOfDay(start), FIRST_HOUR * 60);
  const to = Math.min(end.slice(0, 10) > start.slice(0, 10) ? 24 * 60 : minutesOfDay(end), LAST_HOUR * 60);
  return { top: (from - FIRST_HOUR * 60) * PX_PER_MIN, height: Math.max((to - from) * PX_PER_MIN, 18) };
}

/** Grilla de horas (filas) por día (columnas), con las citas y los bloqueos en su lugar. */
export function AppointmentCalendar({
  days,
  appointments,
  blocks,
  barbers,
  onAppointment,
  onBlock,
}: {
  days: string[];
  appointments: Appointment[];
  blocks: TimeBlock[];
  barbers: Barber[];
  onAppointment: (appointment: Appointment) => void;
  onBlock: (block: TimeBlock) => void;
}) {
  const hours = Array.from({ length: LAST_HOUR - FIRST_HOUR }, (_, i) => FIRST_HOUR + i);
  const height = (LAST_HOUR - FIRST_HOUR) * 60 * PX_PER_MIN;
  // Cada barbero con su color, para distinguir sus citas
  const color = (id: number) => COLORS[barbers.findIndex((b) => b.id === id) % COLORS.length] ?? COLORS[0];

  return (
    <div className="flex-1 overflow-auto px-4 pb-4">
      <div
        className="grid min-w-min rounded-card bg-card shadow-[0_1px_3px_rgb(0_0_0/8%)]"
        style={{ gridTemplateColumns: `52px repeat(${days.length}, minmax(130px, 1fr))` }}
      >
        <div className={header} />
        {days.map((d) => (
          <div key={d} className={header}>
            {DAYS_SHORT[weekday(d)]}{" "}
            <strong className={cn("text-[1rem] text-ink", d === today() && "rounded-full bg-brand px-[7px] py-[2px] text-white")}>
              {Number(d.slice(8, 10))}
            </strong>
          </div>
        ))}

        <div className="relative" style={{ height }}>
          {hours.map((h, i) => (
            <span
              key={h}
              className={cn("absolute right-[6px] text-[0.7rem] text-muted", i > 0 && "-translate-y-1/2")}
              style={{ top: (h - FIRST_HOUR) * 60 * PX_PER_MIN }}
            >
              {h % 12 === 0 ? 12 : h % 12} {h < 12 ? "am" : "pm"}
            </span>
          ))}
        </div>

        {days.map((d) => (
          <div key={d} className="relative border-0 border-l border-solid border-line" style={{ height }}>
            {hours.map((h) => (
              <div
                key={h}
                className="absolute right-0 left-0 border-0 border-t border-solid border-t-[#f0f0f2]"
                style={{ top: (h - FIRST_HOUR) * 60 * PX_PER_MIN }}
              />
            ))}

            {blocks
              .filter((b) => b.start.slice(0, 10) <= d && b.end.slice(0, 10) >= d)
              .map((b) => {
                // Un bloqueo de varios días se corta en cada día
                const start = b.start.slice(0, 10) < d ? `${d}T00:00` : b.start;
                const end = b.end.slice(0, 10) > d ? `${d}T23:59` : b.end;
                return (
                  <button
                    key={b.id}
                    className={cn(
                      item,
                      "border-0 bg-[repeating-linear-gradient(45deg,#f4f4f5,#f4f4f5_6px,#e4e4e7_6px,#e4e4e7_12px)] text-muted",
                    )}
                    style={position(start, end)}
                    onClick={() => onBlock(b)}
                  >
                    ⛔ {b.barber.name} {b.reason && `· ${b.reason}`}
                  </button>
                );
              })}

            {appointments
              .filter((a) => a.start.startsWith(d))
              .map((a) => (
                <button
                  key={a.id}
                  className={cn(
                    item,
                    "z-[1] border-0 border-l-4 border-solid border-l-brand bg-brand-soft text-ink",
                    STATUS_STYLE[a.status],
                  )}
                  style={{ ...position(a.start, a.end), borderLeftColor: color(a.barber.id) }}
                  onClick={() => onAppointment(a)}
                  title={`${a.client.name} · ${a.service.name} · ${a.barber.name}`}
                >
                  <strong>{a.start.slice(11, 16)} {a.client.name}</strong>
                  <span className="overflow-hidden text-ellipsis whitespace-nowrap text-muted">
                    {a.service.name} · {a.barber.name}
                  </span>
                  {a.channel === "WHATSAPP" && (
                    <span className="overflow-hidden text-ellipsis whitespace-nowrap font-semibold text-[#15803d]">WhatsApp</span>
                  )}
                </button>
              ))}
          </div>
        ))}
      </div>
    </div>
  );
}
