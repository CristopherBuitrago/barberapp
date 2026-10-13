import type { ReactNode } from "react";

export function Modal({ titulo, onCerrar, children }: { titulo: string; onCerrar: () => void; children: ReactNode }) {
  return (
    <div className="modal-fondo" onClick={onCerrar}>
      <div className="modal tarjeta" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={titulo}>
        <div className="servicio-cabeza">
          <h2>{titulo}</h2>
          <button className="enlace" onClick={onCerrar} aria-label="Cerrar">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
