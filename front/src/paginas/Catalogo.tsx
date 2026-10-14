import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, barberia, type Servicio } from "../api";
import { Duracion, Marco, Precio } from "../componentes/Marco";

export function Catalogo() {
  const [servicios, setServicios] = useState<Servicio[] | null>(null);
  const [error, setError] = useState("");
  const navegar = useNavigate();

  useEffect(() => {
    api.servicios().then(setServicios).catch((e: Error) => setError(e.message));
  }, []);

  return (
    <Marco>
      <Link to="/registro" className="aviso-descuento">
        🎁 Regístrate y llévate <strong>{barberia.descuentoRegistroPct}% de descuento</strong> en tu próximo corte
      </Link>

      {error && <p className="error">No pudimos cargar los servicios: {error}</p>}
      {!servicios && !error && <p className="cargando">Cargando servicios…</p>}

      <div className="lista">
        {servicios?.map((s) => (
          <article key={s.id} className="tarjeta servicio" onClick={() => navegar(`/reservar/${s.id}?paso=0`)}>
            <div className="servicio-cabeza">
              <h2>{s.nombre}</h2>
              <Duracion minutos={s.duracionMin} />
            </div>
            <p className="descripcion">{s.descripcion}</p>
            <div className="servicio-pie">
              <Precio valor={s.precio} />
              <button
                className="boton primario"
                onClick={(e) => {
                  e.stopPropagation();
                  navegar(`/reservar/${s.id}`);
                }}
              >
                Reservar
              </button>
            </div>
          </article>
        ))}
      </div>

      {barberia.whatsapp && (
        <a className="boton whatsapp flotante" href={`https://wa.me/${barberia.whatsapp}`} target="_blank" rel="noreferrer">
          💬 Agenda por WhatsApp
        </a>
      )}
    </Marco>
  );
}
