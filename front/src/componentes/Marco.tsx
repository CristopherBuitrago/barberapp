import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { barberia } from "../api";

/** Encabezado oscuro con el logo (grande en el catálogo, compacto en los pasos). */
export function Marco({ children, compacto = false }: { children: ReactNode; compacto?: boolean }) {
  const [nombre, ...resto] = barberia.nombre.split(" ");
  return (
    <div className="pagina">
      <header className={compacto ? "cabecera compacta" : "cabecera"}>
        <Link to="/" className="logo" aria-label="Inicio">
          <span className="logo-poste">💈</span>
          <span className="logo-texto">
            {nombre}
            {resto.length > 0 && <em>{resto.join(" ")}</em>}
          </span>
        </Link>
      </header>
      <main className="contenido">{children}</main>
    </div>
  );
}

const PASOS = ["Servicio", "Detalles", "Confirmar"];

export function Pasos({ actual }: { actual: number }) {
  return (
    <ol className="pasos">
      {PASOS.map((p, i) => (
        <li key={p} className={i < actual ? "hecho" : i === actual ? "actual" : ""}>
          <span className="pasos-circulo">{i < actual ? "✓" : i + 1}</span>
          {p}
        </li>
      ))}
    </ol>
  );
}
