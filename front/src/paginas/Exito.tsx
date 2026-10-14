import { useState } from "react";
import { Link } from "react-router-dom";
import { api, barberia, type Cita } from "../api";
import { almacen } from "../almacen";
import { Marco } from "../componentes/Marco";
import { descargarIcs, fechaLarga, hora, precio } from "../formato";
import checkGrande from "../assets/figma/check-grande.svg";

type CitaGuardada = Cita & { telefono: string };

export function Exito() {
  const [cita, setCita] = useState(almacen.ultimaCita<CitaGuardada>());
  const [cancelando, setCancelando] = useState(false);
  const [error, setError] = useState("");

  if (!cita) {
    return (
      <Marco>
        <section className="tarjeta paso">
          <p className="descripcion centrado">No encontramos tu reserva. <Link to="/">Volver al inicio</Link></p>
        </section>
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
    <Marco>
      <section className="tarjeta paso">
        <div className="recuadro reservado">
          <div className="recuadro-cabeza centrado">
            <h2>{cancelada ? "Cita cancelada" : "¡Reservado!"}</h2>
          </div>
          <div className="recuadro-cuerpo">
            <div className={cancelada ? "check cancelado" : "check"}>
              {cancelada ? "✕" : <img src={checkGrande} alt="" width={64} height={64} />}
            </div>
            <p className="descripcion centrado">
              {cancelada ? (
                "Listo, tu cita quedó cancelada. ¡Te esperamos otro día!"
              ) : (
                <>
                  Te esperamos el {fechaLarga(cita.inicio)} a las {hora(cita.inicio)} con {cita.barbero.nombre} para{" "}
                  {cita.servicio.nombre.toLowerCase()}.{" "}
                  {cita.descuentoPct > 0 ? (
                    <>
                      Pagas <s>{precio(cita.precio)}</s> {precio(cita.precioFinal)} ({cita.descuentoPct}% de descuento 🎉).
                    </>
                  ) : (
                    <>Total: {precio(cita.precioFinal)}.</>
                  )}
                </>
              )}
            </p>

            {!cancelada && (
              <div className="enlaces">
                <button
                  className="enlace"
                  onClick={() => descargarIcs(`${cita.servicio.nombre} – ${barberia.nombre}`, cita.inicio, cita.fin, barberia.nombre)}
                >
                  📅 Agregar a mi calendario
                </button>
                {barberia.whatsapp && (
                  <a
                    className="enlace"
                    href={`https://wa.me/${barberia.whatsapp}?text=${encodeURIComponent(`Hola, quiero cambiar mi cita #${cita.id}`)}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    💬 Cambiar hora por WhatsApp
                  </a>
                )}
                <button className="enlace peligro" disabled={cancelando} onClick={cancelar}>
                  {cancelando ? "Cancelando…" : "Cancelar cita"}
                </button>
              </div>
            )}
            {error && <p className="error">{error}</p>}
          </div>
        </div>

        <div className="acciones centradas">
          <Link to="/" className="boton exito">Listo</Link>
        </div>
      </section>

      {cita.descuentoPct === 0 && (
        <Link to="/registro" className="aviso-descuento">
          🎁 Regístrate y te damos <strong>{barberia.descuentoRegistroPct}%</strong> en tu próximo corte
        </Link>
      )}
    </Marco>
  );
}
