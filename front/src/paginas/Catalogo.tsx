import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, barberia, type Servicio } from "../api";
import { esActiva, useCitaGuardada } from "../citaGuardada";
import { Duracion, Marco, Precio } from "../componentes/Marco";
import { horaCompacta } from "../formato";

export function Catalogo() {
  const [servicios, setServicios] = useState<Servicio[] | null>(null);
  const [error, setError] = useState("");
  const navegar = useNavigate();
  const { cita } = useCitaGuardada();
  const activa = esActiva(cita) ? cita : null;

  useEffect(() => {
    api.servicios().then(setServicios).catch((e: Error) => setError(e.message));
  }, []);

  return (
    <Marco>
      {activa ? (
        <p className="aviso-agendada">
          Ya tienes una cita agendada. Para reservar otra, cancélala o espera a que pase.
        </p>
      ) : (
        <Link to="/registro" className="aviso-descuento">
          🎁 Regístrate y llévate <strong>{barberia.descuentoRegistroPct}% de descuento</strong> en tu próximo corte
        </Link>
      )}

      {error && <p className="error">No pudimos cargar los servicios: {error}</p>}
      {!servicios && !error && <p className="cargando">Cargando servicios…</p>}

      <div className="lista">
        {servicios?.map((s) => {
          const agendado = activa?.servicio.id === s.id;
          const bloqueado = !!activa && !agendado;
          const abrir = agendado
            ? () => navegar("/reserva-confirmada")
            : bloqueado
              ? undefined
              : () => navegar(`/reservar/${s.id}?paso=0`);
          return (
            <article key={s.id} className={bloqueado ? "tarjeta servicio bloqueado" : "tarjeta servicio"} onClick={abrir}>
              <div className="servicio-cabeza">
                <h2>{s.nombre}</h2>
                <Duracion minutos={s.duracionMin} />
              </div>
              {agendado && (
                <p className="fecha-cita">
                  {activa.inicio.slice(0, 10)} | {horaCompacta(activa.inicio)} · {activa.barbero.nombre}
                </p>
              )}
              <p className="descripcion">{s.descripcion}</p>
              <div className="servicio-pie">
                <Precio valor={s.precio} />
                {agendado ? (
                  <button className="boton agendada">AGENDADA</button>
                ) : (
                  <button
                    className="boton primario"
                    disabled={bloqueado}
                    onClick={(e) => {
                      e.stopPropagation();
                      navegar(`/reservar/${s.id}`);
                    }}
                  >
                    Reservar
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {barberia.whatsapp && (
        <a className="boton whatsapp flotante" href={`https://wa.me/${barberia.whatsapp}`} target="_blank" rel="noreferrer">
          💬 Agenda por WhatsApp
        </a>
      )}
    </Marco>
  );
}
