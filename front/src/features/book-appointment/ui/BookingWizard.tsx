import { useEffect, useState } from "react";
import type { Appointment } from "@/entities/appointment";
import { useBarbers } from "@/entities/barber";
import type { Service } from "@/entities/service";
import { rememberedContact, useSession } from "@/entities/session";
import type { Slot } from "@/entities/slot";
import { ApiError } from "@/shared/api";
import { localPhone, startOfWeek } from "@/shared/lib";
import { Steps, siteStepCard } from "@/shared/ui";
import { createAppointment } from "../api/createAppointment";
import { firstBookableDay } from "../lib/schedule";
import { useDaySlots } from "../model/useDaySlots";
import { ConfirmStep, type Contact } from "./ConfirmStep";
import { ScheduleStep } from "./ScheduleStep";
import { ServiceStep } from "./ServiceStep";

const STEPS = ["Servicio", "Detalles", "Confirmar"];

/**
 * La reserva en tres pasos: servicio, fecha y hora, y confirmar. startAtService es para
 * quien entró tocando la tarjeta, así ve primero el servicio con su foto.
 */
export function BookingWizard({
  service,
  startAtService,
  onBooked,
  onExit,
}: {
  service: Service;
  startAtService: boolean;
  /** ownerPhone es con el que después se consulta o cancela la cita */
  onBooked: (appointment: Appointment, ownerPhone: string) => void;
  onExit: () => void;
}) {
  const [step, setStep] = useState(startAtService ? 0 : 1);
  const { data: barbers = [] } = useBarbers();
  const [barberId, setBarberId] = useState<number | undefined>();
  const [date, setDate] = useState(firstBookableDay());
  const [week, setWeek] = useState(startOfWeek(firstBookableDay()));
  const [chosen, setChosen] = useState<Slot | null>(null);
  const { slots, nextAvailable, reload } = useDaySlots(service.id, date, barberId);

  // Con cuenta de cliente la cita va a su nombre y teléfono (el back los toma de la sesión)
  const { user } = useSession();
  const withAccount = user?.role === "CLIENTE";
  const remembered = withAccount && user ? { name: user.name, phone: localPhone(user.phone) } : rememberedContact.read();
  const [contact, setContact] = useState<Contact>({
    name: remembered?.name ?? "",
    phone: remembered?.phone ?? "",
    acceptsDataPolicy: false,
  });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  // Al cambiar de día o de barbero la hora elegida ya no sirve
  useEffect(() => setChosen(null), [date, barberId]);

  async function confirm() {
    if (!chosen) return;
    setSending(true);
    setError("");
    try {
      const appointment = await createAppointment({
        serviceId: service.id,
        barberId,
        start: chosen.start,
        client: { name: contact.name.trim(), phone: contact.phone, acceptsDataPolicy: contact.acceptsDataPolicy },
      });
      rememberedContact.save({ name: contact.name.trim(), phone: contact.phone });
      onBooked(appointment, contact.phone);
    } catch (e) {
      setError((e as Error).message);
      if (e instanceof ApiError && e.code === "SLOT_TAKEN") {
        // Alguien tomó esa hora mientras tanto: a elegir otra con la disponibilidad al día
        setStep(1);
        setChosen(null);
        reload();
      }
    } finally {
      setSending(false);
    }
  }

  const barberName = barberId ? barbers.find((b) => b.id === barberId)?.name : chosen?.barbers[0]?.name;

  return (
    <section className={siteStepCard}>
      <Steps steps={STEPS} current={step} />

      {step === 0 && <ServiceStep service={service} onNext={() => setStep(1)} />}

      {step === 1 && (
        <ScheduleStep
          service={service}
          barbers={barbers}
          barberId={barberId}
          onBarber={setBarberId}
          date={date}
          onDate={setDate}
          week={week}
          onWeek={setWeek}
          slots={slots}
          nextAvailable={nextAvailable}
          chosen={chosen}
          onChoose={setChosen}
          error={error}
          onBack={() => (startAtService ? setStep(0) : onExit())}
          onNext={() => setStep(2)}
        />
      )}

      {step === 2 && chosen && (
        <ConfirmStep
          service={service}
          slot={chosen}
          barberName={barberName}
          contact={contact}
          onContact={setContact}
          withAccount={withAccount}
          sending={sending}
          error={error}
          onBack={() => setStep(1)}
          onConfirm={confirm}
        />
      )}
    </section>
  );
}
