/**
 * Deja el teléfono como lo maneja WhatsApp: solo números y con indicativo.
 * A un celular colombiano de 10 dígitos (3xx...) se le pone el 57 adelante.
 */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10 && digits.startsWith("3")) return `57${digits}`;
  return digits;
}
