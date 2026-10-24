import { ServiceHeader, type Service } from "@/entities/service";
import type { Slot } from "@/entities/slot";
import { cn, timeCompact } from "@/shared/lib";
import {
  Price,
  siteActions,
  siteBox,
  siteBoxBody,
  siteBoxBodyAfterHeader,
  siteBoxHeader,
  siteButton,
  siteText,
} from "@/shared/ui";

const input =
  "mt-[11px] block h-4 w-full rounded-[2px] border border-solid border-db-input-border bg-white px-[5px] py-0 text-[10px] font-bold text-black [font-family:inherit] placeholder:text-db-text-soft";

export interface Contact {
  name: string;
  phone: string;
  acceptsDataPolicy: boolean;
}

/** Paso 3: resumen de la cita y los datos de contacto. Con cuenta, el nombre y el teléfono no se editan. */
export function ConfirmStep({
  service,
  slot,
  barberName,
  contact,
  onContact,
  withAccount,
  sending,
  error,
  onBack,
  onConfirm,
}: {
  service: Service;
  slot: Slot;
  barberName: string | undefined;
  contact: Contact;
  onContact: (contact: Contact) => void;
  withAccount: boolean;
  sending: boolean;
  error: string;
  onBack: () => void;
  onConfirm: () => void;
}) {
  const ready = contact.name.trim() && contact.phone.replace(/\D/g, "").length >= 7 && (contact.acceptsDataPolicy || withAccount);

  return (
    <>
      <div className={siteBox}>
        <div className={siteBoxHeader}>
          <h2 className={siteText.title}>Resumen</h2>
          <span className="inline-flex items-center gap-1 text-[12px] font-bold">
            Total{" "}
            <span className="inline-flex h-[17px] items-center rounded-[20px] bg-db-total px-[5px]">
              <Price value={service.price} />
            </span>
          </span>
        </div>
        <div className={siteBoxBodyAfterHeader}>
          <ServiceHeader service={service} />
          <p className="mt-[2px] mb-0 text-[10px] font-bold text-db-text-faint">
            {slot.start.slice(0, 10)} | {timeCompact(slot.start)} · {barberName ?? "El barbero que esté libre"}
          </p>
          <p className={cn(siteText.description, "mt-2! mb-[6px]! line-clamp-3")}>{service.description}</p>
          <div className="flex justify-end">
            <Price value={service.price} />
          </div>
        </div>
      </div>

      <div className={siteBox}>
        <div className={siteBoxBody}>
          <h2 className={cn(siteText.title, "text-db-text-soft!")}>Contacto</h2>
          <p className="mt-[10px] mb-[14px] text-[10px] font-medium text-db-text-soft">
            {withAccount
              ? "Reservas con tu cuenta. Te confirmamos la cita por WhatsApp."
              : "Te confirmamos la cita por WhatsApp. Si te registraste, el descuento se aplica automáticamente."}
          </p>
          <input
            className={input}
            value={contact.name}
            onChange={(e) => onContact({ ...contact, name: e.target.value })}
            placeholder="Nombre"
            aria-label="Nombre"
            autoComplete="name"
            readOnly={withAccount}
          />
          <input
            className={input}
            value={contact.phone}
            onChange={(e) => onContact({ ...contact, phone: e.target.value })}
            placeholder="Teléfono"
            aria-label="Teléfono (WhatsApp)"
            inputMode="tel"
            autoComplete="tel"
            readOnly={withAccount}
          />
          {!withAccount && (
            <label className={siteText.checkbox}>
              <input
                type="checkbox"
                checked={contact.acceptsDataPolicy}
                onChange={(e) => onContact({ ...contact, acceptsDataPolicy: e.target.checked })}
              />
              Autorizo el tratamiento de mis datos personales para gestionar mis citas (Ley 1581 de 2012).
            </label>
          )}
        </div>
      </div>

      {error && <p className={siteText.error}>{error}</p>}
      <div className={siteActions}>
        <button className={siteButton("danger")} onClick={onBack}>Atrás</button>
        <button className={siteButton("success")} disabled={sending || !ready} onClick={onConfirm}>
          {sending ? "Reservando…" : "Confirmar"}
        </button>
      </div>
    </>
  );
}
