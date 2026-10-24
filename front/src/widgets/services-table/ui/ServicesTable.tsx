import type { AdminService } from "@/entities/service";
import { resolveImageUrl } from "@/shared/api";
import { cn, money, shortDate } from "@/shared/lib";
import { panelButton } from "@/shared/ui";

const th =
  "whitespace-nowrap border-0 border-b border-solid border-line px-[14px] py-3 text-left text-[0.75rem] font-semibold tracking-[0.03em] text-muted uppercase";
const td = "border-0 border-b border-solid border-b-[#f0f0f2] px-[14px] py-[10px] align-middle";
const thumbnail = "grid h-10 w-14 place-items-center rounded-[6px] bg-[#f4f4f5] object-cover text-muted";
const note = "block max-w-[280px] text-[0.78rem] text-muted";

/** La tabla de servicios del admin, con quién los creó y los botones para editar u ocultar. */
export function ServicesTable({
  services,
  onEdit,
  onToggleVisible,
}: {
  services: AdminService[];
  onEdit: (service: AdminService) => void;
  onToggleVisible: (service: AdminService) => void;
}) {
  return (
    <div className="mx-4 mt-0 mb-4 overflow-x-auto rounded-card bg-card shadow-[0_1px_3px_rgb(0_0_0/8%)]">
      <table className="w-full border-collapse text-[0.88rem]">
        <thead>
          <tr>
            {["Imagen", "Servicio", "Duración", "Precio", "Estado", "Creado por", "Último cambio", "Opciones"].map((title) => (
              <th key={title} className={th}>{title}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {services.map((s) => {
            // Los ocultos se ven apagados, menos los botones
            const cell = cn(td, "group-last:border-b-0", !s.active && "opacity-55");
            return (
              <tr key={s.id} className="group hover:bg-[#fafafa]">
                <td className={cell}>
                  {s.imageUrl ? (
                    <img className={thumbnail} src={resolveImageUrl(s.imageUrl)!} alt="" />
                  ) : (
                    <span className={thumbnail}>—</span>
                  )}
                </td>
                <td className={cell}>
                  <strong>{s.name}</strong>
                  {s.description && <span className={note}>{s.description}</span>}
                </td>
                <td className={cell}>{s.durationMin} min</td>
                <td className={cell}>{money(s.price)}</td>
                <td className={cell}>
                  <span
                    className={cn(
                      "inline-block rounded-full px-[10px] py-[2px] text-[0.75rem] font-semibold",
                      s.active ? "bg-[#dcfce7] text-[#15803d]" : "bg-[#f4f4f5] text-muted",
                    )}
                  >
                    {s.active ? "Visible" : "Oculto"}
                  </span>
                </td>
                <td className={cell}>{s.createdBy?.name ?? "Datos de ejemplo"}</td>
                <td className={cell}>
                  {shortDate(s.updatedAt)}
                  {s.updatedBy && <span className={note}>por {s.updatedBy.name}</span>}
                </td>
                <td className={cn(td, "group-last:border-b-0")}>
                  <div className="flex gap-[6px]">
                    <button className={panelButton("secondary", "sm")} onClick={() => onEdit(s)}>Editar</button>
                    <button className={panelButton("secondary", "sm")} onClick={() => onToggleVisible(s)}>
                      {s.active ? "Ocultar" : "Mostrar"}
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
