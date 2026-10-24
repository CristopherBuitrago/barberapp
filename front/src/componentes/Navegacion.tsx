import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useSesion } from "../sesion";
import iconoMenu from "../assets/figma/menu.svg";
import iconoPerfil from "../assets/figma/perfil.svg";
import iconoCerrar from "../assets/figma/cerrar.svg";

/** A dónde vuelve la X del perfil: a la página desde la que se abrió, o al inicio de cada rol. */
export function useVolver() {
  const navegar = useNavigate();
  const { state } = useLocation() as { state: { desde?: string } | null };
  const { esEquipo } = useSesion();
  return () => navegar(state?.desde ?? (esEquipo ? "/panel" : "/"));
}

/** Botón de perfil (esquina superior derecha). En las páginas de perfil se vuelve una X. */
export function BotonPerfil({ enPerfil = false }: { enPerfil?: boolean }) {
  const navegar = useNavigate();
  const { pathname, search } = useLocation();
  const volver = useVolver();
  if (enPerfil) {
    return (
      <button className="boton-icono" aria-label="Cerrar perfil" onClick={volver}>
        <img src={iconoCerrar} alt="" width={36} height={36} />
      </button>
    );
  }
  return (
    <button className="boton-icono" aria-label="Mi perfil" onClick={() => navegar("/perfil", { state: { desde: pathname + search } })}>
      <img src={iconoPerfil} alt="" width={36} height={36} />
    </button>
  );
}

/** Botón de menú (esquina superior izquierda) con las secciones según quién inició sesión. */
export function BotonMenu() {
  const [abierto, setAbierto] = useState(false);
  const { usuario, esEquipo, esAdmin, cerrar } = useSesion();
  const { pathname } = useLocation();
  const navegar = useNavigate();

  useEffect(() => setAbierto(false), [pathname]);
  useEffect(() => {
    if (!abierto) return;
    const alTeclear = (e: KeyboardEvent) => e.key === "Escape" && setAbierto(false);
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, [abierto]);

  return (
    <>
      <button className="boton-icono" aria-label="Menú" aria-expanded={abierto} onClick={() => setAbierto(true)}>
        <img src={iconoMenu} alt="" width={36} height={36} />
      </button>
      {abierto && (
        <div className="menu-fondo" onClick={() => setAbierto(false)}>
          <nav className="menu" onClick={(e) => e.stopPropagation()} aria-label="Menú">
            <div className="menu-cabeza">
              <h2>{usuario ? `Hola, ${usuario.nombre.split(" ")[0]}` : "Menú"}</h2>
              <button className="boton-icono oscuro" aria-label="Cerrar menú" onClick={() => setAbierto(false)}>
                <img src={iconoCerrar} alt="" width={24} height={24} />
              </button>
            </div>
            {esEquipo && <Link to="/panel">Panel</Link>}
            {/* El admin administra los servicios; los demás ven el catálogo de la web. */}
            <Link to={esAdmin ? "/panel/servicios" : "/"}>Servicios</Link>
            {esEquipo && <Link to="/">Ver la web</Link>}
            {!esEquipo && <Link to="/reserva-confirmada">Mi cita</Link>}
            <Link to="/perfil" state={{ desde: pathname }}>{usuario ? "Mi perfil" : "Iniciar sesión"}</Link>
            {!usuario && <Link to="/perfil/registro" state={{ desde: pathname }}>Crear cuenta</Link>}
            {usuario && (
              <button
                className="menu-salir"
                onClick={async () => {
                  await cerrar();
                  setAbierto(false);
                  navegar("/");
                }}
              >
                Cerrar sesión
              </button>
            )}
          </nav>
        </div>
      )}
    </>
  );
}
