import { Link, useNavigate } from "react-router-dom";
import { isActive } from "@/entities/appointment";
import { ServiceHeader, useCatalog } from "@/entities/service";
import { useSession } from "@/entities/session";
import { useTrackedAppointment } from "@/features/track-appointment";
import { business } from "@/shared/config/business";
import { cn, timeCompact } from "@/shared/lib";
import { Price, siteButton, siteCard, siteText } from "@/shared/ui";
import { SiteLayout } from "@/widgets/site-layout";

/** El catálogo: una tarjeta por servicio. Con una cita activa, esa queda marcada y las demás no se pueden reservar. */
export function CatalogPage() {
  const { data: services, error } = useCatalog();
  const navigate = useNavigate();
  const { appointment } = useTrackedAppointment();
  const { user } = useSession();
  const active = isActive(appointment) ? appointment : null;

  return (
    <SiteLayout>
      {active ? (
        <p className="m-0 rounded-[10px] border border-solid border-db-orange bg-[#fff3e0] px-3 py-[10px] text-[10px] font-bold text-[#8a4500]">
          Ya tienes una cita agendada. Para reservar otra, cancélala o espera a que pase.
        </p>
      ) : (
        !user && (
          <Link
            to="/perfil/registro"
            state={{ from: "/" }}
            className="block rounded-[10px] border border-dashed border-[#f59e0b] bg-[#fff7e6] px-3 py-[10px] text-[10px] font-bold text-[#7c4a03] no-underline"
          >
            🎁 Regístrate y llévate <strong>{business.welcomeDiscountPct}% de descuento</strong> en tu próximo corte
          </Link>
        )
      )}

      {error && <p className={siteText.error}>No pudimos cargar los servicios: {error}</p>}
      {!services && !error && <p className={siteText.loading}>Cargando servicios…</p>}

      <div className="grid grid-cols-[repeat(auto-fill,minmax(283px,1fr))] gap-[21px]">
        {services?.map((s) => {
          const booked = active?.service.id === s.id;
          const locked = !!active && !booked;
          const open = booked ? () => navigate("/reserva-confirmada") : locked ? undefined : () => navigate(`/reservar/${s.id}?paso=0`);
          return (
            <article key={s.id} className={cn(siteCard, locked ? "cursor-default" : "cursor-pointer")} onClick={open}>
              <ServiceHeader service={s} />
              {booked && (
                <p className="mt-1 mx-0 -mb-1 text-[10px] font-bold text-db-text-faint">
                  {active.start.slice(0, 10)} | {timeCompact(active.start)} · {active.barber.name}
                </p>
              )}
              <p className={siteText.description}>{s.description}</p>
              <div className="flex items-center justify-between">
                <Price value={s.price} />
                {booked ? (
                  <button className={siteButton("booked")}>AGENDADA</button>
                ) : (
                  <button
                    className={siteButton("primary")}
                    disabled={locked}
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/reservar/${s.id}`);
                    }}
                  >
                    Reservar
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {business.whatsapp && (
        <a
          className={siteButton("whatsapp", {
            extra:
              "fixed! right-0 bottom-[18px] left-0 mx-auto w-fit h-8! rounded-full! px-4! leading-8! whitespace-nowrap shadow-[0_6px_18px_rgb(0_0_0/20%)]",
          })}
          href={`https://wa.me/${business.whatsapp}`}
          target="_blank"
          rel="noreferrer"
        >
          Agenda por WhatsApp
        </a>
      )}
    </SiteLayout>
  );
}
