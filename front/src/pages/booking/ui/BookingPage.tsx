import { useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { isActive } from "@/entities/appointment";
import { useCatalog } from "@/entities/service";
import { BookingWizard } from "@/features/book-appointment";
import { saveTrackedAppointment, useTrackedAppointment } from "@/features/track-appointment";
import { siteText } from "@/shared/ui";
import { SiteLayout } from "@/widgets/site-layout";

/** /reservar/:serviceId. Con ?paso=0 arranca mostrando el servicio con su foto. */
export function BookingPage() {
  const { serviceId } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { data: services } = useCatalog();
  const service = services?.find((s) => s.id === Number(serviceId));

  // Con una cita activa no se puede reservar otra: de vuelta al catálogo, donde se ve la agendada
  const { appointment } = useTrackedAppointment();
  useEffect(() => {
    if (isActive(appointment)) navigate("/", { replace: true });
  }, [appointment, navigate]);

  return (
    <SiteLayout>
      {!service ? (
        <p className={siteText.loading}>Cargando…</p>
      ) : (
        <BookingWizard
          service={service}
          startAtService={params.get("paso") === "0"}
          onBooked={(booked, ownerPhone) => {
            saveTrackedAppointment({ ...booked, ownerPhone });
            navigate("/reserva-confirmada");
          }}
          onExit={() => navigate("/")}
        />
      )}
    </SiteLayout>
  );
}
