import { useState } from "react";
import { Link } from "react-router-dom";
import { api, barberia } from "../api";
import { almacen } from "../almacen";
import { Marco } from "../componentes/Marco";

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
      <Marco compacto>
        <section className="tarjeta exito">
          <h2>¡Bienvenido, {resultado.nombre.split(" ")[0]}!</h2>
          <div className="check">✓</div>
          <p className="exito-texto">
            {resultado.descuentoPct > 0
              ? `Tu ${resultado.descuentoPct}% de descuento se aplica solo en tu próxima reserva, por la web o por WhatsApp.`
              : "Ya estabas registrado. ¡Gracias por volver!"}
          </p>
          <Link to="/" className="boton primario bloque">Reservar ahora</Link>
        </section>
      </Marco>
    );
  }

  return (
    <Marco compacto>
      <form className="tarjeta" onSubmit={registrar}>
        <h2>Regístrate</h2>
        <p className="descripcion">
          Te damos <strong>{barberia.descuentoRegistroPct}% de descuento</strong> en tu próximo corte, y te avisamos de promos y
          productos para el cabello.
        </p>
        <label className="campo">
          Nombre
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} required autoComplete="name" />
        </label>
        <label className="campo">
          Celular (WhatsApp)
          <input value={telefono} onChange={(e) => setTelefono(e.target.value)} required inputMode="tel" autoComplete="tel" placeholder="300 123 4567" />
        </label>
        <label className="campo">
          Cumpleaños (opcional, para un detalle ese día 🎂)
          <input type="date" value={fechaNacimiento} onChange={(e) => setFechaNacimiento(e.target.value)} />
        </label>
        <label className="casilla">
          <input type="checkbox" checked={aceptaDatos} onChange={(e) => setAceptaDatos(e.target.checked)} />
          Autorizo el tratamiento de mis datos personales para gestionar mis citas y recibir promociones (Ley 1581 de 2012).
        </label>
        {error && <p className="error">{error}</p>}
        <div className="acciones">
          <Link to="/" className="boton peligro">Atrás</Link>
          <button className="boton exito" disabled={!aceptaDatos}>Registrarme</button>
        </div>
      </form>
    </Marco>
  );
}
