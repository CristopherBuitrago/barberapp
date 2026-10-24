import type { ReactNode } from "react";
import { MenuButton, ProfileButton } from "@/features/app-menu";
import { business } from "@/shared/config/business";

/** La barra negra del panel con el menú, el nombre de la barbería, un resumen y el perfil. */
export function PanelLayout({ summary, children }: { summary: string; children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center gap-4 bg-night px-4 py-3 text-white">
        <MenuButton variant="panel" />
        <strong>💈 {business.name}</strong>
        <span className="flex-1 text-[0.85rem] text-[#a1a1aa] [@media(max-width:760px)]:hidden">{summary}</span>
        <ProfileButton variant="panel" />
      </header>
      {children}
    </div>
  );
}

/** La fila de controles debajo de la barra: navegación a la izquierda y acciones a la derecha */
export const panelControls =
  "flex flex-wrap justify-between gap-[10px] px-4 py-3 [@media(max-width:760px)]:flex-col";
export const panelControlGroup = "flex flex-wrap items-center gap-2";
export const panelControlsTitle = "ml-[6px] first-letter:uppercase";
