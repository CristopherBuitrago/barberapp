/**
 * La forma de comparar nombres para no dejar repetidos: sin mayúsculas, sin tildes y con
 * los espacios de más quitados. "Corte a  Máquina" y "corte a maquina" dan lo mismo.
 */
export function nameKey(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}
