/** "15.000" (el signo $ lo pone el ícono del diseño) */
export function thousands(value: number): string {
  return value.toLocaleString("es-CO");
}

/** "$15.000" */
export function money(value: number): string {
  return `$${thousands(value)}`;
}

/** "30min", "1h", "1h 30min" */
export function duration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m}min`;
  return m ? `${h}h ${m}min` : `${h}h`;
}

/** "573001234567" queda "3001234567" (celulares colombianos), los demás igual */
export function localPhone(phone: string): string {
  return phone.length === 12 && phone.startsWith("573") ? phone.slice(2) : phone;
}
