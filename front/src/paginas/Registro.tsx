import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { apiCuenta } from "../api";
import { almacen } from "../almacen";
import { Marco } from "../componentes/Marco";
import { useSesion } from "../sesion";
import { CampoPerfil } from "./Perfil";
import checkGrande from "../assets/figma/check-grande.svg";

/** /perfil/registro: crear cuenta de cliente (da el descuento de bienvenida). */
export function Registro() {
  const { usuario, iniciar } = useSesion();
  const recordado = almacen.cliente();
  const [nombre, setNombre] = useState(recordado?.nombre ?? "");
  const [telefono, setTelefono] = useState(recordado?.telefono ?? "");
  const [clave, setClave] = useState("");
  const [fechaNacimiento, setFechaNacimiento] = useState("");
  const [aceptaDatos, setAceptaDatos] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [bienvenida, setBienvenida] = useState<{ nombre: string; descuentoPct: number } | null>(null);
  const [error, setError] = useState("");

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setError("");
    try {
      const r = await apiCuenta.registro({
        nombre: nombre.trim(),
        telefono,
        clave,
        fechaNacimiento: fechaNacimiento || undefined,
        aceptaDatos: true,
      });
      almacen.guardarCliente({ nombre: nombre.trim(), telefono });
      setBienvenida({ nombre: r.usuario.nombre, descuentoPct: r.descuentoPct });
      iniciar({ token: r.token, usuario: r.usuario });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  if (bienvenida) {
    return (
      <Marco enPerfil>
        <section className="tarjeta paso">
          <div className="recuadro reservado">
            <div className="recuadro-cabeza centrado">
              <h2>¡Bienvenido, {bienvenida.nombre.split(" ")[0]}!</h2>
            </div>
            <div className="recuadro-cuerpo">
              <div className="check">
                <img src={checkGrande} alt="" width={64} height={64} />
              </div>
              <p className="descripcion centrado">
                {bienvenida.descuentoPct > 0
                  ? `Tu ${bienvenida.descuentoPct}% de descuento se aplica en tu próxima reserva, por la web o por WhatsApp.`
                  : "Tu cuenta quedó lista. ¡Gracias por volver!"}
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

  // Ya con sesión no tiene sentido crear otra cuenta.
  if (usuario) return <Navigate to="/perfil" replace />;

  return (
    <Marco enPerfil>
      <form className="tarjeta perfil" onSubmit={crear}>
        <h1>Estás a punto de unirte a la Recocha</h1>
        <CampoPerfil etiqueta="Nombres" value={nombre} onChange={(e) => setNombre(e.target.value)} autoComplete="name" required />
        <CampoPerfil
          etiqueta="Teléfono"
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
          inputMode="tel"
          autoComplete="tel"
          placeholder="300 123 4567"
          required
        />
        <CampoPerfil
          etiqueta="Contraseña"
          type="password"
          value={clave}
          onChange={(e) => setClave(e.target.value)}
          autoComplete="new-password"
          minLength={6}
          required
        />
        <CampoPerfil
          etiqueta="Fecha de nacimiento"
          type="date"
          value={fechaNacimiento}
          onChange={(e) => setFechaNacimiento(e.target.value)}
        />
        <label className="casilla">
          <input type="checkbox" checked={aceptaDatos} onChange={(e) => setAceptaDatos(e.target.checked)} />
          Autorizo el tratamiento de mis datos personales para gestionar mis citas y recibir promociones (Ley 1581 de 2012).
        </label>
        {error && <p className="error">{error}</p>}
        <button className="boton exito ancho" disabled={!aceptaDatos || enviando}>
          {enviando ? "Creando…" : "Crear Cuenta"}
        </button>
      </form>
    </Marco>
  );
}
