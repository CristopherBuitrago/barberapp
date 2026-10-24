import type { ReactNode } from "react";
import { cn } from "../lib/cn";

/** Campo de los formularios del panel: la etiqueta arriba y el control debajo. */
export function PanelField({ label, children, as = "label" }: { label: string; children: ReactNode; as?: "label" | "div" }) {
  const Tag = as;
  return (
    <Tag className={cn("flex min-w-0 flex-1 flex-col gap-[6px] mt-3 text-[0.85rem] text-muted")}>
      {label}
      {children}
    </Tag>
  );
}
