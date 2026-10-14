import { Fragment, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { barberia } from "../api";
import { duracion, miles } from "../formato";
import logo from "../assets/figma/logo.png";
import check from "../assets/figma/check.svg";
import reloj from "../assets/figma/reloj.svg";
import pesos from "../assets/figma/pesos.svg";

/** Encabezado negro con el logo y el panel gris redondeado donde va el contenido. */
export function Marco({ children }: { children: ReactNode }) {
  return (
    <div className="pagina">
      <header className="cabecera">
        <Link to="/" className="logo">
          <img src={logo} alt={barberia.nombre} width={159} height={159} />
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
        <Fragment key={p}>
          {i > 0 && <li className="pasos-linea" aria-hidden="true" />}
          <li className={i < actual ? "hecho" : i === actual ? "actual" : ""} aria-current={i === actual ? "step" : undefined}>
            <span className="pasos-circulo">
              {i < actual ? <img src={check} alt="Hecho" width={15} height={15} /> : i + 1}
            </span>
            {p}
          </li>
        </Fragment>
      ))}
    </ol>
  );
}

export function Duracion({ minutos }: { minutos: number }) {
  return (
    <span className="meta">
      <img src={reloj} alt="" width={12} height={12} />
      {duracion(minutos)}
    </span>
  );
}

export function Precio({ valor }: { valor: number }) {
  return (
    <span className="meta precio">
      <img src={pesos} alt="$" width={6} height={11} />
      {miles(valor)}
    </span>
  );
}
