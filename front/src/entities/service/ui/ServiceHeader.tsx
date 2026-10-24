import { Duration, siteText } from "@/shared/ui";
import type { Service } from "../model/types";

/** Nombre del servicio a la izquierda y duración a la derecha, como en las tarjetas del diseño. */
export function ServiceHeader({ service }: { service: Pick<Service, "name" | "durationMin"> }) {
  return (
    <div className="flex items-center justify-between gap-[10px]">
      <h2 className={siteText.title}>{service.name}</h2>
      <Duration minutes={service.durationMin} />
    </div>
  );
}
