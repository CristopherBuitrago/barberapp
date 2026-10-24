/** Datos de la barbería que se configuran por variables de Vite (.env del front). */
export const business = {
  name: import.meta.env.VITE_BARBERIA_NOMBRE ?? "Diego Barber",
  /** Número de WhatsApp sin "+", para los botones de "Escríbenos" */
  whatsapp: import.meta.env.VITE_WHATSAPP_BARBERIA ?? "",
  welcomeDiscountPct: Number(import.meta.env.VITE_DESCUENTO_REGISTRO_PCT ?? 10),
};
