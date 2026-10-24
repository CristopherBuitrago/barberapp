import type { TeamMember } from "@/entities/barber";
import { DAYS_SHORT, cn, localPhone } from "@/shared/lib";
import { panelButton } from "@/shared/ui";

const th =
  "whitespace-nowrap border-0 border-b border-solid border-line px-[14px] py-3 text-left text-[0.75rem] font-semibold tracking-[0.03em] text-muted uppercase";
const td = "border-0 border-b border-solid border-b-[#f0f0f2] px-[14px] py-[10px] align-top";
const badge = "inline-block rounded-full px-[10px] py-[2px] text-[0.75rem] font-semibold whitespace-nowrap";

/** De lunes a domingo */
const WEEK = [1, 2, 3, 4, 5, 6, 0];

/** La semana en renglones cortos: "Lun 09:00–19:00". Los días que no trabaja no salen */
function WeekSummary({ member }: { member: TeamMember }) {
  const days = WEEK.flatMap((weekday) =>
    member.schedules
      .filter((s) => s.weekday === weekday)
      .map((s) => ({ key: s.id, text: `${DAYS_SHORT[weekday]} ${s.startTime}–${s.endTime}` })),
  );
  if (!days.length) return <span className="text-muted">Sin horario</span>;
  return (
    <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-x-3 gap-y-[2px] p-0 text-[0.8rem]">
      {days.map((d) => (
        <li key={d.key} className="whitespace-nowrap">{d.text}</li>
      ))}
    </ul>
  );
}

/**
 * El equipo con su horario de la semana. Con onEdit y los demás es la versión del admin,
 * con botones; sin ellos es solo para ver.
 */
export function TeamTable({
  team,
  actions,
}: {
  team: TeamMember[];
  actions?: {
    onEdit: (member: TeamMember) => void;
    onAccount: (member: TeamMember) => void;
    onToggleActive: (member: TeamMember) => void;
  };
}) {
  const titles = ["Barbero", "Teléfono", "Horario", "Estado", "Panel", ...(actions ? ["Opciones"] : [])];
  return (
    <div className="mx-4 mt-0 mb-4 overflow-x-auto rounded-card bg-card shadow-[0_1px_3px_rgb(0_0_0/8%)]">
      <table className="w-full border-collapse text-[0.88rem]">
        <thead>
          <tr>
            {titles.map((title) => (
              <th key={title} className={th}>{title}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {team.map((m) => {
            const cell = cn(td, "group-last:border-b-0", !m.active && "opacity-55");
            return (
              <tr key={m.id} className="group hover:bg-[#fafafa]">
                <td className={cell}>
                  <strong>{m.name}</strong>
                  {m.isAdmin && <span className="block text-[0.78rem] text-muted">Administrador</span>}
                </td>
                <td className={cn(cell, "whitespace-nowrap")}>{m.phone ? localPhone(m.phone) : "—"}</td>
                <td className={cn(cell, "min-w-[260px]")}>
                  <WeekSummary member={m} />
                </td>
                <td className={cell}>
                  <span className={cn(badge, m.active ? "bg-[#dcfce7] text-[#15803d]" : "bg-[#f4f4f5] text-muted")}>
                    {m.active ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td className={cell}>
                  <span className={cn(badge, m.hasAccount ? "bg-[#e0e7ff] text-[#3730a3]" : "bg-[#f4f4f5] text-muted")}>
                    {m.hasAccount ? "Con cuenta" : "Sin cuenta"}
                  </span>
                </td>
                {actions && (
                  <td className={cn(td, "group-last:border-b-0")}>
                    <div className="flex flex-wrap gap-[6px]">
                      <button className={panelButton("secondary", "sm")} onClick={() => actions.onEdit(m)}>Editar</button>
                      <button className={panelButton("secondary", "sm")} onClick={() => actions.onAccount(m)}>
                        {m.hasAccount ? "Contraseña" : "Dar cuenta"}
                      </button>
                      <button className={panelButton("secondary", "sm")} onClick={() => actions.onToggleActive(m)}>
                        {m.active ? "Desactivar" : "Activar"}
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
