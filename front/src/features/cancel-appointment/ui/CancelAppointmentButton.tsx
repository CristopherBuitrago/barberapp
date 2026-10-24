import { useState } from "react";
import type { Appointment } from "@/entities/appointment";
import { cn } from "@/shared/lib";
import { siteText } from "@/shared/ui";
import { cancelAppointment } from "../api/cancelAppointment";

/** El enlace rojo para que el cliente cancele su cita. Pide confirmación antes. */
export function CancelAppointmentButton({
  appointmentId,
  ownerPhone,
  onCancelled,
  onError,
}: {
  appointmentId: number;
  ownerPhone: string;
  onCancelled: (appointment: Appointment) => void;
  onError: (message: string) => void;
}) {
  const [cancelling, setCancelling] = useState(false);

  async function cancel() {
    if (!confirm("¿Seguro que quieres cancelar la cita?")) return;
    setCancelling(true);
    try {
      onCancelled(await cancelAppointment(appointmentId, ownerPhone));
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setCancelling(false);
    }
  }

  return (
    <button className={cn(siteText.link, "text-db-red!")} disabled={cancelling} onClick={cancel}>
      {cancelling ? "Cancelando…" : "Cancelar cita"}
    </button>
  );
}
