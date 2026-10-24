import { cn } from "@/shared/lib";

/** En la web los íconos se escalan con el diseño, en el panel van más pequeños */
export type HeaderVariant = "site" | "panel";

export function iconButton(variant: HeaderVariant | "plain", extra?: string): string {
  return cn(
    "grid cursor-pointer place-items-center rounded-full border-0 bg-transparent p-0",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white focus-visible:outline-solid",
    variant === "site" && "pointer-events-auto [zoom:var(--db-scale)]",
    extra,
  );
}
