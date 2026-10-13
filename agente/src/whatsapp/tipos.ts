/**
 * Forma (parcial) del payload que Meta envía al webhook de WhatsApp.
 * https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/components
 */
export interface PayloadWebhook {
  object: string;
  entry?: {
    id: string;
    changes?: {
      field: string;
      value: {
        messaging_product: "whatsapp";
        metadata?: { display_phone_number: string; phone_number_id: string };
        contacts?: { wa_id: string; profile?: { name?: string } }[];
        messages?: MensajeEntrante[];
        statuses?: unknown[];
      };
    }[];
  }[];
}

export interface MensajeEntrante {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text?: { body: string };
  button?: { text: string };
  interactive?: {
    type: string;
    button_reply?: { id: string; title: string };
    list_reply?: { id: string; title: string };
  };
}

/** Mensaje ya simplificado que procesa el agente. */
export interface MensajeCliente {
  id: string;
  telefono: string;
  nombrePerfil?: string;
  texto: string;
}
