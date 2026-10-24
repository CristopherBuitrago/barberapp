import { STATUS_LABEL } from "@/entities/appointment";
import type { ClientSummary } from "@/entities/client";
import { cn, localPhone } from "@/shared/lib";

const th =
  "whitespace-nowrap border-0 border-b border-solid border-line px-[14px] py-3 text-left text-[0.75rem] font-semibold tracking-[0.03em] text-muted uppercase";
const td = "border-0 border-b border-solid border-b-[#f0f0f2] px-[14px] py-[10px] align-middle group-last:border-b-0";
const badge = "inline-block rounded-full px-[10px] py-[2px] text-[0.75rem] font-semibold whitespace-nowrap";
const yes = "bg-[#dcfce7] text-[#15803d]";
const no = "bg-[#f4f4f5] text-muted";

/** "30 oct 2026, 10:00" con la hora de Colombia que ya trae la fecha */
function dateTime(iso: string): string {
  const [date, time] = iso.split("T");
  const [y, m, d] = date.split("-").map(Number);
  const month = new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("es-CO", { month: "short", timeZone: "UTC" });
  return `${d} ${month.replace(".", "")} ${y}, ${time.slice(0, 5)}`;
}

/** Los clientes de la barbería con su resumen de citas. Es solo para ver. */
export function ClientsTable({ clients }: { clients: ClientSummary[] }) {
  return (
    <div className="mx-4 mt-0 mb-4 overflow-x-auto rounded-card bg-card shadow-[0_1px_3px_rgb(0_0_0/8%)]">
      <table className="w-full border-collapse text-[0.88rem]">
        <thead>
          <tr>
            {["Cliente", "Teléfono", "Cuenta", "Datos", "Citas", "Última cita"].map((title) => (
              <th key={title} className={th}>{title}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {clients.map((c) => (
            <tr key={c.id} className="group hover:bg-[#fafafa]">
              <td className={td}>
                <strong>{c.name}</strong>
              </td>
              <td className={cn(td, "whitespace-nowrap")}>
                <a className="text-inherit" href={`https://wa.me/${c.phone}`} target="_blank" rel="noreferrer">
                  {localPhone(c.phone)}
                </a>
              </td>
              <td className={td}>
                <span className={cn(badge, c.hasAccount ? yes : no)}>{c.hasAccount ? "Registrado" : "Sin cuenta"}</span>
              </td>
              <td className={td}>
                <span className={cn(badge, c.acceptsDataPolicy ? yes : no)}>{c.acceptsDataPolicy ? "Aceptó" : "No"}</span>
              </td>
              <td className={td}>{c.appointmentCount}</td>
              <td className={cn(td, "whitespace-nowrap")}>
                {c.lastAppointment ? (
                  <>
                    {dateTime(c.lastAppointment.start)}
                    <span className="block text-[0.78rem] text-muted">{STATUS_LABEL[c.lastAppointment.status]}</span>
                  </>
                ) : (
                  <span className="text-muted">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
