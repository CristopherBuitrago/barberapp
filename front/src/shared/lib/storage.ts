/**
 * Lo que se recuerda en el navegador. No es crítico: si el navegador no deja guardar
 * (modo privado, almacenamiento lleno), se sigue sin eso.
 */
export function readStored<T>(key: string): T | null {
  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : null;
  } catch {
    return null;
  }
}

/** null borra lo guardado */
export function writeStored(key: string, value: unknown): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Sin almacenamiento disponible, no pasa nada
  }
}
