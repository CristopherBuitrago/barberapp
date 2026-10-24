import { useState } from "react";
import { Link } from "react-router-dom";
import { isActive } from "@/entities/appointment";
import { useSession } from "@/entities/session";
import { CancelAppointmentButton } from "@/features/cancel-appointment";
import { useTrackedAppointment } from "@/features/track-appointment";
import { business } from "@/shared/config/business";
import { cn, downloadIcs, longDate, money, time12 } from "@/shared/lib";
import { ResultBox, resultText, siteActions, siteButton, siteStepCard, siteText } from "@/shared/ui";
import { SiteLayout } from "@/widgets/site-layout";

/** /reserva-confirmada: la última cita que se reservó desde este navegador, con sus opciones. */
export function BookingConfirmedPage() {
  const { appointment, save } = useTrackedAppointment();
  const { user } = useSession();
  const [error, setError] = useState("");

  if (!appointment) {
    return (
      <SiteLayout>
        <section className={siteStepCard}>
          <p className={cn(siteText.description, "text-center")}>
            No encontramos tu reserva. <Link to="/">Volver al inicio</Link>
          </p>
        </section>
      </SiteLayout>
    );
  }

  const a = appointment;
  const cancelled = a.status === "CANCELADA";

  return (
    <SiteLayout>
      <section className={siteStepCard}>
        <ResultBox title={cancelled ? "Cita cancelada" : "¡Reservado!"} cancelled={cancelled}>
          <p className={resultText}>
            {cancelled ? (
              "Listo, tu cita quedó cancelada. ¡Te esperamos otro día!"
            ) : (
              <>
                Te esperamos el {longDate(a.start)} a las {time12(a.start)} con {a.barber.name} para{" "}
                {a.service.name.toLowerCase()}.{" "}
                {a.discountPct > 0 ? (
                  <>
                    Pagas <s>{money(a.price)}</s> {money(a.finalPrice)} ({a.discountPct}% de descuento 🎉).
                  </>
                ) : (
                  <>Total: {money(a.finalPrice)}.</>
                )}
              </>
            )}
          </p>

          {isActive(a) && (
            <div className="flex flex-wrap justify-center gap-x-[14px] gap-y-[6px]">
              <button
                className={siteText.link}
                onClick={() => downloadIcs(`${a.service.name} – ${business.name}`, a.start, a.end, business.name)}
              >
                📅 Agregar a mi calendario
              </button>
              {business.whatsapp && (
                <a
                  className={siteText.link}
                  href={`https://wa.me/${business.whatsapp}?text=${encodeURIComponent(`Hola, quiero cambiar mi cita #${a.id}`)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  💬 Cambiar hora por WhatsApp
                </a>
              )}
              <CancelAppointmentButton
                appointmentId={a.id}
                ownerPhone={a.ownerPhone}
                onCancelled={(fresh) => save({ ...fresh, ownerPhone: a.ownerPhone })}
                onError={setError}
              />
            </div>
          )}
          {error && <p className={siteText.error}>{error}</p>}
        </ResultBox>

        <div className={cn(siteActions, "justify-center")}>
          <Link to="/" className={siteButton("success")}>Listo</Link>
        </div>
      </section>

      {a.discountPct === 0 && !user && (
        <Link
          to="/perfil/registro"
          className="mx-auto block w-full max-w-[480px] rounded-[10px] border border-dashed border-[#f59e0b] bg-[#fff7e6] px-3 py-[10px] text-[10px] font-bold text-[#7c4a03] no-underline"
        >
          🎁 Regístrate y te damos <strong>{business.welcomeDiscountPct}%</strong> en tu próximo corte
        </Link>
      )}
    </SiteLayout>
  );
}
