/** Datos que se recuerdan en el navegador del cliente (no críticos: si fallan, se ignoran). */

const CLAVE_CLIENTE = "barberia.cliente";
const CLAVE_ULTIMA_CITA = "barberia.ultimaCita";
const CLAVE_PANEL = "barberia.panelClave";

function leer<T>(clave: string): T | null {
  try {
    const v = localStorage.getItem(clave);
    return v ? (JSON.parse(v) as T) : null;
  } catch {
    return null;
  }
}

function escribir(clave: string, valor: unknown) {
  try {
    if (valor === null) localStorage.removeItem(clave);
    else localStorage.setItem(clave, JSON.stringify(valor));
  } catch {
    /* almacenamiento no disponible */
  }
}

export interface ClienteRecordado {
  nombre: string;
  telefono: string;
}

export const almacen = {
  cliente: () => leer<ClienteRecordado>(CLAVE_CLIENTE),
  guardarCliente: (c: ClienteRecordado) => escribir(CLAVE_CLIENTE, c),
  ultimaCita: <T>() => leer<T>(CLAVE_ULTIMA_CITA),
  guardarUltimaCita: (c: unknown) => escribir(CLAVE_ULTIMA_CITA, c),
  panelClave: () => leer<string>(CLAVE_PANEL),
  guardarPanelClave: (c: string | null) => escribir(CLAVE_PANEL, c),
};
