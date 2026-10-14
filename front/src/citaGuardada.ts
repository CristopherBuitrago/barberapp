import { useEffect, useState } from "react";
import { api, apiCuenta, type Cita } from "./api";
import { almacen } from "./almacen";
import { useSesion } from "./sesion";

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
  const { usuario } = useSesion();
  const [cita, setCita] = useState(almacen.ultimaCita<CitaGuardada>());

  useEffect(() => {
    // Con sesión de cliente manda el servidor: también ve las citas agendadas por WhatsApp.
    if (usuario?.rol === "CLIENTE") {
      apiCuenta
        .citaActiva()
        .then((activa) => {
          const guardada = almacen.ultimaCita<CitaGuardada>();
          if (activa) guardar({ ...activa, telefono: usuario.telefono });
          // Sin activa se conserva la última (cancelada o atendida) si es de esta cuenta.
          else if (guardada && guardada.cliente.telefono !== usuario.telefono) guardar(null);
          else if (guardada) refrescar(guardada);
        })
        .catch(() => {});
      return;
    }
    const guardada = almacen.ultimaCita<CitaGuardada>();
    if (guardada) refrescar(guardada);
  }, [usuario?.rol, usuario?.telefono]);

  function refrescar(guardada: CitaGuardada) {
    api
      .cita(guardada.id, guardada.telefono)
      .then((fresca) => guardar({ ...fresca, telefono: guardada.telefono }))
      .catch((e: Error) => {
        if (e.message.includes("no encontrada")) guardar(null);
      });
  }

  function guardar(nueva: CitaGuardada | null) {
    almacen.guardarUltimaCita(nueva);
    setCita(nueva);
  }

  return { cita, guardar };
}
