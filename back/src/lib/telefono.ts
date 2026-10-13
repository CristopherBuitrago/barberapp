/**
 * Normaliza un teléfono al formato que usa WhatsApp: solo dígitos, con indicativo.
 * Un celular colombiano de 10 dígitos (3xx...) recibe el indicativo 57.
 */
export function normalizarTelefono(telefono: string): string {
  const digitos = telefono.replace(/\D/g, "");
  if (digitos.length === 10 && digitos.startsWith("3")) return `57${digitos}`;
  return digitos;
}
