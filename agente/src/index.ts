import express from "express";
import Anthropic from "@anthropic-ai/sdk";
import { config } from "./config.js";
import { AgenteBarberia } from "./agente/agente.js";
import { HttpBarberiaApi } from "./backend/HttpBarberiaApi.js";
import { ConversacionesEnMemoria } from "./conversaciones/RepositorioConversaciones.js";
import { MetaWhatsAppCliente } from "./whatsapp/MetaWhatsAppCliente.js";
import { crearWebhookWhatsApp } from "./whatsapp/webhook.js";
import type { MensajeCliente } from "./whatsapp/tipos.js";

for (const [nombre, valor] of Object.entries(config.whatsapp)) {
  if (!valor) throw new Error(`Falta configurar WhatsApp: ${nombre} (ver .env.example)`);
}

const whatsapp = new MetaWhatsAppCliente(config.whatsapp);
const agente = new AgenteBarberia({
  claude: new Anthropic({ apiKey: config.claude.apiKey }),
  api: new HttpBarberiaApi(config.back.url, config.back.apiKey),
  whatsapp,
  conversaciones: new ConversacionesEnMemoria(),
});

// Los mensajes de un mismo número se procesan en orden, uno a la vez.
const colas = new Map<string, Promise<void>>();

async function atender(m: MensajeCliente) {
  await whatsapp.marcarLeidoYEscribiendo(m.id).catch((e) => console.error("marcar leído:", e));
  const respuestas = await agente.responder(m.telefono, m.texto, m.nombrePerfil);
  for (const texto of respuestas) {
    await whatsapp.enviarTexto(m.telefono, texto);
  }
}

function encolar(m: MensajeCliente) {
  const anterior = colas.get(m.telefono) ?? Promise.resolve();
  const siguiente = anterior
    .then(() => atender(m))
    .catch((e) => console.error(`Error con ${m.telefono}:`, e))
    .finally(() => {
      if (colas.get(m.telefono) === siguiente) colas.delete(m.telefono);
    });
  colas.set(m.telefono, siguiente);
}

const app = express();
app.get("/salud", (_req, res) => {
  res.json({ ok: true });
});
app.use(
  "/webhook/whatsapp",
  crearWebhookWhatsApp({
    verifyToken: config.whatsapp.verifyToken,
    appSecret: config.whatsapp.appSecret,
    alRecibir: encolar,
  }),
);

if (config.simuladorActivo) {
  // Prueba el agente sin pasar por WhatsApp: devuelve las respuestas en JSON.
  app.post("/simular", express.json(), async (req, res) => {
    const { telefono, texto, nombre } = req.body as { telefono: string; texto: string; nombre?: string };
    res.json({ respuestas: await agente.responder(telefono, texto, nombre) });
  });
}

app.listen(config.puerto, () => {
  console.log(`Agente escuchando en http://localhost:${config.puerto}`);
  console.log(`Webhook de WhatsApp: /webhook/whatsapp`);
});
