import { useEffect, useState } from "react";
import { getActiveAppointment, getAppointment, type Appointment } from "@/entities/appointment";
import { onSessionEnd, useSession } from "@/entities/session";
import { ApiError } from "@/shared/api";
import { readStored, writeStored } from "@/shared/lib";

const TRACKED_KEY = "barberia.trackedAppointment";

/** La última cita reservada desde este navegador, con el teléfono del dueño para consultarla */
export type TrackedAppointment = Appointment & { ownerPhone: string };

export function saveTrackedAppointment(appointment: TrackedAppointment | null) {
  writeStored(TRACKED_KEY, appointment);
}

// Al cerrar sesión no se deja la cita a la vista del siguiente que use el equipo
onSessionEnd(() => saveTrackedAppointment(null));

/**
 * Lee la cita guardada y la refresca con el back, porque pudo cambiar desde el panel o
 * por WhatsApp (cancelada, atendida...).
 */
export function useTrackedAppointment() {
  const { user } = useSession();
  const [appointment, setAppointment] = useState(readStored<TrackedAppointment>(TRACKED_KEY));

  function save(next: TrackedAppointment | null) {
    saveTrackedAppointment(next);
    setAppointment(next);
  }

  function refresh(tracked: TrackedAppointment) {
    getAppointment(tracked.id, tracked.ownerPhone)
      .then((fresh) => save({ ...fresh, ownerPhone: tracked.ownerPhone }))
      .catch((e) => {
        if (e instanceof ApiError && e.code === "APPOINTMENT_NOT_FOUND") save(null);
      });
  }

  useEffect(() => {
    // Con sesión de cliente manda el servidor, que también ve las citas agendadas por WhatsApp
    if (user?.role === "CLIENTE") {
      getActiveAppointment()
        .then((active) => {
          const tracked = readStored<TrackedAppointment>(TRACKED_KEY);
          if (active) save({ ...active, ownerPhone: user.phone });
          // Sin activa se deja la última (cancelada o atendida) si es de esta cuenta
          else if (tracked && tracked.client.phone !== user.phone) save(null);
          else if (tracked) refresh(tracked);
        })
        .catch(() => {});
      return;
    }
    const tracked = readStored<TrackedAppointment>(TRACKED_KEY);
    if (tracked) refresh(tracked);
    // Solo se vuelve a pedir cuando cambia quién tiene la sesión
  }, [user?.role, user?.phone]);

  return { appointment, save };
}
