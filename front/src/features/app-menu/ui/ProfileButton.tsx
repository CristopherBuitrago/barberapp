import { useLocation, useNavigate } from "react-router-dom";
import { useSession } from "@/entities/session";
import { cn, useGoBack } from "@/shared/lib";
import profileIcon from "@/shared/assets/figma/perfil.svg";
import closeIcon from "@/shared/assets/figma/cerrar.svg";
import { iconButton, type HeaderVariant } from "./iconButton";

/** Botón de perfil (arriba a la derecha). Dentro del perfil se vuelve una X que regresa a donde estaba. */
export function ProfileButton({ variant, inProfile = false }: { variant: HeaderVariant; inProfile?: boolean }) {
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const { isTeam } = useSession();
  const goBack = useGoBack(isTeam ? "/panel" : "/");
  const panelPosition = variant === "panel" && "ml-auto";

  if (inProfile) {
    return (
      <button className={iconButton(variant, panelPosition || undefined)} aria-label="Cerrar perfil" onClick={goBack}>
        <img src={closeIcon} alt="" width={36} height={36} className={cn(variant === "panel" && "h-7 w-7")} />
      </button>
    );
  }
  return (
    <button
      className={iconButton(variant, panelPosition || undefined)}
      aria-label="Mi perfil"
      onClick={() => navigate("/perfil", { state: { from: pathname + search } })}
    >
      <img src={profileIcon} alt="" width={36} height={36} className={cn(variant === "panel" && "h-7 w-7")} />
    </button>
  );
}
