import { useEffect, useState } from "react";
import { api, type Cita } from "./api";
import { almacen } from "./almacen";

/** La última cita que el cliente reservó desde este navegador, con su teléfono para consultarla. */
export type CitaGuardada = Cita & { telefono: string };

/** Agendada y todavía no ha terminado: mientras exista, el cliente no puede reservar otra. */
export function esActiva(cita: Cita | null): cita is Cita {
  return !!cita && cita.estado === "AGENDADA" && new Date(cita.fin) > new Date();
}

/**
 * Lee la cita guardada y la refresca con el back, porque pudo cambiar desde el panel
 * o por WhatsApp (cancelada, atendida...).
 */
export function useCitaGuardada() {
  const [cita, setCita] = useState(almacen.ultimaCita<CitaGuardada>());

  useEffect(() => {
    const guardada = almacen.ultimaCita<CitaGuardada>();
    if (!guardada) return;
    api
      .cita(guardada.id, guardada.telefono)
      .then((fresca) => guardar({ ...fresca, telefono: guardada.telefono }))
      .catch((e: Error) => {
        if (e.message.includes("no encontrada")) guardar(null);
      });
  }, []);

  function guardar(nueva: CitaGuardada | null) {
    almacen.guardarUltimaCita(nueva);
    setCita(nueva);
  }

  return { cita, guardar };
}
