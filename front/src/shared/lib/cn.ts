/** Junta clases de Tailwind y se salta las vacías: cn("a", cerrado && "b") */
export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}
