import { useLocation, useNavigate } from "react-router-dom";

/**
 * Para volver a la página desde la que se abrió el perfil (viene en state.from).
 * Si no hay de dónde, va a fallback: el panel para el equipo, el catálogo para los clientes.
 */
export function useGoBack(fallback: string) {
  const navigate = useNavigate();
  const { state } = useLocation() as { state: { from?: string } | null };
  return () => navigate(state?.from ?? fallback);
}
