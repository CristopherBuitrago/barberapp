/**
 * Chat de prueba en la terminal: habla con el agente como si fuera WhatsApp,
 * sin configurar Meta. Uso: npm run chat -- 3001234567
 */
import readline from "node:readline/promises";
import Anthropic from "@anthropic-ai/sdk";
import { config } from "./config.js";
import { AgenteBarberia } from "./agente/agente.js";
import { HttpBarberiaApi } from "./backend/HttpBarberiaApi.js";
import { ConversacionesEnMemoria } from "./conversaciones/RepositorioConversaciones.js";
import type { ClienteWhatsApp } from "./whatsapp/ClienteWhatsApp.js";

const telefono = process.argv[2] ?? "573001234567";

const whatsappDeConsola: ClienteWhatsApp = {
  async enviarTexto(para, texto) {
    console.log(`\n[WhatsApp a ${para}] ${texto}\n`);
  },
  async marcarLeidoYEscribiendo() {},
  async enviarPlantilla(para, plantilla) {
    console.log(`\n[Plantilla ${plantilla} a ${para}]\n`);
  },
};

const agente = new AgenteBarberia({
  claude: new Anthropic(),
  api: new HttpBarberiaApi(config.back.url, config.back.apiKey),
  whatsapp: whatsappDeConsola,
  conversaciones: new ConversacionesEnMemoria(),
});

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
console.log(`Chateando como ${telefono}. Escribe "salir" para terminar.\n`);
for (;;) {
  const texto = await rl.question("Tú: ");
  if (texto.trim().toLowerCase() === "salir") break;
  for (const r of await agente.responder(telefono, texto, "Cliente de prueba")) {
    console.log(`Barbería: ${r}`);
  }
}
rl.close();
