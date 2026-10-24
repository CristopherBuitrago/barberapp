import { ServiceHeader, type Service } from "@/entities/service";
import { resolveImageUrl } from "@/shared/api";
import { cn } from "@/shared/lib";
import { Price, siteActions, siteButton, siteText } from "@/shared/ui";

const image = "block w-full h-[124px] object-cover bg-db-gray-photo mt-[11px] mb-[21px] mx-0";

/** Paso 1: el servicio con su foto, para quien entró tocando la tarjeta del catálogo. */
export function ServiceStep({ service, onNext }: { service: Service; onNext: () => void }) {
  return (
    <div className="mt-7 px-2">
      <ServiceHeader service={service} />
      {service.imageUrl ? (
        <img className={image} src={resolveImageUrl(service.imageUrl)!} alt={service.name} />
      ) : (
        <div className={image} />
      )}
      <p className={cn(siteText.description, "mt-0! mb-1!")}>{service.description}</p>
      <div className="flex justify-end">
        <Price value={service.price} />
      </div>
      <div className={cn(siteActions, "mt-16!")}>
        <span />
        <button className={siteButton("primary")} onClick={onNext}>Siguiente</button>
      </div>
    </div>
  );
}
