import type { ReactNode } from "react";
import { cn } from "../lib/cn";
import { panelCard, panelLink } from "./styles";

/** Ventana del panel: se cierra con la X o tocando afuera. */
export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-10 grid place-items-center bg-[rgb(0_0_0/45%)] p-4"
      onClick={onClose}
    >
      <div
        className={cn(panelCard, "w-full max-w-[420px] max-h-[90vh] overflow-auto")}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={title}
      >
        <div className="flex justify-between items-center gap-[10px]">
          <h2>{title}</h2>
          <button className={panelLink} onClick={onClose} aria-label="Cerrar">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
