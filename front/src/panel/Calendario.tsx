import type { Barbero, Bloqueo, Cita } from "../api";
import { DIAS_CORTOS, diaSemana, hoy, minutosDelDia } from "../formato";

const HORA_INICIO = 7;
const HORA_FIN = 21;
const PX_POR_MIN = 1.1;
const COLORES = ["#2563eb", "#d97706", "#059669", "#db2777", "#7c3aed", "#0891b2"];

interface Props {
  dias: string[];
  citas: Cita[];
  bloqueos: Bloqueo[];
  barberos: Barbero[];
  onCita: (c: Cita) => void;
  onBloqueo: (b: Bloqueo) => void;
}

function posicion(inicio: string, fin: string) {
  const desde = Math.max(minutosDelDia(inicio), HORA_INICIO * 60);
  const hasta = Math.min(fin.slice(0, 10) > inicio.slice(0, 10) ? 24 * 60 : minutosDelDia(fin), HORA_FIN * 60);
  return { top: (desde - HORA_INICIO * 60) * PX_POR_MIN, height: Math.max((hasta - desde) * PX_POR_MIN, 18) };
}

/** Grilla de horas (filas) por día (columnas), con citas y bloqueos posicionados. */
export function Calendario({ dias, citas, bloqueos, barberos, onCita, onBloqueo }: Props) {
  const horas = Array.from({ length: HORA_FIN - HORA_INICIO }, (_, i) => HORA_INICIO + i);
  const alto = (HORA_FIN - HORA_INICIO) * 60 * PX_POR_MIN;
  const color = (id: number) => COLORES[barberos.findIndex((b) => b.id === id) % COLORES.length] ?? COLORES[0];

  return (
    <div className="calendario-contenedor">
      <div className="calendario" style={{ gridTemplateColumns: `52px repeat(${dias.length}, minmax(130px, 1fr))` }}>
        <div className="cal-esquina" />
        {dias.map((d) => (
          <div key={d} className={d === hoy() ? "cal-dia-titulo hoy" : "cal-dia-titulo"}>
            {DIAS_CORTOS[diaSemana(d)]} <strong>{Number(d.slice(8, 10))}</strong>
          </div>
        ))}

        <div className="cal-horas" style={{ height: alto }}>
          {horas.map((h) => (
            <span key={h} style={{ top: (h - HORA_INICIO) * 60 * PX_POR_MIN }}>
              {h % 12 === 0 ? 12 : h % 12} {h < 12 ? "am" : "pm"}
            </span>
          ))}
        </div>

        {dias.map((d) => (
          <div key={d} className="cal-columna" style={{ height: alto }}>
            {horas.map((h) => (
              <div key={h} className="cal-linea" style={{ top: (h - HORA_INICIO) * 60 * PX_POR_MIN }} />
            ))}

            {bloqueos
              .filter((b) => b.inicio.slice(0, 10) <= d && b.fin.slice(0, 10) >= d)
              .map((b) => {
                const inicio = b.inicio.slice(0, 10) < d ? `${d}T00:00` : b.inicio;
                const fin = b.fin.slice(0, 10) > d ? `${d}T23:59` : b.fin;
                return (
                  <button key={b.id} className="cal-bloqueo" style={posicion(inicio, fin)} onClick={() => onBloqueo(b)}>
                    ⛔ {b.barbero.nombre} {b.motivo && `· ${b.motivo}`}
                  </button>
                );
              })}

            {citas
              .filter((c) => c.inicio.startsWith(d))
              .map((c) => (
                <button
                  key={c.id}
                  className={`cal-cita estado-${c.estado.toLowerCase()}`}
                  style={{ ...posicion(c.inicio, c.fin), borderLeftColor: color(c.barbero.id) }}
                  onClick={() => onCita(c)}
                  title={`${c.cliente.nombre} · ${c.servicio.nombre} · ${c.barbero.nombre}`}
                >
                  <strong>{c.inicio.slice(11, 16)} {c.cliente.nombre}</strong>
                  <span>{c.servicio.nombre} · {c.barbero.nombre}</span>
                  {c.canal === "WHATSAPP" && <span className="canal">WhatsApp</span>}
                </button>
              ))}
          </div>
        ))}
      </div>
    </div>
  );
}
