import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useSession } from "@/entities/session";
import { cn } from "@/shared/lib";
import menuIcon from "@/shared/assets/figma/menu.svg";
import closeIcon from "@/shared/assets/figma/cerrar.svg";
import { iconButton, type HeaderVariant } from "./iconButton";

const item =
  "block border-0 border-b border-solid border-b-[#ececec] bg-transparent px-4 py-3 text-left text-[12px] font-bold text-db-text no-underline [font-family:inherit] cursor-pointer hover:bg-[#f4f4f5]";

/** Botón de menú (arriba a la izquierda) con las secciones según quién inició sesión. */
export function MenuButton({ variant }: { variant: HeaderVariant }) {
  const [open, setOpen] = useState(false);
  const { user, isTeam, isAdmin, end } = useSession();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button className={iconButton(variant)} aria-label="Menú" aria-expanded={open} onClick={() => setOpen(true)}>
        <img src={menuIcon} alt="" width={36} height={36} className={cn(variant === "panel" && "h-7 w-7")} />
      </button>
      {open && (
        // pointer-events: en la web el menú se abre dentro de la cabecera, que deja pasar los clics al logo
        <div className="pointer-events-auto fixed inset-0 z-20 bg-[rgb(0_0_0/45%)]" onClick={() => setOpen(false)}>
          <nav
            className="absolute top-0 bottom-0 left-0 flex w-[min(85vw,calc(240px*var(--db-scale)))] flex-col bg-white font-sans shadow-[0_0_12px_rgb(0_0_0/35%)] [&>*]:[zoom:var(--db-scale)]"
            onClick={(e) => e.stopPropagation()}
            aria-label="Menú"
          >
            <div className="flex items-center justify-between border-0 border-b border-solid border-db-box-border pt-[14px] pr-3 pb-3 pl-4">
              <h2 className="text-[14px] font-bold text-db-text">{user ? `Hola, ${user.name.split(" ")[0]}` : "Menú"}</h2>
              {/* En la web la X también se escala, igual que los otros íconos de la cabecera */}
              <button className={iconButton(variant)} aria-label="Cerrar menú" onClick={() => setOpen(false)}>
                <img src={closeIcon} alt="" width={24} height={24} className={cn("invert", variant === "panel" && "h-7 w-7")} />
              </button>
            </div>
            {isTeam && <Link className={item} to="/panel">Panel</Link>}
            {/* El admin administra los servicios, los demás ven el catálogo de la web */}
            <Link className={item} to={isAdmin ? "/panel/servicios" : "/"}>Servicios</Link>
            {isTeam && <Link className={item} to="/">Ver la web</Link>}
            {!isTeam && <Link className={item} to="/reserva-confirmada">Mi cita</Link>}
            <Link className={item} to="/perfil" state={{ from: pathname }}>{user ? "Mi perfil" : "Iniciar sesión"}</Link>
            {!user && <Link className={item} to="/perfil/registro" state={{ from: pathname }}>Crear cuenta</Link>}
            {user && (
              <button
                className={cn(item, "text-db-red")}
                onClick={async () => {
                  await end();
                  setOpen(false);
                  navigate("/");
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
