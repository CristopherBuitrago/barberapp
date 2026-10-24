import { readStored, writeStored } from "@/shared/lib";

const CONTACT_KEY = "barberia.contact";

/** Nombre y teléfono de la última reserva sin cuenta, para no pedirlos otra vez */
export interface RememberedContact {
  name: string;
  phone: string;
}

export const rememberedContact = {
  read: () => readStored<RememberedContact>(CONTACT_KEY),
  save: (contact: RememberedContact) => writeStored(CONTACT_KEY, contact),
};
