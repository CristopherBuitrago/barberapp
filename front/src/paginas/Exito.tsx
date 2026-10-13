import { useState } from "react";
import { Link } from "react-router-dom";
import { api, barberia, type Cita } from "../api";
import { almacen } from "../almacen";
import { Marco } from "../componentes/Marco";
import { descargarIcs, fechaLarga, hora, precio } from "../formato";

type CitaGuardada = Cita & { telefono: string };

export function Exito() {
  const [cita, setCita] = useState(almacen.ultimaCita<CitaGuardada>());
  const [cancelando, setCancelando] = useState(false);
  const [error, setError] = useState("");

  if (!cita) {
    return (
      <Marco compacto>
        <p>No encontramos tu reserva. <Link to="/">Volver al inicio</Link></p>
      </Marco>
    );
  }

  const cancelada = cita.estado === "CANCELADA";

  async function cancelar() {
    if (!cita || !confirm("¿Seguro que quieres cancelar la cita?")) return;
    setCancelando(true);
    try {
      const actualizada = { ...(await api.cancelarCita(cita.id, cita.telefono)), telefono: cita.telefono };
      almacen.guardarUltimaCita(actualizada);
      setCita(actualizada);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCancelando(false);
    }
  }

  return (
    <Marco compacto>
      <section className="tarjeta exito">
        <h2>{cancelada ? "Cita cancelada" : "¡Reservado!"}</h2>
        <div className={cancelada ? "check cancelado" : "check"}>{cancelada ? "✕" : "✓"}</div>
        <p className="exito-texto">
          {cancelada ? (
            "Listo, tu cita quedó cancelada. ¡Te esperamos otro día!"
          ) : (
            <>
              Te esperamos el <strong>{fechaLarga(cita.inicio)}</strong> a las <strong>{hora(cita.inicio)}</strong> con{" "}
              <strong>{cita.barbero.nombre}</strong> para {cita.servicio.nombre.toLowerCase()}.
            </>
          )}
        </p>
        {!cancelada && (
          <p className="exito-precio">
            {cita.descuentoPct > 0 ? (
              <>
                <s>{precio(cita.precio)}</s> {precio(cita.precioFinal)} · {cita.descuentoPct}% de descuento 🎉
              </>
            ) : (
              precio(cita.precioFinal)
            )}
          </p>
        )}

        {!cancelada && (
          <div className="acciones columna">
            <button
              className="boton primario"
              onClick={() => descargarIcs(`${cita.servicio.nombre} – ${barberia.nombre}`, cita.inicio, cita.fin, barberia.nombre)}
            >
              📅 Agregar a mi calendario
            </button>
            {barberia.whatsapp && (
              <a
                className="boton whatsapp"
                href={`https://wa.me/${barberia.whatsapp}?text=${encodeURIComponent(`Hola, quiero cambiar mi cita #${cita.id}`)}`}
                target="_blank"
                rel="noreferrer"
              >
                💬 Cambiar hora por WhatsApp
              </a>
            )}
            <button className="boton peligro" disabled={cancelando} onClick={cancelar}>
              {cancelando ? "Cancelando…" : "Cancelar cita"}
            </button>
          </div>
        )}
        {error && <p className="error">{error}</p>}
      </section>

      {cita.descuentoPct === 0 && (
        <Link to="/registro" className="aviso-descuento">
          🎁 Regístrate y te damos <strong>{barberia.descuentoRegistroPct}%</strong> en tu próximo corte
        </Link>
      )}
      <Link to="/" className="boton secundario bloque">Volver al inicio</Link>
    </Marco>
  );
}
