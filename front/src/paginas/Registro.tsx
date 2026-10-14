import { useState } from "react";
import { Link } from "react-router-dom";
import { api, barberia } from "../api";
import { almacen } from "../almacen";
import { Marco } from "../componentes/Marco";
import checkGrande from "../assets/figma/check-grande.svg";

export function Registro() {
  const recordado = almacen.cliente();
  const [nombre, setNombre] = useState(recordado?.nombre ?? "");
  const [telefono, setTelefono] = useState(recordado?.telefono ?? "");
  const [fechaNacimiento, setFechaNacimiento] = useState("");
  const [aceptaDatos, setAceptaDatos] = useState(false);
  const [resultado, setResultado] = useState<{ nombre: string; descuentoPct: number } | null>(null);
  const [error, setError] = useState("");

  async function registrar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const r = await api.registro({
        nombre: nombre.trim(),
        telefono,
        fechaNacimiento: fechaNacimiento || undefined,
        aceptaDatos: true,
      });
      almacen.guardarCliente({ nombre: nombre.trim(), telefono });
      setResultado(r);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  if (resultado) {
    return (
      <Marco>
        <section className="tarjeta paso">
          <div className="recuadro reservado">
            <div className="recuadro-cabeza centrado">
              <h2>¡Bienvenido, {resultado.nombre.split(" ")[0]}!</h2>
            </div>
            <div className="recuadro-cuerpo">
              <div className="check">
                <img src={checkGrande} alt="" width={64} height={64} />
              </div>
              <p className="descripcion centrado">
                {resultado.descuentoPct > 0
                  ? `Tu ${resultado.descuentoPct}% de descuento se aplica solo en tu próxima reserva, por la web o por WhatsApp.`
                  : "Ya estabas registrado. ¡Gracias por volver!"}
              </p>
            </div>
          </div>
          <div className="acciones centradas">
            <Link to="/" className="boton primario">Reservar ahora</Link>
          </div>
        </section>
      </Marco>
    );
  }

  return (
    <Marco>
      <form className="tarjeta paso" onSubmit={registrar}>
        <div className="recuadro">
          <div className="recuadro-cabeza">
            <h2>Regístrate</h2>
          </div>
          <div className="recuadro-cuerpo">
            <p className="texto-contacto">
              Te damos <strong>{barberia.descuentoRegistroPct}% de descuento</strong> en tu próximo corte, y te avisamos de promos y
              productos para el cabello.
            </p>
            <input
              className="entrada"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              placeholder="Nombre"
              aria-label="Nombre"
              autoComplete="name"
            />
            <input
              className="entrada"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              required
              placeholder="Teléfono"
              aria-label="Teléfono (WhatsApp)"
              inputMode="tel"
              autoComplete="tel"
            />
            <label className="etiqueta">
              Cumpleaños (opcional, para un detalle ese día 🎂)
              <input className="entrada" type="date" value={fechaNacimiento} onChange={(e) => setFechaNacimiento(e.target.value)} />
            </label>
            <label className="casilla">
              <input type="checkbox" checked={aceptaDatos} onChange={(e) => setAceptaDatos(e.target.checked)} />
              Autorizo el tratamiento de mis datos personales para gestionar mis citas y recibir promociones (Ley 1581 de 2012).
            </label>
          </div>
        </div>
        {error && <p className="error">{error}</p>}
        <div className="acciones">
          <Link to="/" className="boton peligro">Atrás</Link>
          <button className="boton exito" disabled={!aceptaDatos}>Registrarme</button>
        </div>
      </form>
    </Marco>
  );
}
