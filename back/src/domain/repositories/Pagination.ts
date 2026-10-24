/** Qué página pidieron. page empieza en 1. */
export interface PageRequest {
  page: number;
  perPage: number;
}

/** Una página de resultados y cuántos hay en total. */
export interface Page<T> {
  items: T[];
  total: number;
}

/** Cuántos saltarse en la base para llegar a esa página */
export function offsetOf(request: PageRequest): number {
  return (request.page - 1) * request.perPage;
}

/** Para listas que ya están en memoria, como las horas libres que se calculan */
export function paginate<T>(items: T[], request: PageRequest): Page<T> {
  const start = offsetOf(request);
  return { items: items.slice(start, start + request.perPage), total: items.length };
}
